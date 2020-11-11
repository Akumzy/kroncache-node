# kroncache-node

kroncache-node is [kroncache](https://github.com/Akumzy/kroncache) client

**Do know that [kroncache](https://github.com/Akumzy/kroncache) its still under development**

# Installation

```sh
npm install kroncache
```

Download [kroncache](https://github.com/Akumzy/kroncache) server from [here](https://github.com/Akumzy/kroncache) and start run it with your favorite process manager

example pm2

```sh
$ cd ./kroncache

$ pm2 start kroncache

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
    // Retrieve recors keys
    let keys = await kron.keys();
    console.log(keys);
    // Reset database
    await kron.reset();
    // Listen for expired/elapsed records
    kron.addListener("expired", (d) => {
      console.log("Expired: ", d);
      //Expired:  { data: { name: 'me' }, key: 'LOKI' }
    });
  } catch (error) {
    console.log({ error });
  }
}
main();
```
