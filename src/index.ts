import ms from "ms";
import * as WebSocket from "ws";
import { EventEmitter } from "events";
import { v4 } from "uuid";

type MessagePayload = {
  action: "SET" | "RESPONSE" | "EXPIRED";
  data?: string;
  error?: string;
  key: string;
  expire: string;
  id: string;
};
type SetOption = {
  key: string;
  expire: number | string;
  data: any;
};
class Kroncache extends EventEmitter {
  #ws!: WebSocket;
  constructor(private config?: { port?: number }) {
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
        let data = null;
        if (p.data) {
          data = JSON.parse(p.data);
          data = data.value;
        }
        if (p.action === "EXPIRED") {
          this.emit("expired", { data, expire: p.expire, key: p.key });
        } else {
          this.emit(p.id, p.error, data);
        }
      }
    });
  }
  set(opt: SetOption) {
    return new Promise((resolve, reject) => {
      let { key, expire, data } = opt;
      if (this.#ws) {
        if (typeof expire === "string") {
          expire = ms(expire);
        }
        let date = new Date(Date.now() + expire);
        const id = v4();
        /**@todo put a timeout */
        this.once(id, (err) => {
          err ? reject(err) : resolve();
        });
        this.#ws.send(
          JSON.stringify({
            key,
            action: "SET",
            data: JSON.stringify({ value: data }),
            id,
            expire: date,
          }),
        );
      } else reject("Socket not connected");
    });
  }

  get(key: string) {
    return new Promise((resolve, reject) => {
      if (this.#ws) {
        const id = v4();
        this.#ws.send(
          JSON.stringify({
            key,
            action: "GET",
            id,
          }),
        );
        /**@todo put a timeout */

        this.once(id, (err, data) => {
          err ? reject(err) : resolve(data);
        });
      } else reject("Socket not connected");
    });
  }

  purgeAll() {
    return new Promise((resolve, reject) => {
      if (this.#ws) {
        const id = v4();
        this.#ws.send(
          JSON.stringify({
            action: "PURGE",
            id,
          }),
        );
        /**@todo put a timeout */

        this.once(id, (err) => {
          err ? reject(err) : resolve();
        });
      } else reject("Socket not connected");
    });
  }
}

export = Kroncache;
