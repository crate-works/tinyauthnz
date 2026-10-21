import { type Configuration } from "oidc-provider";
import { findAccount } from "../authentication.js";

import _SqliteAdapter from "./sqlite_adapter.js";

function _pkceRequired(_a: any, _b: any) {
  return false;
}

// TODO: custom error page
export default {
  findAccount,
  // refer to the documentation for other available configuration
  // TODO: sqlite adapter
  // adapter: SqliteAdapter,
  clients: [
    {
      // TODO: get id and secret from env
      client_id: "foo",
      // client_secret: "bar",
      redirect_uris: [
        "http://localhost:9009/auth/callback",
        "http://localhost:1234/oidc-client/sample.html",
        "http://localhost:1234/oidc-client",
        "https://openidconnect.net/callback",
        "https://jwt.io", // using jwt.io as redirect_uri to show the ID Token contents
        "http://localhost:8080/auth/callback",
      ],
      post_logout_redirect_uris: [
        "http://localhost:1234/oidc-client/sample.html",
      ],
      response_types: ["code", "id_token", "code id_token"],
      grant_types: ["authorization_code"],
      token_endpoint_auth_method: "none",
      claims_supported: ["full_name", "name", "first_name"],
    },
  ],
  // claims: {
  //   openid: ['sub']
  // },
  // TODO:
  // jwks,
  clientBasedCORS() {
    return true;
  },
  interactions: {
    url(_ctx: any, interaction: { uid: any }) {
      return `/interaction/${interaction.uid}`;
    },
  },
  features: {
    devInteractions: { enabled: false },
  },
} as Configuration;
