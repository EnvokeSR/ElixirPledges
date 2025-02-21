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
    destination: (_req: express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
      cb(null, "./uploads");
    },
    filename: (req: express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
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
        const errorMessage = error instanceof Error ? error.message : 'Error in filename generation';
        log(errorMessage);
        cb(new Error(errorMessage), '');
      }
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!file.mimetype.startsWith('video/')) {
      cb(new Error('Only video files are allowed'));
      return;
    }
    cb(null, true);
  }
});

// Standardized success response helper
const successResponse = <T>(data: T) => ({
  status: "ok" as const,
  data
});

// Standardized error response helper
const errorResponse = (message: string, status = 500) => ({
  status: "error" as const,
  message,
  statusCode: status
});

export function registerRoutes(app: Express): Server {
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get("/api/health", async (_req, res) => {
    try {
      await testConnection();
      res.json(successResponse({ message: "Service is healthy" }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log("Health check failed:", message);
      res.status(503).json(errorResponse("Service is unavailable", 503));
    }
  });

  // Standardized error wrapper for async route handlers
  const asyncHandler = (fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>) => 
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log("Route error:", errorMessage);
        const status = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500;
        res.status(status).json(errorResponse(errorMessage, status));
      }
    };

  app.get("/api/users", asyncHandler(async (_req, res) => {
    const users = await storage.getAllUsersNotSubmitted();
    res.json(successResponse(users));
  }));

  app.get("/api/users/grade/:grade", asyncHandler(async (req, res) => {
    const grade = req.params.grade.toLowerCase();
    const users = await storage.getUsersByGradeNotSubmitted(grade);
    res.json(successResponse(users));
  }));

  app.get("/api/pledges/:code", asyncHandler(async (req, res) => {
    const pledge = await storage.getPledgeByCode(req.params.code);
    if (!pledge) {
      res.status(404).json(errorResponse("Pledge not found", 404));
      return;
    }
    res.json(successResponse(pledge));
  }));

  app.post("/api/videos", upload.single("video"), asyncHandler(async (req, res) => {
    if (!req.file) {
      throw Object.assign(new Error("No video file uploaded"), { statusCode: 400 });
    }

    const { userId, name, grade, celebrity } = req.body;
    if (!userId || !name || !grade || !celebrity) {
      throw Object.assign(new Error("Missing required fields"), { statusCode: 400 });
    }

    const videoUrl = `/uploads/${req.file.filename}`;
    await storage.updateUserVideoStatus(parseInt(userId), celebrity, videoUrl);

    res.json(successResponse({
      message: "Video uploaded successfully",
      filename: req.file.filename,
      url: videoUrl
    }));
  }));

  return createServer(app);
}