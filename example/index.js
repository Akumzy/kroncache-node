const Kroncache = require("../lib");

async function main() {
  try {
    const kron = new Kroncache({ ttl: 20 });
    await kron.connect();
    // Subscribe to expired event
    kron.addListener("expired", async (d) => {
      console.log("Expired: ", d);
      //Expired:  { data: { name: 'me' }, key: 'LOKI' }
      await kron.del(d.key);
    });

    // Define jobs
    kron.define("cron directive expression", (payload) => {
      console.log(payload);
    });
    kron.define("cron expression", (payload) => {
      console.log(payload);
    });
    kron.define("scheduler", (payload) => {
      console.log(payload);
    });
    await kron.cron("cron directive expression", "@every 2s");

    await kron.cron("cron expression", "* * * * *");

    let sixSeconds = new Date(Date.now() + 6000);
    await kron.schedule("scheduler", sixSeconds, { expire: sixSeconds });
    
    // Reset database
    // await kron.reset();
  } catch (error) {
    console.log({ error });
  }
}

main();
