import ms = require("ms")
import WebSocket = require("ws")
import { EventEmitter } from "events"
import { v4 } from "uuid"

type MessagePayload = {
  action: "SET" | "RESPONSE" | "EXPIRED" | "KEYS" | "RESET" | "DELETE" | "CRON" | "SCHEDULE" | "BATCH" | "ADD-BATCH"
  data?: string
  error?: string
  key: string
  ttl: string
  id: string
}
type SetConfig = {
  /**number in seconds or string https://github.com/vercel/ms#readme*/
  ttl: number | string | Date
  /**Set to true if you need to be notified once TTL elapsed
   * and by setting to true you'll need to delete the record manually*/
  ack?: boolean
  cron?: string
}

type KroncacheConfig = { port?: number; ttl: number | string; ack?: boolean; host?: string }
type ExpiredPayload = { data: any; key: string }

class Kroncache {
  #ws!: WebSocket
  #bus = new EventEmitter()
  #disconnected = false
  constructor(private config: KroncacheConfig) {}
  connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const port = this.config?.port || 5093
      const host = this.config?.host || "localhost"
      const ws = (this.#ws = new WebSocket(`ws://${host}:${port}`))
      ws.once("error", reject)
      ws.once("open", () => {
        resolve(true)
        this.#disconnected = false
        ws.removeEventListener("error", reject)
        this.boot()
      })
    })
  }
  disconnect() {
    if (this.#ws) {
      this.#ws.close()
      this.#disconnected = true
    }
  }
  private boot() {
    const ws = this.#ws
    const ths = this
    ws.addEventListener("error", (err) => {
      if (!ths.#disconnected) {
        ths.#bus.emit("error", err)
      }
    })
    ws.addEventListener("close", (err) => {
      if (!ths.#disconnected) {
        const error = new Error("[Kroncache server close] " + err.reason)
        ths.#bus.emit("error", error)
      }
    })
    ws.addEventListener("message", (payload) => {
      if (payload.type === "message") {
        const p: MessagePayload = JSON.parse(payload.data)
        let data = parseJSON(p.data)

        if (p.action === "EXPIRED") {
          this.#bus.emit("expired", { data, key: p.key })
        } else if (["CRON", "SCHEDULE", "BATCH"].includes(p.action)) {
          if (p.action === "BATCH") {
            // For some unknown reason, empty strings are added to the data array
            data = data.filter(Boolean).map((v: string) => JSON.parse(v))
          }
          this.#bus.emit(p.key, { data, key: p.key })
        } else {
          this.#bus.emit(p.id, p.error, data)
        }
      }
    })
  }

  set(key: string, value: any, opt?: SetConfig) {
    return new Promise<boolean>((resolve, reject) => {
      let ttl = opt?.ttl || this.config.ttl
      if (this.#ws) {
        const id = v4()
        this.#bus.once(id, (err) => {
          err ? reject(err) : resolve(true)
        })
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
        )
      } else reject("Socket not connected")
    })
  }

  get<T = any>(opt: string | { regex: string }) {
    return new Promise<T>((resolve, reject) => {
      if (this.#ws) {
        const id = v4()
        const query: { [key: string]: any } = {
          action: "GET",
          id,
        }
        if (typeof opt === "string") {
          query.key = opt
        } else {
          query.regex = opt.regex
        }
        this.#ws.send(JSON.stringify(query))
        this.#bus.once(id, (err, data) => {
          resolve(err ? null : Array.isArray(data) ? data.filter(Boolean).map((v) => JSON.parse(v)) : data)
        })
      } else reject("Socket not connected")
    })
  }

  keys() {
    return new Promise<string[]>((resolve, reject) => {
      if (this.#ws) {
        const id = v4()
        this.#ws.send(
          JSON.stringify({
            action: "KEYS",
            id,
          }),
        )
        this.#bus.once(id, (err, data) => {
          err ? reject(err) : resolve(data.filter(Boolean))
        })
      } else reject("Socket not connected")
    })
  }

  del(key: string) {
    return new Promise<boolean>((resolve, reject) => {
      if (this.#ws) {
        const id = v4()
        this.#ws.send(
          JSON.stringify({
            action: "DELETE",
            id,
            key,
          }),
        )
        this.#bus.once(id, (err) => {
          resolve(!err)
        })
      } else reject("Socket not connected")
    })
  }
  reset() {
    return new Promise<void>((resolve, reject) => {
      if (this.#ws) {
        const id = v4()
        this.#ws.send(
          JSON.stringify({
            action: "RESET",
            id,
          }),
        )
        this.#bus.once(id, (err) => {
          err ? reject(err) : resolve()
        })
      } else reject("Socket not connected")
    })
  }
  addListener(event: "expired" | "error", listener: (payload: ExpiredPayload) => void) {
    this.#bus.addListener(event, listener)
  }

  cron(key: string, expression: string, data: any = null) {
    if (typeof expression !== "string") {
      throw new Error(
        "expression must be a valid cron expression, visit https://pkg.go.dev/gopkg.in/robfig/cron.v3 for more information.",
      )
    }
    return this.set(key, data, { cron: expression, ttl: 0 })
  }
  /**
   * Schedule a defined job
   */
  schedule(key: string, time: string | number | Date, data: any = null) {
    return new Promise<void>((resolve, reject) => {
      if (this.#ws) {
        const id = v4()
        this.#bus.once(id, (err) => {
          err ? reject(err) : resolve()
        })
        this.#ws.send(
          JSON.stringify({
            key,
            action: "SCHEDULE",
            data: JSON.stringify(data),
            id,
            ttl: parseTTL(time),
            ack: true,
          }),
        )
      } else reject("Socket not connected")
    })
  }
  // Define a batch schudule
  scheduleBatch(key: string, /**time e**/ cronExpression: string) {
    return new Promise<void>((resolve, reject) => {
      if (this.#ws) {
        const id = v4()
        this.#bus.once(id, (err) => {
          err ? reject(err) : resolve()
        })
        this.#ws.send(
          JSON.stringify({
            key,
            action: "BATCH",
            id,
            cron: cronExpression,
          }),
        )
      } else reject("Socket not connected")
    })
  }
  // Add to batch
  addToBatch(key: string, data: any) {
    return new Promise<void>((resolve, reject) => {
      if (this.#ws) {
        const id = v4()
        this.#bus.once(id, (err) => {
          err ? reject(err) : resolve()
        })
        this.#ws.send(
          JSON.stringify({
            key,
            action: "ADD-BATCH",
            data: JSON.stringify(data),
            id,
          }),
        )
      } else reject("Socket not connected")
    })
  }
  define(key: string, listener: (payload: ExpiredPayload) => void) {
    this.#bus.addListener(key, listener)
  }
  // incr
  incr(key: string, value: number = 1) {
    return new Promise<number>((resolve, reject) => {
      if (this.#ws) {
        const id = v4()
        this.#bus.once(id, (err, data) => {
          err ? reject(err) : resolve(data)
        })
        this.#ws.send(
          JSON.stringify({
            key,
            action: "INCREMENT",
            id,
            data: JSON.stringify(value),
          }),
        )
      } else reject("Socket not connected")
    })
  }
  // decr
  decr(key: string, value: number = 1) {
    return new Promise<number>((resolve, reject) => {
      if (this.#ws) {
        const id = v4()
        this.#bus.once(id, (err, data) => {
          err ? reject(err) : resolve(data)
        })
        this.#ws.send(
          JSON.stringify({
            key,
            action: "DECREMENT",
            id,
            data: JSON.stringify(value),
          }),
        )
      } else reject("Socket not connected")
    })
  }
}

function parseTTL(ttl: number | string | Date) {
  if (typeof ttl === "string") {
    return new Date(Date.now() + ms(ttl))
  } else if (typeof ttl === "number") {
    ttl = Number(ttl) * 1000
    return new Date(Date.now() + ttl)
  }
  return ttl
}
function parseJSON(d: string | undefined) {
  try {
    if (!d) return d
    return JSON.parse(d)
  } catch (error) {
    return d
  }
}

export = Kroncache
