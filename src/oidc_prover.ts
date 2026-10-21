import type Koa from "koa";

import oidc from "oidc-provider";
import providerConfig from "./provider_configuration";

// TODO: get post and host from config
const provider: any = new oidc("http://localhost:3000/oidc", {
  ...providerConfig,
  async loadExistingGrant(ctx: Koa.Context) {
    const grantId =
      ctx.oidc.result?.consent?.grantId ||
      ctx.oidc.session.grantIdFor(ctx.oidc.client.clientId);

    if (grantId) {
      const grant = await ctx.oidc.provider.Grant.find(grantId);

      if (ctx.oidc.account && grant.exp < ctx.oidc.session.exp) {
        console.log(grant);
        grant.exp = ctx.oidc.session.exp;

        await grant.save();
      }
      // TODO: double check if we really do need to check who is asking
      function isFirstParty(client: any) {
        console.log({ client });
        return true;
      }
      grant.addOIDCClaims(["first_name", "full_name", "name"]);
      if (isFirstParty(ctx.oidc.client)) {
        const grant = new ctx.oidc.provider.Grant({
          clientId: ctx.oidc.client.clientId,
          accountId: ctx.oidc.session.accountId,
        });

        grant.addOIDCScope("openid email profile");
        grant.addOIDCClaims(["first_name"]);
        grant.addResourceScope(
          "urn:example:resource-indicator",
          "api:read api:write",
        );
        await grant.save();
        return grant;
      }

      return undefined;
    }
  },
});
