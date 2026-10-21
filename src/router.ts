import Router, { RouterMiddleware } from "@koa/router";
import * as z from "zod";

import User, { UserType } from "./User";
import Licence, { LicenceType } from "./Licence";
import koaBody from "koa-body";
import Application, { ApplicationType } from "./Application";
import { Middleware } from "koa";

const body = koaBody({
  text: false,
  json: false,
  patchNode: true,
  patchKoa: true,
});

type AuthState = {
  session: {
    currentUser?: UserType;
  } | null;
};

const router = new Router<AuthState>();
router.get("/", async (ctx) => {
  return ctx.render("home");
});

function validate<T>(schema: z.ZodType<T>): RouterMiddleware {
  return async (ctx, next) => {
    const { data, error, success } = schema.safeParse(ctx.req.body);
    if (error) {
      ctx.status = 400;
      // TODO: make this error nicer
      ctx.body = {
        error: error.message,
      };
      return;
    }
    // TODO: can we type this?
    ctx.req.body = data;
    return next();
  };
}

function admin(): Middleware {
   return async (ctx, next) => {
     if (!ctx.session.currentUser) {
       ctx.status = 401
      return ctx.render("error/401")
    } else if (!ctx.session.currentUser.is_admin) {
      ctx.status = 403
      return ctx.render("error/403")
    } else {
      return next()
    }
  }
}

async function unimplemented(ctx: {
  response: { status: number };
  render: (arg0: string) => any;
}) {
  ctx.response.status = 501;
  return ctx.render("error/501");
}

const LoginReq = z.object({
  username: z.string(),
  password: z.string(),
});
// TODO: admin login validation
router.get("/login", async (ctx) => {
  return ctx.render("login/form");
});
router.post("/login", body, validate(LoginReq), async (ctx) => {
  const { username, password } = ctx.req.body as z.infer<typeof LoginReq>;
  const valid = await User.authenticate(username, password);
  if (valid) {
    ctx.session.currentUser = User.byUsername(username);
    return ctx.render("home");
  } else {
  }
});
router.get("/logout", async (ctx) => {
  ctx.session = null;
  return ctx.redirect("/");
});

// Obviously the types here are really ugly
const userRouter = new Router<
  AuthState & {
    user?: UserType;
    licences?: LicenceType[];
    applications?: ({id: string, user_id: string, text: string}&LicenceType)[];
  }
>({ prefix: "/users"}).param("id", function (userId, ctx, next) {
  const user = User.byId(userId);
  if (!user) {
    ctx.throw("User not found");
  }
  ctx.state.user = user;
  ctx.state.licences = User.licences(userId);
  ctx.state.applications = User.applications(userId);
  return next();
});

userRouter.use(admin())

userRouter.get("/", async function (ctx) {
  const applications = Application.all()
  const users = User.all().map(user => {
    user.applications = applications.filter(application => application.user_id === user.id)
    return user
  });
  return ctx.render("user/list", { users });
});

const CreateUserReq = z.object({
  username: z.string(),
  full_name: z.string(),
});
userRouter.post("/", body, validate(CreateUserReq), async function (ctx) {
  const { username, full_name } = ctx.req.body as z.infer<typeof CreateUserReq>;
  const { changes, lastInsertRowid } = User.create(username, full_name);
  if (!lastInsertRowid || changes !== 1) {
    ctx.throw("something went wrong");
  }
  const user = User.byId(lastInsertRowid);

  if (!user) {
    ctx.throw("something else went wrong");
  }
  // return ctx.render('user', { user: ctx.state.user })
  ctx.redirect(`/users/${user.id}`);
});
userRouter.get("/:id", async function (ctx) {
  return ctx.render("user");
});
const DeleteUserReq = z.object({
  _method: z.enum(["delete"]),
  id: z.number(),
});
const ChangeUserReq = z.object<UserType>()
userRouter.post("/:id", validate(DeleteUserReq.or(ChangeUserReq)), async function (ctx) {
  const body = ctx.req.body as z.infer<typeof DeleteUserReq> | z.infer<typeof ChangeUserReq>
  if ("_method" in body && body._method === "delete") {
    // TODO: delete
  } else {
    // TODO: handle details update
  }
});
userRouter.get("/:id/reset-password", async function (ctx) {
  ctx.body = `https://`
});

const licenceRouter = new Router<
  AuthState & {
    licence: LicenceType;
    users: UserType[];
  }
>().param("id", function (licenceId, ctx, next) {
  const licence = Licence.byId(licenceId);
  if (!licence) {
    ctx.throw("Licence not found");
  } else {
    const users = Licence.users(licenceId);
  
    ctx.state.licence = licence;
    ctx.state.users = users || [];
  }

  return next();
});

licenceRouter.get("/licences", async function (ctx) {
  const licences = Licence.all();
  return ctx.render("licence/list", { licences });
});
licenceRouter.get("/licences/:id", async function (ctx) {
  return ctx.render("licence", ctx.state);
});
licenceRouter.get("/licences/:id/grant", unimplemented);

const CreateLicenceReq = z.object({
  uri: z.string(),
  name: z.string(),
});
licenceRouter.post(
  "/licences",
  body,
  validate(CreateLicenceReq),
  async function (ctx) {
    const { uri, name } = ctx.req.body as z.infer<typeof CreateLicenceReq>;
    const { changes, lastInsertRowid } = Licence.create(uri, name);

    const licence = Licence.byId(lastInsertRowid);

    if (!licence) {
      ctx.response.status = 500;
      return ctx.render("error/500");
    }
    ctx.redirect(`/licences/${licence.id}`);
  },
);

const applicationRouter = new Router<{
  application: ApplicationType;
  licence: LicenceType;
  user: UserType;
}>().param("id", function (applicationId, ctx, next) {
  const application = Application.byId(applicationId);
  if (!application) {
    ctx.throw("application not found");
  }

  const licence = Licence.byId(application.licence_id);
  if (!licence) {
    ctx.response.status = 404;
    return ctx.render("error/404", { msg: "licence not found" });
  }

  const user = User.byId(application.user_id);
  if (!user) {
    ctx.throw("User not found");
  }

  ctx.state.application = application;
  ctx.state.licence = licence;
  ctx.state.user = user;

  return next();
});

applicationRouter.get("/application", async function (ctx) {
  const licenceUri = ctx.query["id"];
  if (!licenceUri) {
    // TODO: also check licence uri format
    ctx.response.status = 400;
    return ctx.render("error/400", { msg: `Did not provide licence ID` });
  }
  const licence = Licence.byUri(licenceUri as string);
  if (!licence) {
    ctx.response.status = 404;
    return ctx.render("error/404", { msg: `Licence "${licenceUri}" not found` });
  }
  if (!ctx.session.currentUser) {
    // TODO: do a redirect or add a login form or something
    ctx.response.status = 401;
    return ctx.render("error/401");
  }
  let user = User.byId(ctx.session.currentUser.id);
  return ctx.render("application/form", { licence, user });
});
applicationRouter.get("/application/:id", async function (ctx) {
  return ctx.render("application");
});

// TODO: remove these two endpoints

router.get("/entitlements", body, async (ctx, _next) => {
  const apiKey = ctx.headers["x-rems-api-key"];
  const userId = ctx.headers["x-rems-user-id"];
  // TODO: validate api key and user id etc etc

  if (apiKey) {
    throw new Error("api keys not implemented");
  }
  if (typeof userId !== "string") {
    ctx.body = "x-rems-user-id should be a string";
    return;
  }

  const licences = Licence.forUser(userId);
  // TODO: error handling for licences

  // TODO: old oni just cares about the .resource
  ctx.body = licences.map((licence) => ({
    resource: licence.uri,
    user: {
      userid: userId,
      // TODO: actually put them there
      name: null,
      email: null,
      // TODO: check if we really need organizations
      organizations: [{ "organization/id": null }],
      "notification-email": null,
      "researcher-status-by": null,
    },
    "application-id": 0,
    start: "1970-01-01T00:00:00.000Z",
    end: "1970-01-01T00:00:00.000Z",
    mail: null,
  }));
});

router.get("/catalogue/application", async (ctx, _next) => {
  const licenceId = ctx.query["id"];

  // TODO: fetch real licence etc etc
  // TODO: add and render error templates
  // Error page for if licence doesn't exist
  if (!licenceId || typeof licenceId !== "string") {
    return ctx.render("application/not_found");
  }

  const results = Licence.get(licenceId);

  if (results.length < 1) {
    return ctx.render("application/not_found");
  } else if (results.length > 1) {
    // TODO: other error
    // just redirect maybe? depends how someone got to this page
  } else {
    return ctx.render("application/form", {
      licence: results[0],
      question: null,
    });
  }
});


router
  .use(userRouter.routes())
  .use(licenceRouter.routes())
  .use(applicationRouter.routes());

export default router;
