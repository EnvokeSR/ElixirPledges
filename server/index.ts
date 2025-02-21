import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { testConnection } from "./db";

// Add environment validation at startup
function validateEnvironment() {
  const requiredVars = ['DATABASE_URL'];
  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Set default NODE_ENV if not provided
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }

  // Log environment context (without sensitive values)
  log(`Environment: ${process.env.NODE_ENV}`);
  log(`Port: ${process.env.PORT || 5000}`);
  log(`Database Host: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'Not configured'}`);
}

const app = express();

// Configure CORS to allow specific origins based on environment
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? false // Disable CORS in production since we're serving from same origin
    : true, // Allow all origins in development
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

  // Only log API requests
  if (req.path.startsWith('/api')) {
    log(`[${process.env.NODE_ENV}] Incoming ${req.method} ${req.path}`);
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      log(`[${process.env.NODE_ENV}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });

  next();
});

let server: any = null;

async function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      validateEnvironment();

      // Try different ports if the default is in use
      const tryPort = (port: number): Promise<void> => {
        return new Promise((resolvePort, rejectPort) => {
          server = registerRoutes(app);

          server.listen(port, "0.0.0.0")
            .once('error', (err: NodeJS.ErrnoException) => {
              if (err.code === 'EADDRINUSE') {
                log(`Port ${port} is in use, trying ${port + 1}`);
                server.close();
                resolvePort(tryPort(port + 1));
              } else {
                rejectPort(err);
              }
            })
            .once('listening', () => {
              const actualPort = (server.address() as any).port;
              log(`Server successfully started on port ${actualPort}`);
              resolvePort();
            });
        });
      };

      // Test database connection before starting server
      testConnection()
        .then(() => {
          log("Database connection verified");
          return tryPort(parseInt(process.env.PORT || "5000"));
        })
        .then(resolve)
        .catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

// Graceful shutdown handler
function shutdown() {
  if (server) {
    log("Shutting down server...");
    server.close(() => {
      log("Server shut down successfully");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  log(`[${process.env.NODE_ENV}] Error: ${status} - ${message}`);

  res.status(status).json({
    status: "error",
    message,
    error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

(async () => {
  try {
    // Set up appropriate middleware based on environment
    if (process.env.NODE_ENV !== "production") {
      log("Setting up Vite middleware for development");
      await setupVite(app, registerRoutes(app));
    } else {
      log("Setting up static file serving for production");
      serveStatic(app);
    }

    await startServer();
  } catch (error) {
    log(`Critical error starting server: ${error}`);
    process.exit(1);
  }
})();