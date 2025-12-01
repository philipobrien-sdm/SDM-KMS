import React, { useRef, useState } from 'react';
import { LocalFile, LogLevel } from '../types';
import { FileUploader } from './FileUploader';

interface SidebarProps {
  files: LocalFile[];
  onRemoveFile: (id: string) => void;
  onAddFiles: (files: LocalFile[]) => void;
  onLog: (level: LogLevel, message: string, details?: string) => void;
  onExportContext: () => void;
  onImportContext: (file: File) => void;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  const k = 1024;
  const sizes = ['KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const Sidebar: React.FC<SidebarProps> = ({ 
  files, onRemoveFile, onAddFiles, onLog, onExportContext, onImportContext 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportContext(e.target.files[0]);
      e.target.value = ''; // Reset
    }
  };

  return (
    <aside 
      className={`${isCollapsed ? 'w-16' : 'w-80'} bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 z-20 transition-all duration-300 ease-in-out relative`}
    >
      {/* Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-full p-1 shadow-md z-30 hover:scale-110 transition-transform"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      <div className={`p-6 border-b border-slate-800 ${isCollapsed ? 'px-2 items-center flex flex-col' : ''}`}>
        <div className={`flex items-center gap-2 mb-6 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-gradient-to-tr from-gemini-600 to-gemini-400 rounded-lg flex items-center justify-center shadow-lg shadow-gemini-900/50 shrink-0">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
              <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
            </svg>
          </div>
          {!isCollapsed && <h1 className="text-lg font-bold text-white tracking-tight whitespace-nowrap overflow-hidden">SDM KMS</h1>}
        </div>
        
        <div className={isCollapsed ? 'hidden' : 'block'}>
            <FileUploader onFilesAdded={onAddFiles} onLog={onLog} />
        </div>
        {isCollapsed && (
            <button 
                onClick={() => setIsCollapsed(false)}
                title="Expand to add files" 
                className="w-10 h-10 border-2 border-dashed border-slate-700 hover:border-gemini-400 rounded-lg flex items-center justify-center text-slate-600 hover:text-gemini-400 transition-colors"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 overflow-x-hidden">
        {!isCollapsed && (
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 pl-2 whitespace-nowrap">
            Context ({files.length})
            </h3>
        )}
        
        {files.length === 0 ? (
          !isCollapsed && (
            <div className="text-center py-8 text-slate-600 text-sm border border-dashed border-slate-800 rounded-lg">
                No files added yet.<br/>
                <span className="text-xs">Upload files to chat with them.</span>
            </div>
          )
        ) : (
          <ul className="space-y-2">
            {files.map(file => (
              <li key={file.id} className={`group flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-gemini-500/30 rounded-lg transition-all duration-200`}>
                <div className="flex items-center gap-3 overflow-hidden" title={file.name}>
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gemini-400 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  {!isCollapsed && (
                    <div className="min-w-0">
                        <p className="text-sm text-slate-200 font-medium truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-500">{formatSize(file.size)}</p>
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                    <button 
                    onClick={() => onRemoveFile(file.id)}
                    className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove file"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                    </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Session Management */}
      <div className={`p-4 bg-slate-900 border-t border-slate-800 ${isCollapsed ? 'flex flex-col items-center gap-4' : ''}`}>
        <div className={`grid ${isCollapsed ? 'grid-cols-1' : 'grid-cols-2'} gap-2 mb-3 w-full`}>
          <button 
            onClick={onExportContext}
            disabled={files.length === 0}
            title="Save State"
            className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-2 rounded-lg border border-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            {!isCollapsed && "Save"}
          </button>
          <button 
            onClick={() => importInputRef.current?.click()}
            title="Load State"
            className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-2 rounded-lg border border-slate-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5M12 16.5V3" /></svg>
            {!isCollapsed && "Load"}
          </button>
          <input 
            type="file" 
            ref={importInputRef} 
            onChange={handleFileSelect} 
            accept=".json" 
            className="hidden" 
          />
        </div>
        {!isCollapsed && (
            <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-800">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            Gemini 2.5 Flash Active
            </div>
        )}
      </div>
    </aside>
  );
};