const Redis = require("ioredis");
const fs = require("fs");

const redis = new Redis();

const luaScript = fs.readFileSync(__dirname + "/delete_keys.lua", "utf-8");

async function deleteKeysNotStartingWithUser() {
  let cursor = "0";
  const count = "1000"; // You can adjust this number based on your needs
  do {
    cursor = await redis.eval(luaScript, 0, cursor, count);
  } while (cursor !== "0");

  console.log('Finished deleting keys not starting with "user:"');
  redis.disconnect();
}

deleteKeysNotStartingWithUser().catch((err) => {
  console.error("Error occurred:", err);
  redis.disconnect();
});
