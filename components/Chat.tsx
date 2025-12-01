import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, Sender } from '../types';
import MarkdownView from './MarkdownView';

interface ChatProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
}

export const Chat: React.FC<ChatProps> = ({ messages, isLoading, onSendMessage }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Message List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 z-10">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-80">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
              <span className="text-3xl">🔮</span>
            </div>
            <h2 className="text-xl font-medium text-slate-300">What If? Engine</h2>
            <p className="mt-2 max-w-md text-center text-sm">
              Simulate scenarios, ask complex questions, and explore possibilities based on your uploaded data.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 w-full max-w-lg text-xs text-slate-400">
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 text-center">"What if the budget is cut by 20%?"</div>
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 text-center">"What if we delay launch?"</div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === Sender.USER ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-2xl px-6 py-4 shadow-md ${
                  msg.sender === Sender.USER
                    ? 'bg-gemini-600 text-white'
                    : 'bg-slate-800/80 border border-slate-700 text-slate-100'
                }`}
              >
                {msg.sender === Sender.BOT ? (
                   <MarkdownView content={msg.text} />
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-slate-800/80 border border-slate-700 rounded-2xl px-6 py-4 flex items-center gap-2">
               <div className="w-2 h-2 bg-gemini-400 rounded-full animate-bounce"></div>
               <div className="w-2 h-2 bg-gemini-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
               <div className="w-2 h-2 bg-gemini-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-md z-20">
        <form 
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto relative flex items-end gap-2 bg-slate-800 rounded-xl border border-slate-700 focus-within:border-gemini-500/50 focus-within:ring-1 focus-within:ring-gemini-500/50 transition-all p-2"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a scenario or question..."
            rows={1}
            className="flex-1 bg-transparent border-none text-slate-100 placeholder-slate-500 focus:ring-0 resize-none py-3 px-2 max-h-32 scrollbar-hide"
            style={{ minHeight: '44px' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 bg-gemini-600 text-white rounded-lg hover:bg-gemini-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-0.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};
