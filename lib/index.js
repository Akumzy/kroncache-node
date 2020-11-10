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
                let data = null;
                if (p.data) {
                    data = JSON.parse(p.data);
                    data = data.value;
                }
                if (p.action === "EXPIRED") {
                    this.emit("expired", { data, expire: p.expire, key: p.key });
                }
                else {
                    this.emit(p.id, p.error, data);
                }
            }
        });
    }
    set(opt) {
        return new Promise((resolve, reject) => {
            let { key, expire, data } = opt;
            if (__classPrivateFieldGet(this, _ws)) {
                if (typeof expire === "string") {
                    expire = ms_1.default(expire);
                }
                let date = new Date(Date.now() + expire);
                const id = uuid_1.v4();
                /**@todo put a timeout */
                this.once(id, (err) => {
                    err ? reject(err) : resolve();
                });
                __classPrivateFieldGet(this, _ws).send(JSON.stringify({
                    key,
                    action: "SET",
                    data: JSON.stringify({ value: data }),
                    id,
                    expire: date,
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
                /**@todo put a timeout */
                this.once(id, (err, data) => {
                    err ? reject(err) : resolve(data);
                });
            }
            else
                reject("Socket not connected");
        });
    }
    purgeAll() {
        return new Promise((resolve, reject) => {
            if (__classPrivateFieldGet(this, _ws)) {
                const id = uuid_1.v4();
                __classPrivateFieldGet(this, _ws).send(JSON.stringify({
                    action: "PURGE",
                    id,
                }));
                /**@todo put a timeout */
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
module.exports = Kroncache;
//# sourceMappingURL=index.js.map