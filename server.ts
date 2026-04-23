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

  const PORT = Number(process.env.PORT) || 5000;
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

  // Universal Health Check

  // Socket.io for Real-time TRPG
  const roomMessages = {};
  const roomPlayers = {};
  const roomOwners = {};

  io.on("connection", (socket) => {
    socket.on("join-room", (room) => {
      socket.join(room);
      if (!roomPlayers[room]) roomPlayers[room] = {};
      
      // Keep existing player info if it exists or create new
      if (!roomPlayers[room][socket.id]) {
        roomPlayers[room][socket.id] = { 
          id: socket.id, 
          isReady: false,
          name: "탐험가",
          race: "모험가",
          job: "시작인"
        };
      }
      
      if (!roomOwners[room]) {
        roomOwners[room] = socket.id;
      }
      
      socket.emit("room-owner", roomOwners[room]);
      io.to(room).emit("players-update", Object.values(roomPlayers[room]));
      if (roomMessages[room]) {
        socket.emit("room-history", roomMessages[room]);
      }
    });

    socket.on("check-room", (room, callback) => {
      const roomExists = roomPlayers[room] && Object.keys(roomPlayers[room]).length > 0;
      callback(roomExists);
    });

    socket.on("update-player-status", ({ room, userInfo, isReady }) => {
      if (roomPlayers[room] && roomPlayers[room][socket.id]) {
        roomPlayers[room][socket.id] = { 
          ...roomPlayers[room][socket.id],
          ...userInfo,
          isReady 
        };
        
        io.to(room).emit("players-update", Object.values(roomPlayers[room]));

        // Check if all players are ready
        const players = Object.values(roomPlayers[room]);
        if (players.length >= 1 && players.every((p: any) => p.isReady)) {
          io.to(room).emit("all-ready-start");
        }
      }
    });

    socket.on("send-message", ({ room, message }) => {
      const msg = { 
        id: Math.random().toString(36).substr(2, 9), 
        ...message, 
        timestamp: new Date().toISOString() 
      };
      if (!roomMessages[room]) roomMessages[room] = [];
      roomMessages[room].push(msg);
      io.to(room).emit("new-message", msg);
    });

    socket.on("disconnecting", () => {
      socket.rooms.forEach(room => {
        if (roomPlayers[room]) {
          delete roomPlayers[room][socket.id];
          
          if (Object.keys(roomPlayers[room]).length === 0) {
            delete roomPlayers[room];
            delete roomOwners[room];
            delete roomMessages[room];
          } else if (roomOwners[room] === socket.id) {
            roomOwners[room] = Object.keys(roomPlayers[room])[0];
            io.to(room).emit("room-owner", roomOwners[room]);
          }
          
          if (roomPlayers[room]) {
            io.to(room).emit("players-update", Object.values(roomPlayers[room]));
          }
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
