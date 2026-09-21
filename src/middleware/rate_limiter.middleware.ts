import rateLimit from "express-rate-limit"
import { RedisStore, type RedisReply } from "rate-limit-redis"
import { redis } from "../common/redis"

export const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (command: string, ...args: string[]) =>
            redis.call(command, ...args) as Promise<RedisReply>,
        prefix: 'rl:global:',
    }),
    message: {
        success: false,
        message: "Too many requests, please try again later."
    }
})

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, 
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (command: string, ...args: string[]) =>
            redis.call(command, ...args) as Promise<RedisReply>,
        prefix: "rl:auth:",
    }),
    message: {
        success: false,
        message: "Too many authentication attempts. Please try again after 15 minutes."
    }
})