import ms = require("ms");
import WebSocket = require("ws");
import { EventEmitter } from "events";
import { v4 } from "uuid";

type MessagePayload = {
  action:
    | "SET"
    | "RESPONSE"
    | "EXPIRED"
    | "KEYS"
    | "RESET"
    | "DELETE"
    | "CRON"
    | "SCHEDULE";
  data?: string;
  error?: string;
  key: string;
  ttl: string;
  id: string;
};
type SetConfig = {
  /**number in seconds or string https://github.com/vercel/ms#readme*/
  ttl: number | string | Date;
  /**Set to true if you need to be notified once TTL elapsed
   * and by setting to true you'll need to delete the record manually*/
  ack?: boolean;
  cron?: string;
};

type KroncacheConfig = { port?: number; ttl: number | string; ack?: boolean };
type ExpiredPayload = { data: any; key: string };

class Kroncache {
  #ws!: WebSocket;
  #bus = new EventEmitter();
  constructor(private config: KroncacheConfig) {}
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
          this.#bus.emit("expired", { data, key: p.key });
        } else if (["CRON", "SCHEDULE"].includes(p.action)) {
          this.#bus.emit(p.key, { data, key: p.key });
        } else {
          this.#bus.emit(p.id, p.error, data);
        }
      }
    });
  }

  set(key: string, value: any, opt?: SetConfig) {
    return new Promise<void>((resolve, reject) => {
      let ttl = opt?.ttl || this.config.ttl;
      if (this.#ws) {
        const id = v4();
        this.#bus.once(id, (err) => {
          err ? reject(err) : resolve();
        });
        this.#ws.send(
          JSON.stringify({
            key,
            action: "SET",
            data: JSON.stringify(value),
            id,
            ttl: parseTTL(ttl),
            ack: opt?.ack || this.config.ack,
            cron: opt?.cron,
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
        this.#bus.once(id, (err, data) => {
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
        this.#bus.once(id, (err, data) => {
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
        this.#bus.once(id, (err) => {
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
        this.#bus.once(id, (err) => {
          err ? reject(err) : resolve();
        });
      } else reject("Socket not connected");
    });
  }
  addListener(event: "expired", listener: (payload: ExpiredPayload) => void) {
    this.#bus.addListener(event, listener);
  }

  cron(key: string, expression: string, data: any = null) {
    if (typeof expression !== "string") {
      throw new Error(
        "expression must be a valid cron expression, visit https://pkg.go.dev/gopkg.in/robfig/cron.v3 for more information.",
      );
    }
    return this.set(key, data, { cron: expression, ttl: 0 });
  }
  /**
   * Schedule a defined job
   */
  schedule(key: string, time: string | number | Date, data: any = null) {
    return new Promise<void>((resolve, reject) => {
      if (this.#ws) {
        const id = v4();
        this.#bus.once(id, (err) => {
          err ? reject(err) : resolve();
        });
        this.#ws.send(
          JSON.stringify({
            key,
            action: "SCHEDULE",
            data: JSON.stringify(data),
            id,
            ttl: parseTTL(time),
            ack: true,
          }),
        );
      } else reject("Socket not connected");
    });
  }
  define(key: string, listener: (payload: ExpiredPayload) => void) {
    this.#bus.addListener(key, listener);
  }
}

function parseTTL(ttl: number | string | Date) {
  if (typeof ttl === "string") {
    return new Date(Date.now() + ms(ttl));
  } else if (typeof ttl === "number") {
    ttl = Number(ttl) * 1000;
    return new Date(Date.now() + ttl);
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
