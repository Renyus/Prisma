// frontend/app/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import ChatArea from "../components/ChatArea";
import Sidebar from "../components/Sidebar";
import { CharacterCardPanel } from "@/components/CharacterCardPanel";
import { LorebookPanel } from "@/components/LorebookPanel";
// 🔥 1. 引入 Prompt 面板 (确保路径对)


import { useCharacterCardStore } from "@/store/useCharacterCardStore";
import { useLorebookStore } from "@/store/useLorebookStore";

import type { ChatAreaHandle } from "@/components/ChatArea";

export default function Home() {
  const chatAreaRef = useRef<ChatAreaHandle | null>(null);

  // === 🔥 2. 状态管理核心：三个面板的开关 ===
  const [showCharacterPanel, setShowCharacterPanel] = useState(false);
  const [showLorebookPanel, setShowLorebookPanel] = useState(false);
  

  const {
    fetchCharacters, 
    // characterCards, // 如果没用到可以不解构
    // currentCardId,
    // setCurrentCard,
  } = useCharacterCardStore();

  const { loadFromStorage: loadLorebooks } = useLorebookStore();

  useEffect(() => {
    fetchCharacters();
    loadLorebooks();
  }, [fetchCharacters, loadLorebooks]);

  return (
    <>
      <main className="h-screen w-screen flex bg-white overflow-hidden">
        
        {/* Sidebar: 它是遥控器 */}
        <Sidebar
          onNewChat={() => {
            chatAreaRef.current?.startNewChat();
          }}
          // 🔥 3. 连线：把开关函数传给 Sidebar
          onOpenCharacterPanel={() => setShowCharacterPanel(true)}
          onOpenLorebookPanel={() => setShowLorebookPanel(true)}
           
        />

        {/* Chat Area: 主屏幕 */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
          <ChatArea ref={chatAreaRef} />
        </div>
      </main>

      {/* === 🔥 4. 弹窗区域：它们平时隐藏，开关变 True 时显示 === */}
      
      {/* 角色卡面板 */}
      <CharacterCardPanel
        open={showCharacterPanel}
        onClose={() => setShowCharacterPanel(false)}
      />

      {/* 世界书面板 */}
      <LorebookPanel
        open={showLorebookPanel}
        onClose={() => setShowLorebookPanel(false)}
      />

      
    </>
  );
}