// TODO: move migrations to database.ts and let Application/User/Licence handle the database access
import Koa from "koa";

import sqlite from "node:sqlite";
import bcrypt from "bcrypt";

const saltRounds = 10;

export const database = new sqlite.DatabaseSync("db.sqlite");

export async function init(createDB = false) {
  if (createDB) {
    for (const table of ["users", "users_licences", "licences", "oidc", "applications"]) {
      database.exec(`DROP TABLE IF EXISTS ${table}`);
    }
    database.exec(`
        CREATE TABLE users(
          id INTEGER PRIMARY KEY,
          username TEXT,
          full_name TEXT,
          password TEXT
        ) STRICT
      `);
    database.exec(`
        CREATE TABLE users_licences(
          id INTEGER PRIMARY KEY,
          user_id TEXT,
          licence_id TEXT
        ) STRICT
      `);
    database.exec(`
        CREATE TABLE licences(
          id INTEGER PRIMARY KEY,
          uri TEXT,
          name TEXT
        ) STRICT
      `);
    database.exec(`
        CREATE TABLE applications(
          id INTEGER PRIMARY KEY,
          licence_id TEXT,
          user_id TEXT
        ) STRICT
      `);
    database.exec(`
        CREATE TABLE oidc(
          id TEXT PRIMARY KEY,
          payload TEXT
        ) STRICT
      `);
    const insert = database.prepare(
      "INSERT INTO users (username, full_name, password) VALUES (?, ?, ?)",
    );
    const hash = await bcrypt.hash("admin", saltRounds);

    insert.run("admin", "River Smith", hash);
    database
      .prepare(
        `INSERT INTO licences (uri, name) VALUES ('https://example.org/licence_a.pdf', 'Sample Licence A')`,
      )
      .run();
    database
      .prepare(`INSERT INTO users_licences (user_id, licence_id) VALUES (1, 1)`)
      .run();
  }
}

export async function user_authenticate(username: string, password: string) {
  const query = database.prepare(
    "SELECT password FROM users WHERE username = ?",
  );

  const users = query.all(username);

  if (users.length > 1) {
    throw new Error(`More than 1 '${username}' user found`);
  }
  if (users.length < 1) {
    throw new Error(`User '${username}' not found`);
  }

  if (typeof users[0].password === "string") {
    return bcrypt.compare(password, users[0].password);
  } else {
    return false;
  }
}

export function findAccount(ctx: Koa.Context, id: string) {
  if (id) {
    // return database.prepare(`SELECT username FROM users`).get()
    const query = database.prepare(
      "SELECT username FROM users WHERE username = ?",
    );
    const result = query.get(id);

    if (!result) {
      throw new Error("account not found");
    }

    return {
      accountId: result.username,
      async claims() {
        return { sub: result.username };
      },
    };
  } else {
    return {};
  }
}

export function listAccounts() {
  return database.prepare(`SELECT * from users u`).all();
}

export function createUser(username: string, full_name: string) {
  return database
    .prepare(
      `
    INSERT INTO users (username, full_name) VALUES (?, ?)
  `,
    )
    .run(username, full_name);
}

export function deleteUser(userId: string) {
  return database
    .prepare(
      `
    DELETE FROM users WHERE id = ?
  `,
    )
    .run(userId);
}

export function getLicencesForUser(userId: string) {
  return database
    .prepare(
      `
    SELECT l.uri FROM users_licences ul
    JOIN licences l ON ul.licenceId = l.id
    WHERE ul.id = ?
  `,
    )
    .all(userId)
    .map((licence) => ({ uri: licence.uri, name: licence.name }));
}

export function getUser(userId: string) {
  return database
    .prepare(
      `
    SELECT * from users
    WHERE id = ?
  `,
    )
    .get(userId);
}
