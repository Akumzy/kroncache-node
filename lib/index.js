"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Kroncache_ws, _Kroncache_bus, _Kroncache_disconnected;
const ms = require("ms");
const WebSocket = require("ws");
const events_1 = require("events");
const uuid_1 = require("uuid");
class Kroncache {
    constructor(config) {
        this.config = config;
        _Kroncache_ws.set(this, void 0);
        _Kroncache_bus.set(this, new events_1.EventEmitter());
        _Kroncache_disconnected.set(this, false);
    }
    connect() {
        return new Promise((resolve, reject) => {
            var _a, _b;
            const port = ((_a = this.config) === null || _a === void 0 ? void 0 : _a.port) || 5093;
            const host = ((_b = this.config) === null || _b === void 0 ? void 0 : _b.host) || "localhost";
            const ws = (__classPrivateFieldSet(this, _Kroncache_ws, new WebSocket(`ws://${host}:${port}`), "f"));
            ws.once("error", reject);
            ws.once("open", () => {
                resolve(true);
                __classPrivateFieldSet(this, _Kroncache_disconnected, false, "f");
                ws.removeEventListener("error", reject);
                this.boot();
            });
        });
    }
    disconnect() {
        if (__classPrivateFieldGet(this, _Kroncache_ws, "f")) {
            __classPrivateFieldGet(this, _Kroncache_ws, "f").close();
            __classPrivateFieldSet(this, _Kroncache_disconnected, true, "f");
        }
    }
    boot() {
        const ws = __classPrivateFieldGet(this, _Kroncache_ws, "f");
        const ths = this;
        ws.addEventListener("error", (err) => {
            if (!__classPrivateFieldGet(ths, _Kroncache_disconnected, "f")) {
                __classPrivateFieldGet(ths, _Kroncache_bus, "f").emit("error", err);
            }
        });
        ws.addEventListener("close", (err) => {
            if (!__classPrivateFieldGet(ths, _Kroncache_disconnected, "f")) {
                const error = new Error("[Kroncache server close] " + err.reason);
                __classPrivateFieldGet(ths, _Kroncache_bus, "f").emit("error", error);
            }
        });
        ws.addEventListener("message", (payload) => {
            if (payload.type === "message") {
                const p = JSON.parse(payload.data);
                let data = parseJSON(p.data);
                if (p.action === "EXPIRED") {
                    __classPrivateFieldGet(this, _Kroncache_bus, "f").emit("expired", { data, key: p.key });
                }
                else if (["CRON", "SCHEDULE", "BATCH"].includes(p.action)) {
                    if (p.action === "BATCH") {
                        // For some unknown reason, empty strings are added to the data array
                        data = data.filter(Boolean).map((v) => JSON.parse(v));
                    }
                    __classPrivateFieldGet(this, _Kroncache_bus, "f").emit(p.key, { data, key: p.key });
                }
                else {
                    __classPrivateFieldGet(this, _Kroncache_bus, "f").emit(p.id, p.error, data);
                }
            }
        });
    }
    set(key, value, opt) {
        return new Promise((resolve, reject) => {
            let ttl = (opt === null || opt === void 0 ? void 0 : opt.ttl) || this.config.ttl;
            if (__classPrivateFieldGet(this, _Kroncache_ws, "f")) {
                const id = (0, uuid_1.v4)();
                __classPrivateFieldGet(this, _Kroncache_bus, "f").once(id, (err) => {
                    err ? reject(err) : resolve(true);
                });
                __classPrivateFieldGet(this, _Kroncache_ws, "f").send(JSON.stringify({
                    key,
                    action: "SET",
                    data: JSON.stringify(value),
                    id,
                    ttl: parseTTL(ttl),
                    ack: (opt === null || opt === void 0 ? void 0 : opt.ack) || this.config.ack,
                    cron: opt === null || opt === void 0 ? void 0 : opt.cron,
                }));
            }
            else
                reject("Socket not connected");
        });
    }
    get(opt) {
        return new Promise((resolve, reject) => {
            if (__classPrivateFieldGet(this, _Kroncache_ws, "f")) {
                const id = (0, uuid_1.v4)();
                const query = {
                    action: "GET",
                    id,
                };
                if (typeof opt === "string") {
                    query.key = opt;
                }
                else {
                    query.regex = opt.regex;
                }
                __classPrivateFieldGet(this, _Kroncache_ws, "f").send(JSON.stringify(query));
                __classPrivateFieldGet(this, _Kroncache_bus, "f").once(id, (err, data) => {
                    resolve(err ? null : Array.isArray(data) ? data.filter(Boolean).map((v) => parseJSON(v)) : data);
                });
            }
            else
                reject("Socket not connected");
        });
    }
    keys() {
        return new Promise((resolve, reject) => {
            if (__classPrivateFieldGet(this, _Kroncache_ws, "f")) {
                const id = (0, uuid_1.v4)();
                __classPrivateFieldGet(this, _Kroncache_ws, "f").send(JSON.stringify({
                    action: "KEYS",
                    id,
                }));
                __classPrivateFieldGet(this, _Kroncache_bus, "f").once(id, (err, data) => {
                    err ? reject(err) : resolve(data.filter(Boolean));
                });
            }
            else
                reject("Socket not connected");
        });
    }
    del(key) {
        return new Promise((resolve, reject) => {
            if (__classPrivateFieldGet(this, _Kroncache_ws, "f")) {
                const id = (0, uuid_1.v4)();
                __classPrivateFieldGet(this, _Kroncache_ws, "f").send(JSON.stringify({
                    action: "DELETE",
                    id,
                    key,
                }));
                __classPrivateFieldGet(this, _Kroncache_bus, "f").once(id, (err) => {
                    resolve(!err);
                });
            }
            else
                reject("Socket not connected");
        });
    }
    reset() {
        return new Promise((resolve, reject) => {
            if (__classPrivateFieldGet(this, _Kroncache_ws, "f")) {
                const id = (0, uuid_1.v4)();
                __classPrivateFieldGet(this, _Kroncache_ws, "f").send(JSON.stringify({
                    action: "RESET",
                    id,
                }));
                __classPrivateFieldGet(this, _Kroncache_bus, "f").once(id, (err) => {
                    err ? reject(err) : resolve();
                });
            }
            else
                reject("Socket not connected");
        });
    }
    addListener(event, listener) {
        __classPrivateFieldGet(this, _Kroncache_bus, "f").addListener(event, listener);
    }
    cron(key, expression, data = null) {
        if (typeof expression !== "string") {
            throw new Error("expression must be a valid cron expression, visit https://pkg.go.dev/gopkg.in/robfig/cron.v3 for more information.");
        }
        return this.set(key, data, { cron: expression, ttl: 0 });
    }
    /**
     * Schedule a defined job
     */
    schedule(key, time, data = null) {
        return new Promise((resolve, reject) => {
            if (__classPrivateFieldGet(this, _Kroncache_ws, "f")) {
                const id = (0, uuid_1.v4)();
                __classPrivateFieldGet(this, _Kroncache_bus, "f").once(id, (err) => {
                    err ? reject(err) : resolve();
                });
                __classPrivateFieldGet(this, _Kroncache_ws, "f").send(JSON.stringify({
                    key,
                    action: "SCHEDULE",
                    data: JSON.stringify(data),
                    id,
                    ttl: parseTTL(time),
                    ack: true,
                }));
            }
            else
                reject("Socket not connected");
        });
    }
    // Define a batch schudule
    scheduleBatch(key, /**time e**/ cronExpression) {
        return new Promise((resolve, reject) => {
            if (__classPrivateFieldGet(this, _Kroncache_ws, "f")) {
                const id = (0, uuid_1.v4)();
                __classPrivateFieldGet(this, _Kroncache_bus, "f").once(id, (err) => {
                    err ? reject(err) : resolve();
                });
                __classPrivateFieldGet(this, _Kroncache_ws, "f").send(JSON.stringify({
                    key,
                    action: "BATCH",
                    id,
                    cron: cronExpression,
                }));
            }
            else
                reject("Socket not connected");
        });
    }
    // Add to batch
    addToBatch(key, data) {
        return new Promise((resolve, reject) => {
            if (__classPrivateFieldGet(this, _Kroncache_ws, "f")) {
                const id = (0, uuid_1.v4)();
                __classPrivateFieldGet(this, _Kroncache_bus, "f").once(id, (err) => {
                    err ? reject(err) : resolve();
                });
                __classPrivateFieldGet(this, _Kroncache_ws, "f").send(JSON.stringify({
                    key,
                    action: "ADD-BATCH",
                    data: JSON.stringify(data),
                    id,
                }));
            }
            else
                reject("Socket not connected");
        });
    }
    define(key, listener) {
        __classPrivateFieldGet(this, _Kroncache_bus, "f").addListener(key, listener);
    }
    // incr
    incr(key, value = 1) {
        return new Promise((resolve, reject) => {
            if (__classPrivateFieldGet(this, _Kroncache_ws, "f")) {
                const id = (0, uuid_1.v4)();
                __classPrivateFieldGet(this, _Kroncache_bus, "f").once(id, (err, data) => {
                    err ? reject(err) : resolve(data);
                });
                __classPrivateFieldGet(this, _Kroncache_ws, "f").send(JSON.stringify({
                    key,
                    action: "INCREMENT",
                    id,
                    data: JSON.stringify(value),
                }));
            }
            else
                reject("Socket not connected");
        });
    }
    // decr
    decr(key, value = 1) {
        return new Promise((resolve, reject) => {
            if (__classPrivateFieldGet(this, _Kroncache_ws, "f")) {
                const id = (0, uuid_1.v4)();
                __classPrivateFieldGet(this, _Kroncache_bus, "f").once(id, (err, data) => {
                    err ? reject(err) : resolve(data);
                });
                __classPrivateFieldGet(this, _Kroncache_ws, "f").send(JSON.stringify({
                    key,
                    action: "DECREMENT",
                    id,
                    data: JSON.stringify(value),
                }));
            }
            else
                reject("Socket not connected");
        });
    }
}
_Kroncache_ws = new WeakMap(), _Kroncache_bus = new WeakMap(), _Kroncache_disconnected = new WeakMap();
function parseTTL(ttl) {
    if (typeof ttl === "string") {
        return new Date(Date.now() + ms(ttl));
    }
    else if (typeof ttl === "number") {
        ttl = Number(ttl) * 1000;
        return new Date(Date.now() + ttl);
    }
    return ttl;
}
function parseJSON(d) {
    try {
        if (!d)
            return d;
        return JSON.parse(d);
    }
    catch (error) {
        return d;
    }
}
module.exports = Kroncache;
//# sourceMappingURL=index.js.map