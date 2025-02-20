import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
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

async function startServer(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = registerRoutes(app);

    server.listen(port)
      .once('listening', () => {
        log(`Server successfully started and listening on port ${port}`);
        resolve();
      })
      .once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          log(`Port ${port} is in use, will try alternate port`);
          reject(err);
        } else {
          log(`Failed to start server: ${err.message}`);
          reject(err);
        }
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
    await setupVite(app, registerRoutes(app)); //Corrected this line.  registerRoutes(app) returns the server object.
  } else {
    log("Setting up static file serving for production");
    serveStatic(app);
  }

  // Try port 5000 first, then fallback to 3000
  const PRIMARY_PORT = 5000;
  const FALLBACK_PORT = 3000;
  const ENV_PORT = process.env.PORT ? parseInt(process.env.PORT) : PRIMARY_PORT;

  log(`Environment PORT value: ${process.env.PORT}`);
  log(`Attempting to start server with configured port: ${ENV_PORT}`);

  try {
    await startServer(ENV_PORT);
  } catch (error) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      log(`Attempting to start with fallback port: ${FALLBACK_PORT}`);
      try {
        await startServer(FALLBACK_PORT);
      } catch (fallbackError) {
        log(`Failed to start server on fallback port: ${fallbackError}`);
        process.exit(1);
      }
    } else {
      log(`Failed to start server: ${error}`);
      process.exit(1);
    }
  }
})();