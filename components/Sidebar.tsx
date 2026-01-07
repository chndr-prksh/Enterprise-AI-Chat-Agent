
import React, { useState } from 'react';
import { Plus, Database, Trash2, FolderOpen, Key, ChevronRight, LogOut, User as UserIcon } from 'lucide-react';
import { KnowledgeBase, User } from '../types';

interface SidebarProps {
  knowledgeBases: KnowledgeBase[];
  activeBaseId: string | null;
  currentUser: User | null;
  onSelectBase: (id: string) => void;
  onCreateBase: (name: string) => void;
  onDeleteBase: (id: string) => void;
  onOpenApiKey: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  knowledgeBases,
  activeBaseId,
  currentUser,
  onSelectBase,
  onCreateBase,
  onDeleteBase,
  onOpenApiKey,
  onLogout
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newBaseName, setNewBaseName] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBaseName.trim()) {
      onCreateBase(newBaseName.trim());
      setNewBaseName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="w-72 bg-neutral-900 border-r border-neutral-800 flex flex-col h-full text-sm">
      <div className="p-4 border-b border-neutral-800">
        <h1 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="#6366f1" fillOpacity="0.2"/>
              <path d="M12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6ZM12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16Z" fill="#6366f1"/>
           </svg>
          <span>Shape AI Chat</span>
        </h1>
        <p className="text-xs text-neutral-500 mt-1 ml-8">Powered by Google Gemini</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Shared Knowledge</h2>
            <button 
              onClick={() => setIsCreating(true)}
              className="text-neutral-400 hover:text-white transition-colors p-1"
              title="New Knowledge Base"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {isCreating && (
            <form onSubmit={handleCreateSubmit} className="mb-3 px-2">
              <input
                autoFocus
                type="text"
                placeholder="Name..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
                value={newBaseName}
                onChange={(e) => setNewBaseName(e.target.value)}
                onBlur={() => !newBaseName && setIsCreating(false)}
              />
            </form>
          )}

          <ul className="space-y-1">
            {knowledgeBases.length === 0 && !isCreating && (
              <li className="px-2 py-8 text-center text-neutral-600 italic text-xs">
                No shared databases yet.<br/>Create one for the team.
              </li>
            )}
            {knowledgeBases.map((kb) => (
              <li key={kb.id}>
                <button
                  onClick={() => onSelectBase(kb.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all group ${
                    activeBaseId === kb.id 
                      ? 'bg-blue-900/20 text-blue-200 ring-1 ring-blue-800' 
                      : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FolderOpen className={`w-4 h-4 ${activeBaseId === kb.id ? 'text-blue-400' : 'text-neutral-500'}`} />
                    <span className="truncate">{kb.name}</span>
                  </div>
                  {activeBaseId === kb.id && <ChevronRight className="w-3 h-3 text-blue-500/50" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 space-y-2">
        {currentUser && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-md bg-neutral-800/50 border border-neutral-800">
             <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                {currentUser.username.substring(0, 2).toUpperCase()}
             </div>
             <div className="flex-1 overflow-hidden">
               <p className="text-xs font-medium text-white truncate">{currentUser.username}</p>
               <p className="text-[10px] text-green-400 flex items-center gap-1">
                 <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                 Online
               </p>
             </div>
          </div>
        )}

        <button
          onClick={onOpenApiKey}
          className="w-full flex items-center gap-2 px-3 py-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors text-xs"
        >
          <Key className="w-3.5 h-3.5" />
          <span>API Key Settings</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-neutral-400 hover:text-red-400 hover:bg-red-900/10 rounded-md transition-colors text-xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
};
