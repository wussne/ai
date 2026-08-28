import { type RefObject } from "react";
import { RESULT_TABS } from "../../constants/ui";
import type { BusinessProcess, ChatMessage } from "../../types";
import { ChatTab } from "./result/ChatTab";
import { FlowTab } from "./result/FlowTab";
import { RecommendationsTab } from "./result/RecommendationsTab";
import { RegulationTab } from "./result/RegulationTab";
import { StructureTab } from "./result/StructureTab";

interface ResultPanelProps {
  process: BusinessProcess;
  activeTab: number;
  resultRef: RefObject<HTMLDivElement | null>;
  chat: {
    messages: ChatMessage[];
    input: string;
    isLoading: boolean;
    endRef: RefObject<HTMLDivElement | null>;
    onInputChange: (input: string) => void;
    onSend: () => void;
  };
  onTabChange: (tab: number) => void;
  onExport: () => void;
}

export function ResultPanel({ process, activeTab, resultRef, chat, onTabChange, onExport }: ResultPanelProps) {
  const result = process.result!;

  return (
    <div className="b2b-card overflow-hidden flex flex-col h-[680px]">
      <div className="bg-slate-50 border-b border-slate-200 p-1.5 flex gap-1">
        {RESULT_TABS.map((tab, index) => (
          <button key={tab} onClick={() => onTabChange(index)} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === index ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}>{tab}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-8" ref={resultRef}>
        {activeTab === 0 && <StructureTab result={result} />}
        {activeTab === 1 && <RegulationTab result={result} onExport={onExport} onOpenFlow={() => onTabChange(2)} />}
        {activeTab === 2 && <FlowTab result={result} />}
        {activeTab === 3 && <RecommendationsTab result={result} />}
        {activeTab === 4 && <ChatTab messages={chat.messages} input={chat.input} isLoading={chat.isLoading} endRef={chat.endRef} onInputChange={chat.onInputChange} onSend={chat.onSend} />}
      </div>
    </div>
  );
}
