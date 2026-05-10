import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { initializeApp, cert, getApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { sendChatMessageStream, analyzeJobReadiness, parseCV, generateSpeech } from "./services/geminiService";

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

  // Gemini Proxy Routes
  app.post("/api/chat", async (req, res) => {
    try {
      const { history, newMessage, attachment } = req.body;
      const stream = sendChatMessageStream(history, newMessage, attachment);
      let finalResult = { text: "", sources: [] };
      for await (const chunk of stream) {
          finalResult = chunk;
      }
      res.json(finalResult);
    } catch (error: any) {
      console.error("Server Chat Error:", error);
      res.status(500).json({ error: error.message || "Failed to process chat" });
    }
  });

  app.post("/api/analyze", async (req, res) => {
    try {
      const { profile, jobContext } = req.body;
      const result = await analyzeJobReadiness(profile, jobContext);
      res.json(result);
    } catch (error: any) {
      console.error("Server Analysis Error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze job readiness" });
    }
  });

  app.post("/api/parse-cv", async (req, res) => {
    try {
      const { fileData, mimeType } = req.body;
      const result = await parseCV(fileData, mimeType);
      res.json(result);
    } catch (error: any) {
      console.error("Server CV Parse Error:", error);
      res.status(500).json({ error: error.message || "Failed to parse CV" });
    }
  });

  app.post("/api/speech", async (req, res) => {
    try {
      const { text } = req.body;
      const result = await generateSpeech(text);
      res.json(result);
    } catch (error: any) {
      console.error("Server Speech Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate speech" });
    }
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
    // Production static file serving
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const distPath = path.resolve(__dirname, "dist");
    
    app.use(express.static(distPath));
    
    // SPA Fallback: Serve index.html for any route that doesn't match an API or static file
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
