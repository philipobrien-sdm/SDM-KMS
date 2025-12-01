
import { GoogleGenAI, Chat, Part, Content, Schema, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { LocalFile, ProcessedData } from "../types";

// Initialize API Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

let chatSession: Chat | null = null;
let currentFileContextHash: string = "";

const generateFileHash = (files: LocalFile[]): string => {
  return files.map(f => `${f.name}-${f.size}`).join('|');
};

// Helper to chunk text safely
const chunkText = (text: string, chunkSize: number = 50000): string[] => {
    if (text.length <= chunkSize) return [text];
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        let end = Math.min(i + chunkSize, text.length);
        // Try to find a safe break point (newline or period) if not at end
        if (end < text.length) {
            const lastNewline = text.lastIndexOf('\n', end);
            if (lastNewline > i + chunkSize * 0.8) {
                 end = lastNewline + 1;
            } else {
                 const lastPeriod = text.lastIndexOf('.', end);
                 if (lastPeriod > i + chunkSize * 0.8) end = lastPeriod + 1;
            }
        }
        chunks.push(text.slice(i, end));
        i = end;
    }
    return chunks;
};

const getSystemInstruction = (files: LocalFile[]): string => {
  // Optimization: Use processed data for system instruction if available to save tokens
  let context = "You are a helpful, intelligent research assistant capable of analyzing documents.\n";
  
  const processedFiles = files.filter(f => f.processedData);
  if (processedFiles.length > 0) {
      context += "Here is a summary of the available knowledge base:\n";
      processedFiles.forEach(f => {
          context += `- File: ${f.name}\n  Summary: ${f.processedData?.summary}\n`;
      });
      context += "\nUse this high-level context to answer questions. If specific details are needed, you can refer to the raw file content provided in the history.";
  } else {
      context += `RULES:
      1. Strictly use the provided file content as your primary source of truth.
      2. If the answer is not in the files, state that clearly.
      3. Be concise but thorough.`;
  }

  return context;
};

/**
 * Constructs the content parts for files.
 * Used for both Chat history and One-shot tool generation.
 */
const getFileParts = (files: LocalFile[]): Part[] => {
  if (files.length === 0) return [];
  
  const parts: Part[] = [];
  parts.push({ text: "Here are the uploaded documents you need to analyze:\n" });

  files.forEach((file, index) => {
    const header = `\n--- FILE ${index + 1}: ${file.name} ---\n`;
    if (file.type === 'application/pdf') {
      parts.push({ text: header });
      parts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: file.content
        }
      });
    } else {
       // Truncate for general chat context if huge, relied on Ingestion for deep details
      const content = file.content.length > 200000 ? file.content.substring(0, 200000) + "\n...(Truncated for Chat)..." : file.content;
      parts.push({ text: header + content });
    }
  });
  return parts;
};

// --- DOCUMENT INGESTION & RATIONALIZATION ---

const INGESTION_SCHEMA: Schema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING },
        topics: { type: Type.ARRAY, items: { type: Type.STRING } },
        risks: { 
            type: Type.ARRAY, 
            items: { 
                type: Type.OBJECT, 
                properties: { 
                    risk: { type: Type.STRING }, 
                    category: { type: Type.STRING, description: "One of: Political, Economic, Social, Technological, Legal, Environmental, or Operational" } 
                } 
            } 
        },
        keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
        entities: { type: Type.ARRAY, items: { type: Type.STRING } }
    }
};

const processChunk = async (chunkText: string, isPDF: boolean, fileName: string): Promise<ProcessedData> => {
    const parts: Part[] = [];
    parts.push({ text: `Analyze this document segment from (${fileName}). Extract key intelligence.\n` });
    
    if (isPDF) {
         parts.push({ inlineData: { mimeType: 'application/pdf', data: chunkText } });
    } else {
         parts.push({ text: chunkText });
    }

    parts.push({ text: `\n\nTASK: 
    1. Write a concise summary of this section.
    2. List key topics/concepts.
    3. List explicit or implied risks and CATEGORIZE them using PESTLE (Political, Economic, Social, Technological, Legal, Environmental) or Operational.
    4. Extract key data points.
    5. List key entities.
    
    Output strictly valid JSON.` });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { role: 'user', parts: parts },
            config: {
                responseMimeType: 'application/json',
                responseSchema: INGESTION_SCHEMA,
                temperature: 0.2,
                maxOutputTokens: 8192,
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            }
        });
        
        const text = response.text;
        if (!text) {
             const finishReason = response.candidates?.[0]?.finishReason;
             console.warn(`Ingestion Chunk Warning: No text returned. Reason: ${finishReason}`);
             // Return empty structure to allow aggregation to continue instead of failing entire file
             return { summary: "", topics: [], risks: [], keyPoints: [], entities: [] };
        }
        return JSON.parse(text) as ProcessedData;

    } catch (e: any) {
        console.error("Process Chunk Error:", e);
        // Return empty structure on error to handle gracefully
        return { summary: "", topics: [], risks: [], keyPoints: [], entities: [] };
    }
};

export const processDocumentIngestion = async (file: LocalFile): Promise<ProcessedData> => {
    try {
        const isPDF = file.type === 'application/pdf';
        
        // If PDF (assumed optimized by backend) or small text, process directly
        if (isPDF || file.content.length < 60000) {
             return await processChunk(file.content, isPDF, file.name);
        }

        // Large Text File Strategy
        const chunks = chunkText(file.content);
        const results: ProcessedData[] = [];
        
        // Process chunks sequentially to avoid rate limits, or parallel if few
        for (const chunk of chunks) {
            const result = await processChunk(chunk, false, file.name);
            results.push(result);
        }

        // Aggregate Results
        const aggregated: ProcessedData = {
            summary: results.map(r => r.summary).filter(s => s).join('\n\n'),
            topics: Array.from(new Set(results.flatMap(r => r.topics || []))),
            risks: results.flatMap(r => r.risks || []), 
            keyPoints: results.flatMap(r => r.keyPoints || []),
            entities: Array.from(new Set(results.flatMap(r => r.entities || [])))
        };

        // Optional: Run a final "Synthesis" pass if summary is too long
        if (aggregated.summary.length > 2000) {
             // Could trigger a summarization of the summary here, skipping for speed/simplicity now
             aggregated.summary = aggregated.summary.substring(0, 2000) + "...(Synthesized from multiple sections)";
        }

        return aggregated;

    } catch (e: any) {
        console.error("Ingestion Error:", e);
        return {
            summary: "Analysis failed.",
            topics: [],
            risks: [],
            keyPoints: [],
            entities: []
        };
    }
};

// --- WIKI PARENT SUGGESTION ---

const PARENT_SUGGESTION_SCHEMA: Schema = {
    type: Type.OBJECT,
    properties: {
        suggestedParent: { type: Type.STRING },
        reasoning: { type: Type.STRING }
    }
};

export const suggestWikiParent = async (newTerm: string, newDefinition: string, existingNodes: string[]): Promise<{ suggestedParent: string, reasoning: string }> => {
    try {
        if (existingNodes.length <= 1) return { suggestedParent: 'ROOT', reasoning: 'No other nodes available.' };

        const prompt = `We are organizing a knowledge graph.
        New Node: "${newTerm}" - ${newDefinition}
        
        Existing Nodes:
        ${existingNodes.join(', ')}
        
        Task: Select the Best Existing Node to be the PARENT of the New Node.
        If no specific node fits well, select 'ROOT'.
        Return strictly JSON.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { role: 'user', parts: [{ text: prompt }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: PARENT_SUGGESTION_SCHEMA,
                temperature: 0.1,
            }
        });
        
        const text = response.text;
        if (!text) return { suggestedParent: 'ROOT', reasoning: 'Model failed.' };
        return JSON.parse(text);

    } catch (e) {
        console.error("Suggestion Error", e);
        return { suggestedParent: 'ROOT', reasoning: 'Error during suggestion.' };
    }
};


/**
 * Chat Stream (What If Engine)
 */
export const streamGeminiResponse = async (
  userMessage: string,
  files: LocalFile[],
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
) => {
  try {
    const fileHash = generateFileHash(files);

    if (!chatSession || fileHash !== currentFileContextHash) {
      const fileParts = getFileParts(files);
      // We use the dynamic system instruction based on processed data
      const sysInstruction = getSystemInstruction(files);
      
      const history: Content[] = fileParts.length > 0 ? [
        { role: 'user', parts: fileParts },
        { role: 'model', parts: [{ text: "I have received the documents and their context." }] }
      ] : [];
      
      chatSession = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: history,
        config: {
          systemInstruction: sysInstruction,
          temperature: 0.5, 
        },
      });
      currentFileContextHash = fileHash;
    }

    const resultStream = await chatSession.sendMessageStream({ message: userMessage });

    for await (const chunk of resultStream) {
       if (chunk.text) {
         onChunk(chunk.text);
       }
    }
    onComplete();

  } catch (err: any) {
    console.error("Gemini API Error:", err);
    onError(err.message || "An error occurred while contacting Gemini.");
  }
};

export const resetChatSession = () => {
  chatSession = null;
  currentFileContextHash = "";
};

/**
 * Standard Text Generation (Non-JSON)
 */
export const generateTextResponse = async (
  prompt: string,
  files: LocalFile[]
): Promise<string> => {
  try {
    const fileParts = getFileParts(files);
    const parts = [
      ...fileParts,
      { text: prompt }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { role: 'user', parts: parts },
      config: {
        temperature: 0.4,
        maxOutputTokens: 4096,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text returned from model.");
    return text;

  } catch (err: any) {
    console.error("Gemini Text Error:", err);
    throw new Error(err.message || "Failed to generate text.");
  }
};

export const generateDocumentSummary = async (file: LocalFile): Promise<string> => {
    if (file.processedData?.summary) return file.processedData.summary;
    const data = await processDocumentIngestion(file);
    return data.summary;
}

export const generateStructuredResponse = async <T>(
  prompt: string,
  files: LocalFile[],
  responseSchema: Schema
): Promise<T> => {
  try {
    const fileParts = getFileParts(files);
    const parts = [
      ...fileParts, 
      { text: `\n\nSYSTEM_NOTE: You are a data extraction expert. Output strictly valid JSON based on the schema. \nCRITICAL TOKEN LIMITS: You have a very strict token limit. Keep string values, summaries, and definitions EXTREMELY CONCISE (under 25 words unless specified). Do NOT be verbose. Do not add filler text.` },
      { text: `\n\nTASK:\n${prompt}` }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { role: 'user', parts: parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.3,
        maxOutputTokens: 8192,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      }
    });

    const text = response.text;
    
    if (!text) {
       const candidate = response.candidates?.[0];
       if (candidate?.finishReason) {
           if (candidate.finishReason === 'SAFETY') throw new Error("The model blocked the response due to safety settings.");
           if (candidate.finishReason === 'MAX_TOKENS') throw new Error("The model ran out of tokens. The response was too long.");
           throw new Error(`Model stopped generating. Reason: ${candidate.finishReason}`);
       }
       throw new Error("No data returned from model.");
    }
    
    return JSON.parse(text) as T;

  } catch (err: any) {
    console.error("Gemini Structured Error:", err);
    throw new Error(err.message || "Failed to generate structured data.");
  }
};
