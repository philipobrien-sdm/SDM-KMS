
export interface ProcessedData {
  summary: string;
  topics: string[]; // For Wiki
  risks: { risk: string; category: string }[]; // Extracted potential risks with PESTLE category
  keyPoints: string[]; // Key facts/figures
  entities: string[]; // People, orgs, places
}

export interface LocalFile {
  id: string;
  name: string;
  content: string;
  type: string;
  size: number;
  timestamp: number;
  summary?: string;
  processedData?: ProcessedData; // The AI-rationalized JSON layer
  isProcessing?: boolean;
}

export enum Sender {
  USER = 'user',
  BOT = 'bot',
}

export interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  isError?: boolean;
  timestamp: number;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
}

export type AppTab = 'library' | 'what-if' | 'report' | 'wiki' | 'email' | 'risk' | 'guidance';

// --- Structured Tool Responses ---

export interface RiskItem {
  id: string;
  source: string; // Filename or "Manual" or "AI Draft"
  riskDescription: string;
  category: string;
  probability: number; // 1-5
  impact: number; // 1-5
  mitigationStrategy: string;
}

export interface RiskAnalysisData {
  risks: RiskItem[];
  gapAnalysis: string[]; // List of potential risks not considered
}

export interface WikiEntry {
  term: string;
  definition: string;
  relatedContext: string;
}

export interface WikiNodeData {
  entries: WikiEntry[];
  content?: string; // User added expert opinion/notes
  files?: LocalFile[]; // Files attached specifically to this node
}

export interface WikiCache {
  [term: string]: WikiNodeData;
}

export interface ReportSection {
  heading: string;
  content: string;
}

export interface ReportData {
  title: string;
  executiveSummary: string;
  keyFindings: string[];
  sections: ReportSection[];
  conclusion: string;
}

export interface EmailDraft {
  subject: string;
  body: string;
  toneAnalysis: string; // AI explanation of how it matched the sliders
}

// --- Logging ---

export type LogLevel = 'info' | 'success' | 'warning' | 'error';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  details?: string;
}