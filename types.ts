
export interface KnowledgeBase {
  id: string;
  name: string;
  createdAt: number;
  files: StoredFile[];
}

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string; // Base64 encoded content for inline context
  uploadedAt: number;
}

export interface Citation {
  source: string;
  context: string;
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'file';
  mimeType: string;
  name: string;
  content: string; // Base64
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isError?: boolean;
  citations?: Citation[];
  attachments?: ChatAttachment[];
  feedback?: 'thumbs_up' | 'thumbs_down'; // Shared Learning signal
}

export interface User {
  id: string;
  username: string;
  createdAt: number;
}

export interface SharedInsight {
  id: string;
  content: string; // The Q&A pair or summary learned from feedback
  timestamp: number;
  sourceBaseId?: string;
}

export interface AppState {
  apiKey: string | null;
  knowledgeBases: KnowledgeBase[];
  activeBaseId: string | null;
  chatHistory: Record<string, ChatMessage[]>; // Keyed by Base ID
  currentUser: User | null;
}

export type ViewMode = 'manager' | 'chat';

export type ModelId = 'fast' | 'pro';
