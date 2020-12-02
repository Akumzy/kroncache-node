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
    // console.log(await kron.keys());
    // console.log(await kron.get("yo"));
    await kron.cron("yo", "@every 2s");
    let sixSeconds = new Date(Date.now() + 6000);
    console.log(sixSeconds)
    await kron.schedule("cool", sixSeconds, { expire: sixSeconds });
    // Reset database
    // await kron.reset();
    kron.define("yo", (p) => {
      console.log(p);
    });
    kron.define("cool", (p) => {
      console.log(p);
    });
  } catch (error) {
    console.log({ error });
  }
}

main();
