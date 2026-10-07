import client from 'prom-client';

client.collectDefaultMetrics({
  prefix: 'node_',
});

export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_req_duration_seconds',
  help: 'Duration of all HTTP request in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 25],
});

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const register = client.register;
