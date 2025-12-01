
import React, { useCallback, useState } from 'react';
import { LocalFile, LogLevel } from '../types';

// Global declarations for CDN libraries
declare const mammoth: any;
declare const XLSX: any;
declare const JSZip: any;

// Mock UUID for this environment
const uuid = () => Math.random().toString(36).substring(2, 15);

interface FileUploaderProps {
  onFilesAdded: (files: LocalFile[]) => void;
  onLog: (level: LogLevel, message: string, details?: string) => void;
}

const SUPPORTED_EXTENSIONS = [
  // Code/Text
  '.txt', '.md', '.json', '.csv', '.js', '.ts', '.tsx', '.py', '.html', '.css', '.java', '.c', '.cpp',
  // Documents
  '.pdf', '.docx', '.xlsx', '.pptx'
];

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesAdded, onLog }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper to extract text from PowerPoint
  const extractTextFromPPTX = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const zip = await JSZip.loadAsync(arrayBuffer);
      const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
      
      // Sort slides numerically
      slideFiles.sort((a, b) => {
         const numA = parseInt(a.match(/\d+/)?.[0] || '0');
         const numB = parseInt(b.match(/\d+/)?.[0] || '0');
         return numA - numB;
      });
      
      let fullText = "";
      let slideCount = 0;
      for (const fileName of slideFiles) {
         const content = await zip.files[fileName].async("string");
         // Regex to grab text inside <a:t> tags (common in PPTX XML)
         const textMatches = content.match(/<a:t[^>]*>(.*?)<\/a:t>/g);
         if (textMatches) {
             const slideText = textMatches.map((m: string) => m.replace(/<\/?a:t[^>]*>/g, '')).join(' ');
             fullText += `[Slide ${fileName.replace('ppt/slides/', '')}]: ${slideText}\n`;
             slideCount++;
         }
      }
      onLog('info', `Extracted text from ${slideCount} slides.`);
      return fullText || "No text content found in slides.";
    } catch (e) {
      console.error("PPTX Parse Error", e);
      throw new Error("Failed to parse PowerPoint file.");
    }
  };

  const processFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return;
    setError(null);
    setIsProcessing(true);
    onLog('info', `Starting processing of ${fileList.length} files.`);

    const newFiles: LocalFile[] = [];
    const promises: Promise<void>[] = [];

    Array.from(fileList).forEach((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      
      const p = new Promise<void>(async (resolve, reject) => {
        try {
          // 1. PDF Handling (Base64)
          if (ext === '.pdf') {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              // Remove "data:application/pdf;base64," prefix for API usage
              const base64Content = result.split(',')[1]; 
              newFiles.push({
                id: uuid(),
                name: file.name,
                size: file.size,
                type: 'application/pdf', // Special flag for service
                content: base64Content,
                timestamp: Date.now()
              });
              onLog('success', `Processed PDF: ${file.name}`);
              resolve();
            };
            reader.readAsDataURL(file);
          } 
          // 2. Word Handling (Mammoth)
          else if (ext === '.docx') {
            const reader = new FileReader();
            reader.onload = async (e) => {
               try {
                 const arrayBuffer = e.target?.result as ArrayBuffer;
                 const result = await mammoth.extractRawText({ arrayBuffer });
                 newFiles.push({
                    id: uuid(),
                    name: file.name,
                    size: file.size,
                    type: 'text/plain',
                    content: result.value,
                    timestamp: Date.now()
                 });
                 onLog('success', `Processed Word Doc: ${file.name}`, `Extracted ${result.value.length} chars`);
                 resolve();
               } catch (err) {
                 onLog('error', `Failed to parse DOCX: ${file.name}`, String(err));
                 resolve(); // Skip on error
               }
            };
            reader.readAsArrayBuffer(file);
          }
          // 3. Excel Handling (SheetJS)
          else if (ext === '.xlsx') {
             const reader = new FileReader();
             reader.onload = (e) => {
               try {
                 const data = new Uint8Array(e.target?.result as ArrayBuffer);
                 const workbook = XLSX.read(data, { type: 'array' });
                 let fullText = "";
                 workbook.SheetNames.forEach((sheetName: string) => {
                    const sheet = workbook.Sheets[sheetName];
                    const csv = XLSX.utils.sheet_to_csv(sheet);
                    fullText += `--- Sheet: ${sheetName} ---\n${csv}\n`;
                 });
                 newFiles.push({
                    id: uuid(),
                    name: file.name,
                    size: file.size,
                    type: 'text/csv',
                    content: fullText,
                    timestamp: Date.now()
                 });
                 onLog('success', `Processed Excel: ${file.name}`, `Sheets: ${workbook.SheetNames.join(', ')}`);
                 resolve();
               } catch (err) {
                 onLog('error', `Failed to parse XLSX: ${file.name}`, String(err));
                 resolve();
               }
             };
             reader.readAsArrayBuffer(file);
          }
          // 4. PowerPoint Handling (JSZip)
          else if (ext === '.pptx') {
             const reader = new FileReader();
             reader.onload = async (e) => {
               try {
                 const text = await extractTextFromPPTX(e.target?.result as ArrayBuffer);
                 newFiles.push({
                    id: uuid(),
                    name: file.name,
                    size: file.size,
                    type: 'text/plain',
                    content: text,
                    timestamp: Date.now()
                 });
                 onLog('success', `Processed PowerPoint: ${file.name}`);
                 resolve();
               } catch (err) {
                 onLog('error', `Failed to parse PPTX: ${file.name}`, String(err));
                 resolve();
               }
             };
             reader.readAsArrayBuffer(file);
          }
          // 5. Plain Text / Code
          else if (file.type.startsWith('text/') || SUPPORTED_EXTENSIONS.includes(ext)) {
            const reader = new FileReader();
            reader.onload = (e) => {
              newFiles.push({
                id: uuid(),
                name: file.name,
                size: file.size,
                type: file.type || 'text/plain',
                content: e.target?.result as string,
                timestamp: Date.now()
              });
              onLog('success', `Processed Text File: ${file.name}`);
              resolve();
            };
            reader.readAsText(file);
          } else {
            onLog('warning', `Skipped unsupported file: ${file.name}`);
            resolve();
          }
        } catch (e) {
          onLog('error', `Critical error reading file: ${file.name}`, String(e));
          resolve();
        }
      });
      promises.push(p);
    });

    await Promise.all(promises);
    
    if (newFiles.length === 0 && fileList.length > 0) {
      setError("No supported files could be processed.");
    }
    
    if (newFiles.length > 0) {
      onFilesAdded(newFiles);
    }
    setIsProcessing(false);
  }, [onFilesAdded, onLog]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    e.target.value = ''; 
  };

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative group cursor-pointer
          border-2 border-dashed rounded-xl p-6 transition-all duration-200 ease-in-out
          flex flex-col items-center justify-center text-center
          ${isDragging 
            ? 'border-gemini-400 bg-gemini-900/20' 
            : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 bg-slate-900/50'}
        `}
      >
        <input
          type="file"
          multiple
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          disabled={isProcessing}
        />
        
        {isProcessing ? (
          <div className="flex flex-col items-center">
             <div className="w-6 h-6 border-2 border-gemini-400 border-t-transparent rounded-full animate-spin mb-2"></div>
             <span className="text-sm text-slate-300">Processing files...</span>
          </div>
        ) : (
          <>
            <div className="p-3 bg-slate-800 rounded-full mb-3 group-hover:scale-110 transition-transform duration-200">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gemini-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            
            <h3 className="text-sm font-semibold text-slate-200">
              {isDragging ? 'Drop files now' : 'Add Documents'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              PDF, Word, Excel, PowerPoint, Code, Text
            </p>
          </>
        )}
      </div>
      {error && (
        <div className="mt-2 text-xs text-red-400 bg-red-400/10 p-2 rounded border border-red-400/20">
          {error}
        </div>
      )}
    </div>
  );
};
