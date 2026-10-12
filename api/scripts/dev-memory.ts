import { fileURLToPath } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";

// Reuse the MongoDB binary the tests already downloaded, whatever folder this is started from.
process.env.MONGOMS_DOWNLOAD_DIR ??= fileURLToPath(new URL("../node_modules/.cache/mongodb-memory-server", import.meta.url));

// Local development without Atlas: starts a throwaway MongoDB, then the normal dev server.
const mongo = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongo.getUri("analytics");
console.log("In-memory MongoDB ready (data is lost when you stop the server).");
await import("../src/dev.js");

const stop = async () => {
  await mongo.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
