import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Configure CORS to allow all origins in development
const corsOptions = {
  origin: true, // This allows any origin
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Log all incoming requests
  log(`Incoming ${req.method} request to ${path} from ${req.ip}`);

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

    // Listen on all network interfaces
    server.listen(PORT, '0.0.0.0', () => {
      log(`Server successfully started and listening on port ${PORT}`);
      log(`Server is accessible at http://0.0.0.0:${PORT}`);
      resolve();
    }).on('error', (err: NodeJS.ErrnoException) => {
      log(`Failed to start server: ${err.message}`);
      reject(err);
    });
  });
}

(async () => {
  // Add error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`Error: ${status} - ${message}`);
    log(`Stack trace: ${err.stack}`);
    res.status(status).json({ message, error: err.message });
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