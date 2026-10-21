import Koa from "koa";
import { koaBody } from "koa-body";
import serve from "koa-static";
import mount from "koa-mount";
import session from "koa-session";
import cors from "@koa/cors";
import views from "@ladjs/koa-views";

import router from "./src/router";

// import {database, init} from "./authentication";


// import database, { migrate } from "./src/database";

const body = koaBody({
  text: false,
  json: false,
  patchNode: true,
  patchKoa: true,
});

const app = new Koa();

if (!process.env.SESSION_SECRET) throw new Error("must set SESSION_SECRET");

app.keys = [process.env.SESSION_SECRET];

app.use(
  session(
    {
      maxAge: 86400000,
      overwrite: true /** (boolean) can overwrite or not (default true) */,
      renew: true /** (boolean) renew session when session is nearly expired, so we can always keep user logged in. (default is false)*/,
      // TODO: set this back to true and give instructions on setting up https in dev
      signed: true,
      secure: false /** (boolean) secure cookie*/,
      sameSite:
        "Strict" /** (string) session cookie sameSite options (default null, do not provide this key if you are not restricting sameSite) */,
    },
    app,
  ),
);
app.use(serve("assets"));
app.use(views("./views", { extension: "pug" }));
app.use(cors());
app.use(async function (ctx, next) {
  ctx.state = {
    session: ctx.session,
  };
  return next();
});
app.use(router.routes()).use(router.allowedMethods());
// TODO: enable this
// app.use(mount("/oidc", provider));

// migrate()

app.listen(3001);

console.log(`Listening on http://localhost:3001`)