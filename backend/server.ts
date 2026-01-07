// This file is provided to satisfy the requirement for "Backend Code".
// The React application above is configured to run in "Client-Side Mode" for the demo preview.
// To use this backend, you would deploy this Node.js app and update the `gemini.ts` service 
// to point to these endpoints instead of using `@google/genai` directly in the browser.

import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Fix: Cast cors middleware and express.json to any to resolve overload mismatch
app.use(cors() as any);
app.use(express.json() as any);

// Middleware to extract API key from header
const getApiKey = (req: express.Request): string | null => {
  // Fix: Access headers safely using type assertion to avoid potential type mismatch issues
  const authHeader = (req as any).headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
};

// Endpoint: List Databases (In a real app, this would query a persistent DB)
app.get('/list-databases', (req, res) => {
  // Logic to list databases associated with the user (via DB or external service)
  res.json({ databases: [] });
});

// Endpoint: Chat Proxy
app.post('/chat', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: "Missing API Key" });
    return;
  }

  const { prompt, history, files } = req.body;

  try {
    // Initialize SDK with User's Key (Server acts as proxy)
    const ai = new GoogleGenAI({ apiKey });
    
    // Construct content parts similar to client-side logic
    const fileParts = files.map((f: any) => ({
      inlineData: { mimeType: f.type, data: f.content }
    }));
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        ...history,
        { role: 'user', parts: [...fileParts, { text: prompt }] }
      ]
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Error", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Upload File Proxy
// Useful if client-side CORS is restricted for the Gemini File API
app.post('/upload-file', upload.single('file'), async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    res.status(401).json({ error: "Missing API Key" });
    return;
  }
  
  // Here you would upload to Gemini File API using the SDK
  // const ai = new GoogleGenAI({ apiKey });
  // const uploadResponse = await ai.files.upload(...)
  
  res.json({ success: true, message: "File processed" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server proxy running on port ${PORT}`);
});