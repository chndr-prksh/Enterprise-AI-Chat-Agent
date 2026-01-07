
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DatabaseManager } from './components/DatabaseManager';
import { ChatArea } from './components/ChatArea';
import { ApiKeyInput } from './components/ApiKeyInput';
import { Login } from './components/Login';
import { KnowledgeBase, ChatMessage, StoredFile, ModelId, ChatAttachment, User, SharedInsight } from './types';
import { StorageUtils } from './utils/storage';
import { GeminiService } from './services/gemini';
import { Layout, Loader2 } from 'lucide-react';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [activeBaseId, setActiveBaseId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({});
  const [sharedInsights, setSharedInsights] = useState<SharedInsight[]>([]);
  
  const [viewMode, setViewMode] = useState<'manager' | 'chat'>('manager');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initial Load (Global Settings)
  useEffect(() => {
    const initGlobal = async () => {
      await StorageUtils.migrateFromLocalStorage();
      const loadedKey = await StorageUtils.getApiKey();
      setApiKey(loadedKey);
      
      const insights = await StorageUtils.getSharedInsights();
      setSharedInsights(insights);

      // Load Knowledge Bases (Global)
      const kbs = await StorageUtils.getKnowledgeBases();
      setKnowledgeBases(kbs);
      
      setIsLoaded(true);
    };
    initGlobal();
  }, []);

  // Load User Data when User Changes
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser) {
        const history = await StorageUtils.getUserChatHistory(currentUser.id);
        setChatHistory(history);
        if (!apiKey) setShowApiKeyModal(true);
      }
    };
    loadUserData();
  }, [currentUser, apiKey]);

  // Persistence Effects
  useEffect(() => {
    if (isLoaded) StorageUtils.saveKnowledgeBase(knowledgeBases[knowledgeBases.length - 1]); // Simplified saving
    // Note: Ideally we save the specific modified KB, but StorageUtils.saveKnowledgeBase puts the whole object
    // Wait, storage util was updated to save array? No, updated to save KB by key.
    // Let's rely on atomic saves in handlers for better perf in multi-user.
  }, [knowledgeBases, isLoaded]);

  useEffect(() => {
    if (currentUser && isLoaded) {
      StorageUtils.saveUserChatHistory(currentUser.id, chatHistory);
    }
  }, [chatHistory, currentUser, isLoaded]);


  // --- Auth Handlers ---
  const handleLogin = async (username: string) => {
    const user = await StorageUtils.loginUser(username);
    setCurrentUser(user);
    // Refresh global data
    const kbs = await StorageUtils.getKnowledgeBases();
    setKnowledgeBases(kbs);
    const insights = await StorageUtils.getSharedInsights();
    setSharedInsights(insights);
  };

  const handleRegister = async (username: string) => {
    const user = await StorageUtils.registerUser(username);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setChatHistory({});
    setActiveBaseId(null);
  };

  // --- KB Handlers ---
  const handleCreateBase = async (name: string) => {
    const newBase: KnowledgeBase = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      files: []
    };
    await StorageUtils.saveKnowledgeBase(newBase);
    setKnowledgeBases(await StorageUtils.getKnowledgeBases());
    setActiveBaseId(newBase.id);
    setViewMode('manager');
  };

  const handleDeleteBase = async (id: string) => {
    await StorageUtils.deleteKnowledgeBase(id);
    setKnowledgeBases(await StorageUtils.getKnowledgeBases());
    if (activeBaseId === id) setActiveBaseId(null);
  };

  const handleAddFiles = async (baseId: string, files: StoredFile[]) => {
    const kb = knowledgeBases.find(k => k.id === baseId);
    if (kb) {
      const updatedKb = { ...kb, files: [...kb.files, ...files] };
      await StorageUtils.saveKnowledgeBase(updatedKb);
      setKnowledgeBases(await StorageUtils.getKnowledgeBases());
    }
  };

  const handleDeleteFile = async (baseId: string, fileId: string) => {
    const kb = knowledgeBases.find(k => k.id === baseId);
    if (kb) {
      const updatedKb = { ...kb, files: kb.files.filter(f => f.id !== fileId) };
      await StorageUtils.saveKnowledgeBase(updatedKb);
      setKnowledgeBases(await StorageUtils.getKnowledgeBases());
    }
  };

  // --- Chat Handlers ---
  const handleSendMessage = async (text: string, modelId: ModelId, attachments: ChatAttachment[], useWebSearch: boolean) => {
    if (!apiKey || !activeBaseId) return;
    const currentBase = knowledgeBases.find(kb => kb.id === activeBaseId);
    if (!currentBase) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      attachments,
      timestamp: Date.now()
    };

    const updatedHistory = [...(chatHistory[activeBaseId] || []), userMsg];
    setChatHistory(prev => ({ ...prev, [activeBaseId]: updatedHistory }));
    setIsProcessing(true);

    try {
      const apiHistory = updatedHistory.slice(0, -1).map(m => {
        const parts: any[] = [];
        if (m.attachments) m.attachments.forEach(a => parts.push({ inlineData: { mimeType: a.mimeType, data: a.content } }));
        if (m.text) parts.push({ text: m.text });
        return { role: m.role, parts };
      });

      const { text: responseText, citations } = await GeminiService.generateResponse(
        apiKey,
        text,
        currentBase.files,
        apiHistory,
        modelId,
        attachments,
        useWebSearch,
        sharedInsights
      );

      const modelMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        text: responseText,
        citations,
        timestamp: Date.now()
      };

      setChatHistory(prev => ({ ...prev, [activeBaseId]: [...prev[activeBaseId], modelMsg] }));

    } catch (error: any) {
       const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        text: `Error: ${error.message}`,
        timestamp: Date.now(),
        isError: true
      };
      setChatHistory(prev => ({ ...prev, [activeBaseId]: [...prev[activeBaseId], errorMsg] }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFeedback = async (messageId: string, type: 'thumbs_up' | 'thumbs_down') => {
    if (!activeBaseId) return;
    
    // Update local state UI
    setChatHistory(prev => {
      const history = prev[activeBaseId] || [];
      return {
        ...prev,
        [activeBaseId]: history.map(msg => msg.id === messageId ? { ...msg, feedback: type } : msg)
      };
    });

    // If thumbs up, save to Shared Insights for learning
    if (type === 'thumbs_up') {
      const history = chatHistory[activeBaseId];
      const msgIndex = history.findIndex(m => m.id === messageId);
      if (msgIndex > 0) {
        const question = history[msgIndex - 1].text;
        const answer = history[msgIndex].text;
        
        const insight: SharedInsight = {
          id: crypto.randomUUID(),
          content: `Q: ${question}\nA: ${answer.substring(0, 200)}...`, // Summarize/truncate for context window efficiency
          timestamp: Date.now(),
          sourceBaseId: activeBaseId
        };
        
        await StorageUtils.addSharedInsight(insight);
        setSharedInsights(await StorageUtils.getSharedInsights());
      }
    }
  };

  if (!isLoaded) return <div className="h-screen bg-neutral-950 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2" /> Loading System...</div>;

  if (!currentUser) {
    return <Login onLogin={handleLogin} onRegister={handleRegister} />;
  }

  const activeBase = knowledgeBases.find(kb => kb.id === activeBaseId);

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
      <Sidebar
        knowledgeBases={knowledgeBases}
        activeBaseId={activeBaseId}
        currentUser={currentUser}
        onSelectBase={(id) => { setActiveBaseId(id); setViewMode('chat'); }}
        onCreateBase={handleCreateBase}
        onDeleteBase={handleDeleteBase}
        onOpenApiKey={() => setShowApiKeyModal(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col h-full relative">
        {!activeBase ? (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 space-y-4">
            <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center"><Layout className="w-8 h-8 opacity-50" /></div>
            <p>Select a Team Knowledge Base to start.</p>
          </div>
        ) : (
          viewMode === 'manager' ? (
            <DatabaseManager
              knowledgeBase={activeBase}
              onAddFiles={handleAddFiles}
              onDeleteFile={handleDeleteFile}
              onDeleteDatabase={(id) => { handleDeleteBase(id); setViewMode('manager'); }}
            />
          ) : (
            <ChatArea
              knowledgeBase={activeBase}
              messages={chatHistory[activeBaseId!] || []}
              onSendMessage={handleSendMessage}
              isProcessing={isProcessing}
              onViewManager={() => setViewMode('manager')}
              onFeedback={handleFeedback}
            />
          )
        )}
      </main>

      {showApiKeyModal && (
        <ApiKeyInput
          currentKey={apiKey}
          onSave={async (k) => { await StorageUtils.setApiKey(k); setApiKey(k); setShowApiKeyModal(false); }}
          onRemove={async () => { await StorageUtils.removeApiKey(); setApiKey(null); }}
          onClose={() => apiKey && setShowApiKeyModal(false)}
        />
      )}
    </div>
  );
}

export default App;
