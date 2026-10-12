import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll } from "vitest";

/** Starts an in-memory MongoDB for the test file and clears it between tests. */
export function useTestDb() {
  let mongo: MongoMemoryServer;
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });
  afterEach(async () => {
    await mongoose.connection.db?.dropDatabase();
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });
}
