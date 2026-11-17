// This file contains the function for opening/creating the sqlite database.

const { DatabaseSync } = require("node:sqlite");
const { readFileSync, mkdirSync } = require("node:fs");
const path = require("node:path");

const projectDir = path.join(__dirname, "..");
const sqlDir = path.join(projectDir, "database");
const defaultPath = path.join(projectDir, "data", "line_dance_dj.db");

function openDatabase(filename = process.env.DB_PATH || defaultPath) {
  if (filename !== ":memory:") {
    mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  }

  const db = new DatabaseSync(filename);

  function runSqlFile(file) {
    db.exec(readFileSync(path.join(sqlDir, file), "utf8"));
  }

  try {
    db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");

    const initialized = db
      .prepare(
        `
      SELECT 1 FROM sqlite_schema
      WHERE type = 'table' AND name = 'UserProfile'
    `,
      )
      .get();

    if (!initialized) {
      const existingTable = db
        .prepare(
          `
        SELECT name FROM sqlite_schema
        WHERE type = 'table' AND name NOT GLOB 'sqlite_*'
        LIMIT 1
      `,
        )
        .get();

      if (existingTable) {
        throw new Error(
          "Choose an empty database or an existing Line Dance DJ database.",
        );
      }

      runSqlFile("schema.sql");
      runSqlFile("insert_data.sql");
    }

    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

module.exports = { openDatabase, defaultPath };
