require("./tracing");
const express = require("express");
const client = require("prom-client");

const app = express();
// HTTP Request Logging Middleware
app.use((req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;

        console.log(
            `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
        );
    });

    next();
});
const PORT = process.env.PORT || 3000;

// Collect default Node.js metrics
client.collectDefaultMetrics();

// Custom HTTP request counter
const httpRequests = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status_code"]
});

// HTTP request duration
const httpDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route"],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5]
});

// Monitoring middleware
app.use((req, res, next) => {
  const start = process.hrtime();

  res.on("finish", () => {
    const duration = process.hrtime(start);
    const seconds = duration[0] + duration[1] / 1e9;
    const route = req.route?.path || req.path;

    httpRequests.inc({
      method: req.method,
      route,
      status_code: res.statusCode
    });

    httpDuration.observe({
      method: req.method,
      route
    }, seconds);
  });

  next();
});

// Welcome endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to DevOps Observability Platform",
    project: "DevOps Observability",
    version: "1.0.0"
  });
});

// Health endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    service: "observability-app",
    timestamp: new Date().toISOString()
  });
});

// Prometheus metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Application running on port ${PORT}`);
});
