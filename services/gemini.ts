
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { StoredFile, Citation, ModelId, ChatAttachment, SharedInsight } from "../types";

export const GeminiService = {
  async generateResponse(
    apiKey: string,
    prompt: string,
    files: StoredFile[],
    history: { role: string; parts: any[] }[],
    modelId: ModelId = 'fast',
    attachments: ChatAttachment[] = [],
    useWebSearch: boolean = false,
    sharedInsights: SharedInsight[] = []
  ): Promise<{ text: string; citations: Citation[] }> {
    const ai = new GoogleGenAI({ apiKey });

    // Prepare content parts
    const knowledgeBaseParts = files.map(file => ({
      inlineData: {
        mimeType: file.type,
        data: file.content
      }
    }));

    const attachmentParts = attachments.map(att => ({
        inlineData: {
            mimeType: att.mimeType,
            data: att.content
        }
    }));

    // Inject Shared Insights into the prompt context implicitly or via system prompt?
    // The requirement says "These learnings gradually update the internal team-wide model context".
    // We will inject the top/latest insights into the System Prompt to guide the model.
    const insightText = sharedInsights.length > 0 
      ? `\n\nTEAM SHARED LEARNINGS (Prioritize these patterns):\n${sharedInsights.slice(-10).map(i => `• ${i.content}`).join('\n')}`
      : "";

    const textPart = { text: prompt };
    
    // Updated System Instruction: Multi-User + Shared Learning + Web Search
    const systemInstruction = `You are Shape AI Chat, a multi-user internal AI assistant for our team.
Your job is to provide accurate, contextual, and continuously improving answers based on:
1. Public Knowledge Base (shared RAG)
2. Private User Chats (not visible to others)
3. Shared Learning (model improves using every user’s conversations)
4. Thumbs-up feedback loop (reinforces good answers)

${insightText}

⸻

CORE BEHAVIOR RULES

1. User Authentication & Session Handling
   - You are interacting with a specific logged-in user.
   - Respect their private chat history context.

2. Public Knowledge Base (Shared RAG Layer)
   - Use the provided documents (files) as the primary shared truth.
   - All users share these documents.

3. Handling File Uploads / Images (Ephemeral)
   - Files uploaded in this session are TEMPORARY.
   - Do NOT store them or assume they persist.
   - Use them immediately for analysis.

4. Shared Learning From All Users
   - The "TEAM SHARED LEARNINGS" section above contains insights derived from thumbs-up feedback.
   - Use these to align with team terminology, processes, and corrections.

5. Web Browsing
   - If the tool 'googleSearch' is available/enabled, use it to get broader context when the Knowledge Base is insufficient.

6. Response Formatting (Strict)
   - Use clear spacing, bullet points, and numbered lists.
   - Use emojis naturally.
   - Use clean section headings.
   - Tables: Only for summaries. No multiline text inside cells.
   - Tone: Professional, Confident, Insightful.

⸻

Output Style Examples

# 🚧 Title
Short intro.

## 🔍 Key Insights
- Point 1
- Point 2

## 📊 Summary
| Metric | Value |
| :--- | :--- |
| A | B |

## 📌 Final Thoughts
Wrap up.

⸻

🚫 Never Do This
   - No solid text blocks
   - No plain-text dumps
   - No citations unless asked ("Show sources")
`;

    try {
      const model = modelId === 'pro' ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
      
      const contents = [
        ...history, 
        {
          role: 'user',
          parts: [...knowledgeBaseParts, ...attachmentParts, textPart]
        }
      ];

      const tools: any[] = [];
      if (useWebSearch) {
        tools.push({ googleSearch: {} });
      }

      const response: GenerateContentResponse = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: modelId === 'pro' ? 0.4 : 0.3,
          tools: tools.length > 0 ? tools : undefined
        }
      });

      let text = response.text || "No response generated.";
      
      // Extract citations if present (legacy support)
      const citations: Citation[] = [];
      // Grounding metadata handling if web search was used
      if (useWebSearch && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
         response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
            if (chunk.web?.uri) {
                citations.push({ source: chunk.web.title || "Web Source", context: chunk.web.uri });
            }
         });
      }

      // Existing regex for file citations
      const regex = /\[Source:\s*([^,\]]+)(?:,\s*Context:\s*"([^"]+)")?\]/g;
      let match;
      const seen = new Set<string>();
      while ((match = regex.exec(text)) !== null) {
          const source = match[1].trim();
          const context = match[2] ? match[2].trim() : "Reference found in document";
          const key = `${source}-${context}`;
          if (!seen.has(key)) {
              citations.push({ source, context });
              seen.add(key);
          }
      }
      const cleanedText = text.replace(regex, '').trim();

      return { 
        text: citations.length > 0 ? cleanedText : text, 
        citations 
      };

    } catch (error: any) {
      console.error("Gemini API Error:", error);
      throw new Error(error.message || "Failed to generate response");
    }
  }
};
