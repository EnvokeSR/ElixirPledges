import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

// Create uploads directory if it doesn't exist
fs.mkdir("./uploads", { recursive: true }).catch(error => {console.error("Error creating upload directory:", error)});

const upload = multer({
  storage: multer.diskStorage({
    destination: "./uploads",
    filename: (req, file, cb) => {
      try {
        // Get the fields from the FormData
        const name = req.body.name || 'unnamed';
        const grade = req.body.grade || 'nograde';
        const celebrity = req.body.celebrity || 'nocelebrity';

        // Sanitize the filename components
        const sanitizedName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const sanitizedGrade = grade.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const sanitizedCelebrity = celebrity.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        const filename = `${sanitizedName}_${sanitizedGrade}_${sanitizedCelebrity}_${timestamp}${path.extname(file.originalname)}`;
        console.log("Generated filename:", filename);
        cb(null, filename);
      } catch (error) {
        console.error("Error generating filename:", error);
        cb(error as Error, '');
      }
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

export function registerRoutes(app: Express): Server {
  // Parse URL-encoded bodies (as sent by HTML forms)
  app.use(express.urlencoded({ extended: true }));

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