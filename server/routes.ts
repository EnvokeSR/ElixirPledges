import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        await fs.mkdir("./uploads", { recursive: true });
        console.log("Upload directory created/verified at ./uploads");
        cb(null, "./uploads");
      } catch (error) {
        console.error("Error creating upload directory:", error);
        cb(error as Error, "./uploads");
      }
    },
    filename: (req, file, cb) => {
      console.log("File upload request body:", req.body);
      console.log("Incoming file:", file);

      const { name, grade, celebrity } = req.body;
      // Sanitize the filename components
      const sanitizedName = name?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'unnamed';
      const sanitizedGrade = grade || 'nograde';
      const sanitizedCelebrity = celebrity?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'nocelebrity';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      const filename = `${sanitizedName}_${sanitizedGrade}_${sanitizedCelebrity}_${timestamp}${path.extname(file.originalname)}`;
      console.log("Generated filename:", filename);
      cb(null, filename);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

export function registerRoutes(app: Express): Server {
  app.get("/api/users/grade/:grade", async (req, res) => {
    const users = await storage.getUsersByGradeNotSubmitted(req.params.grade);
    res.json(users);
  });

  app.get("/api/pledges/:code", async (req, res) => {
    const pledge = await storage.getPledgeByCode(req.params.code);
    if (!pledge) return res.status(404).json({ message: "Pledge not found" });
    res.json(pledge);
  });

  app.post("/api/videos", upload.single("video"), async (req, res) => {
    try {
      console.log("Video upload request received", {
        body: req.body,
        file: req.file,
      });

      if (!req.file) {
        console.error("No file received in request");
        return res.status(400).json({ message: "No video file uploaded" });
      }

      const { userId, celebrity } = req.body;
      console.log("Updating user status", { userId, celebrity });

      // Update user's video submission status and favorite celebrity
      await storage.updateUserVideoStatus(parseInt(userId), celebrity);

      res.json({ 
        message: "Video uploaded successfully",
        filename: req.file.filename
      });
    } catch (error) {
      console.error("Video upload error:", error);
      res.status(500).json({ message: "Failed to upload video" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}