# kroncache-node

kroncache-node is a cache manager and job scheduling [kroncache](https://github.com/Akumzy/kroncache) client for Node.js

**Do know that [kroncache](https://github.com/Akumzy/kroncache) is still under development**

# Installation

Setup [kroncache](https://github.com/Akumzy/kroncache) server

```sh
npm install kroncache
```

# Usage

```js
const Kroncache = require("kroncache");

async function main() {
  try {
    const kron = new Kroncache({ ttl: 20 });
    await kron.connect();
    // Save records
    // set the ttl to 2 minutes and set the ack to true to notify once it expired
    await kron.set("LOKI", { name: "me" }, { ttl: "2 minutes", ack: true });

    // Save a record which will expires after the default 20 seconds ttl and it will not notify
    await kron.set("AKUMA", [{ name: "me" }, { name: "Akuma" }]);

    // Retrieve record
    let data = await kron.get("AKUMA");
    console.log(data.name);

    // Retrieve records keys
    let keys = await kron.keys();
    console.log(keys);

    // Reset/purge database
    // await kron.reset();

    // Listen for expired/elapsed records
    kron.addListener("expired", (payload) => {
      console.log("Expired: ", payload);
      //Expired:  { data: { name: 'me' }, key: 'LOKI' }
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
  } catch (error) {
    console.log({ error });
  }
}
main();
```
