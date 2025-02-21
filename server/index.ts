import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

async function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = registerRoutes(app);
    const PORT = process.env.PORT || 5000;

    log(`Starting server on port ${PORT}...`);

    server.listen(PORT, '0.0.0.0')
      .once('listening', () => {
        log(`Server successfully started and listening on port ${PORT}`);
        resolve();
      })
      .once('error', (err: NodeJS.ErrnoException) => {
        log(`Failed to start server: ${err.message}`);
        reject(err);
      });
  });
}

(async () => {
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`Error: ${status} - ${message}`);
    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    log("Setting up Vite middleware for development");
    await setupVite(app, registerRoutes(app));
  } else {
    log("Setting up static file serving for production");
    serveStatic(app);
  }

  try {
    await startServer();
  } catch (error) {
    log(`Critical error starting server: ${error}`);
    process.exit(1);
  }
})();