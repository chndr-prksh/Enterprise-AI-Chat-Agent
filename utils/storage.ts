
import { KnowledgeBase, ChatMessage, User, SharedInsight } from '../types';

const DB_NAME = 'ShapeAIChatDB_MultiUser';
const DB_VERSION = 2; // Incremented version for new stores
const STORES = {
  GLOBAL: 'global_store', // Settings like API Key
  USERS: 'users', // User accounts
  KNOWLEDGE_BASES: 'knowledge_bases', // Shared KBs
  CHATS: 'chat_history', // Scoped by UserID + BaseID
  INSIGHTS: 'shared_insights' // Global shared learning
};

export const StorageUtils = {
  getDB: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORES.GLOBAL)) db.createObjectStore(STORES.GLOBAL);
        if (!db.objectStoreNames.contains(STORES.USERS)) db.createObjectStore(STORES.USERS, { keyPath: 'username' });
        if (!db.objectStoreNames.contains(STORES.KNOWLEDGE_BASES)) db.createObjectStore(STORES.KNOWLEDGE_BASES, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORES.INSIGHTS)) db.createObjectStore(STORES.INSIGHTS, { keyPath: 'id' });
        // Chats stored as simple key-value blobs in GLOBAL for simplicity in previous version, 
        // but for multi-user we will store them in GLOBAL with composite keys or a separate store.
        // Let's stick to GLOBAL store for dynamic keys to minimize migration friction, 
        // but prefix keys with userID.
      };
    });
  },

  // Generic Helpers
  get: async <T>(storeName: string, key: string): Promise<T | null> => {
    const db = await StorageUtils.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  },

  put: async (storeName: string, value: any, key?: string): Promise<void> => {
    const db = await StorageUtils.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = key ? store.put(value, key) : store.put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  getAll: async <T>(storeName: string): Promise<T[]> => {
    const db = await StorageUtils.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  },

  // --- Auth & Users ---
  registerUser: async (username: string): Promise<User> => {
    const existing = await StorageUtils.get<User>(STORES.USERS, username);
    if (existing) throw new Error("Username already taken");

    const newUser: User = {
      id: crypto.randomUUID(),
      username,
      createdAt: Date.now()
    };
    await StorageUtils.put(STORES.USERS, newUser);
    return newUser;
  },

  loginUser: async (username: string): Promise<User> => {
    const user = await StorageUtils.get<User>(STORES.USERS, username);
    if (!user) throw new Error("User not found");
    return user;
  },

  // --- API Key (Global for simplicity, or could be per user) ---
  // The requirement says "Multi-User API Key Use... It works fine".
  // We will keep it in LocalStorage for simplicity across sessions or Global Store.
  getApiKey: async (): Promise<string | null> => {
    return StorageUtils.get(STORES.GLOBAL, 'gemini_api_key');
  },
  setApiKey: async (key: string) => {
    return StorageUtils.put(STORES.GLOBAL, key, 'gemini_api_key');
  },
  removeApiKey: async () => {
    // Implementing remove by putting null or deleting
    const db = await StorageUtils.getDB();
    const tx = db.transaction(STORES.GLOBAL, 'readwrite');
    tx.objectStore(STORES.GLOBAL).delete('gemini_api_key');
  },

  // --- Knowledge Bases (Shared/Global) ---
  getKnowledgeBases: async (): Promise<KnowledgeBase[]> => {
    return StorageUtils.getAll<KnowledgeBase>(STORES.KNOWLEDGE_BASES);
  },
  saveKnowledgeBase: async (kb: KnowledgeBase) => {
    return StorageUtils.put(STORES.KNOWLEDGE_BASES, kb);
  },
  deleteKnowledgeBase: async (id: string) => {
    const db = await StorageUtils.getDB();
    const tx = db.transaction(STORES.KNOWLEDGE_BASES, 'readwrite');
    tx.objectStore(STORES.KNOWLEDGE_BASES).delete(id);
  },

  // --- Chat History (Private - Scoped to User) ---
  // Key format: chat_history_{userId}
  getUserChatHistory: async (userId: string): Promise<Record<string, ChatMessage[]>> => {
    return (await StorageUtils.get(STORES.GLOBAL, `chat_history_${userId}`)) || {};
  },
  saveUserChatHistory: async (userId: string, history: Record<string, ChatMessage[]>) => {
    return StorageUtils.put(STORES.GLOBAL, history, `chat_history_${userId}`);
  },

  // --- Shared Learning (Global Insights) ---
  getSharedInsights: async (): Promise<SharedInsight[]> => {
    return StorageUtils.getAll<SharedInsight>(STORES.INSIGHTS);
  },
  addSharedInsight: async (insight: SharedInsight) => {
    return StorageUtils.put(STORES.INSIGHTS, insight);
  },

  // --- Migration ---
  migrateFromLocalStorage: async () => {
    // Existing migration logic simplified for brevity, ensuring IDB is ready
    // This is handled by onupgradeneeded mainly.
    // Ensure we move any old "single user" data to a default "admin" user if needed?
    // For now, fresh start for multi-user logic is cleaner, or we assume empty.
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};
