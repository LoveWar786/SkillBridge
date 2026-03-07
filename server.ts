import express from "express";
import { createServer as createViteServer } from "vite";
import { initializeApp, cert, getApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
try {
  if (getApps().length === 0) {
    initializeApp();
  }
} catch (error) {
  console.error("Firebase Admin initialization failed:", error);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Stats Endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const db = getFirestore();
      
      // Count users
      const usersSnapshot = await db.collection('users').count().get();
      const usersCount = usersSnapshot.data().count;

      // Count analyses
      const analysesSnapshot = await db.collection('analyses').count().get();
      const analysesCount = analysesSnapshot.data().count;

      res.json({
        users: usersCount,
        analyses: analysesCount
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving would go here
    // But for this environment, we focus on dev/preview
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
