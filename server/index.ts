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

// Create a single server instance
const server = registerRoutes(app);

async function startServer(): Promise<void> {
  try {
    validateEnvironment();
    await testConnection();
    log("Database connection verified");

    // For debugging, temporarily use static serving even in development
    log("Setting up static file serving for debugging");
    serveStatic(app);

    // Try different ports if the default is in use
    const startPort = parseInt(process.env.PORT || "5000");
    const maxRetries = 10;

    for (let port = startPort; port < startPort + maxRetries; port++) {
      try {
        await new Promise<void>((resolve, reject) => {
          const bindServer = server.listen(port, "0.0.0.0");

          bindServer.once('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
              log(`Port ${port} is in use, trying next port`);
              bindServer.close();
              resolve(); // Continue to next port
            } else {
              reject(err);
            }
          });

          bindServer.once('listening', () => {
            const address = bindServer.address();
            const actualPort = typeof address === 'object' && address ? address.port : port;
            log(`Server successfully started on port ${actualPort}`);
            resolve(); // Successfully bound to port
          });
        });

        // If we get here, the server was successfully bound
        log(`Server is ready and listening on port ${port}`);
        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Failed to bind to port ${port}: ${errorMessage}`);

        // If this was the last retry, throw the error
        if (port === startPort + maxRetries - 1) {
          throw new Error(`Could not find an available port after ${maxRetries} attempts`);
        }
      }
    }
  } catch (error) {
    log(`Critical error starting server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  log(`[${process.env.NODE_ENV}] Error: ${status} - ${message}`);

  res.status(status).json({
    status: "error",
    message,
    error: process.env.NODE_ENV === 'development' ? err.stack : 'An error occurred'
  });
});

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

// Start the server
startServer();