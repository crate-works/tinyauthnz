// TODO: remove this file in favour of database.ts
import Koa from "koa";

import sqlite from "node:sqlite";
import bcrypt from "bcrypt";

const saltRounds = 10;

export const database = new sqlite.DatabaseSync("db.sqlite");

for (const table of ["users", "users_licences", "licences", "applications", "oidc"]) {
  database.exec(`DROP TABLE IF EXISTS ${table}`);
}
database.exec(`
    CREATE TABLE users(
      id INTEGER PRIMARY KEY,
      username TEXT,
      full_name TEXT,
      password TEXT,
      is_admin INTEGER DEFAULT 0
    ) STRICT
  `);
database.exec(`
    CREATE TABLE users_licences(
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      licence_id INTEGER
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
      licence_id INTEGER,
      user_id INTEGER,
      text TEXT
    ) STRICT
  `);
  // TODO: we're not using this yet
database.exec(`
    CREATE TABLE oidc(
      id TEXT PRIMARY KEY,
      payload TEXT
    ) STRICT
  `);

async function newLicence(
  licence: {uri: string, name: string}
) {
  database.prepare(
    "INSERT INTO licences (uri, name) VALUES (?, ?)",
  ).run(licence.uri, licence.name);
}

type User = {username: string, plaintext_password: string, licences: number[], full_name: string, is_admin: number, applications?: {licence: number, text?: string}[]}

async function newUser(
  user: User
) {
  const hashed_password = await bcrypt.hash(user.plaintext_password, saltRounds);
  const { lastInsertRowid: user_id } = database.prepare(
    "INSERT INTO users (username, password, full_name, is_admin) VALUES (?, ?, ?, ?)",
  ).run(user.username, hashed_password, user.full_name, user.is_admin || 0);
  console.log(user_id)
  user.applications?.forEach(({licence, text}) => {
    database.prepare(
      "INSERT INTO applications (licence_id, user_id, text) VALUES (?, ?, ?)"
    ).run(licence, user_id, text || null);
  })
  user.licences.map(licence_id => {
    database.prepare(
      "INSERT INTO users_licences (user_id, licence_id) VALUES (?, ?)"
    ).run(user_id, licence_id)
  })
}

const licences = [
  {uri: "https://example.org/A", name: "Example Licence A"},
  {uri: "https://example.org/B", name: "Example Licence B"},
  {uri: "https://example.org/C", name: "Example Licence C"},
].map(newLicence)

const users = [
  {
    username: "admin@example.org",
    plaintext_password: "admin",
    full_name: "Administrator",
    is_admin: 1,
    licences: [1, 2, 3],
  },
  {
    username: "jlocke@example.org",
    plaintext_password: "jlocke",
    full_name: "John Locke",
    licences: [1],
    applications: [
      { licence: 1, text: "Pretty please" },
    ],
  },
  {
    username: "dhume@example.org",
    plaintext_password: "dhume",
    full_name: "David Hume",
    licences: [1, 2],
    applications: [
      { licence: 1, text: "I'd like to access this data." },
    ],
  },
  {
    username: "rdescartes@example.org",
    plaintext_password: "rdescartes",
    full_name: "Renée Descartes",
    licences: [1, 2, 3],
  },
  {
    username: "ikant@example.org",
    plaintext_password: "ikant",
    full_name: "Immanuel Kant",
    licences: [3],
    applications: [
      { licence: 1, text: "Plleeeeeaaasssse" },
      { licence: 2 }
    ],
  },
].map(newUser)