"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _ws, _bus;
const ms = require("ms");
const WebSocket = require("ws");
const events_1 = require("events");
const uuid_1 = require("uuid");
class Kroncache {
    constructor(config) {
        this.config = config;
        _ws.set(this, void 0);
        _bus.set(this, new events_1.EventEmitter());
    }
    connect() {
        return new Promise((resolve, reject) => {
            var _a;
            const port = ((_a = this.config) === null || _a === void 0 ? void 0 : _a.port) || 5093;
            const ws = (__classPrivateFieldSet(this, _ws, new WebSocket(`ws://localhost:${port}`)));
            ws.once("error", reject);
            ws.once("open", () => {
                resolve();
                ws.removeEventListener("error", reject);
                this.boot();
            });
        });
    }
    boot() {
        const ws = __classPrivateFieldGet(this, _ws);
        ws.addEventListener("error", (err) => {
            throw err;
        });
        ws.addEventListener("close", (err) => {
            const error = new Error("[Kroncache server close] " + err.reason);
            throw error;
        });
        ws.addEventListener("message", (payload) => {
            if (payload.type === "message") {
                const p = JSON.parse(payload.data);
                const data = parseJSON(p.data);
                if (p.action === "EXPIRED") {
                    __classPrivateFieldGet(this, _bus).emit("expired", { data, key: p.key });
                }
                else if (["CRON", "SCHEDULE"].includes(p.action)) {
                    __classPrivateFieldGet(this, _bus).emit(p.key, { data, key: p.key });
                }
                else {
                    __classPrivateFieldGet(this, _bus).emit(p.id, p.error, data);
                }
            }
        });
    }
    set(key, value, opt) {
        return new Promise((resolve, reject) => {
            let ttl = (opt === null || opt === void 0 ? void 0 : opt.ttl) || this.config.ttl;
            if (__classPrivateFieldGet(this, _ws)) {
                const id = uuid_1.v4();
                __classPrivateFieldGet(this, _bus).once(id, (err) => {
                    err ? reject(err) : resolve();
                });
                __classPrivateFieldGet(this, _ws).send(JSON.stringify({
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
    get(key) {
        return new Promise((resolve, reject) => {
            if (__classPrivateFieldGet(this, _ws)) {
                const id = uuid_1.v4();
                __classPrivateFieldGet(this, _ws).send(JSON.stringify({
                    key,
                    action: "GET",
                    id,
                }));
                __classPrivateFieldGet(this, _bus).once(id, (err, data) => {
                    resolve(err ? null : data);
                });
            }
            else
                reject("Socket not connected");
        });
    }
    keys() {
        return new Promise((resolve, reject) => {
            if (__classPrivateFieldGet(this, _ws)) {
                const id = uuid_1.v4();
                __classPrivateFieldGet(this, _ws).send(JSON.stringify({
                    action: "KEYS",
                    id,
                }));
                __classPrivateFieldGet(this, _bus).once(id, (err, data) => {
                    err ? reject(err) : resolve(data.filter(Boolean));
                });
            }
            else
                reject("Socket not connected");
        });
    }
    del(key) {
        return new Promise((resolve, reject) => {
            if (__classPrivateFieldGet(this, _ws)) {
                const id = uuid_1.v4();
                __classPrivateFieldGet(this, _ws).send(JSON.stringify({
                    action: "DELETE",
                    id,
                    key,
                }));
                __classPrivateFieldGet(this, _bus).once(id, (err) => {
                    resolve(!err);
                });
            }
            else
                reject("Socket not connected");
        });
    }
    reset() {
        return new Promise((resolve, reject) => {
            if (__classPrivateFieldGet(this, _ws)) {
                const id = uuid_1.v4();
                __classPrivateFieldGet(this, _ws).send(JSON.stringify({
                    action: "RESET",
                    id,
                }));
                __classPrivateFieldGet(this, _bus).once(id, (err) => {
                    err ? reject(err) : resolve();
                });
            }
            else
                reject("Socket not connected");
        });
    }
    addListener(event, listener) {
        __classPrivateFieldGet(this, _bus).addListener(event, listener);
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
            if (__classPrivateFieldGet(this, _ws)) {
                const id = uuid_1.v4();
                __classPrivateFieldGet(this, _bus).once(id, (err) => {
                    err ? reject(err) : resolve();
                });
                __classPrivateFieldGet(this, _ws).send(JSON.stringify({
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
    define(key, listener) {
        __classPrivateFieldGet(this, _bus).addListener(key, listener);
    }
}
_ws = new WeakMap(), _bus = new WeakMap();
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