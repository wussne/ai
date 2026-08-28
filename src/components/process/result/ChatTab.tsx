import { type RefObject } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { CHAT_HINTS } from "../../../constants/ui";
import type { ChatMessage } from "../../../types";

interface ChatTabProps {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  endRef: RefObject<HTMLDivElement | null>;
  onInputChange: (input: string) => void;
  onSend: () => void;
}

export function ChatTab({ messages, input, isLoading, endRef, onInputChange, onSend }: ChatTabProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4 mb-6">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><MessageSquare className="w-6 h-6 text-slate-300" /></div>
            <p className="text-sm text-slate-500 mb-6">Используйте чат для уточнения деталей или доработки документации</p>
            <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">{CHAT_HINTS.map((hint) => <button key={hint.label} onClick={() => onInputChange(hint.prompt)} className="text-xs px-4 py-3 bg-white border border-slate-200 hover:border-slate-900 rounded-xl text-slate-600 hover:text-slate-900 transition-all text-left font-medium shadow-sm">{hint.label}</button>)}</div>
          </div>
        )}
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] p-4 rounded-xl text-sm leading-relaxed ${message.role === "user" ? "bg-slate-900 text-white rounded-tr-none" : "bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-none"}`}>{message.text}</div>
          </div>
        ))}
        {isLoading && <div className="flex justify-start"><div className="bg-slate-50 border border-slate-200 p-3 rounded-xl rounded-tl-none"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div></div>}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
        <input type="text" placeholder="Задайте вопрос по процессу..." className="flex-1 bg-transparent px-3 py-2 outline-none text-sm" value={input} onChange={(event) => onInputChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSend()} />
        <button onClick={onSend} disabled={isLoading || !input.trim()} className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
