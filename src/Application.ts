import * as z from "zod";

import database from "./database";

const schema = z.object({
  id: z.number(),
  user_id: z.number(),
  licence_id: z.number(),
  text: z.string().nullable(),
});

export type ApplicationType = z.infer<typeof schema>;


function all() {
  return z.array(schema).parse(database
    .prepare(
      `
    SELECT * from applications
  `,
    )
    .all());
}


function create(userId: string, licenceId: string, text: string | null = null) {
  return database
    .prepare(
      `
      INSERT INTO applications (user_id, licence_id, text) VALUES (?, ?, ?)
    `,
    )
    .run(userId, licenceId, text);
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

export default {
  all,
  create,
  byId,
  licences,
  schema,
};
