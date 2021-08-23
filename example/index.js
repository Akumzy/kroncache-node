const Kroncache = require("../lib")

async function main() {
  try {
    const kron = new Kroncache({ ttl: 20 })
    await kron.connect()
    // Subscribe to expired event
    kron.addListener("expired", async (d) => {
      console.log("Expired: ", d)
      //Expired:  { data: { name: 'me' }, key: 'LOKI' }
      await kron.del(d.key)
    })
    let reg = await kron.del("batch:no")
    const notyBatchKey = "batch:no"
    kron.define(notyBatchKey, (p) => {
      console.log(p)
    })
    // emit batched notifictions every 5 seconds
    await kron.scheduleBatch(notyBatchKey, "@every 5s")
    setInterval(() => {
      kron.addToBatch(notyBatchKey, { date: new Date() })
    }, 1000)
    // Define jobs
    kron.define("cron directive expression", (payload) => {
      console.log(payload)
    })
    // kron.define("cron expression", (payload) => {
    //   console.log(payload);
    // });
    // kron.define("scheduler", (payload) => {
    //   console.log(payload);
    // });
    // await kron.cron("cron directive expression", "@every 2s");

    // await kron.cron("cron expression", "* * * * *");

    // let sixSeconds = new Date(Date.now() + 6000);
    // await kron.schedule("scheduler", sixSeconds, { expire: sixSeconds });

    // Reset database
    // await kron.reset();
  } catch (error) {
    console.log({ error })
  }
}

main()
