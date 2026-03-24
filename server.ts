import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import http from "http";
import path from "path";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Socket.io signaling logic
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId) => {
      // Leave all other rooms first (except their own socket id room)
      const roomsToLeave = Array.from(socket.rooms).filter(r => r !== socket.id);
      for (const room of roomsToLeave) {
        socket.leave(room);
        socket.to(room).emit("user-disconnected", socket.id);
      }

      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
      
      // Notify others in the room
      socket.to(roomId).emit("user-joined", socket.id);
      
      // Send the list of existing users in the room to the new user
      const clients = io.sockets.adapter.rooms.get(roomId);
      const usersInRoom = clients ? Array.from(clients).filter(id => id !== socket.id) : [];
      socket.emit("room-users", usersInRoom);
    });

    socket.on("leave-room", (roomId) => {
      socket.leave(roomId);
      console.log(`User ${socket.id} left room ${roomId}`);
      socket.to(roomId).emit("user-disconnected", socket.id);
    });

    socket.on("offer", (payload) => {
      io.to(payload.target).emit("offer", payload);
    });

    socket.on("answer", (payload) => {
      io.to(payload.target).emit("answer", payload);
    });

    socket.on("ice-candidate", (incoming) => {
      io.to(incoming.target).emit("ice-candidate", incoming);
    });

    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          socket.to(room).emit("user-disconnected", socket.id);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
