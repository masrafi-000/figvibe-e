import type { NextFunction, Request, Response } from "express";
import { httpRequestDurationMicroseconds, httpRequestsTotal } from "../config/metrics";


export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime();

    res.on('finish', ()=> {
        const duration = process.hrtime(start);
        const durationInSeconds = duration[0] + duration[1] / 1e9;

        const route = req.route ? req.baseUrl + req.route.path : req.path;

        httpRequestDurationMicroseconds.labels(req.method, route, res.statusCode.toString()).observe(durationInSeconds);

        httpRequestsTotal.labels(req.method, route, res.statusCode.toString()).inc();
    })

    next();
}