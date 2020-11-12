const Kroncache = require("../lib");

async function main() {
  try {
    const kron = new Kroncache({ ttl: 20 });
    await kron.connect();
    // Save records
    // set the ttl to 2 minutes and set the ack to true to notify once it expired
    await kron.set("LOKI", { name: "me" }, { ttl: "2 minutes", ack: true });
    // Save a record which will expires after the default 20 seconds ttl and it will not notify
    await kron.set("AKUMA", [{ name: "me" }, { name: "Akuma" }]);
    // Retrieve with the right key
    let data = await kron.get("AKUMA2");
    console.log(data);
    // Retrieve with the wrong key
    data = await kron.get("LOKI");
    console.log(data);
    data & console.log(data.name);
    let res = await kron.del("WRONG");
    console.log(res);
    // Retrieve recors keys
    let keys = await kron.keys();
    console.log(keys);
    // Reset database
    await kron.reset();
     keys = await kron.keys();
    console.log(keys)
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
