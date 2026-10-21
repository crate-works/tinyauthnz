import sqlite from "node:sqlite";

const database = new sqlite.DatabaseSync("db.sqlite");

// Migration stuff
export function migrate() {
  const user_version = database.prepare("PRAGMA user_version").get()?.user_version

  if (!(typeof user_version === "number")) {
    throw new Error("database did not respond to `PRAGMA user_version`; this shouldn't be possible")
  }

  switch (user_version) {
    case 0:
      database.prepare("PRAGMA user_version = 1").get()
      console.log('updated to version one')
    default:
      console.log('migration finished')
  }
}

// TODO: add stuff about migration and validation
export default database;
