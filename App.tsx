
import React, { useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Chat } from './components/Chat';
import { ScaffoldedReport, ConceptWiki, EmailComposer, RiskRegister, UserGuidance, LibraryView } from './components/Tools';
import { Logger } from './components/Logger';
import { LocalFile, ChatMessage, Sender, AppTab, ReportData, WikiEntry, WikiCache, EmailDraft, RiskAnalysisData, LogEntry, LogLevel, RiskItem } from './types';
import { streamGeminiResponse, generateStructuredResponse, generateTextResponse, processDocumentIngestion, generateDocumentSummary, suggestWikiParent } from './services/geminiService';
import { Schema } from '@google/genai';

const uuid = () => Math.random().toString(36).substring(2, 15);

const tabs: { id: AppTab; label: string; icon: string }[] = [
  { id: 'library', label: 'Library', icon: '📂' },
  { id: 'what-if', label: 'What-If', icon: '🔮' },
  { id: 'report', label: 'Report', icon: '📝' },
  { id: 'wiki', label: 'Wiki', icon: '🧠' },
  { id: 'email', label: 'Email', icon: '✉️' },
  { id: 'risk', label: 'Risk', icon: '⚠️' },
  { id: 'guidance', label: 'Guidance', icon: '🛡️' },
];

export default function App() {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [activeTab, setActiveTab] = useState<AppTab>('library');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [summarizingIds, setSummarizingIds] = useState<string[]>([]);

  // Tool States
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [emailData, setEmailData] = useState<EmailDraft | null>(null);
  const [riskData, setRiskData] = useState<RiskAnalysisData | null>(null);
  
  // Wiki State (Graph)
  const [wikiCache, setWikiCache] = useState<WikiCache>({});
  const [wikiPath, setWikiPath] = useState<string[]>(['ROOT']);

  // Logging Helper
  const addLog = useCallback((level: LogLevel, message: string, details?: string) => {
    setLogs(prev => [...prev, {
      id: uuid(),
      timestamp: new Date(),
      level,
      message,
      details
    }]);
  }, []);

  // Ingestion Handler
  const ingestFile = async (file: LocalFile) => {
      addLog('info', `Ingesting ${file.name} to Knowledge Base...`);
      // Mark processing start
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, isProcessing: true } : f));
      setSummarizingIds(prev => [...prev, file.id]); 

      try {
          const processedData = await processDocumentIngestion(file);
          
          setFiles(prev => prev.map(f => f.id === file.id ? { 
              ...f, 
              processedData, 
              summary: processedData.summary, 
              isProcessing: false 
          } : f));
          
          addLog('success', `Ingested ${file.name}`, `Topics: ${processedData.topics.length}, Risks: ${processedData.risks.length}`);
          
      } catch (e: any) {
          addLog('error', `Ingestion failed for ${file.name}`, e.message);
          setFiles(prev => prev.map(f => f.id === file.id ? { ...f, isProcessing: false } : f));
      } finally {
          setSummarizingIds(prev => prev.filter(id => id !== file.id));
      }
  };

  const handleAddFiles = useCallback(async (newFiles: LocalFile[]) => {
    setFiles(prev => [...prev, ...newFiles]);
    addLog('info', `Added ${newFiles.length} file(s). Starting ingestion queue...`);

    for (const file of newFiles) {
        await ingestFile(file);
    }
  }, [addLog]);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file) addLog('info', `Removed file: ${file.name}`);
      return prev.filter(f => f.id !== id);
    });
  }, [addLog]);

  const handleGenerateSummary = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    await ingestFile(file);
  };

  // --- LIBRARY TO TOOLS HANDLERS ---

  const handleAddRiskFromLibrary = (riskText: string, category: string, sourceFile: string) => {
    setRiskData(prev => {
      const existing = prev || { risks: [], gapAnalysis: [] };
      const newRisk: RiskItem = {
        id: uuid(),
        source: sourceFile,
        riskDescription: riskText,
        category: category || 'General', 
        probability: 3, // Default Medium
        impact: 3,      // Default Medium
        mitigationStrategy: 'To be determined'
      };
      return { ...existing, risks: [...existing.risks, newRisk] };
    });
    addLog('success', 'Added risk to register', `${riskText.substring(0, 20)}...`);
  };

  const handleAddRisksBulk = (risks: {risk: string, category: string, source: string}[]) => {
      setRiskData(prev => {
         const existing = prev || { risks: [], gapAnalysis: [] };
         const newRisks = risks.map(r => ({
            id: uuid(),
            source: r.source,
            riskDescription: r.risk,
            category: r.category || 'General',
            probability: 3,
            impact: 3,
            mitigationStrategy: 'To be determined'
         }));
         return { ...existing, risks: [...existing.risks, ...newRisks] };
      });
      addLog('success', `Added ${risks.length} risks to register.`);
  };

  const handleAddWikiFromLibrary = (term: string, sourceFile: string) => {
    handleWikiAddManualEntry(term, `Imported from ${sourceFile}`, 'ROOT');
  };

  const handleUpdateRisk = (updatedRisk: RiskItem) => {
    setRiskData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        risks: prev.risks.map(r => r.id === updatedRisk.id ? updatedRisk : r)
      };
    });
  };

  // Structured Generator Wrapper
  const runStructuredTool = async <T,>(
    prompt: string, 
    schema: Schema, 
    onSuccess: (data: T) => void
  ) => {
    setIsLoading(true);
    const toolName = activeTab.toUpperCase();
    addLog('info', `Starting ${toolName} generation...`);
    
    try {
      const data = await generateStructuredResponse<T>(prompt, files, schema);
      onSuccess(data);
      addLog('success', `${toolName} generated successfully.`);
    } catch (e: any) {
      console.error(e);
      addLog('error', `${toolName} generation failed.`, e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Text Generator Wrapper (For Risk Drafts)
  const runTextTool = useCallback(async (
    prompt: string,
    onSuccess: (text: string) => void,
    overrideFiles?: LocalFile[]
  ) => {
    const contextFiles = overrideFiles || files;
    
    if (contextFiles.length === 0) {
        addLog('warning', 'No files available for analysis. Please upload documents.');
        return;
    }
    
    setIsLoading(true);
    
    // OPTIMIZATION: Inject processed metadata into the prompt
    let enhancedPrompt = prompt;
    const aggregatedRisks: string[] = [];
    contextFiles.forEach(f => {
        if (f.processedData?.risks) aggregatedRisks.push(...f.processedData.risks.map(r => r.risk));
    });

    if (aggregatedRisks.length > 0) {
        enhancedPrompt += `\n\n[KNOWLEDGE BASE CONTEXT - EXTRACTED RISKS]:\nThe following risks were already identified during document ingestion. Consider these as a starting point:\n- ${aggregatedRisks.slice(0, 20).join('\n- ')}`;
    }

    addLog('info', `Starting text generation. Using ${contextFiles.length} file(s).`);
    
    try {
      const text = await generateTextResponse(enhancedPrompt, contextFiles);
      if (text) {
          onSuccess(text);
          addLog('success', 'Text generated successfully.');
      } else {
          addLog('warning', 'Model returned empty text.');
      }
    } catch (e: any) {
      addLog('error', 'Text generation failed.', e.message);
    } finally {
      setIsLoading(false);
    }
  }, [files, addLog]);

  // Wiki Specific Logic
  const handleWikiGenerate = (prompt: string, schema: Schema) => {
    const currentTerm = wikiPath[wikiPath.length - 1];
    runStructuredTool<WikiEntry[]>(prompt, schema, (data) => {
      setWikiCache(prev => ({
        ...prev,
        [currentTerm]: {
          entries: data,
          content: prev[currentTerm]?.content || '',
          files: prev[currentTerm]?.files || []
        }
      }));
    });
  };

  const handleWikiUpdateContent = (content: string) => {
    const currentTerm = wikiPath[wikiPath.length - 1];
    setWikiCache(prev => ({
      ...prev,
      [currentTerm]: {
        ...prev[currentTerm],
        entries: prev[currentTerm]?.entries || [],
        content: content,
        files: prev[currentTerm]?.files || []
      }
    }));
  };

  const handleWikiAddFile = (file: LocalFile) => {
    const currentTerm = wikiPath[wikiPath.length - 1];
    setWikiCache(prev => ({
      ...prev,
      [currentTerm]: {
        ...prev[currentTerm],
        entries: prev[currentTerm]?.entries || [],
        content: prev[currentTerm]?.content || '',
        files: [...(prev[currentTerm]?.files || []), file]
      }
    }));
    addLog('success', `Attached file to node '${currentTerm}': ${file.name}`);
  };

  const handleWikiRemoveFile = (fileId: string) => {
    const currentTerm = wikiPath[wikiPath.length - 1];
    setWikiCache(prev => ({
      ...prev,
      [currentTerm]: {
        ...prev[currentTerm],
        files: (prev[currentTerm]?.files || []).filter(f => f.id !== fileId)
      }
    }));
  };

  const handleWikiAutoPopulate = async () => {
    const currentTerm = wikiPath[wikiPath.length - 1];
    const nodeFiles = wikiCache[currentTerm]?.files || [];

    if (nodeFiles.length === 0) {
      addLog('warning', 'No files attached to this node to populate content.');
      return;
    }

    setIsLoading(true);
    addLog('info', `Populating expert content for '${currentTerm}' using ${nodeFiles.length} file(s)...`);

    try {
      const prompt = `Analyze the attached documents. Write a comprehensive expert summary for the concept: "${currentTerm}". Include key definitions and context.`;
      const text = await generateTextResponse(prompt, nodeFiles);
      handleWikiUpdateContent(text);
      addLog('success', `Populated content for '${currentTerm}'.`);
    } catch (e: any) {
      addLog('error', 'Failed to populate node content.', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWikiAddManualEntry = (term: string, definition: string, parentNode: string = 'ROOT') => {
    setWikiCache(prev => {
        const targetParent = prev[parentNode] ? parentNode : 'ROOT';
        
        const node = prev[targetParent] || { entries: [], content: '', files: [] };
        const newEntry: WikiEntry = {
          term,
          definition,
          relatedContext: 'Manually added by user'
        };
        
        const newTermNode = prev[term] || { entries: [], content: definition, files: [] };
        
        return {
          ...prev,
          [targetParent]: {
            ...node,
            entries: [...(node.entries || []), newEntry]
          },
          [term]: newTermNode
        };
    });
    addLog('success', `Added manual node: ${term} under ${parentNode}`);
  };
  
  const handleWikiSuggestParent = async (term: string, definition: string) => {
      addLog('info', 'Asking AI for best parent node...');
      setIsLoading(true);
      try {
          const existingNodes = Object.keys(wikiCache);
          const result = await suggestWikiParent(term, definition, existingNodes);
          addLog('success', `AI Suggested: ${result.suggestedParent}`, result.reasoning);
          return result.suggestedParent;
      } catch(e) {
          addLog('error', 'Failed to suggest parent');
          return 'ROOT';
      } finally {
          setIsLoading(false);
      }
  };

  const handleWikiMoveNode = (term: string, definition: string, newParent: string) => {
      const currentParent = wikiPath[wikiPath.length - 1];
      if (currentParent === newParent) return;

      setWikiCache(prev => {
          // 1. Remove from old
          const oldParentNode = prev[currentParent];
          const updatedOldEntries = oldParentNode.entries.filter(e => e.term !== term);
          
          // 2. Add to new
          const newParentNode = prev[newParent] || { entries: [], content: '', files: [] };
          // Check for dupes
          if (newParentNode.entries.some(e => e.term === term)) return prev;
          
          const movedEntry: WikiEntry = { term, definition, relatedContext: `Moved from ${currentParent}` };
          
          return {
              ...prev,
              [currentParent]: { ...oldParentNode, entries: updatedOldEntries },
              [newParent]: { ...newParentNode, entries: [...newParentNode.entries, movedEntry] }
          };
      });
      addLog('success', `Moved '${term}' to '${newParent}'`);
  };

  const handleWikiDrillDown = (term: string) => {
    setWikiPath(prev => [...prev, term]);
    setWikiCache(prev => {
      if (!prev[term]) {
        return { ...prev, [term]: { entries: [], content: '', files: [] } };
      }
      return prev;
    });
  };

  const handleWikiBack = () => {
    if (wikiPath.length > 1) {
      setWikiPath(prev => prev.slice(0, -1));
    }
  };

  const handleWikiHome = () => {
    setWikiPath(['ROOT']);
  };

  const handleExportContext = useCallback(() => {
    try {
      const contextData = {
        version: 2,
        timestamp: new Date().toISOString(),
        files: files,
        wiki: wikiCache,
        riskData: riskData 
      };
      const jsonString = JSON.stringify(contextData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sdm_kms_context_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addLog('success', 'Full session context (Files + Wiki + Risks) saved.');
    } catch (e: any) {
      addLog('error', 'Failed to export context.', e.message);
    }
  }, [files, wikiCache, riskData, addLog]);

  const handleImportContext = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.files) && typeof parsed.wiki === 'object') {
           setFiles(parsed.files);
           setWikiCache(parsed.wiki);
           if (parsed.riskData) setRiskData(parsed.riskData); 
           setWikiPath(['ROOT']);
           addLog('success', `Context loaded: ${parsed.files.length} files restored.`);
        } else {
           throw new Error("Invalid context file format.");
        }
      } catch (err: any) {
        addLog('error', 'Failed to load context file', err.message);
      }
    };
    reader.readAsText(file);
  }, [addLog]);

  const handleExportWiki = useCallback(() => {
    try {
      const jsonString = JSON.stringify(wikiCache, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "concept_wiki_graph.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addLog('success', 'Wiki graph exported successfully.');
    } catch (e: any) {
      addLog('error', 'Failed to export wiki.', e.message);
    }
  }, [wikiCache, addLog]);

  const handleImportWiki = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (typeof parsed === 'object' && parsed !== null) {
           setWikiCache(parsed);
           setWikiPath(['ROOT']);
           addLog('success', 'Wiki graph imported successfully.');
        } else {
           throw new Error("Invalid JSON structure");
        }
      } catch (err: any) {
        addLog('error', 'Failed to import wiki JSON', err.message);
      }
    };
    reader.readAsText(file);
  }, [addLog]);

  const handleSendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { id: uuid(), sender: Sender.USER, text: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    addLog('info', 'Sending message to Gemini...');
    
    const botMsgId = uuid();
    setMessages(prev => [...prev, { id: botMsgId, sender: Sender.BOT, text: "", timestamp: Date.now() }]);

    await streamGeminiResponse(
      text,
      files,
      (chunk) => setMessages(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, text: msg.text + chunk } : msg)),
      () => {
        setIsLoading(false);
        addLog('success', 'Gemini response stream complete.');
      },
      (err) => {
        setMessages(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, text: `Error: ${err}`, isError: true } : msg));
        setIsLoading(false);
        addLog('error', 'Gemini stream error', err);
      }
    );
  }, [files, addLog]);

  const currentWikiNode = wikiCache[wikiPath[wikiPath.length - 1]];
  const currentWikiEntries = currentWikiNode?.entries || [];
  const currentWikiContent = currentWikiNode?.content || '';
  const currentWikiFiles = currentWikiNode?.files || [];

  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden font-sans text-slate-100">
      <Sidebar 
        files={files} 
        onAddFiles={handleAddFiles} 
        onRemoveFile={handleRemoveFile} 
        onLog={addLog}
        onExportContext={handleExportContext}
        onImportContext={handleImportContext}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-slate-900/50 border-b border-slate-800 px-4 pt-4">
           <nav className="flex space-x-1 overflow-x-auto scrollbar-hide">
             {tabs.map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap
                   ${activeTab === tab.id ? 'bg-[#0b1221] text-gemini-400 border-t border-l border-r border-slate-800 relative top-[1px]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}
                 `}
               >
                 <span>{tab.icon}</span>{tab.label}
               </button>
             ))}
           </nav>
        </header>

        <main className="flex-1 bg-[#0b1221] relative overflow-hidden flex flex-col">
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gemini-900/10 via-transparent to-transparent pointer-events-none" />
           <div className="flex-1 z-10 relative h-full pb-10">
             
             {activeTab === 'library' && (
               <div className="h-full overflow-hidden">
                 <LibraryView 
                   files={files} 
                   onGenerateSummary={handleGenerateSummary} 
                   onDeleteFile={handleRemoveFile} 
                   summarizingIds={summarizingIds}
                   onAddRisk={handleAddRiskFromLibrary}
                   onAddRisksBulk={handleAddRisksBulk}
                   onAddWikiNode={handleAddWikiFromLibrary}
                 />
               </div>
             )}

             {activeTab === 'what-if' && <Chat messages={messages} isLoading={isLoading} onSendMessage={handleSendMessage} />}
             
             {activeTab === 'report' && (
               <div className="h-full p-6 overflow-hidden">
                 <ScaffoldedReport isLoading={isLoading} onGenerate={(p, s) => runStructuredTool(p, s, setReportData)} output={reportData} />
               </div>
             )}
             
             {activeTab === 'wiki' && (
               <div className="h-full p-6 overflow-hidden">
                 <ConceptWiki 
                    isLoading={isLoading} 
                    onGenerate={handleWikiGenerate} 
                    currentEntries={currentWikiEntries}
                    currentContent={currentWikiContent}
                    currentFiles={currentWikiFiles}
                    allNodes={Object.keys(wikiCache)}
                    onUpdateContent={handleWikiUpdateContent}
                    path={wikiPath}
                    onDrillDown={handleWikiDrillDown}
                    onNavigateBack={handleWikiBack}
                    onNavigateHome={handleWikiHome}
                    onExport={handleExportWiki}
                    onImport={handleImportWiki}
                    checkIsBranch={(term) => !!(wikiCache[term] && wikiCache[term].entries.length > 0)}
                    onAddFile={handleWikiAddFile}
                    onRemoveFile={handleWikiRemoveFile}
                    onAutoPopulate={handleWikiAutoPopulate}
                    onAddManualEntry={handleWikiAddManualEntry}
                    onSuggestParent={handleWikiSuggestParent}
                    onMoveNode={handleWikiMoveNode}
                 />
               </div>
             )}
             
             {activeTab === 'email' && (
               <div className="h-full p-6 overflow-hidden">
                 <EmailComposer isLoading={isLoading} onGenerate={(p, s) => runStructuredTool(p, s, setEmailData)} output={emailData} />
               </div>
             )}

             {activeTab === 'risk' && (
               <div className="h-full p-6 overflow-hidden">
                 <RiskRegister 
                    isLoading={isLoading} 
                    onGenerate={(p, s) => runStructuredTool(p, s, setRiskData)} 
                    onGenerateText={runTextTool}
                    output={riskData} 
                    onAddFiles={handleAddFiles}
                    onLog={addLog}
                    fileCount={files.length}
                    onUpdateRisk={handleUpdateRisk}
                 />
               </div>
             )}

             {activeTab === 'guidance' && (
               <div className="h-full p-6 overflow-hidden">
                 <UserGuidance />
               </div>
             )}
           </div>
           
           {/* Logger Overlay */}
           <Logger logs={logs} onClear={() => setLogs([])} />
        </main>
      </div>
    </div>
  );
}
