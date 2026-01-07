
import React, { useRef, useState } from 'react';
import { Upload, FileText, Trash2, HardDrive, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { KnowledgeBase, StoredFile } from '../types';
import { fileToBase64 } from '../utils/storage';

interface DatabaseManagerProps {
  knowledgeBase: KnowledgeBase;
  onAddFiles: (baseId: string, files: StoredFile[]) => void;
  onDeleteFile: (baseId: string, fileId: string) => void;
  onDeleteDatabase: (baseId: string) => void;
}

export const DatabaseManager: React.FC<DatabaseManagerProps> = ({
  knowledgeBase,
  onAddFiles,
  onDeleteFile,
  onDeleteDatabase
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadStatus('uploading');
      setUploadProgress(0);
      setError(null);
      
      const filesToProcess: File[] = Array.from(e.target.files);
      const totalFiles = filesToProcess.length;
      const newFiles: StoredFile[] = [];
      const MAX_SIZE_MB = 50; // Increased limit for IndexedDB support

      try {
        for (let i = 0; i < totalFiles; i++) {
          const file = filesToProcess[i];
          
          if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            throw new Error(`File "${file.name}" is too large (> ${MAX_SIZE_MB}MB).`);
          }

          const base64 = await fileToBase64(file);
          
          newFiles.push({
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type || 'text/plain',
            size: file.size,
            content: base64,
            uploadedAt: Date.now()
          });

          // Update progress
          setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
          
          // Small delay to yield to main thread for UI updates
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        onAddFiles(knowledgeBase.id, newFiles);
        setUploadStatus('success');

        // Reset after 2 seconds
        setTimeout(() => {
          setUploadStatus('idle');
          setUploadProgress(0);
        }, 2000);

      } catch (err: any) {
        setError(err.message);
        setUploadStatus('idle');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteFileConfirm = (fileId: string, fileName: string) => {
    if (window.confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      onDeleteFile(knowledgeBase.id, fileId);
    }
  };

  const handleDeleteDatabaseConfirm = () => {
    const message = `Are you sure you want to delete the database "${knowledgeBase.name}"?\n\nThis will permanently delete ALL ${knowledgeBase.files.length} files associated with it.\n\nThis action cannot be undone.`;
    if (window.confirm(message)) {
      onDeleteDatabase(knowledgeBase.id);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex-1 bg-neutral-950 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{knowledgeBase.name}</h2>
            <p className="text-neutral-400 text-sm">
              Manage documents in this knowledge base. These files will be used to ground the chat responses.
            </p>
          </div>
          <button
            onClick={handleDeleteDatabaseConfirm}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500 rounded-lg transition-all text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Delete Database
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-900/50 rounded-lg p-4 flex items-center gap-3 text-red-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Upload Card */}
          <div 
            onClick={() => uploadStatus === 'idle' && fileInputRef.current?.click()}
            className={`col-span-1 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all h-64 group relative overflow-hidden ${
              uploadStatus !== 'idle'
                ? 'border-blue-500/30 bg-neutral-900 cursor-default' 
                : 'border-neutral-800 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5'
            }`}
          >
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              accept=".txt,.md,.csv,.pdf,.jpg,.png,.html"
              disabled={uploadStatus !== 'idle'}
            />
            
            {uploadStatus === 'uploading' ? (
              <div className="w-full h-full flex flex-col items-center justify-center z-10 animate-in fade-in duration-300">
                 <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                 <h3 className="text-white font-medium mb-1">Processing Files...</h3>
                 <p className="text-blue-400 font-mono text-xs mb-4">{uploadProgress}%</p>
                 <div className="w-48 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                   <div 
                    className="h-full bg-blue-500 transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                   />
                 </div>
              </div>
            ) : uploadStatus === 'success' ? (
              <div className="w-full h-full flex flex-col items-center justify-center z-10 animate-in fade-in zoom-in duration-300">
                 <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                 </div>
                 <h3 className="text-white font-medium mb-1">Upload Complete!</h3>
                 <p className="text-green-400 text-xs">Files added to database</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-neutral-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-neutral-800 transition-all duration-300">
                  <Upload className="w-6 h-6 text-neutral-400 group-hover:text-blue-400" />
                </div>
                <h3 className="text-white font-medium mb-1">Upload Documents</h3>
                <p className="text-neutral-500 text-xs px-4">
                  Drag & drop or click to browse<br/>
                  <span className="opacity-70 mt-1 inline-block">PDF, TXT, MD, CSV (Max 50MB)</span>
                </p>
              </>
            )}
          </div>

          {/* Stats Card */}
          <div className="col-span-1 bg-neutral-900 border border-neutral-800 rounded-xl p-6 h-64 flex flex-col">
            <h3 className="text-neutral-400 text-sm font-medium mb-4 flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Storage Stats
            </h3>
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-4xl font-bold text-white mb-2 tracking-tight">
                {knowledgeBase.files.length}
              </div>
              <p className="text-neutral-500 text-sm">Total Documents</p>
            </div>
            <div className="pt-4 border-t border-neutral-800">
               <p className="text-neutral-400 text-xs font-mono">
                 Total Size: <span className="text-white">{formatSize(knowledgeBase.files.reduce((acc, f) => acc + f.size, 0))}</span>
               </p>
            </div>
          </div>

          {/* Recent Files List (First few) */}
          <div className="col-span-1 bg-neutral-900 border border-neutral-800 rounded-xl p-6 h-64 flex flex-col">
             <h3 className="text-neutral-400 text-sm font-medium mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Recent Uploads
            </h3>
            <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-2 custom-scrollbar">
              {knowledgeBase.files.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-neutral-600 text-xs italic">
                   <FileText className="w-8 h-8 opacity-20 mb-2" />
                   No files yet
                 </div>
              ) : (
                knowledgeBase.files.slice().reverse().slice(0, 5).map(file => (
                  <div key={file.id} className="flex items-center gap-3 text-xs text-neutral-300 py-2 px-2 hover:bg-neutral-800 rounded-lg transition-colors group">
                    <div className="w-6 h-6 rounded bg-neutral-800 group-hover:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                       <FileText className="w-3 h-3 text-blue-500/70" />
                    </div>
                    <span className="truncate flex-1">{file.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Full File List */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            All Documents
            <span className="text-xs font-normal text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">
              {knowledgeBase.files.length}
            </span>
          </h3>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-950/50 text-neutral-500 border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Size</th>
                  <th className="px-6 py-4 font-medium">Uploaded</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {knowledgeBase.files.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-600 italic">
                      No files in this database. Upload some documents to get started.
                    </td>
                  </tr>
                ) : (
                  knowledgeBase.files.map(file => (
                    <tr key={file.id} className="hover:bg-neutral-800/50 transition-colors group">
                      <td className="px-6 py-4 text-neutral-200">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-blue-500/50 group-hover:text-blue-500 transition-colors" />
                          <span className="truncate max-w-md font-medium">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-neutral-400 font-mono text-xs">{file.type}</td>
                      <td className="px-6 py-4 text-neutral-400 font-mono text-xs">{formatSize(file.size)}</td>
                      <td className="px-6 py-4 text-neutral-400 text-xs">
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteFileConfirm(file.id, file.name)}
                          className="text-neutral-600 hover:text-red-400 hover:bg-red-400/10 rounded p-2 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
