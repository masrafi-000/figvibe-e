import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV == 'Production' ? 'info' : 'debug',
  transport:
    process.env.NODE_ENV !== 'Production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid, hostname, req.headers, res.headers',
          },
        }
      : undefined,
});
