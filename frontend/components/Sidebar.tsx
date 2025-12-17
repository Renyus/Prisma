// frontend/components/Sidebar.tsx
"use client";

import { useMounted } from "@/hooks/useMounted";
import { useSidebarController } from "@/hooks/controllers/useSidebarController";
import { SidebarHeader } from "./sidebar/SidebarHeader";
import { SidebarNavigation } from "./sidebar/SidebarNavigation";
import { SidebarSettings } from "./sidebar/SidebarSettings";
import versionData from "@/version.json";

type SidebarProps = {
  onNewChat?: () => void;
  onOpenCharacterPanel?: () => void;
  onOpenLorebookPanel?: () => void;
  onOpenPromptPanel?: () => void;
};

export default function Sidebar({
  onNewChat,
  onOpenCharacterPanel,
  onOpenLorebookPanel,
  onOpenPromptPanel, 
}: SidebarProps) {
  const isMounted = useMounted();
  
  const {
      isClearingCurrent, currentCard, currentBook, currentPreset,
      contextMessages, contextTokens,
      memoryEnabled, memoryLimit,
      temperature, topP, frequencyPenalty, maxTokens,
      setPreset, setMemoryEnabled, setMemoryLimit,
      setTemperature, setTopP, setFrequencyPenalty, setMaxTokens,
      handleClearHistory, handleExportCurrentSession, handleImportFileChange
  } = useSidebarController({ onNewChat });

  if (!isMounted) return <aside className="w-68 h-full bg-[#f0f4f9] border-r border-transparent" />;

  return (
    <aside className="w-68 h-full flex-shrink-0 bg-[#f0f4f9] flex flex-col font-sans border-r border-transparent">
        <SidebarHeader 
            isClearingCurrent={isClearingCurrent}
            onClearHistory={handleClearHistory}
            onExport={handleExportCurrentSession}
            onImport={handleImportFileChange}
        />
        
        <SidebarNavigation 
            onOpenCharacterPanel={onOpenCharacterPanel}
            onOpenLorebookPanel={onOpenLorebookPanel}
            onOpenPromptPanel={onOpenPromptPanel}
        />

        <SidebarSettings 
            currentCard={currentCard}
            currentBook={currentBook}
            contextMessages={contextMessages}
            contextTokens={contextTokens}
            memoryEnabled={memoryEnabled}
            memoryLimit={memoryLimit}
            temperature={temperature}
            topP={topP}
            frequencyPenalty={frequencyPenalty}
            maxTokens={maxTokens}
            setPreset={setPreset}
            setMemoryEnabled={setMemoryEnabled}
            setMemoryLimit={setMemoryLimit}
            setTemperature={setTemperature}
            setTopP={setTopP}
            setFrequencyPenalty={setFrequencyPenalty}
            setMaxTokens={setMaxTokens}
            currentPreset={currentPreset}
        />
        <div className="py-2 text-center select-none opacity-50 hover:opacity-100 transition-opacity">
            <p className="text-[10px] text-gray-400 font-mono tracking-widest">
                Version {versionData.version}
            </p>
        </div>
    </aside>
  );
}
