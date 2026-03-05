import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";
import express from "express";
import {router} from "./api/router";
import {errorHandler} from "./api/middleware";

setGlobalOptions({maxInstances: 10});

const app = express();
app.use(express.json());
app.use("/api", router);
app.use(errorHandler);

export const api = onRequest(app);
