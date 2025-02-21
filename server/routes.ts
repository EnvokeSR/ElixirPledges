import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { log } from "./vite";
import { testConnection } from "./db";

// Create uploads directory if it doesn't exist
fs.mkdir("./uploads", { recursive: true }).catch(error => {
  log("Error creating upload directory:", error);
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "./uploads");
    },
    filename: (req, file, cb) => {
      try {
        const { name, grade, celebrity } = req.body;
        if (!name || !grade || !celebrity) {
          return cb(new Error(`Missing required fields. Got name: ${name}, grade: ${grade}, celebrity: ${celebrity}`), '');
        }
        const sanitizedName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const sanitizedGrade = grade.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const sanitizedCelebrity = celebrity.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${sanitizedName}_${sanitizedGrade}_${sanitizedCelebrity}.webm`;
        log("Generated filename:", filename);
        cb(null, filename);
      } catch (error) {
        log("Error in filename generation:", error);
        cb(error as Error, '');
      }
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) {
      cb(new Error('Only video files are allowed'));
      return;
    }
    cb(null, true);
  }
});

export function registerRoutes(app: Express): Server {
  app.use(express.urlencoded({ extended: true }));

  // Enhanced health check endpoint with detailed error reporting
  app.get("/api/health", async (_req, res) => {
    try {
      log("Health check endpoint called");

      // Test database connection
      const dbConnectionTest = await testConnection();
      log("Database connection test successful:", dbConnectionTest);

      // Test storage layer with timeout
      const storageTestPromise = new Promise(async (resolve, reject) => {
        try {
          const users = await storage.getAllUsersNotSubmitted();
          log(`Storage layer test successful, found ${users.length} users`);
          resolve({ users_count: users.length });
        } catch (error) {
          reject(error);
        }
      });

      const storageResult = await Promise.race([
        storageTestPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Storage layer test timed out")), 5000)
        )
      ]);

      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          timestamp: dbConnectionTest.now
        },
        storage: {
          working: true,
          ...storageResult
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log("Health check failed:", errorMessage);

      res.status(503).json({
        status: "error",
        timestamp: new Date().toISOString(),
        error: errorMessage,
        details: error instanceof Error ? error.stack : "No stack trace available"
      });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      log('Received request for all users');
      const users = await storage.getAllUsersNotSubmitted();
      log(`Returning ${users.length} users:`, JSON.stringify(users));
      res.setHeader('Content-Type', 'application/json');
      res.json(users);
    } catch (error) {
      log("Error fetching users:", error);
      res.status(500).json({
        message: "Failed to fetch users",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/users/grade/:grade", async (req, res) => {
    try {
      const grade = req.params.grade.toLowerCase();
      log(`Received request for users in grade: ${grade}`);
      log(`Client IP: ${req.ip}, Headers:`, req.headers);

      const users = await storage.getUsersByGradeNotSubmitted(grade);
      log(`Found ${users.length} users for grade ${grade}`);

      res.setHeader('Content-Type', 'application/json');
      res.json(users);
    } catch (error) {
      log("Error fetching users by grade:", error);
      res.status(500).json({
        message: "Failed to fetch users by grade",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/pledges/:code", async (req, res) => {
    try {
      const pledge = await storage.getPledgeByCode(req.params.code);
      if (!pledge) return res.status(404).json({ message: "Pledge not found" });
      res.json(pledge);
    } catch (error) {
      log("Error fetching pledge:", error);
      res.status(500).json({ message: "Failed to fetch pledge" });
    }
  });

  app.post("/api/videos", upload.single("video"), async (req, res) => {
    try {
      log("Video upload request received", {
        body: req.body,
        file: req.file
      });

      if (!req.file) {
        log("No file received in request");
        return res.status(400).json({ message: "No video file uploaded" });
      }

      const { userId, name, grade, celebrity } = req.body;
      if (!userId || !name || !grade || !celebrity) {
        return res.status(400).json({
          message: "Missing required fields",
          received: { userId, name, grade, celebrity }
        });
      }

      log("Updating user status", { userId, celebrity });

      const videoUrl = `/uploads/${req.file.filename}`;
      await storage.updateUserVideoStatus(parseInt(userId), celebrity, videoUrl);

      res.json({
        message: "Video uploaded successfully",
        filename: req.file.filename,
        url: videoUrl
      });
    } catch (error) {
      log("Video upload error:", error);
      res.status(500).json({
        message: "Failed to upload video",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}