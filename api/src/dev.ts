import express from "express";
import { fileURLToPath } from "node:url";
import app from "./index.js";

// Local development only. On Vercel, files in public/ are served by the CDN instead.
const port = Number(process.env.PORT ?? 4000);
const server = express();
server.use(express.static(fileURLToPath(new URL("../public", import.meta.url))));
server.use(app);
server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
