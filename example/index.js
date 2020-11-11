const Kroncache = require("../lib");

async function main() {
  try {
    const kron = new Kroncache();
    await kron.connect();
    let all = await kron.getAll();
    await kron.purgeAll()
    console.log(all.length)
    for (const p of all) {
      console.log(p.key)
      await kron.delete(p.key);
    }
     all = await kron.getAll();
    console.table(all.length);
    // console.log("Purged");
    kron.addListener("expired", (d) => {
      console.log("Expired: ", d);
    });
    console.time("SET MILLION");
    // for (let index = 0; index < 1000000; index++) {
    //   try {
    //     let num = index;
    //     let key = `akuma_${index}`;
    //     console.log(num);
    //     console.log(key);
    //     kron.set({ key, expire: `${num} seconds`, data: index });
    //   } catch (error) {
    //     console.log(error);
    //   }
    // }
    console.timeEnd("SET MILLION");

    console.log("connected");
  } catch (error) {
    console.log({ error });
  }
}
main();
