import React, { useState } from 'react';
import { Key, Eye, EyeOff, ShieldCheck, ExternalLink } from 'lucide-react';

interface ApiKeyInputProps {
  currentKey: string | null;
  onSave: (key: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ currentKey, onSave, onRemove, onClose }) => {
  const [key, setKey] = useState(currentKey || '');
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-black">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-900/30 rounded-full flex items-center justify-center">
              <Key className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">API Configuration</h2>
              <p className="text-xs text-neutral-400">Enter your Google Gemini API Key</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-900/10 border border-blue-900/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400 mt-0.5" />
                <p className="text-xs text-blue-200 leading-relaxed">
                  Your API key is stored <strong>locally in your browser</strong>. 
                  It is never sent to our servers. We act only as a client-side interface for the Gemini API.
                </p>
              </div>
            </div>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-between items-center text-xs text-neutral-500">
               <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-400">
                 Get API Key <ExternalLink className="w-3 h-3" />
               </a>
               {currentKey && (
                 <button onClick={onRemove} className="text-red-400 hover:underline">
                   Clear Saved Key
                 </button>
               )}
            </div>
          </div>
        </div>

        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex justify-end gap-3">
          {currentKey && (
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => {
              if (key.trim()) {
                onSave(key.trim());
                onClose();
              }
            }}
            disabled={!key.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save API Key
          </button>
        </div>
      </div>
    </div>
  );
};