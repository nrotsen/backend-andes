import express from "express";
import cors from "cors";
import Router from "express-promise-router";
import dotenv from "dotenv";
import jwt from "express-jwt";
import jwksRsa from "jwks-rsa";
import helmet from "helmet";
import fs from "fs";

import companiesEndpoint from "./routes/companiesRoute.js";
import docRefEndpoint from "./routes/docRefRoute.js";
import startedEndpoint from "./routes/startedDocRoute.js";
import foldersEnpoint from "./routes/foldersRoute.js";
import companyDocEndpoint from "./routes/companyDocRoute.js";
import healthEndpoint from "./routes/health.js";
import electronicSignatureEndpoint from "./routes/ElectronicSignatureRoute.js";
import serverOptionsEndpoint from "./routes/serverOptionsRoute.js";
import usersEndpoint from "./routes/userRoute.js";
import masterEndpoint from "./routes/masterDataRoute.js";

dotenv.config({ path: process.env.ENV_PATH || ".env" });

const { env } = process;

const PORT = process.env.PORT || 8000;
const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(helmet());

export const jwtCheck = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: "https://andesdocs.us.auth0.com/.well-known/jwks.json",
  }),
  audience: "https://andesdocs/api",
  issuer: "https://andesdocs.us.auth0.com/",
  algorithms: ["RS256"],
});

// Router Set up

const router = Router();

router.use("/companies", jwtCheck, companiesEndpoint);
router.use("/doc-ref", jwtCheck, docRefEndpoint);
router.use("/started", jwtCheck, startedEndpoint);
router.use("/folders", jwtCheck, foldersEnpoint);
router.use("/company-docs", jwtCheck, companyDocEndpoint);
router.use("/health", healthEndpoint);
router.use("/electronic-signature", jwtCheck, electronicSignatureEndpoint);
router.use("/server-options", jwtCheck, serverOptionsEndpoint);
router.use("/users", jwtCheck, usersEndpoint);
router.use("/master", jwtCheck, masterEndpoint);

app.use(router);

app.get("/", async (req, res) => {
  res.send("Api is now live.");
});

app.listen(PORT, () => console.log("app now live on port 8000"));

export default null;
