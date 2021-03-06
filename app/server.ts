import * as http from "http";
import passport from "passport";
import jwt from "jsonwebtoken";
import config from "./config";
import app from "./app";
import { logError } from "./logging";
import { Strategy as BearerStrategy } from "passport-http-bearer";
import type { JWT } from "./auth/auth";
import * as b2access from "./auth/b2access";
import * as openaire from "./auth/openaire";
import type { UserProfile } from "./core/user";
import * as dbUsers from "./db/users";

config.dumpConfig();

// Initialise auth service providers

const authConfPms = [
  b2access.retrieveConfigurationPm(),
  openaire.retrieveConfigurationPm()
];

Promise.allSettled(authConfPms).then(
  ([b2accessOIDConfigRes, openaireOIDConfigRes]) => {

    if (b2accessOIDConfigRes.status === "fulfilled") {
      app.use(config.serverPath, b2access.router(b2accessOIDConfigRes.value));
    } else {
      console.error("B2ACCESS OIDC configuration request failed");
    }
    if (openaireOIDConfigRes.status === "fulfilled") {
      app.use(config.serverPath, openaire.router(openaireOIDConfigRes.value));
    } else {
      console.error("OpenAIRE OIDC configuration request failed");
    }

    passport.use(new BearerStrategy(
      (token: string, done: (x: any, y: boolean|UserProfile) => void) => {
        jwt.verify(token, config.jwtSecret, (err, decoded) => {
          if (err) {
            done(null, false);
          } else {
            const email = (decoded as JWT).email;
            if (!email) {
              throw new Error("email not present in the JWT token");
            } else {
              dbUsers.getUserProfileByEmail(email).then(userProfile => {
                if (!userProfile) {
                  logError(`JWT verification failed: User with email ${email} does not exist`);
                  return done(null, false);
                } else {
                  return done(null, userProfile);
                }
              });
            }
          }
        });
      }
    ));

    // Server initialisation

    function onListening(): void {
      const addr = server.address();
      const bind = typeof addr === "string"
        ? "pipe " + addr
        : "port " + (addr ? addr.port : "");
      console.log("B2NOTE server listening on " + bind);
    }

    const server = http.createServer(app);
    const port = config.serverPort;
    app.set("port", port);
    server.on("listening", onListening);
    server.listen(port);

  }
);
