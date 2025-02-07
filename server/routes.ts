import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

const upload = multer({
  storage: multer.diskStorage({
    destination: "./uploads",
    filename: (req, file, cb) => {
      const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
      const { userId } = req.body;
      const fileName = `video_${userId}_${timestamp}${path.extname(file.originalname)}`;
      cb(null, fileName);
    },
  }),
});

// Ensure uploads directory exists
await fs.mkdir("./uploads", { recursive: true });

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
      const { userId, favoriteCelebrity } = req.body;
      const videoLink = `/uploads/${req.file?.filename}`;
      await storage.updateUserVideoStatus(parseInt(userId), favoriteCelebrity, videoLink);
      res.json({ message: "Video uploaded successfully", videoLink });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload video" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
