import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Request, type Response } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { logger } from "./config/logger";
import { errorMiddleware } from "./middleware/error.middleware";
import { notFoundMiddleware } from "./middleware/not_found.middleware";
import { apiRouter } from "./routes";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(cors({ origin: "*", credentials: true }));

app.use(express.json({ limit: "1mb" }));

app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(cookieParser());

app.use(
  pinoHttp({
    logger,
  }),
);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Server is Healthy",
  });
});

app.use("api/v1", apiRouter);

app.use(notFoundMiddleware);

app.use(errorMiddleware);

export default app;
