// Always use import {GoogleGenAI} from "@google/genai";
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisResult, UserProfile, JobContext } from "../types";
import mammoth from "mammoth";

// Always initialize with direct access to process.env.API_KEY within the named parameter.
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Utility to extract JSON from a potentially messy string (e.g. if the model wraps it in markdown blocks)
 */
const extractJSON = (input: string): string => {
  const jsonMatch = input.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return input;
};

/**
 * Parses a DOCX ArrayBuffer to text.
 */
export const extractTextFromDocx = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error("Mammoth error:", error);
    throw new Error("Could not extract text from DOCX.");
  }
};

/**
 * Utility for exponential backoff retries
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000
): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Only retry on 429 (Rate Limit) or 5xx (Server Error)
      const isRateLimit = error.message?.includes("429") || error.status === 429 || JSON.stringify(error).includes("429");
      const isServerError = error.status >= 500 || JSON.stringify(error).includes("500");
      
      if (isRateLimit || isServerError) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`API error (${isRateLimit ? 'Rate Limit' : 'Server Error'}). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error; // Immediate fail for other errors (e.g. 400, 401, 403)
    }
  }
  throw lastError;
};

/**
 * Parses a CV (text or image base64) to extract a structured profile.
 */
export const parseCV = async (
  fileData: string,
  mimeType: string
): Promise<UserProfile> => {
  const model = "gemini-flash-latest";
  
  const prompt = `
    You are an expert Skills Analysis AI. Analyze the input document (Resume/CV/Bio).

    STRICT VALIDATION REQUIRED:
    - You MUST first determine if the uploaded document is a valid Resume, CV, or Professional Skills Profile.
    - If the document is irrelevant (e.g., a cooking recipe, a blank image, an essay about kittens, code without context), you MUST set 'isValid' to false.
    
    EXTRACTION RULES (Only if 'isValid' is true):
    1. **Summary**: Polish professionally. If missing, generate a brief professional summary based on skills.
    2. **Skills**: Extract explicit & INFER foundational skills (e.g. React -> JS). Max 20.
    3. **Experience**: Extract total years strictly.
       - **LOGIC**: Look for the *earliest* start date mentioned in the work history.
       - Perform calculation: (Current Year [2026] - Earliest Start Year).
       - Example: "Started career in 2015" or "Work History: ... 2015-2018" => 2026 - 2015 = 11 years.
       - If the user explicitly states "X years experience", use that.
       - Default to 0 if no dates found.

    Return JSON.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      isValid: { type: Type.BOOLEAN, description: "Set to false if the content is NOT a Resume/CV." },
      fullName: { type: Type.STRING },
      summary: { type: Type.STRING },
      experienceYears: { type: Type.NUMBER },
      skills: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING, enum: ['Technical', 'Soft', 'Tool', 'Domain'] },
            level: { type: Type.STRING, enum: ['Beginner', 'Intermediate', 'Advanced'] },
            evidence: { type: Type.STRING }
          },
          required: ["name", "category", "level"]
        }
      }
    },
    required: ["isValid", "skills", "experienceYears"]
  };

  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: fileData } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    }));

    if (!response.text) throw new Error("No response from AI");
    const parsed = JSON.parse(extractJSON(response.text));

    if (parsed.isValid === false) {
       throw new Error("INVALID_CONTENT");
    }

    if (!parsed.skills || !Array.isArray(parsed.skills)) parsed.skills = [];
    if (!parsed.summary) parsed.summary = "";
    if (typeof parsed.experienceYears !== 'number') parsed.experienceYears = 0;
    
    const hasSkills = parsed.skills.length > 0;
    const hasSummary = parsed.summary && parsed.summary.trim().length > 5;

    if (!hasSkills && !hasSummary) {
         throw new Error("EMPTY_CONTENT");
    }
    
    return parsed as UserProfile;
  } catch (error: any) {
    console.error("Error parsing CV:", error);
    if (error.message?.includes("429") || JSON.stringify(error).includes("429")) {
        throw new Error("The AI service is currently busy (Rate Limit Exceeded). Please wait a few seconds and try again.");
    }
    if (error.message === "INVALID_CONTENT" || error.message.includes("INVALID_CONTENT")) {
        throw new Error("The uploaded file does not appear to be a valid Resume or Professional Profile. Please upload a clear CV document or image.");
    }
    throw new Error("Failed to parse profile. Please ensure the file is a valid CV/Resume.");
  }
};

/**
 * Performs deep analysis of the profile against the job description.
 */
export const analyzeJobReadiness = async (
  profile: UserProfile,
  jobContext: JobContext
): Promise<{ result: AnalysisResult, modelUsed: string }> => {
  
  let model = "gemini-3-pro-preview";
  let thinkingConfig = undefined;
  let maxOutputTokens = 16384; 

  switch (jobContext.modelSpeed) {
    case 'fastest':
      model = "gemini-flash-lite-latest";
      maxOutputTokens = 16384;
      break;
    case 'balanced':
      model = "gemini-3-flash-preview";
      maxOutputTokens = 20000; // Reduced to avoid potential timeout/large response issues
      break;
    case 'deep':
    default:
      model = "gemini-3-pro-preview";
      thinkingConfig = { thinkingBudget: 12000 }; // Slightly reduced budget for stability
      maxOutputTokens = 32768; // Reduced from 65k to avoid timeouts
      break;
  }

  const jobDescText = jobContext.type === 'Generalized' 
    ? `Standard industry requirements for a ${jobContext.role} role.`
    : `Specific Job Description for ${jobContext.role} at ${jobContext.companyName || 'the company'}:\n${jobContext.description}`;

  const prompt = `
    Conduct a rigorous employability gap analysis.
    
    Candidate Profile: ${JSON.stringify(profile)}
    Job Target: ${jobDescText}

    TASK:
    1. Identify critical gaps. LIMIT to the TOP 5 most critical gaps only.
    2. Score readiness (0-100).
    3. Create a learning path. LIMIT to the TOP 4 logical steps only. 
       - Each step must have a clear 'title'.
       - **estimatedTime**: Provide realistic estimates. 
          - Example: "3 weeks (10h/week)", "4 hours".
    4. Suggest 3 alternative roles. Calculate a match percentage (0-100) for each.
    
    STRICT CONSTRAINTS:
    - 'executiveSummary' must be under 50 words. Be blunt and direct.
    - LIMIT 'skillGaps' array to 5 items maximum.
    - LIMIT 'learningPath' array to 4 items maximum.

    Return ONLY valid JSON.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      readinessScore: { type: Type.NUMBER },
      readinessLevel: { type: Type.STRING, enum: ['Not Ready', 'Novice', 'Partially Ready', 'Well Qualified', 'Job Ready'] },
      executiveSummary: { type: Type.STRING },
      skillGaps: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            skill: { type: Type.STRING },
            status: { type: Type.STRING, enum: ['Missing', 'Weak', 'Improvement Needed'] },
            reason: { type: Type.STRING },
            priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] }
          }
        }
      },
      learningPath: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            step: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            resourceName: { type: Type.STRING },
            resourceSuggestion: { type: Type.STRING },
            estimatedTime: { type: Type.STRING }
          },
          required: ["step", "title", "description", "resourceName", "resourceSuggestion", "estimatedTime"]
        }
      },
      alternativeRoles: { 
        type: Type.ARRAY, 
        items: { 
          type: Type.OBJECT,
          properties: {
            role: { type: Type.STRING },
            matchReason: { type: Type.STRING },
            matchPercentage: { type: Type.NUMBER }
          },
          required: ["role", "matchReason", "matchPercentage"]
        } 
      }
    },
    required: ["readinessScore", "readinessLevel", "executiveSummary", "skillGaps", "learningPath", "alternativeRoles"]
  };

  try {
    const config: any = {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      maxOutputTokens: maxOutputTokens
    };

    if (thinkingConfig && (model.includes('gemini-3') || model.includes('gemini-2.5'))) {
      config.thinkingConfig = thinkingConfig;
    }

    const response = await retryWithBackoff(() => ai.models.generateContent({
      model,
      contents: prompt,
      config: config
    }));

    if (!response.text) throw new Error("No analysis generated");
    
    const cleanJSON = extractJSON(response.text);
    const parsed = JSON.parse(cleanJSON);

    if (!parsed.skillGaps || !Array.isArray(parsed.skillGaps)) parsed.skillGaps = [];
    if (!parsed.learningPath || !Array.isArray(parsed.learningPath)) parsed.learningPath = [];
    if (!parsed.alternativeRoles || !Array.isArray(parsed.alternativeRoles)) parsed.alternativeRoles = [];
    if (!parsed.executiveSummary) parsed.executiveSummary = "Analysis pending...";
    if (typeof parsed.readinessScore !== 'number') parsed.readinessScore = 0;
    
    parsed.learningPath.forEach((item: any) => {
        if (!item.title) item.title = item.step;
        if (!item.estimatedTime) item.estimatedTime = "Unknown duration";
    });

    return { result: parsed as AnalysisResult, modelUsed: model };
  } catch (error: any) {
    console.error("Analysis failed:", error);
    if (error.message?.includes("429") || JSON.stringify(error).includes("429")) {
        throw new Error("You've hit the API rate limit for the 'Deep Reasoning' model. Please wait 60 seconds or try the 'Balanced' model which has higher limits.");
    }
    throw new Error("Analysis failed. The response may have been too large or the API hit a timeout. Please try again with the 'Balanced' model.");
  }
};

/**
 * Chat with the AI about career advice using Search Grounding.
 */
export const sendChatMessage = async (
  history: { role: string, content: string }[],
  newMessage: string,
  attachment?: { type: 'image' | 'file', preview: string, name: string }
) => {
  const model = "gemini-3-flash-preview";
  const context = history.map(h => `${h.role}: ${h.content}`).join('\n');
  
  const parts: any[] = [{ text: `Context: ${context}\nUser: ${newMessage}\nProvide concise career advice. Use Markdown for bolding key terms. Use Search Grounding.` }];

  if (attachment) {
      const base64Data = attachment.preview.split(',')[1];
      const mimeType = attachment.preview.split(';')[0].split(':')[1];
      
      if (attachment.name.toLowerCase().endsWith('.docx')) {
         try {
             const binaryString = atob(base64Data);
             const bytes = new Uint8Array(binaryString.length);
             for (let i = 0; i < binaryString.length; i++) {
                 bytes[i] = binaryString.charCodeAt(i);
             }
             const text = await extractTextFromDocx(bytes.buffer);
             parts[0].text += `\n\nAttached Document Content:\n${text}`;
         } catch (e) {
             console.error("Failed to parse docx", e);
             parts[0].text += `\n\n[User attached a document but it could not be read]`;
         }
      } else {
         parts.push({ inlineData: { mimeType, data: base64Data } });
      }
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: parts },
      config: { tools: [{ googleSearch: {} }] }
    });
    
    const text = response.text || "I couldn't generate a response.";
    
    // Extract sources from grounding chunks
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter((chunk: any) => chunk.web?.uri && chunk.web?.title)
      .map((chunk: any) => ({ 
        title: chunk.web.title, 
        uri: chunk.web.uri 
      }));

    return { text, sources };
  } catch (error) {
    console.error("Chat error:", error);
    return { text: "Error connecting to service. Please try again.", sources: [] };
  }
};

/**
 * Transform text into audio using the TTS model.
 */
export const generateSpeech = async (text: string): Promise<{ audioData: string } | null> => {
  const model = "gemini-2.5-flash-preview-tts";
  try {
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text }] },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
    });
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return audioData ? { audioData } : null;
  } catch (error) {
    return null;
  }
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export function base64ToArrayBuffer(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}