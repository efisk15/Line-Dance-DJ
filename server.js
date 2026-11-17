// This file opens the database the injects all the api endpoints from src/app.js

const { openDatabase } = require("./src/database");
const { createApp } = require("./src/app");
const { parseArgs } = require("node:util");

const { values } = parseArgs({
  options: {
    port: { type: "string" },
    host: { type: "string" },
    strictPort: { type: "boolean" },
  },
});

const port = Number(values.port || process.env.PORT || 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be between 1 and 65535.");

const db = openDatabase();

// I have put all of the endpoints in the src/app.js file and am calling them with createApp()
// to keep this server.js file clean.
const server = createApp(db).listen(port, values.host || "127.0.0.1", () => {
  console.log(`Line Dance DJ is running at http://localhost:${port}`);
});

server.on("error", (error) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `Port ${port} is already in use. Set PORT to another port.`
      : error.message,
  );
  db.close();
  process.exitCode = 1;
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
