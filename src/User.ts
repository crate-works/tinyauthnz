import * as z from "zod";
import bcrypt from "bcrypt";

import database from "./database";
import {ApplicationType} from "./Application";

const schema = z.object({
  id: z.number(),
  is_admin: z.number().transform(value => {
    if (value === 1) {
      return true
    } else {
      return false
    }
  }),
  username: z.string(),
  full_name: z.string(),
  applications: z.array(z.object<ApplicationType>()).optional()
});

export type UserType = z.infer<typeof schema>;

function all() {
  return z.array(schema).parse(database
    .prepare(
      `
    SELECT * from users
  `,
    )
    .all());
}

function create(username: string, full_name: string) {
  return database
    .prepare(
      `
    INSERT INTO users (username, full_name) VALUES (?, ?)
  `,
    )
    .run(username, full_name);
}

function byId(id: string | number | bigint) {
  return schema.parse(
    database
      .prepare(
        `
    SELECT * from users
    WHERE id = ?
  `,
      )
      .get(id),
  );
}

function byUsername(username: string) {
  return schema.parse(
    database
      .prepare(
        `
    SELECT * from users
    WHERE username = ?
  `,
      )
      .get(username),
  );
}

function licences(userId: string) {
  const schema = z.array(
    z.object({
      id: z.number(),
      uri: z.string(),
      name: z.string(),
    }),
  );

  return schema.parse(
    database
      .prepare(
        `
      SELECT * FROM users_licences ul
      JOIN licences l ON ul.licence_id = l.id
      WHERE ul.user_id = ?
    `,
      )
      .all(userId),
  );
}


function applications(userId: string) {
  const schema = z.array(
    z.object({
      id: z.number(),
      user_id: z.number(),
      text: z.string().nullable(),
      name: z.string(),
      uri: z.string(),
    }),
  );

  return schema.parse(
    database
      .prepare(
        `
      SELECT * FROM applications a
      JOIN licences l ON a.licence_id = l.id
      WHERE a.user_id = ?
    `,
      )
      .all(userId),
  );
}

async function authenticate(username: string, password: string) {
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

export default {
  all,
  create,
  byId,
  byUsername,
  licences,
  applications,
  schema,
  authenticate,
};
