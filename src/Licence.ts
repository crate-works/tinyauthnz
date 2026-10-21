import { database } from "../authentication";
import * as z from "zod";
import User from "./User";

const schema = z.object({
  id: z.number(),
  uri: z.string(),
  name: z.string(),
});

export type LicenceType = z.infer<typeof schema>;

function byId(id: string | number | bigint) {
  return schema.optional().parse(
    database
      .prepare(
        `
      SELECT * from licences
      WHERE id = ?
    `,
      )
      .get(id),
  );
}
function byUri(uri: string) {
  return schema.optional().parse(
    database
      .prepare(
        `
      SELECT * from licences
      WHERE uri = ?
    `,
      )
      .get(uri),
  );
}

function users(licenceId: string) {
  const results = database
    .prepare(
      `
    SELECT u.* FROM users u
    RIGHT JOIN users_licences ul
    ON ul.user_id = u.id
    WHERE ul.licence_id = ?
  `,
    )
    .all(licenceId);
  return z.array(User.schema).parse(results);
}

function forUser(userId: string) {
  // TODO: handle auth
  return database
    .prepare(
      `
    SELECT * FROM users_licences ul
    JOIN licences l ON ul.licence_id = l.id
    WHERE ul.user_id = ?
  `,
    )
    .all(userId);
}

function deleteForUser(username: string, licenceId: string) {
  return database
    .prepare(
      `
    DELETE ul FROM users_licences ul
    JOIN licences l on ul.licence_id = l.id
    JOIN users u on ul.username = u.username
    WHERE u.username = ? AND ul.licence_id = ?
  `,
    )
    .run(username, licenceId);
}

function addForUser(username: string, licenceId: string) {
  // TODO: need some validation of licenceId
  // TODO: need to verify that the user exists
  // TODO: also that the user doesn't already have this licence

  return database
    .prepare(
      `
    INSERT INTO users_licences ul (username, licence_id)
    VALUES (?, ?)
  `,
    )
    .run(username, licenceId);
}

export function all(): LicenceType[] {
  const schema = z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      uri: z.string(),
    }),
  );

  return schema.parse(database.prepare(`SELECT * FROM licences`).all());
}

function create(uri: string, name: string) {
  return database
    .prepare(
      `
    INSERT INTO licences (uri, name)
    VALUES (?, ?)
  `,
    )
    .run(uri, name);
}

function drop(uri: string) {
  return database
    .prepare(
      `
    DELETE FROM licences WHERE id = ?
  `,
    )
    .run(uri);
}

function get(uri: string) {
  return database
    .prepare(
      `
    SELECT * FROM licences
    WHERE uri = ?
  `,
    )
    .all(uri);
}

export default {
  all,
  byId,
  byUri,
  users,
  forUser,
  deleteForUser,
  addForUser,
  create,
  drop,
  get,
};
