import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";
import {router} from "./api/router";
import {errorHandler} from "./api/middleware";

setGlobalOptions({maxInstances: 10, region: "asia-northeast1"});

const app = express();
app.use(cors({origin: true}));
app.use(express.json());
app.use(router);
app.use(errorHandler);

export const api = onRequest(app);
