import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      await fs.mkdir("./uploads", { recursive: true });
      cb(null, "./uploads");
    },
    filename: (req, file, cb) => {
      const { name, grade, celebrity } = req.body;
      // Sanitize the filename components
      const sanitizedName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const sanitizedCelebrity = celebrity.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      cb(null, `${sanitizedName}_${grade}_${sanitizedCelebrity}_${timestamp}${path.extname(file.originalname)}`);
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
      if (!req.file) {
        return res.status(400).json({ message: "No video file uploaded" });
      }

      const { userId, favoriteCelebrity } = req.body;

      await storage.updateUserVideoStatus(parseInt(userId), favoriteCelebrity);

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