import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  const PORT = 3000;
  // Dynamic path resolution for any hosting environment (Vercel, Replit, etc.)
  const distPath = path.join(process.cwd(), "dist");
  const indexPath = path.join(distPath, "index.html");

  app.use(express.json());

  // Universal Health Check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ready", 
      time: new Date().toISOString(),
      distAvailable: fs.existsSync(distPath)
    });
  });

  // AI GM Proxy
  app.post("/api/gm", async (req, res) => {
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: req.body.prompt,
      });
      res.json({ text: result.text });
    } catch (err) {
      res.status(500).json({ error: "GM is busy" });
    }
  });

  // Socket.io for Real-time TRPG
  const roomMessages = {};
  const roomPlayers = {};
  io.on("connection", (socket) => {
    socket.on("join-room", (room) => {
      socket.join(room);
      if (!roomPlayers[room]) roomPlayers[room] = {};
      roomPlayers[room][socket.id] = { id: socket.id, isReady: false };
      io.to(room).emit("players-update", Object.values(roomPlayers[room]));
    });
    socket.on("send-message", ({ room, message }) => {
      const msg = { id: Math.random().toString(36).substr(2, 9), ...message, timestamp: new Date().toISOString() };
      if (!roomMessages[room]) roomMessages[room] = [];
      roomMessages[room].push(msg);
      io.to(room).emit("new-message", msg);
    });
    socket.on("disconnecting", () => {
      socket.rooms.forEach(room => {
        if (roomPlayers[room]) {
          delete roomPlayers[room][socket.id];
          io.to(room).emit("players-update", Object.values(roomPlayers[room]));
        }
      });
    });
  });

  // Serve static files (Hybrid Mode)
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("TRPG Game is loading... Please refresh in 5 seconds.");
    }
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`TRPG Server is now open on port ${PORT}`);
  });
}

startServer();
