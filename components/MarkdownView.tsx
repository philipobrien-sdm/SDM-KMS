import React from 'react';

interface MarkdownViewProps {
  content: string;
}

const MarkdownView: React.FC<MarkdownViewProps> = ({ content }) => {
  // Very basic splitting to handle code blocks and simple tables manually would be complex.
  // However, for this environment, we will enhance the simple parser to handle
  // basic table structures which usually look like | Header | \n | --- |
  
  const parts = content.split(/(```[\s\S]*?```)/g);

  const renderTable = (tableText: string) => {
    const rows = tableText.trim().split('\n').map(r => r.trim()).filter(r => r);
    if (rows.length < 2) return <pre className="whitespace-pre-wrap">{tableText}</pre>;
    
    return (
      <div className="my-4 overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900 text-slate-100 uppercase text-xs font-semibold">
            <tr>
              {rows[0].split('|').filter(c => c.trim()).map((h, i) => (
                <th key={i} className="px-4 py-3 border-b border-slate-700 whitespace-nowrap">{h.trim()}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-800/30">
             {rows.slice(2).map((row, rIdx) => (
               <tr key={rIdx} className="hover:bg-slate-700/30">
                 {row.split('|').filter(c => c.trim() !== '').map((cell, cIdx) => (
                   <td key={cIdx} className="px-4 py-3 align-top">{cell.trim()}</td>
                 ))}
               </tr>
             ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="text-gray-200 leading-relaxed text-sm space-y-4">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Code block handling
          const innerContent = part.slice(3, -3);
          const firstNewLine = innerContent.indexOf('\n');
          const language = firstNewLine > -1 ? innerContent.substring(0, firstNewLine).trim() : '';
          const code = firstNewLine > -1 ? innerContent.substring(firstNewLine + 1) : innerContent;

          return (
            <div key={index} className="bg-slate-950 rounded-md overflow-hidden border border-slate-800 my-3 shadow-sm">
              {language && (
                <div className="bg-slate-900 px-4 py-1.5 text-xs text-gray-400 font-mono border-b border-slate-800 flex justify-between items-center">
                  <span>{language}</span>
                  <span className="text-[10px] uppercase tracking-wider opacity-50">Code</span>
                </div>
              )}
              <pre className="p-4 overflow-x-auto text-xs font-mono text-emerald-400 bg-[#0a0f1e]">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Text processing
        // We check if this part contains a markdown table
        if (part.match(/\|.*\|/)) {
           // Simple heuristic: if it looks like a table, render it.
           // NOTE: This is a simple parser. Real apps use `react-markdown`.
           const tableMatch = part.match(/(\|.*\|\n\|[-\s:|]*\|[\s\S]*?)(?=\n\n|$)/);
           if (tableMatch) {
               const before = part.substring(0, tableMatch.index);
               const table = tableMatch[0];
               const after = part.substring((tableMatch.index || 0) + table.length);
               
               return (
                   <React.Fragment key={index}>
                       {before && <p className="whitespace-pre-wrap">{before}</p>}
                       {renderTable(table)}
                       {after && <p className="whitespace-pre-wrap">{after}</p>}
                   </React.Fragment>
               )
           }
        }

        // Standard Paragraphs
        const paragraphs = part.split(/\n\n+/);
        return (
          <React.Fragment key={index}>
            {paragraphs.map((p, pIdx) => {
               const boldParts = p.split(/(\*\*.*?\*\*)/g);
               return (
                 <p key={pIdx} className="min-h-[1em] whitespace-pre-wrap">
                   {boldParts.map((b, bIdx) => {
                     if (b.startsWith('**') && b.endsWith('**')) {
                       return <strong key={bIdx} className="text-white font-semibold">{b.slice(2, -2)}</strong>;
                     }
                     return b;
                   })}
                 </p>
               )
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default MarkdownView;
