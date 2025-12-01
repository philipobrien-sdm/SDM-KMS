
import React, { useState, useRef, useEffect } from 'react';
import { Schema, Type } from "@google/genai";
import { RiskAnalysisData, WikiEntry, ReportData, EmailDraft, LocalFile, LogLevel, RiskItem } from '../types';
import MarkdownView from './MarkdownView';
import { FileUploader } from './FileUploader';

interface ToolProps<T> {
  isLoading: boolean;
  onGenerate: (prompt: string, schema: Schema) => void;
  output: T | null;
}

const uuid = () => Math.random().toString(36).substring(2, 15);

// --- Risk Review Modal ---

interface RiskReviewModalProps {
    visible: boolean;
    risks: { risk: string; category: string }[];
    sourceFile: string;
    onClose: () => void;
    onAddBulk: (risks: { risk: string; category: string; source: string }[]) => void;
}

const RiskReviewModal: React.FC<RiskReviewModalProps> = ({ visible, risks, sourceFile, onClose, onAddBulk }) => {
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (visible) setSelectedIndices(new Set()); // Reset on open
    }, [visible]);

    const toggleSelect = (index: number) => {
        const newSet = new Set(selectedIndices);
        if (newSet.has(index)) newSet.delete(index);
        else newSet.add(index);
        setSelectedIndices(newSet);
    };

    const toggleAll = () => {
        if (selectedIndices.size === risks.length) setSelectedIndices(new Set());
        else setSelectedIndices(new Set(risks.map((_, i) => i)));
    };

    const handleAdd = () => {
        const selected = risks.filter((_, i) => selectedIndices.has(i)).map(r => ({ ...r, source: sourceFile }));
        onAddBulk(selected);
        onClose();
    };

    if (!visible) return null;

    const getPestleColor = (category: string) => {
        const c = category.toLowerCase();
        if (c.includes('political')) return 'text-red-400 bg-red-400/10 border-red-400/20';
        if (c.includes('economic')) return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
        if (c.includes('social')) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
        if (c.includes('technolog')) return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
        if (c.includes('legal')) return 'text-slate-300 bg-slate-600/20 border-slate-500/30';
        if (c.includes('environment')) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl flex flex-col shadow-2xl max-h-[80vh]">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white">Review Risks: <span className="text-gemini-400">{sourceFile}</span></h2>
                        <p className="text-sm text-slate-400">Select risks to import into the main register.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="p-4 bg-slate-800/50 flex justify-between items-center border-b border-slate-700/50">
                    <button onClick={toggleAll} className="text-xs font-medium text-slate-300 hover:text-white flex items-center gap-2">
                        <div className={`w-4 h-4 border rounded ${selectedIndices.size === risks.length ? 'bg-gemini-500 border-gemini-500' : 'border-slate-500'}`}>
                            {selectedIndices.size === risks.length && <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
                        </div>
                        Select All ({risks.length})
                    </button>
                    <span className="text-xs text-slate-500">{selectedIndices.size} selected</span>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {risks.map((r, i) => (
                        <div 
                            key={i} 
                            onClick={() => toggleSelect(i)}
                            className={`p-3 rounded-lg mb-1 cursor-pointer flex gap-3 items-start transition-colors ${selectedIndices.has(i) ? 'bg-gemini-900/20 border border-gemini-500/30' : 'hover:bg-slate-800 border border-transparent'}`}
                        >
                             <div className={`mt-0.5 w-4 h-4 border rounded shrink-0 flex items-center justify-center ${selectedIndices.has(i) ? 'bg-gemini-500 border-gemini-500' : 'border-slate-600'}`}>
                                 {selectedIndices.has(i) && <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
                             </div>
                             <div className="flex-1">
                                 <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPestleColor(r.category)}`}>{r.category}</span>
                                 </div>
                                 <p className="text-sm text-slate-200 leading-snug">{r.risk}</p>
                             </div>
                        </div>
                    ))}
                </div>
                
                <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
                    <button 
                        onClick={handleAdd} 
                        disabled={selectedIndices.size === 0}
                        className="px-6 py-2 bg-gemini-600 hover:bg-gemini-500 text-white text-sm font-bold rounded-lg disabled:opacity-50 shadow-lg shadow-gemini-900/20"
                    >
                        Import {selectedIndices.size} Risks
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Library View ---

interface LibraryProps {
  files: LocalFile[];
  onGenerateSummary: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  summarizingIds: string[];
  onAddRisk: (risk: string, category: string, source: string) => void;
  onAddRisksBulk: (risks: { risk: string; category: string; source: string }[]) => void;
  onAddWikiNode: (term: string, source: string) => void;
}

export const LibraryView: React.FC<LibraryProps> = ({ files, onGenerateSummary, onDeleteFile, summarizingIds, onAddRisk, onAddRisksBulk, onAddWikiNode }) => {
    const [reviewModalFile, setReviewModalFile] = useState<LocalFile | null>(null);

    const getPestleColor = (category: string) => {
        const c = category.toLowerCase();
        if (c.includes('political')) return 'text-red-400 bg-red-400/10 border-red-400/20';
        if (c.includes('economic')) return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
        if (c.includes('social')) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
        if (c.includes('technolog')) return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
        if (c.includes('legal')) return 'text-slate-300 bg-slate-600/20 border-slate-500/30';
        if (c.includes('environment')) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    };

  return (
    <div className="h-full overflow-y-auto p-6 max-w-7xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="text-3xl">📚</span> Document Knowledge Base
        </h2>
        
        {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                <p>No documents in library.</p>
                <p className="text-sm mt-2">Upload files via the sidebar to begin ingestion.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {files.map(file => (
                    <div key={file.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex flex-col shadow-lg hover:border-gemini-500/30 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`p-2 rounded-lg shrink-0 ${file.isProcessing ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-900 text-gemini-400'}`}>
                                    {file.isProcessing ? (
                                         <svg className="animate-spin w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                         </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                        </svg>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-slate-200 truncate" title={file.name}>{file.name}</h3>
                                    <p className="text-xs text-slate-500">
                                        {new Date(file.timestamp).toLocaleDateString()} • {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => onDeleteFile(file.id)} className="text-slate-500 hover:text-red-400 transition-colors p-1" title="Delete">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        
                        {/* Processed Data Display */}
                        <div className="flex-1 bg-slate-900/50 rounded-lg p-3 text-sm text-slate-300 leading-relaxed mb-4 border border-slate-800/50 overflow-y-auto max-h-64 custom-scrollbar">
                            {file.isProcessing ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 py-4">
                                    <span className="text-xs font-medium animate-pulse">Ingesting and rationalizing content...</span>
                                </div>
                            ) : file.processedData ? (
                                <div className="space-y-4">
                                    <div>
                                        <strong className="text-xs uppercase text-slate-500 block mb-1">Summary</strong>
                                        <p className="text-xs line-clamp-3">{file.processedData.summary}</p>
                                    </div>
                                    {file.processedData.risks.length > 0 && (
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <strong className="text-xs uppercase text-amber-500/80">Risks Detected</strong>
                                                {file.processedData.risks.length > 5 && (
                                                    <button 
                                                        onClick={() => setReviewModalFile(file)}
                                                        className="text-[10px] text-amber-400 hover:underline"
                                                    >
                                                        Review All {file.processedData.risks.length}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {file.processedData.risks.slice(0, 5).map((r, i) => (
                                                    <button 
                                                      key={i} 
                                                      onClick={() => onAddRisk(r.risk, r.category, file.name)}
                                                      className={`text-[10px] px-1.5 py-0.5 rounded border truncate max-w-[220px] cursor-pointer flex items-center gap-1 group ${getPestleColor(r.category)}`}
                                                      title={`${r.category}: ${r.risk}`}
                                                    >
                                                      <span>{r.risk}</span>
                                                      <span className="opacity-0 group-hover:opacity-100 text-xs font-bold">+</span>
                                                    </button>
                                                ))}
                                                {file.processedData.risks.length > 5 && (
                                                    <button 
                                                        onClick={() => setReviewModalFile(file)}
                                                        className="text-[10px] text-slate-500 hover:text-slate-300"
                                                    >
                                                        +{file.processedData.risks.length - 5} more
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {file.processedData.topics.length > 0 && (
                                        <div>
                                            <strong className="text-xs uppercase text-gemini-500/80 block mb-1">Concepts</strong>
                                            <div className="flex flex-wrap gap-1">
                                                {file.processedData.topics.slice(0, 6).map((t, i) => (
                                                    <button 
                                                      key={i} 
                                                      onClick={() => onAddWikiNode(t, file.name)}
                                                      className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700 hover:bg-gemini-600 hover:text-white transition-colors cursor-pointer flex items-center gap-1 group"
                                                      title="Click to add to Wiki"
                                                    >
                                                      <span>{t}</span>
                                                      <span className="opacity-0 group-hover:opacity-100 text-xs font-bold">+</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 py-4">
                                    <span className="italic text-xs">Analysis failed or pending</span>
                                    <button 
                                        onClick={() => onGenerateSummary(file.id)} // Re-trigger ingestion
                                        className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-md text-slate-300"
                                    >
                                        Retry Ingestion
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex gap-2 text-xs font-mono text-slate-600 border-t border-slate-700/50 pt-3">
                           <span className="uppercase">{file.type.split('/')[1] || 'FILE'}</span>
                           <span className="ml-auto">{file.id.slice(0,4)}...</span>
                        </div>
                    </div>
                ))}
            </div>
        )}
        
        {reviewModalFile && (
            <RiskReviewModal 
                visible={!!reviewModalFile}
                risks={reviewModalFile.processedData?.risks || []}
                sourceFile={reviewModalFile.name}
                onClose={() => setReviewModalFile(null)}
                onAddBulk={onAddRisksBulk}
            />
        )}
    </div>
  )
}

// --- Reusable Autocomplete Textarea ---

interface AutocompleteTextareaProps {
  value: string;
  onChange: (val: string) => void;
  allNodes: string[];
  placeholder?: string;
  className?: string;
}

const AutocompleteTextarea: React.FC<AutocompleteTextareaProps> = ({ value, onChange, allNodes, placeholder, className }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [matchFilter, setMatchFilter] = useState('');

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const match = textBefore.match(/#([\w\s]*)$/);
    
    if (match) {
      setMatchFilter(match[1].toLowerCase());
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  };

  const insertTag = (tag: string) => {
    if (!textareaRef.current) return;
    const val = value;
    const cursor = textareaRef.current.selectionStart;
    const textBefore = val.slice(0, cursor);
    const match = textBefore.match(/#([\w\s]*)$/);
    
    if (match) {
       const startIdx = match.index!;
       const newVal = val.slice(0, startIdx) + `#${tag} ` + val.slice(cursor);
       onChange(newVal);
       setShowAutocomplete(false);
       // Restore focus
       requestAnimationFrame(() => {
         textareaRef.current?.focus();
       });
    }
  };

  const filteredTags = allNodes.filter(n => n.toLowerCase().includes(matchFilter) && n !== 'ROOT').slice(0, 5);

  return (
    <div className="relative w-full h-full">
        <textarea
            ref={textareaRef}
            value={value}
            onChange={handleContentChange}
            placeholder={placeholder}
            className={className}
        />
        
        {/* Autocomplete Dropdown */}
        {showAutocomplete && filteredTags.length > 0 && (
            <div className="absolute bottom-14 left-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 w-64 overflow-hidden">
                <div className="px-2 py-1 text-[10px] text-slate-500 bg-slate-900 uppercase font-bold">Link to Node</div>
                {filteredTags.map(tag => (
                    <button 
                        key={tag} 
                        onMouseDown={(e) => { e.preventDefault(); insertTag(tag); }} // Use onMouseDown to prevent blur
                        className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-gemini-600 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <span>🔗</span> {tag}
                    </button>
                ))}
            </div>
        )}
    </div>
  );
};

// --- 1. Scaffolded Report ---

const REPORT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    executiveSummary: { type: Type.STRING },
    keyFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
    sections: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT, 
        properties: { 
          heading: { type: Type.STRING }, 
          content: { type: Type.STRING } 
        } 
      } 
    },
    conclusion: { type: Type.STRING }
  }
};

export const ScaffoldedReport: React.FC<ToolProps<ReportData>> = ({ isLoading, onGenerate, output }) => {
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [depth, setDepth] = useState('Standard');

  const handleGenerate = () => {
    if (!topic) return;
    const prompt = `Generate a structured report.
    Topic: ${topic}
    Audience: ${audience}
    Detail Level: ${depth}
    
    Requirements:
    - Concise Title.
    - Summarized Executive Summary (Strictly max 30 words).
    - Top 3 Key Findings (1 short sentence each).
    - 2 Main Sections only (Strictly max 80 words per section).
    - Brief Conclusion (max 20 words).
    
    CRITICAL: Keep it extremely concise to avoid cutting off.`;
    onGenerate(prompt, REPORT_SCHEMA);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 text-gemini-400">📝 Report Scaffolding</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input 
            type="text" 
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
            placeholder="Report Topic (e.g., Q3 Financials)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <input 
            type="text" 
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
            placeholder="Audience (e.g., Board)"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          />
        </div>
        <button 
          onClick={handleGenerate}
          disabled={isLoading || !topic}
          className="w-full bg-gemini-600 hover:bg-gemini-500 disabled:opacity-50 text-white py-2 rounded-lg font-medium transition-colors"
        >
          {isLoading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-800 rounded-xl shadow-2xl p-8 font-serif leading-relaxed">
        {output ? (
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-slate-900 border-b pb-4">{output.title}</h1>
            
            <div className="bg-slate-100 p-4 rounded-lg mb-6 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Executive Summary</h3>
              <p className="text-sm">{output.executiveSummary}</p>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-lg mb-2">Key Findings</h3>
              <ul className="list-disc pl-5 space-y-1">
                {output.keyFindings?.map((kf, i) => <li key={i}>{kf}</li>)}
              </ul>
            </div>

            <div className="space-y-6">
              {output.sections?.map((sec, i) => (
                <section key={i}>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">{sec.heading}</h2>
                  <p className="whitespace-pre-wrap text-slate-700">{sec.content}</p>
                </section>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200">
              <h4 className="font-bold text-slate-900">Conclusion</h4>
              <p className="text-slate-700 mt-1">{output.conclusion}</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 font-sans">Report preview...</div>
        )}
      </div>
    </div>
  );
};

// --- 2. Concept Wiki ---

const WIKI_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      term: { type: Type.STRING },
      definition: { type: Type.STRING },
      relatedContext: { type: Type.STRING }
    }
  }
};

interface ConceptWikiProps {
  isLoading: boolean;
  onGenerate: (prompt: string, schema: Schema) => void;
  currentEntries: WikiEntry[];
  currentContent: string;
  currentFiles: LocalFile[];
  allNodes: string[];
  onUpdateContent: (content: string) => void;
  path: string[];
  onDrillDown: (term: string) => void;
  onNavigateBack: () => void;
  onNavigateHome: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  checkIsBranch: (term: string) => boolean;
  onAddFile: (file: LocalFile) => void;
  onRemoveFile: (id: string) => void;
  onAutoPopulate: () => void;
  onAddManualEntry: (term: string, definition: string, parentNode: string) => void;
  onSuggestParent: (term: string, def: string) => Promise<string>;
  onMoveNode: (term: string, definition: string, newParent: string) => void;
}

export const ConceptWiki: React.FC<ConceptWikiProps> = ({ 
  isLoading, onGenerate, currentEntries, currentContent, currentFiles, allNodes, onUpdateContent,
  path, onDrillDown, onNavigateBack, onNavigateHome, onExport, onImport, checkIsBranch,
  onAddFile, onRemoveFile, onAutoPopulate, onAddManualEntry, onSuggestParent, onMoveNode
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nodeFileInputRef = useRef<HTMLInputElement>(null);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [noteMode, setNoteMode] = useState<'edit' | 'preview'>('edit');
  
  // Manual Entry State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [targetParent, setTargetParent] = useState('ROOT');
  const [isSuggesting, setIsSuggesting] = useState(false);
  
  // Move Node State
  const [moveNodeModal, setMoveNodeModal] = useState<{term: string, definition: string} | null>(null);

  const currentTerm = path[path.length - 1];
  const isRoot = currentTerm === 'ROOT';

  const handleGenerate = () => {
    const prompt = isRoot 
      ? "Extract the Top 4 most important key entities or concepts. Keep definitions strict max 15 words."
      : `Deep dive into '${currentTerm}'. Extract 4 sub-concepts, types, or related entities strictly related to ${currentTerm}. Keep definitions strict max 15 words.`;
      
    onGenerate(prompt, WIKI_SCHEMA);
  };
  
  const handleSaveManualEntry = () => {
      if (!newTerm.trim()) return;
      onAddManualEntry(newTerm, newDefinition, targetParent);
      setNewTerm('');
      setNewDefinition('');
      setTargetParent('ROOT');
      setShowAddModal(false);
  };
  
  const handleConfirmMove = () => {
      if (!moveNodeModal) return;
      onMoveNode(moveNodeModal.term, moveNodeModal.definition, targetParent);
      setMoveNodeModal(null);
      setTargetParent('ROOT');
  };
  
  const handleAutoSuggestParent = async () => {
      if(!newTerm) return;
      setIsSuggesting(true);
      const parent = await onSuggestParent(newTerm, newDefinition);
      if(parent && (allNodes.includes(parent) || parent === 'ROOT')) {
          setTargetParent(parent);
      }
      setIsSuggesting(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImport(e.target.files[0]);
      e.target.value = ''; // reset
    }
  };

  // Node Attachment Logic
  const handleNodeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      if (file.type === 'application/pdf') {
        reader.readAsDataURL(file);
        reader.onload = (ev) => {
          const res = ev.target?.result as string;
          onAddFile({
             id: uuid(),
             name: file.name,
             size: file.size,
             type: file.type,
             content: res.split(',')[1],
             timestamp: Date.now()
          });
        }
      } else {
        reader.readAsText(file);
        reader.onload = (ev) => {
          onAddFile({
             id: uuid(),
             name: file.name,
             size: file.size,
             type: file.type || 'text/plain',
             content: ev.target?.result as string,
             timestamp: Date.now()
          });
        }
      }
      e.target.value = '';
    }
  };

  const downloadNodeFile = (file: LocalFile) => {
    let blob;
    if (file.type === 'application/pdf') {
      const byteCharacters = atob(file.content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: file.type });
    } else {
      blob = new Blob([file.content], { type: file.type });
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full relative">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
      <input type="file" ref={nodeFileInputRef} onChange={handleNodeFileChange} className="hidden" />

      {/* Breadcrumbs & Toolbar */}
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gemini-400 flex items-center gap-2">
            📚 Knowledge Graph
          </h2>
          
          <div className="flex gap-2">
            <button onClick={handleImportClick} title="Upload Wiki JSON" className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            </button>
            <button onClick={onExport} title="Download Wiki JSON" className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5M12 16.5V3" /></svg>
            </button>
            <div className="w-px bg-slate-700 mx-1"></div>
            <button 
              onClick={() => {
                  setTargetParent(currentTerm);
                  setShowAddModal(true);
              }}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 text-sm rounded-lg font-medium flex items-center gap-1"
            >
                <span>+</span> Child
            </button>
            {(!currentEntries || currentEntries.length === 0) && (
              <button onClick={handleGenerate} disabled={isLoading} className="bg-gemini-600 hover:bg-gemini-500 disabled:opacity-50 text-white px-4 py-1.5 text-sm rounded-lg font-medium">
                {isLoading ? 'Analyzing...' : isRoot ? 'Build Index' : `Expand '${currentTerm}'`}
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-slate-400 overflow-x-auto scrollbar-hide">
          <button onClick={onNavigateHome} className={`hover:text-white ${isRoot ? 'text-white font-bold' : ''}`}>Home</button>
          {path.slice(1).map((p, i) => (
            <React.Fragment key={i}>
              <span className="text-slate-600">/</span>
              <button disabled={i === path.length - 2} onClick={onNavigateBack} className={`${i === path.length - 2 ? 'text-white font-bold cursor-default' : 'hover:text-white cursor-pointer'}`}>
                {p}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Main Grid */}
        <div className="flex-1 overflow-y-auto pr-2">
            {currentEntries && currentEntries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentEntries.map((entry, i) => {
                  const isBranch = checkIsBranch(entry.term);
                  return (
                    <div 
                        key={i} 
                        className="group bg-slate-800 border border-slate-700 p-4 rounded-lg hover:border-gemini-500/50 hover:bg-slate-750 transition-all relative"
                    >
                        <div 
                            onClick={() => onDrillDown(entry.term)}
                            className="absolute inset-0 cursor-pointer z-0"
                        ></div>
                        
                        <div className="absolute top-3 right-3 flex gap-2 z-10">
                             <span className={`text-xs px-1.5 py-0.5 rounded border ${isBranch ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-600/20 text-slate-500 border-slate-600/30'}`}>
                                {isBranch ? 'Branch' : 'Leaf'}
                             </span>
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setTargetParent('ROOT');
                                    setMoveNodeModal({term: entry.term, definition: entry.definition});
                                }}
                                className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                                title="Move Node"
                             >
                                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                                  </svg>
                             </button>
                        </div>

                        <div className="flex items-center gap-2 mb-2 pointer-events-none">
                             <span className="text-xl">{isBranch ? '🕸️' : '🌿'}</span>
                             <h3 className="text-gemini-400 font-bold text-lg group-hover:underline underline-offset-4">{entry.term}</h3>
                        </div>
                        
                        <p className="text-slate-300 text-sm mb-3 leading-relaxed line-clamp-3 pointer-events-none">{entry.definition}</p>
                        <div className="text-xs text-slate-500 border-t border-slate-700 pt-2 flex items-center gap-1 pointer-events-none">
                        <span className="font-semibold">Context:</span> 
                        <span className="truncate">{entry.relatedContext}</span>
                        </div>
                    </div>
                  )
                })}
            </div>
            ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
                <span className="text-2xl">🕸️</span>
                </div>
                <p>
                {isLoading ? 'Generating graph nodes...' : isRoot ? 'Generate the initial concept index.' : `Click Generate to explore '${currentTerm}'.`}
                </p>
            </div>
            )}
        </div>

        {/* Expert Notes Panel */}
        <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col rounded-l-xl">
            <div className="p-4 flex-1 flex flex-col border-b border-slate-800">
                 <div className="flex justify-between items-center mb-3 group">
                     <h3 
                        onClick={() => setIsNotesExpanded(true)}
                        className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 cursor-pointer hover:text-gemini-400 transition-colors"
                     >
                        Expert Notes
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 opacity-0 group-hover:opacity-100">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                        </svg>
                     </h3>
                     <button 
                        onClick={onAutoPopulate}
                        disabled={isLoading || currentFiles.length === 0}
                        title="Auto-populate from attached files"
                        className="text-gemini-400 hover:text-white hover:bg-gemini-600/50 p-1 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                     >
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM9 15a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5A.75.75 0 019 15z" clipRule="evenodd" />
                        </svg>
                     </button>
                 </div>
                 
                 <div className="relative flex-1">
                      <AutocompleteTextarea
                          value={currentContent}
                          onChange={onUpdateContent}
                          allNodes={allNodes}
                          placeholder={`Add expert context for '${currentTerm}'...\nType '#' to link other knowledge nodes.`}
                          className="w-full h-full bg-transparent border-none text-base text-slate-200 focus:ring-0 outline-none resize-none font-mono leading-relaxed"
                      />
                 </div>
                 <p className="text-[10px] text-slate-500 mt-2">
                     Changes save automatically.
                 </p>
            </div>
            
            {/* File Attachments Section */}
            <div className="p-4 h-1/3 flex flex-col">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attachments ({currentFiles.length})</h3>
                    <button onClick={() => nodeFileInputRef.current?.click()} className="text-slate-400 hover:text-white text-xs font-medium hover:bg-slate-800 px-2 py-1 rounded transition-colors">
                       + Add
                    </button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto space-y-2">
                    {currentFiles.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs border border-dashed border-slate-800 rounded">
                          <span>No files attached</span>
                       </div>
                    ) : (
                       currentFiles.map(file => (
                          <div key={file.id} className="flex items-center justify-between bg-slate-800/50 p-2 rounded text-xs group">
                              <span className="truncate text-slate-300 flex-1">{file.name}</span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => downloadNodeFile(file)} className="p-1 hover:text-gemini-400" title="Download">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" /><path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" /></svg>
                                 </button>
                                 <button onClick={() => onRemoveFile(file.id)} className="p-1 hover:text-red-400" title="Remove">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                                 </button>
                              </div>
                          </div>
                       ))
                    )}
                 </div>
            </div>
        </div>
      </div>

      {/* Expanded Notes Modal */}
      {isNotesExpanded && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-200">
           <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full h-full max-w-5xl flex flex-col shadow-2xl overflow-hidden">
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gemini-900/30 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gemini-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">Expert Notes: <span className="text-gemini-400">{currentTerm}</span></h2>
                  </div>
                  <div className="flex items-center gap-4">
                      {/* View Toggle */}
                      <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                          <button 
                            onClick={() => setNoteMode('edit')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${noteMode === 'edit' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            Write
                          </button>
                          <button 
                            onClick={() => setNoteMode('preview')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${noteMode === 'preview' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            Preview
                          </button>
                      </div>
                      <button 
                        onClick={() => setIsNotesExpanded(false)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-700"
                      >
                        Done
                      </button>
                  </div>
              </div>
              <div className="flex-1 p-6 relative bg-slate-900/50 overflow-hidden">
                   {noteMode === 'edit' ? (
                       <AutocompleteTextarea
                            value={currentContent}
                            onChange={onUpdateContent}
                            allNodes={allNodes}
                            placeholder={`Write detailed expert context for '${currentTerm}' here...\nUse Markdown for formatting.\nType '#' to link other knowledge nodes.`}
                            className="w-full h-full bg-transparent border-none text-base text-slate-200 focus:ring-0 outline-none resize-none font-mono leading-relaxed"
                        />
                   ) : (
                       <div className="h-full w-full overflow-y-auto prose prose-invert prose-sm max-w-none">
                           {currentContent ? (
                               <MarkdownView content={currentContent} />
                           ) : (
                               <div className="text-slate-600 italic">Nothing to preview yet...</div>
                           )}
                       </div>
                   )}
              </div>
              <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-500 flex justify-between">
                 <span>{noteMode === 'edit' ? 'Markdown Supported' : 'Reading Mode'}</span>
                 <span>{currentContent.length} chars</span>
              </div>
           </div>
        </div>
      )}
      
      {/* Add Manual Node Modal */}
      {showAddModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6">
               <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-gemini-400">+</span> Add Concept
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Concept Name</label>
                            <input 
                                type="text"
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-gemini-500 transition-colors"
                                value={newTerm}
                                onChange={e => setNewTerm(e.target.value)}
                                placeholder="e.g. CP1 Deployment"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Parent Node</label>
                            <div className="flex gap-2">
                                <select 
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-gemini-500"
                                    value={targetParent}
                                    onChange={e => setTargetParent(e.target.value)}
                                >
                                    <option value="ROOT">ROOT (Top Level)</option>
                                    {allNodes.filter(n => n !== 'ROOT').sort().map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                                <button 
                                    onClick={handleAutoSuggestParent}
                                    disabled={!newTerm.trim() || isSuggesting}
                                    className="bg-gemini-600/20 text-gemini-400 border border-gemini-600/30 hover:bg-gemini-600/30 px-3 py-2 rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                                    title="Ask AI to suggest best parent"
                                >
                                    {isSuggesting ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : '✨'}
                                </button>
                            </div>
                        </div>
                         <div>
                            <label className="block text-xs text-slate-400 mb-1">Short Definition</label>
                            <textarea 
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-gemini-500 resize-none h-24"
                                value={newDefinition}
                                onChange={e => setNewDefinition(e.target.value)}
                                placeholder="Brief description..."
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-sm px-3 py-2">Cancel</button>
                        <button 
                            onClick={handleSaveManualEntry} 
                            disabled={!newTerm.trim()}
                            className="bg-gemini-600 hover:bg-gemini-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 shadow-lg shadow-gemini-900/20"
                        >
                            Add Concept
                        </button>
                    </div>
               </div>
          </div>
      )}
      
      {/* Move Node Modal */}
      {moveNodeModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6">
               <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gemini-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                        Move Node
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                        Move <span className="text-white font-bold">{moveNodeModal.term}</span> to a new parent category.
                    </p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">New Parent Node</label>
                            <select 
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-gemini-500"
                                value={targetParent}
                                onChange={e => setTargetParent(e.target.value)}
                            >
                                <option value="ROOT">ROOT (Top Level)</option>
                                {allNodes.filter(n => n !== 'ROOT' && n !== moveNodeModal.term).sort().map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setMoveNodeModal(null)} className="text-slate-400 hover:text-white text-sm px-3 py-2">Cancel</button>
                        <button 
                            onClick={handleConfirmMove} 
                            className="bg-gemini-600 hover:bg-gemini-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-gemini-900/20"
                        >
                            Move
                        </button>
                    </div>
               </div>
          </div>
      )}
    </div>
  );
};

const EMAIL_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    subject: { type: Type.STRING },
    body: { type: Type.STRING },
    toneAnalysis: { type: Type.STRING }
  }
};

export const EmailComposer: React.FC<ToolProps<EmailDraft>> = ({ isLoading, onGenerate, output }) => {
  const [subject, setSubject] = useState('');
  const [keyPoints, setKeyPoints] = useState('');
  const [sliders, setSliders] = useState({
    directness: 50,
    familiarity: 20,
    audience: 50,
    power: 50,
    structure: 30
  });
  const [culture, setCulture] = useState('US/General');

  const handleGenerate = () => {
    const prompt = `Draft an email.
    Subject: ${subject}
    Points: ${keyPoints}
    
    Configuration (0-100):
    Directness: ${sliders.directness} (Low=Deferential, High=Direct)
    Familiarity: ${sliders.familiarity} (Low=Formal, High=Casual)
    Audience: ${sliders.audience} (Low=Internal, High=External)
    Power: ${sliders.power} (Low=Ask, High=Tell)
    Structure: ${sliders.structure} (Low=Narrative, High=Bulleted)
    Cultural Context: ${culture}
    
    Return the subject, body, and a brief toneAnalysis explaining your choices.`;
    onGenerate(prompt, EMAIL_SCHEMA);
  };

  const Slider = ({ label, val, setVal, minL, maxL }: any) => (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span className="text-gemini-400">{val}%</span>
      </div>
      <input 
        type="range" min="0" max="100" value={val} 
        onChange={(e) => setVal(Number(e.target.value))}
        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-gemini-500"
      />
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>{minL}</span><span>{maxL}</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-full gap-6 max-w-6xl mx-auto w-full">
      {/* Controls */}
      <div className="w-1/3 bg-slate-800/50 p-5 rounded-xl border border-slate-700 overflow-y-auto">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><span className="text-gemini-400">⚙️</span> Configuration</h3>
        <div className="space-y-4 mb-6">
          <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white outline-none" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
          <textarea className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white outline-none h-24 resize-none" placeholder="Key Points..." value={keyPoints} onChange={e => setKeyPoints(e.target.value)} />
        </div>
        
        <div className="space-y-3">
          <Slider label="Directness" val={sliders.directness} setVal={(v:number)=>setSliders({...sliders, directness:v})} minL="Deferential" maxL="Assertive" />
          <Slider label="Familiarity" val={sliders.familiarity} setVal={(v:number)=>setSliders({...sliders, familiarity:v})} minL="Formal" maxL="Casual" />
          <Slider label="Audience" val={sliders.audience} setVal={(v:number)=>setSliders({...sliders, audience:v})} minL="Internal" maxL="External" />
          <Slider label="Power" val={sliders.power} setVal={(v:number)=>setSliders({...sliders, power:v})} minL="Subordinate" maxL="Superior" />
          <Slider label="Style" val={sliders.structure} setVal={(v:number)=>setSliders({...sliders, structure:v})} minL="Flow" maxL="List" />
          
          <div className="mt-2">
            <label className="text-xs text-slate-400 block mb-1">Culture</label>
            <select value={culture} onChange={e=>setCulture(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white">
              {['US/General', 'UK', 'Japan', 'Germany', 'France'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        
        <button onClick={handleGenerate} disabled={isLoading} className="w-full mt-6 bg-gemini-600 hover:bg-gemini-500 disabled:opacity-50 text-white py-2 rounded-lg">
          {isLoading ? 'Drafting...' : 'Generate'}
        </button>
      </div>

      {/* Preview */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex-1 bg-white rounded-xl p-8 text-slate-800 shadow-lg overflow-y-auto">
          {output ? (
            <div>
              <div className="border-b border-slate-200 pb-4 mb-6">
                <p className="text-sm text-slate-500">To: [Recipient]</p>
                <p className="text-sm text-slate-500">From: [You]</p>
                <p className="text-lg font-bold text-slate-800 mt-2">{output.subject}</p>
              </div>
              <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {output.body}
              </div>
            </div>
          ) : <div className="text-center text-slate-400 mt-20">Email preview...</div>}
        </div>
        
        {output && (
          <div className="bg-gemini-900/20 border border-gemini-500/30 p-4 rounded-lg text-sm text-gemini-100">
            <strong className="text-gemini-400 block mb-1">AI Reasoning:</strong>
            {output.toneAnalysis}
          </div>
        )}
      </div>
    </div>
  );
};

// --- 4. Risk Register ---

const RISK_SCHEMA_EXPORT: Schema = {
  type: Type.OBJECT,
  properties: {
    risks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          riskDescription: { type: Type.STRING },
          category: { type: Type.STRING },
          probability: { type: Type.INTEGER },
          impact: { type: Type.INTEGER },
          mitigationStrategy: { type: Type.STRING }
        }
      }
    },
    gapAnalysis: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  }
};

interface RiskRegisterProps extends ToolProps<RiskAnalysisData> {
  onAddFiles: (files: LocalFile[]) => void;
  onLog: (level: LogLevel, message: string, details?: string) => void;
  onGenerateText: (prompt: string, onSuccess: (text: string) => void, overrideFiles?: LocalFile[]) => void;
  fileCount: number;
  onUpdateRisk?: (risk: RiskItem) => void;
}

export const RiskRegister: React.FC<RiskRegisterProps> = ({ isLoading, onGenerate, output, onAddFiles, onLog, onGenerateText, fileCount, onUpdateRisk }) => {
  const [showUploader, setShowUploader] = useState(false);
  const [workflowStep, setWorkflowStep] = useState<'idle' | 'review' | 'complete'>('idle');
  const [draftRiskText, setDraftRiskText] = useState('');
  const [localRiskFiles, setLocalRiskFiles] = useState<LocalFile[]>([]);

  const handleLocalAddFiles = (newFiles: LocalFile[]) => {
      setLocalRiskFiles(prev => [...prev, ...newFiles]);
      onAddFiles(newFiles); 
      onLog('info', `Added ${newFiles.length} risk-specific files.`);
  };

  useEffect(() => {
    if (output?.risks && output.risks.length > 0 && workflowStep === 'idle') {
        setWorkflowStep('complete');
    }
  }, [output, workflowStep]);

  const handleDraftRisks = () => {
    const filesToUse = localRiskFiles.length > 0 ? localRiskFiles : undefined; 
    
    onGenerateText(
        "Analyze the attached content. List the top 10 potential risks found or inferred. \nFormat strictly as a bulleted list:\n- [Risk Description]\n- [Risk Description]\n...",
        (text) => {
            setDraftRiskText(text);
            setWorkflowStep('review');
        },
        filesToUse
    );
  };

  const handleFinalizeMatrix = () => {
    onGenerate(
      `Input Context (CONFIRMED RISKS):\n${draftRiskText}\n\n` + 
      "TASK:\n1. Convert the 'Input Context' list above into a structured 5x5 Risk Register (score probability/impact 1-5) in the 'risks' array.\n2. Review the ORIGINAL files again and populate 'gapAnalysis' with 5-8 blind spots or categories that are NOT in the confirmed list but should be considered.\n\nCRITICAL: Keep risk descriptions and mitigation strategies EXTREMELY SHORT (max 10 words each) to prevent token overflow.",
      RISK_SCHEMA_EXPORT
    );
    setWorkflowStep('complete');
  };

  const handleStartOver = () => {
      setWorkflowStep('idle');
      setDraftRiskText('');
      setLocalRiskFiles([]); 
  };

  const getScoreColor = (score: number) => {
    if (score >= 20) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (score >= 10) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  };

  const sortedRisks = output?.risks ? [...output.risks].sort((a, b) => (b.probability * b.impact) - (a.probability * a.impact)) : [];
  const effectiveFileCount = localRiskFiles.length > 0 ? localRiskFiles.length : fileCount;
  const isUsingLocalFiles = localRiskFiles.length > 0;

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full">
      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 mb-6 flex flex-col gap-4">
         <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white text-gemini-400">⚠️ Risk Register & Gap Analysis</h2>
              {effectiveFileCount > 0 && (
                 <span className={`text-xs font-medium px-2 py-0.5 rounded border ${isUsingLocalFiles ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                    Analyzing {effectiveFileCount} Document{effectiveFileCount !== 1 ? 's' : ''} {isUsingLocalFiles ? '(Isolated)' : '(Global)'}
                 </span>
              )}
              <button 
                onClick={() => setShowUploader(!showUploader)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-2 ${showUploader ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                {showUploader ? 'Hide Upload' : 'Upload Risk Data'}
              </button>
            </div>
            
            <div className="flex gap-2 items-center">
                {workflowStep === 'idle' && (
                   <>
                    {effectiveFileCount === 0 && <span className="text-xs text-amber-500 mr-2">Upload files first</span>}
                    <button 
                        onClick={handleDraftRisks} 
                        disabled={isLoading || effectiveFileCount === 0} 
                        className="bg-gemini-600 hover:bg-gemini-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg shadow-lg shadow-gemini-900/20"
                    >
                        {isLoading ? 'Drafting Risks...' : '1. Draft Risks'}
                    </button>
                   </>
                )}
                {workflowStep === 'review' && (
                    <button onClick={handleFinalizeMatrix} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg shadow-lg shadow-emerald-900/20 animate-pulse">
                        {isLoading ? 'Finalizing...' : '2. Generate Matrix'}
                    </button>
                )}
                {workflowStep === 'complete' && (
                    <button onClick={handleStartOver} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg border border-slate-600">
                        Start Over
                    </button>
                )}
            </div>
         </div>

         {showUploader && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <FileUploader onFilesAdded={handleLocalAddFiles} onLog={onLog} />
                <p className="text-xs text-slate-500 mt-2 ml-1">* Files uploaded here will be prioritized for Risk Analysis.</p>
            </div>
         )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col gap-6 relative">
        
        {isLoading && (
             <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-20 flex items-center justify-center rounded-xl">
                 <div className="flex flex-col items-center">
                     <div className="w-10 h-10 border-4 border-gemini-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                     <p className="text-slate-200 font-medium animate-pulse">AI Processing...</p>
                 </div>
             </div>
        )}

        {workflowStep === 'review' && (
             <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-300">
                  <div className="bg-amber-950/20 border border-amber-900/50 rounded-t-xl p-3 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                      <span className="text-sm font-bold text-amber-100">Review & Edit Risks</span>
                      <span className="text-xs text-amber-200/60 ml-auto">Add, remove, or modify risks before generating the final matrix.</span>
                  </div>
                  <textarea 
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-b-xl p-6 text-slate-200 font-mono text-sm leading-relaxed outline-none focus:ring-1 focus:ring-amber-500/50 resize-none"
                      value={draftRiskText}
                      onChange={(e) => setDraftRiskText(e.target.value)}
                      placeholder="Generating draft risks..."
                  />
             </div>
        )}

        {workflowStep === 'complete' && (
          <>
            <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">5x5 Risk Matrix</h3>
                <span className="text-[10px] text-slate-600">{sortedRisks.length} Risks Identified</span>
                </div>
                <div className="flex-1 overflow-auto">
                {sortedRisks.length > 0 ? (
                    <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-xs font-bold sticky top-0 z-10">
                        <tr>
                        <th className="px-2 py-3 border-b border-slate-800 w-10">#</th>
                        <th className="px-2 py-3 border-b border-slate-800 w-20">Source</th>
                        <th className="px-4 py-3 border-b border-slate-800">Description</th>
                        <th className="px-2 py-3 border-b border-slate-800 text-center w-16">Prob</th>
                        <th className="px-2 py-3 border-b border-slate-800 text-center w-16">Imp</th>
                        <th className="px-2 py-3 border-b border-slate-800 w-16 text-center">Score</th>
                        <th className="px-4 py-3 border-b border-slate-800 w-1/3">Mitigation</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {sortedRisks.map((row, idx) => {
                        const score = row.probability * row.impact;
                        return (
                            <tr key={row.id} className="hover:bg-slate-800/50 transition-colors">
                            <td className="px-2 py-3 font-mono text-xs text-slate-500 text-center">{idx + 1}</td>
                            <td className="px-2 py-3 text-xs text-slate-500 truncate max-w-[80px]" title={row.source}>{row.source || 'AI'}</td>
                            <td className="px-4 py-3">
                                <input 
                                  className="bg-transparent w-full outline-none focus:border-b focus:border-gemini-500 text-slate-200"
                                  value={row.riskDescription}
                                  onChange={(e) => onUpdateRisk?.({ ...row, riskDescription: e.target.value })}
                                />
                            </td>
                            <td className="px-2 py-3 text-center">
                                <select 
                                  className="bg-slate-800 text-xs rounded border border-slate-700 outline-none focus:border-gemini-500 px-1"
                                  value={row.probability}
                                  onChange={(e) => onUpdateRisk?.({ ...row, probability: parseInt(e.target.value) })}
                                >
                                  {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </td>
                            <td className="px-2 py-3 text-center">
                                <select 
                                  className="bg-slate-800 text-xs rounded border border-slate-700 outline-none focus:border-gemini-500 px-1"
                                  value={row.impact}
                                  onChange={(e) => onUpdateRisk?.({ ...row, impact: parseInt(e.target.value) })}
                                >
                                  {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </td>
                            <td className="px-2 py-3 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-bold border ${getScoreColor(score)}`}>
                                {score}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400">
                                <input 
                                  className="bg-transparent w-full outline-none focus:border-b focus:border-gemini-500 text-slate-400"
                                  value={row.mitigationStrategy}
                                  onChange={(e) => onUpdateRisk?.({ ...row, mitigationStrategy: e.target.value })}
                                />
                            </td>
                            </tr>
                        );
                        })}
                    </tbody>
                    </table>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600">
                        <span className="text-4xl mb-2">📊</span>
                        <p>No risks generated yet.</p>
                    </div>
                )}
                </div>
            </div>

            <div className="h-1/3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-700">
                <div className="bg-amber-950/30 px-4 py-2 border-b border-amber-900/30 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-amber-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Blind Spots & Missing Risks</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    {output?.gapAnalysis && output.gapAnalysis.length > 0 ? (
                        <ul className="space-y-2">
                            {output.gapAnalysis.map((gap, i) => (
                                <li key={i} className="flex gap-3 text-sm text-slate-300">
                                    <span className="text-amber-500/50">•</span>
                                    <span>{gap}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-slate-600 text-sm italic">Generate analysis to identify potential blind spots.</p>
                    )}
                </div>
            </div>
          </>
        )}

        {workflowStep === 'idle' && (
             <div className="flex-1 flex items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl">
                 <div className="text-center max-w-md">
                     <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <span className="text-3xl">⚠️</span>
                     </div>
                     <h3 className="text-lg font-medium text-slate-300">Start Risk Analysis</h3>
                     <p className="text-sm text-slate-500 mt-2">
                         Upload your project documents above, then click "Draft Risks" to begin extracting critical risk factors.
                     </p>
                 </div>
             </div>
        )}

      </div>
    </div>
  );
};

export const UserGuidance: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto max-w-4xl mx-auto bg-white rounded-xl shadow-2xl">
      <div className="p-8 md:p-12">
        <div className="border-b border-slate-200 pb-6 mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Ethical Use Guide</h1>
            <h2 className="text-lg font-medium text-gemini-600">For the SESAR Deployment Manager AI Policy Support Tool</h2>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed italic">
                This guide defines how professionals within the SESAR Deployment Manager (SDM) must use AI responsibly when generating, evaluating, or refining policy content related to safety-critical aviation deployment activities.
                It reflects SDM’s commitment to transparency, accountability, and safety of life.
            </p>
        </div>

        <div className="space-y-8 text-slate-800 leading-relaxed">
            <section>
                <h3 className="text-xl font-bold mb-3 text-slate-900">1. Purpose of the AI Tool</h3>
                <p className="mb-2">The SDM AI policy tool exists to:</p>
                <ul className="list-disc pl-5 space-y-1 mb-4">
                    <li>support clarity and structure in policy drafts;</li>
                    <li>accelerate assessment and comparison of policy options;</li>
                    <li>surface inconsistencies or missing information;</li>
                    <li>help analyse the implications of proposed requirements.</li>
                </ul>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-900">
                    <strong>Critical:</strong> It must not be used to set policy direction, make regulatory decisions, or replace professional judgement. Professionals remain the primary authors, reviewers, and custodians of all policy outputs.
                </div>
            </section>
            
            <section>
                <h3 className="text-xl font-bold mb-3 text-slate-900">2. Safety & Liability</h3>
                <p className="mb-2">Aviation is a safety-critical domain. AI models can hallucinate or provide factually incorrect information.</p>
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 text-sm text-amber-900">
                    <ul className="list-disc pl-5">
                        <li><strong>Verify everything:</strong> Never copy-paste AI output into formal policy documents without expert verification.</li>
                        <li><strong>Traceability:</strong> You must be able to trace every requirement back to a valid regulation or operational need, not just an AI suggestion.</li>
                    </ul>
                </div>
            </section>

            <section>
                <h3 className="text-xl font-bold mb-3 text-slate-900">3. Data Privacy & Security</h3>
                <p className="mb-2">Do not input sensitive personal data (GDPR) or classified security information into the tool unless it is deployed in a secure, approved environment.</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Sanitize documents before uploading if necessary.</li>
                    <li>Be aware that input data may be processed by third-party APIs depending on the deployment configuration.</li>
                </ul>
            </section>

             <section>
                 <h3 className="text-xl font-bold mb-3 text-slate-900">4. Transparency</h3>
                 <p>When presenting work significantly aided by this tool, acknowledge the use of AI. This fosters trust and ensures reviewers know to scrutinize the output for common AI pitfalls.</p>
             </section>
             
             <section>
                 <h3 className="text-xl font-bold mb-3 text-slate-900">7. Closing Commitment</h3>
                 <div className="bg-slate-800 text-slate-100 p-6 rounded-lg shadow-lg">
                     <p className="mb-4 font-medium">Using the SDM AI tool, I commit to the following:</p>
                     <ul className="space-y-3">
                         <li className="flex gap-3">
                             <span className="text-gemini-400">✓</span>
                             <span>AI augments my capability; it does not replace my responsibility.</span>
                         </li>
                         <li className="flex gap-3">
                             <span className="text-gemini-400">✓</span>
                             <span>I will use the tool ethically, transparently, and with full professional accountability.</span>
                         </li>
                         <li className="flex gap-3">
                             <span className="text-gemini-400">✓</span>
                             <span>I will ensure that every AI-assisted output meets the safety, rigour, and integrity expected within SESAR’s safety-of-life mandate.</span>
                         </li>
                         <li className="flex gap-3">
                             <span className="text-gemini-400">✓</span>
                             <span>I will act with diligence, neutrality, and honesty in all AI-supported policy work.</span>
                         </li>
                     </ul>
                 </div>
            </section>
        </div>
      </div>
    </div>
  );
};
