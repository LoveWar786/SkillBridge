import express from "express";
import { sendChatMessageStream, analyzeJobReadiness, parseCV, generateSpeech } from "../services/geminiService";
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
try {
  if (getApps().length === 0) {
    initializeApp();
  }
} catch (error) {
  console.error("Firebase Admin initialization failed:", error);
}

const app = express();
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: "vercel" });
});

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

app.get("/api/stats", async (req, res) => {
  try {
    const db = getFirestore();
    const usersSnapshot = await db.collection('users').count().get();
    const usersCount = usersSnapshot.data().count;
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

export default app;
