/**
 * Real-time Chat Server with Clustering Support
 *
 * This application implements a scalable real-time chat server using Socket.IO
 * with clustering capabilities to utilize multiple CPU cores. The server uses SQLite
 * for message persistence and supports connection state recovery.
 *
 * Features:
 * - Multi-core scaling using Node.js cluster module
 * - Real-time bidirectional communication with Socket.IO
 * - Message persistence in SQLite database
 * - Connection state recovery for clients that disconnect and reconnect
 * - Automatic load balancing across worker processes
 *
 * Architecture:
 * - Primary process: Spawns worker processes equal to available CPU cores
 * - Worker processes: Each runs an Express server on a different port (starting at 3000)
 * - Socket.IO cluster adapter: Enables cross-worker communication for broadcasting messages
 *
 * Database Schema:
 * - messages: Stores chat messages with auto-incrementing IDs and client offsets
 *   for deduplication and recovery
 */

import express from "express";
import { createServer } from "node:http";
import { join } from "node:path";
import { Server, Socket } from "socket.io";
import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import { availableParallelism } from "node:os";
import cluster from "node:cluster";
import { createAdapter, setupPrimary } from "@socket.io/cluster-adapter";

interface MessageRow {
  id: number;
  content: string;
}

if (cluster.isPrimary) {
  const numCPUs = availableParallelism();
  console.log(`Primary ${process.pid} is running`);
  console.log(`Starting ${numCPUs} workers...`);

  for (let i = 0; i < numCPUs; i++) {
    // Set environment variables properly for worker processes
    process.env.PORT = (3000 + i).toString();
    cluster.fork();
  }

  setupPrimary();

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
  });
} else {
  // Worker process
  async function main(): Promise<void> {
    const db = await open({
      filename: "chat.db",
      driver: sqlite3.Database,
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_offset TEXT UNIQUE,
        content TEXT
      );
    `);

    const app = express();
    const server = createServer(app);
    const io = new Server(server, {
      connectionStateRecovery: {},
      adapter: createAdapter(),
    });

    app.get("/", (req, res) => {
      res.sendFile(join(__dirname, "index.html"));
    });

    io.on("connection", async (socket: Socket) => {
      console.log(`New client connected: ${socket.id}`);

      socket.on(
        "chat message",
        async (msg: string, clientOffset: string, callback: () => void) => {
          try {
            const result = await db.run(
              "INSERT INTO messages (content, client_offset) VALUES (?, ?)",
              msg,
              clientOffset
            );
            io.emit("chat message", msg, result.lastID);
            callback();
          } catch (e: any) {
            if (e.errno === 19) callback(); // SQLITE_CONSTRAINT
            else console.error("Database error:", e);
          }
        }
      );

      if (!socket.recovered) {
        try {
          await db.each<MessageRow>(
            "SELECT id, content FROM messages WHERE id > ?",
            [socket.handshake.auth.serverOffset || 0],
            (_err, row) => {
              socket.emit("chat message", row.content, row.id);
            }
          );
        } catch (e) {
          console.error("Error recovering messages:", e);
        }
      }

      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });

    // Get port from environment variable with fallback
    const port = parseInt(process.env.PORT || "3000", 10);

    server.listen(port, () => {
      console.log(
        `Worker ${process.pid} started server at http://localhost:${port}`
      );
    });
  }

  main().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
