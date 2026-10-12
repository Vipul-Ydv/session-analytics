import express from "express";
import app from "./index.js";

// Local development only. On Vercel, files in public/ are served by the CDN instead.
const port = Number(process.env.PORT ?? 4000);
const server = express();
server.use(express.static("public"));
server.use(app);
server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
