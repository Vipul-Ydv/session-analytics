import { MongoMemoryServer } from "mongodb-memory-server";

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
