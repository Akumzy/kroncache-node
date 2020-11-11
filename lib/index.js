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
var _ws;
const ms_1 = require("ms");
const WebSocket = require("ws");
const events_1 = require("events");
const uuid_1 = require("uuid");
class Kroncache extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        _ws.set(this, void 0);
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
                    this.emit("expired", { data, key: p.key });
                }
                else {
                    this.emit(p.id, p.error, data);
                }
            }
        });
    }
    set(key, value, opt) {
        return new Promise((resolve, reject) => {
            let ttl = (opt === null || opt === void 0 ? void 0 : opt.ttl) || this.config.ttl;
            if (__classPrivateFieldGet(this, _ws)) {
                const id = uuid_1.v4();
                this.once(id, (err) => {
                    err ? reject(err) : resolve();
                });
                __classPrivateFieldGet(this, _ws).send(JSON.stringify({
                    key,
                    action: "SET",
                    data: JSON.stringify(value),
                    id,
                    ttl: new Date(Date.now() + parseTTL(ttl)),
                    ack: (opt === null || opt === void 0 ? void 0 : opt.ack) || this.config.ack,
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
                this.once(id, (err, data) => {
                    err ? reject(err) : resolve(data);
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
                this.once(id, (err, data) => {
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
                this.once(id, (err) => {
                    err ? reject(err) : resolve();
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
                this.once(id, (err) => {
                    err ? reject(err) : resolve();
                });
            }
            else
                reject("Socket not connected");
        });
    }
}
_ws = new WeakMap();
function parseTTL(ttl) {
    if (typeof ttl === "string") {
        ttl = ms_1.default(ttl);
    }
    else {
        ttl = Number(ttl) * 1000;
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