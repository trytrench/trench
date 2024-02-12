import { createRedisService } from "databases";
import fs from "fs";

const redis = createRedisService();

const luaScript = fs.readFileSync("./delete_keys.lua", "utf-8");

async function deleteKeysNotStartingWithUser() {
  let cursor = "0";
  const count = "1000"; // You can adjust this number based on your needs
  do {
    cursor = await redis.conn.eval(luaScript, 0, cursor, count);
  } while (cursor !== "0");

  console.log('Finished deleting keys not starting with "user:"');
  redis.conn.disconnect();
}

deleteKeysNotStartingWithUser().catch((err) => {
  console.error("Error occurred:", err);
  redis.conn.disconnect();
});
