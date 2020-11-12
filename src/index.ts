import ms = require("ms");
import WebSocket = require("ws");
import { EventEmitter } from "events";
import { v4 } from "uuid";

type MessagePayload = {
  action: "SET" | "RESPONSE" | "EXPIRED" | "KEYS" | "RESET" | "DELETE";
  data?: string;
  error?: string;
  key: string;
  ttl: string;
  id: string;
};
type SetConfig = {
  /**number in seconds or string https://github.com/vercel/ms#readme*/
  ttl?: number | string;
  ack?: boolean;
};

type KroncacheConfig = { port?: number; ttl: number | string; ack?: boolean };
class Kroncache extends EventEmitter {
  #ws!: WebSocket;
  constructor(private config: KroncacheConfig) {
    super();
  }
  connect() {
    return new Promise((resolve, reject) => {
      const port = this.config?.port || 5093;
      const ws = (this.#ws = new WebSocket(`ws://localhost:${port}`));
      ws.once("error", reject);
      ws.once("open", () => {
        resolve();
        ws.removeEventListener("error", reject);
        this.boot();
      });
    });
  }
  private boot() {
    const ws = this.#ws;
    ws.addEventListener("error", (err) => {
      throw err;
    });
    ws.addEventListener("close", (err) => {
      const error = new Error("[Kroncache server close] " + err.reason);
      throw error;
    });
    ws.addEventListener("message", (payload) => {
      if (payload.type === "message") {
        const p: MessagePayload = JSON.parse(payload.data);
        const data = parseJSON(p.data);
        if (p.action === "EXPIRED") {
          this.emit("expired", { data, key: p.key });
        } else {
          this.emit(p.id, p.error, data);
        }
      }
    });
  }
  set(key: string, value: any, opt?: SetConfig) {
    return new Promise<void>((resolve, reject) => {
      let ttl = opt?.ttl || this.config.ttl;
      if (this.#ws) {
        const id = v4();
        this.once(id, (err) => {
          err ? reject(err) : resolve();
        });
        this.#ws.send(
          JSON.stringify({
            key,
            action: "SET",
            data: JSON.stringify(value),
            id,
            ttl: new Date(Date.now() + parseTTL(ttl)),
            ack: opt?.ack || this.config.ack,
          }),
        );
      } else reject("Socket not connected");
    });
  }

  get<T = any>(key: string) {
    return new Promise<T>((resolve, reject) => {
      if (this.#ws) {
        const id = v4();
        this.#ws.send(
          JSON.stringify({
            key,
            action: "GET",
            id,
          }),
        );
        this.once(id, (err, data) => {
          resolve(err ? null : data);
        });
      } else reject("Socket not connected");
    });
  }
  keys() {
    return new Promise<string[]>((resolve, reject) => {
      if (this.#ws) {
        const id = v4();
        this.#ws.send(
          JSON.stringify({
            action: "KEYS",
            id,
          }),
        );
        this.once(id, (err, data) => {
          err ? reject(err) : resolve(data.filter(Boolean));
        });
      } else reject("Socket not connected");
    });
  }

  del(key: string) {
    return new Promise<boolean>((resolve, reject) => {
      if (this.#ws) {
        const id = v4();
        this.#ws.send(
          JSON.stringify({
            action: "DELETE",
            id,
            key,
          }),
        );
        this.once(id, (err) => {
          resolve(!err);
        });
      } else reject("Socket not connected");
    });
  }
  reset() {
    return new Promise<void>((resolve, reject) => {
      if (this.#ws) {
        const id = v4();
        this.#ws.send(
          JSON.stringify({
            action: "RESET",
            id,
          }),
        );
        this.once(id, (err) => {
          err ? reject(err) : resolve();
        });
      } else reject("Socket not connected");
    });
  }
}

function parseTTL(ttl: number | string) {
  if (typeof ttl === "string") {
    ttl = ms(ttl);
  } else {
    ttl = Number(ttl) * 1000;
  }
  return ttl;
}
function parseJSON(d: string | undefined) {
  try {
    if (!d) return d;
    return JSON.parse(d);
  } catch (error) {
    return d;
  }
}
export = Kroncache;
