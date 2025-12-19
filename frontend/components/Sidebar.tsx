"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
  
};

export default function Sidebar({
  onNewChat,
  onOpenCharacterPanel,
  onOpenLorebookPanel,
   
}: SidebarProps) {
  const isMounted = useMounted();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const {
      isClearingCurrent, isExporting, currentCharacter, currentBook, currentPreset,
      contextMessages, contextTokens,
      memoryEnabled, memoryLimit,
      temperature, topP, frequencyPenalty, maxTokens,
      setPreset, setMemoryEnabled, setMemoryLimit,
      setTemperature, setTopP, setFrequencyPenalty, setMaxTokens,
      handleClearHistory, handleExportCurrentSession, handleImportFileChange
  } = useSidebarController({ onNewChat });

  // 响应式：小屏幕自动收起
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsCollapsed(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!isMounted) return <aside className="w-80 h-full bg-[#F0F4F9]" />;

  return (
    <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 80 : 320 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="h-full flex-shrink-0 bg-[#F0F4F9] flex flex-col font-sans relative z-30 overflow-hidden"
    >
        {/* M3 风格侧边栏：去边框，纯色背景 */}
        
        {/* 头部：包含 折叠开关、Logo 和 新建对话 */}
        <div className="px-3 pt-4 pb-2">
            <SidebarHeader 
                collapsed={isCollapsed}
                toggleCollapse={() => setIsCollapsed(!isCollapsed)}
                isClearingCurrent={isClearingCurrent}
                isExporting={isExporting} // Pass the loading state
                onClearHistory={handleClearHistory}
                onExport={handleExportCurrentSession}
                onImport={handleImportFileChange}
            />
        </div>
        
        {/* 导航区 */}
        <div className="px-3 py-2">
             <SidebarNavigation 
                collapsed={isCollapsed}
                onOpenCharacterPanel={onOpenCharacterPanel}
                onOpenLorebookPanel={onOpenLorebookPanel}
                
            />
        </div>

        {/* 设置区：收起时自动隐藏详细设置，保持界面整洁 */}
        <AnimatePresence>
            {!isCollapsed && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar"
                >
                    <SidebarSettings 
                        currentCharacter={currentCharacter}
                        currentBook={currentBook}
                        contextMessages={contextMessages}
                        contextTokens={contextTokens}
                        memoryEnabled={memoryEnabled}
                        memoryLimit={memoryLimit}
                        temperature={temperature}
                        topP={topP}
                        frequencyPenalty={frequencyPenalty}
                        maxTokens={maxTokens}
                        
                        setMemoryEnabled={setMemoryEnabled}
                        setMemoryLimit={setMemoryLimit}
                        setTemperature={setTemperature}
                        setTopP={setTopP}
                        setFrequencyPenalty={setFrequencyPenalty}
                        setMaxTokens={setMaxTokens}
                        
                    />
                </motion.div>
            )}
        </AnimatePresence>

        {/* 底部版本信息 (仅展开时显示) */}
        {!isCollapsed && (
            <div className="py-4 text-center select-none opacity-40 hover:opacity-80 transition-opacity whitespace-nowrap overflow-hidden">
                <p className="text-[10px] text-[#444746] font-mono tracking-widest uppercase">
                    Prisma v{versionData.version}
                </p>
            </div>
        )}
    </motion.aside>
  );
}