
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Bot, User, Loader2, FileText, Settings, Quote, Zap, Sparkles, ChevronDown, Paperclip, X, Globe, ThumbsUp, ThumbsDown } from 'lucide-react';
import { ChatMessage, KnowledgeBase, ModelId, ChatAttachment } from '../types';
import { fileToBase64 } from '../utils/storage';

interface ChatAreaProps {
  knowledgeBase: KnowledgeBase;
  messages: ChatMessage[];
  onSendMessage: (text: string, modelId: ModelId, attachments: ChatAttachment[], useWebSearch: boolean) => Promise<void>;
  isProcessing: boolean;
  onViewManager: () => void;
  onFeedback: (messageId: string, type: 'thumbs_up' | 'thumbs_down') => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  knowledgeBase,
  messages,
  onSendMessage,
  isProcessing,
  onViewManager,
  onFeedback
}) => {
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelId>('fast');
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing, pendingAttachments]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newAttachments: ChatAttachment[] = [];
      for (const file of files) {
        try {
          if (file.size > 5 * 1024 * 1024) {
            alert(`File ${file.name} is too large (max 5MB for session files)`);
            continue;
          }
          const base64 = await fileToBase64(file);
          newAttachments.push({
            id: crypto.randomUUID(),
            type: file.type.startsWith('image/') ? 'image' : 'file',
            mimeType: file.type || 'application/octet-stream',
            name: file.name,
            content: base64
          });
        } catch (err) { console.error("Failed to process file", err); }
      }
      setPendingAttachments(prev => [...prev, ...newAttachments]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => setPendingAttachments(prev => prev.filter(a => a.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && pendingAttachments.length === 0) || isProcessing) return;
    const text = input;
    const attachments = [...pendingAttachments];
    setInput('');
    setPendingAttachments([]);
    await onSendMessage(text, selectedModel, attachments, useWebSearch);
  };

  const MarkdownComponents = {
    h1: ({node, ...props}: any) => <h1 className="text-2xl font-bold text-white mt-6 mb-4 pb-2 border-b border-neutral-800" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-lg font-semibold text-blue-100 mt-6 mb-3" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-base font-medium text-white mt-4 mb-2" {...props} />,
    p: ({node, ...props}: any) => <p className="leading-7 text-neutral-300 mb-4 last:mb-0" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-6 mb-4 space-y-1 text-neutral-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-6 mb-4 space-y-1 text-neutral-300" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-blue-500 pl-4 italic bg-neutral-800/50 py-2 pr-4 rounded-r my-4 text-neutral-400" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
      if (inline) return <code className="bg-neutral-800 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono border border-neutral-700/50" {...props}>{children}</code>;
      return <div className="my-4 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900"><div className="bg-neutral-950 px-4 py-2 border-b border-neutral-800 flex items-center justify-between"><span className="text-xs text-neutral-500 font-mono">code</span></div><pre className="p-4 overflow-x-auto text-sm text-neutral-300 font-mono scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent"><code {...props}>{children}</code></pre></div>;
    },
    table: ({node, ...props}: any) => <div className="overflow-x-auto my-6 rounded-lg border border-neutral-800 scrollbar-thin scrollbar-thumb-neutral-700"><table className="w-full text-sm text-left text-neutral-300" {...props} /></div>,
    thead: ({node, ...props}: any) => <thead className="text-xs text-neutral-400 uppercase bg-neutral-900 border-b border-neutral-800" {...props} />,
    th: ({node, ...props}: any) => <th className="px-6 py-3 font-medium tracking-wider whitespace-nowrap" {...props} />,
    tbody: ({node, ...props}: any) => <tbody className="divide-y divide-neutral-800" {...props} />,
    tr: ({node, ...props}: any) => <tr className="bg-transparent hover:bg-neutral-800/30 transition-colors" {...props} />,
    td: ({node, ...props}: any) => <td className="px-6 py-4 whitespace-nowrap" {...props} />,
    a: ({node, ...props}: any) => <a className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors" target="_blank" rel="noreferrer" {...props} />,
    hr: ({node, ...props}: any) => <hr className="my-6 border-neutral-800" {...props} />,
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 relative">
      <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-900/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-900/20">KB</div>
          <div>
            <h2 className="text-sm font-semibold text-white">{knowledgeBase.name}</h2>
            <p className="text-[10px] text-neutral-400 flex items-center gap-1.5 uppercase tracking-wider font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${knowledgeBase.files.length > 0 ? 'bg-green-500' : 'bg-neutral-600'}`}></span>
              {knowledgeBase.files.length} Shared Documents
            </p>
          </div>
        </div>
        <button onClick={onViewManager} className="text-xs text-neutral-400 hover:text-white flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-md transition-colors border border-neutral-700/50">
          <Settings className="w-3.5 h-3.5" /> Manage
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 scroll-smooth scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-neutral-500 opacity-80 pb-20 animate-in fade-in duration-700">
            <div className="w-24 h-24 bg-neutral-900 rounded-3xl flex items-center justify-center mb-8 shadow-2xl border border-neutral-800"><Bot className="w-12 h-12 text-blue-500" /></div>
            <h3 className="text-2xl font-semibold text-white mb-3">Team Knowledge Hub</h3>
            <p className="text-sm text-center max-w-sm text-neutral-400 leading-relaxed mb-8">Access shared wisdom and private insights from <br/><span className="text-blue-400 font-medium">{knowledgeBase.name}</span>.</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 max-w-4xl mx-auto group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600/20 to-indigo-600/20 flex items-center justify-center flex-shrink-0 mt-1 border border-blue-500/20 shadow-sm"><Bot className="w-4 h-4 text-blue-400" /></div>
            )}
            
            <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[90%] md:max-w-[80%]`}>
              {msg.attachments && msg.attachments.length > 0 && (
                 <div className={`flex flex-wrap gap-2 mb-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   {msg.attachments.map(att => (
                     <div key={att.id} className="relative group/attachment overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900">
                        {att.type === 'image' ? <img src={`data:${att.mimeType};base64,${att.content}`} alt={att.name} className="h-32 w-auto object-cover opacity-90 transition-opacity hover:opacity-100" /> : <div className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-300 bg-neutral-800"><FileText className="w-4 h-4 text-blue-400" /><span className="max-w-[150px] truncate">{att.name}</span></div>}
                     </div>
                   ))}
                 </div>
              )}

              <div className={`px-6 py-4 shadow-sm transition-all ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm shadow-blue-900/10' : 'bg-neutral-900/50 text-neutral-200 rounded-2xl rounded-bl-sm border border-neutral-800 shadow-xl'}`}>
                {msg.role === 'model' ? <div className="prose prose-invert prose-sm max-w-none"><ReactMarkdown components={MarkdownComponents} remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown></div> : <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
              </div>
              
              {msg.role === 'model' && (
                <div className="flex items-center justify-between w-full mt-1 px-1">
                   {/* Citations */}
                   {msg.citations && msg.citations.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {msg.citations.map((citation, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 bg-blue-900/10 border border-blue-500/20 rounded-md px-3 py-1.5 text-xs text-blue-300 hover:bg-blue-900/20 transition-colors cursor-help group/citation relative">
                            <FileText className="w-3 h-3 opacity-70 flex-shrink-0" /><span className="truncate max-w-[200px] font-medium">{citation.source}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs rounded-lg shadow-2xl opacity-0 invisible group-hover/citation:opacity-100 group-hover/citation:visible transition-all z-50 pointer-events-none transform translate-y-2 group-hover/citation:translate-y-0">
                              <span className="font-semibold text-blue-400 block mb-1 text-[10px] uppercase tracking-wider">Matched Context</span><span className="italic leading-relaxed">"{citation.context}"</span>
                            </div>
                          </div>
                        ))}
                      </div>
                   ) : <div></div>}

                   {/* Shared Learning Feedback */}
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onFeedback(msg.id, 'thumbs_up')}
                        className={`p-1.5 rounded-md transition-colors ${msg.feedback === 'thumbs_up' ? 'text-green-400 bg-green-900/20' : 'text-neutral-500 hover:text-green-400 hover:bg-neutral-800'}`}
                        title="Helpful (Shared Learning)"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => onFeedback(msg.id, 'thumbs_down')}
                        className={`p-1.5 rounded-md transition-colors ${msg.feedback === 'thumbs_down' ? 'text-red-400 bg-red-900/20' : 'text-neutral-500 hover:text-red-400 hover:bg-neutral-800'}`}
                        title="Not Helpful"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                   </div>
                </div>
              )}
            </div>

            {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center flex-shrink-0 mt-1 border border-neutral-700"><User className="w-4 h-4 text-neutral-400" /></div>}
          </div>
        ))}

        {isProcessing && (
           <div className="flex gap-4 max-w-4xl mx-auto justify-start animate-pulse">
             <div className="w-8 h-8 rounded-full bg-blue-600/10 flex items-center justify-center flex-shrink-0 mt-1 border border-blue-500/10"><Bot className="w-4 h-4 text-blue-400" /></div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl rounded-bl-none px-6 py-4 flex items-center gap-3 shadow-lg">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-sm text-neutral-400">{selectedModel === 'fast' ? 'Generating response...' : 'Reasoning deeply...'}</span>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      <div className="p-4 bg-neutral-950 border-t border-neutral-800">
        <div className="max-w-3xl mx-auto relative">
           {pendingAttachments.length > 0 && (
             <div className="flex gap-3 overflow-x-auto pb-3 mb-1 custom-scrollbar">
               {pendingAttachments.map((att) => (
                 <div key={att.id} className="relative group flex-shrink-0">
                   {att.type === 'image' ? <div className="h-16 w-16 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-900 relative"><img src={`data:${att.mimeType};base64,${att.content}`} alt="preview" className="h-full w-full object-cover" /></div> : <div className="h-16 w-48 rounded-lg border border-neutral-700 bg-neutral-900 flex items-center gap-3 px-3"><div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center flex-shrink-0"><FileText className="w-4 h-4 text-blue-400" /></div><span className="text-xs text-neutral-300 truncate font-medium">{att.name}</span></div>}
                   <button onClick={() => removeAttachment(att.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-neutral-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center border border-neutral-900 shadow-md transition-colors z-10"><X className="w-3 h-3" /></button>
                 </div>
               ))}
             </div>
           )}
          
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-xl focus-within:ring-1 focus-within:ring-blue-500/50 focus-within:border-blue-500/50 transition-all shadow-lg flex flex-col">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
              placeholder={`Message ${knowledgeBase.name}...`}
              className="w-full bg-transparent border-none text-white text-sm px-4 py-3 min-h-[50px] max-h-32 focus:ring-0 resize-none custom-scrollbar placeholder-neutral-600"
              rows={1}
            />
            
            <div className="flex items-center justify-between px-3 pb-2 pt-1">
              <div className="flex items-center gap-2">
                <div className="relative" ref={dropdownRef}>
                  <button onClick={() => setShowModelMenu(!showModelMenu)} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors text-xs font-medium text-neutral-400 hover:text-white border border-transparent hover:border-neutral-700">
                    {selectedModel === 'fast' ? <Zap className="w-3.5 h-3.5 text-yellow-500" /> : <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                    <span>{selectedModel === 'fast' ? 'Fast' : 'Thinking'}</span><ChevronDown className="w-3 h-3 opacity-50" />
                  </button>
                  {showModelMenu && (
                    <div className="absolute bottom-full left-0 mb-2 w-56 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="p-1">
                        <button onClick={() => { setSelectedModel('fast'); setShowModelMenu(false); }} className={`w-full flex items-start gap-3 p-2.5 rounded-lg transition-colors text-left ${selectedModel === 'fast' ? 'bg-neutral-800' : 'hover:bg-neutral-800/50'}`}>
                          <div className="p-1.5 bg-yellow-500/10 rounded-md"><Zap className="w-4 h-4 text-yellow-500" /></div><div><div className="text-sm font-medium text-white">Fast</div><p className="text-[10px] text-neutral-400">Gemini 2.5 Flash.</p></div>
                        </button>
                        <button onClick={() => { setSelectedModel('pro'); setShowModelMenu(false); }} className={`w-full flex items-start gap-3 p-2.5 rounded-lg transition-colors text-left ${selectedModel === 'pro' ? 'bg-neutral-800' : 'hover:bg-neutral-800/50'}`}>
                          <div className="p-1.5 bg-purple-500/10 rounded-md"><Sparkles className="w-4 h-4 text-purple-400" /></div><div><div className="text-sm font-medium text-white">Reasoning</div><p className="text-[10px] text-neutral-400">Gemini 3.0 Pro.</p></div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-4 w-[1px] bg-neutral-800 mx-1"></div>

                <button 
                  onClick={() => setUseWebSearch(!useWebSearch)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors text-xs font-medium border ${useWebSearch ? 'bg-blue-900/20 text-blue-400 border-blue-500/30' : 'text-neutral-400 hover:text-white border-transparent hover:bg-neutral-800'}`}
                  title="Toggle Web Search"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Web</span>
                </button>

                <div className="h-4 w-[1px] bg-neutral-800 mx-1"></div>

                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white" title="Add attachment">
                  <Paperclip className="w-4 h-4" />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} multiple />
              </div>

              <button onClick={handleSubmit} disabled={(!input.trim() && pendingAttachments.length === 0) || isProcessing} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-blue-500/20">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
