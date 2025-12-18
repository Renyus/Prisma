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

  // SSR Placeholder
  if (!isMounted) return <aside className="w-72 h-full bg-[#F0F4F9]" />;

  return (
    <aside className="w-72 h-full flex-shrink-0 bg-[#F0F4F9] flex flex-col font-sans relative z-30">
        {/* Google 风格侧边栏：
            1. 背景色 #F0F4F9
            2. 无明显右边框，靠主界面的白色区分
        */}
        
        {/* 头部：包含 Logo 和新建对话 */}
        <div className="px-4 pt-4 pb-2">
            <SidebarHeader 
                isClearingCurrent={isClearingCurrent}
                onClearHistory={handleClearHistory}
                onExport={handleExportCurrentSession}
                onImport={handleImportFileChange}
            />
        </div>
        
        {/* 导航区 */}
        <div className="px-3 py-2">
             <SidebarNavigation 
                onOpenCharacterPanel={onOpenCharacterPanel}
                onOpenLorebookPanel={onOpenLorebookPanel}
                onOpenPromptPanel={onOpenPromptPanel}
            />
        </div>

        {/* 设置区：占据剩余空间
            这里通常建议 SidebarSettings 内部也不要用太重的边框
        */}
        <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
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
        </div>

        {/* 底部版本信息 */}
        <div className="py-4 text-center select-none opacity-40 hover:opacity-80 transition-opacity">
            <p className="text-[10px] text-[#444746] font-mono tracking-widest uppercase">
                Prisma v{versionData.version}
            </p>
        </div>
    </aside>
  );
}