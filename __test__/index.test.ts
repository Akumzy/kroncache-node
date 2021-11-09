import Kroncache from "../src"
//Write test for Kroncache with jest
describe("Kroncache", () => {
  let kc: Kroncache
  beforeAll(() => {
    kc = new Kroncache({ ttl: "2 hours" })
    kc.addListener("error", (err) => {
      console.error(err)
    })
  })
  afterAll(() => {
    kc.disconnect()
  })
  it("should connect to Kroncache server", async () => {
    const res = await kc.connect()
    expect(res).toBeTruthy()
  })
  it("should set a key", async () => {
    const res = await kc.set("test", "test")
    expect(res).toBeTruthy()
  })
  it("should get value based on key", async () => {
    const res = await kc.get("test")
    expect(res).toEqual("test")
  })
  it("should delete key", async () => {
    const res = await kc.del("test")
    expect(res).toBeTruthy()
  })
  it("should return null if key does not exist", async () => {
    const res = await kc.get("test")
    expect(res).toBeNull()
  })
  it("should set a key with ttl", async () => {
    const res = await kc.set("test", "test", { ttl: "1 hours" })
    expect(res).toBeTruthy()
  })
  it("should get value based on key with ttl", async () => {
    const res = await kc.get("test")
    expect(res).toEqual("test")
  })
  it("should delete key with ttl", async () => {
    const res = await kc.del("test")
    expect(res).toBeTruthy()
  })
  it("should throw error is record does not exist when kc.incr is called", async () => {
    await kc.del("test-incr")
    await expect(kc.incr("test-incr")).rejects.toEqual("No data found for this key")
  })
  it("should throw error is record does not exist when kc.decr is called", async () => {
    await expect(kc.decr("test-decr")).rejects.toEqual("No data found for this key")
  })
  it("should increment value", async () => {
    await kc.set("test-incr", 1)
    const res = await kc.incr("test-incr")
    expect(res).toEqual(2)
  })
  it("should decrement value", async () => {
    const res = await kc.decr("test-incr")
    expect(res).toEqual(1)
  })
})
