"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import { MessageSquareDashed, Check, ChevronDown, Sparkles, User, Box } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import ChatInputBar from "./ChatInputBar";
import ChatMessage from "./ChatMessage";
import TokenStatsPanel from "./TokenStatsPanel";
import { Badge } from "./ui/Badge";
import { Popover, PopoverContent } from "./ui/Popover";
import { useMounted } from "@/hooks/useMounted";
import { useChatController } from "@/hooks/controllers/useChatController";

export type ChatAreaHandle = {
  startNewChat: () => void;
  reloadHistory: () => Promise<void>;
};

const ChatArea = forwardRef<ChatAreaHandle>((_, ref) => {
  const isMounted = useMounted();
  const listRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // --- UI State ---
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false); // 用于顶部栏阴影控制

  // --- Smart Scroll State ---
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  // --- Logic Controller ---
  const {
    messages, isSending, lastUsedLore, triggeredEntries, availableModels, activeModelInfo,
    title, displayedModelName, displayedVendorName, isOnline,
    userName, currentModel, currentCard, tokenStats,
    setUserName, setCurrentModel, handleSend, handleTypingFinished,
    startNewChat, reloadHistory
  } = useChatController();

  useImperativeHandle(ref, () => ({ startNewChat, reloadHistory }), [startNewChat, reloadHistory]);

  // Click Outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll Shadow Logic
  const checkScrollPosition = useCallback(() => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    
    // 顶部阴影控制
    setScrolled(scrollTop > 10);

    // 底部吸附控制
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsNearBottom(distanceFromBottom <= 100);
  }, []);

  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      setIsUserScrolling(true);
      checkScrollPosition();
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => setIsUserScrolling(false), 150);
    };

    listElement.addEventListener("scroll", handleScroll, { passive: true });
    checkScrollPosition();
    return () => {
      listElement.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [checkScrollPosition]);

  // Auto Scroll Logic
  useEffect(() => {
    if (messages.length > lastMessageCount) {
      setLastMessageCount(messages.length);
      if (isNearBottom || !isUserScrolling) {
        scrollToBottom();
        setHasNewMessages(false);
      } else {
        setHasNewMessages(true);
      }
    }
  }, [messages.length, isNearBottom, isUserScrolling]);

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.isLoading || lastMsg?.isStreaming) {
      if (isNearBottom || !isUserScrolling) scrollToBottom();
    }
  }, [messages, isNearBottom, isUserScrolling]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const handleNewMessageClick = () => {
    scrollToBottom();
    setHasNewMessages(false);
  };

  if (!isMounted) return <div className="flex-1 w-full bg-white" />;

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 bg-white font-sans text-[#1F1F1F]">
      
      {/* 🟢 Google 风格顶部栏: 纯白 + 滚动浮现阴影 */}
      <div className={`
        flex-none w-full px-6 py-4 flex justify-between items-center z-20 transition-all duration-300
        ${scrolled ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100/50" : "bg-white"}
      `}>
        {/* 标题区 */}
        <div className="flex flex-col">
          <h1 className="text-xl font-medium tracking-tight text-[#1F1F1F] flex items-center gap-2">
            {title}
            {currentCard && <span className="text-xs px-2 py-0.5 rounded-full bg-[#F0F4F9] text-[#444746] font-medium">RPG</span>}
          </h1>
          {/* 这里可以放角色的一句话简介，如果以后有的话 */}
        </div>

        {/* 右侧操作区 (Google Pills) */}
        <div className="relative flex items-center gap-3" ref={menuRef}>

          {/* 用户名 Pill */}
          <div className="hidden md:flex items-center bg-[#F0F4F9] hover:bg-[#E2E7EB] transition-colors rounded-full px-4 py-2 h-10 group cursor-text">
             <User size={14} className="text-[#444746] mr-2" />
             <input 
               type="text" 
               value={userName}
               onChange={(e) => setUserName(e.target.value)}
               className="bg-transparent text-sm font-medium text-[#1F1F1F] w-24 focus:outline-none placeholder:text-[#444746]/50"
               placeholder={ (currentCard as any)?.user_alias || "User" }
             />
          </div>

          {/* 模型选择 Pill */}
          <button
            onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
            disabled={!isOnline}
            className={`
              flex items-center gap-2 px-4 py-2 h-10 rounded-full transition-all duration-200
              ${isOnline 
                ? "bg-[#F0F4F9] hover:bg-[#E2E7EB] text-[#1F1F1F]" 
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }
            `}
          >
            {isOnline ? <Sparkles size={14} className="text-emerald-600" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
            <div className="flex flex-col items-start leading-none">
              <span className="text-[13px] font-medium">{displayedModelName}</span>
              {/* <span className="text-[9px] text-[#444746] opacity-80">{displayedVendorName}</span> */}
            </div>
            <ChevronDown size={14} className={`text-[#444746] transition-transform ${isModelMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {/* 下拉菜单 (Material Elevation 2) */}
          <AnimatePresence>
            {isModelMenuOpen && isOnline && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-gray-100 py-2 overflow-hidden z-50"
              >
                <div className="px-4 py-2 text-xs font-medium text-[#444746] bg-gray-50/50">选择模型</div>
                <div className="max-h-64 overflow-y-auto">
                  <button
                    onClick={() => { setCurrentModel(""); setIsModelMenuOpen(false); }}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-[#F0F4F9] flex items-center justify-between"
                  >
                    <span className={!currentModel ? "font-semibold text-emerald-700" : "text-[#1F1F1F]"}>
                      默认模型
                    </span>
                    {!currentModel && <Check size={14} className="text-emerald-600" />}
                  </button>
                  {availableModels.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => { setCurrentModel(model.id); setIsModelMenuOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-[#F0F4F9] flex items-center justify-between"
                    >
                      <span className={`truncate pr-2 ${currentModel === model.id ? "font-semibold text-emerald-700" : "text-[#1F1F1F]"}`}>
                        {model.name}
                      </span>
                      {currentModel === model.id && <Check size={14} className="text-emerald-600" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 消息列表区 */}
      <div ref={listRef} className="flex-1 overflow-y-auto min-h-0 relative scroll-smooth bg-white">
        <div className="max-w-3xl md:max-w-4xl lg:max-w-5xl mx-auto px-4 pb-12 pt-4">
          
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
              <div className="w-16 h-16 bg-[#F0F4F9] rounded-2xl flex items-center justify-center mb-4">
                <MessageSquareDashed size={32} className="text-gray-400" />
              </div>
              <p className="text-base font-medium text-gray-500">开始新的对话</p>
              <p className="text-sm mt-1 opacity-70">选择角色卡，探索无限可能</p>
            </div>
          ) : (
            messages.map((message, idx) => (
              <div key={message.id}>
                <ChatMessage
                  message={message}
                  onTypingComplete={() => {
                    handleTypingFinished(message.id);
                    scrollToBottom();
                  }}
                />
                {idx !== messages.length - 1 && <div className="h-4" />} {/* Google 风格间距较小 */}
              </div>
            ))
          )}

          {/* 🟢 世界书触发预览 (Material Chips) */}
          <AnimatePresence>
            {((triggeredEntries && triggeredEntries.length > 0) || lastUsedLore) && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 mb-4 p-4 rounded-2xl bg-[#F0F4F9]/50 border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Box size={14} className="text-[#444746]" />
                  <span className="text-xs font-medium text-[#444746] uppercase tracking-wider">World Context / Lore</span>
                </div>
                
                {triggeredEntries && triggeredEntries.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {triggeredEntries.map((entry) => (
                      <Popover 
                        key={entry.id}
                        content={
                          <PopoverContent 
                            title={entry.title || "词条详情"}
                            className="max-w-sm text-sm"
                          >
                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                              <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${entry.type === 'vector' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                      {entry.type === 'vector' ? 'VECTOR' : 'KEYWORD'}
                                  </span>
                                  {entry.priority && <span className="text-xs text-gray-400">P:{entry.priority}</span>}
                              </div>
                              <p className="whitespace-pre-wrap text-gray-700">{entry.content}</p>
                            </div>
                          </PopoverContent>
                        }
                        trigger={
                          <div className="px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-xs font-medium text-[#1F1F1F] cursor-pointer shadow-sm transition-all hover:shadow-md active:scale-95 flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${entry.type === 'vector' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                              {entry.title || "未命名"}
                          </div>
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <details className="text-xs text-gray-500 cursor-pointer">
                    <summary className="hover:text-gray-700 transition-colors">查看原始 Context</summary>
                    <pre className="mt-2 p-3 bg-white rounded-xl border border-gray-100 overflow-x-auto">
                      {lastUsedLore}
                    </pre>
                  </details>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Token 统计 */}
          <TokenStatsPanel tokenStats={tokenStats} className="mt-2" />
        </div>
      </div>

      {/* 新消息悬浮按钮 (FAB Style) */}
      <AnimatePresence>
        {hasNewMessages && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={handleNewMessageClick}
            className="fixed bottom-32 right-1/2 translate-x-1/2 z-30 bg-[#1F1F1F] text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-black transition-colors"
          >
            <ChevronDown size={16} />
            <span className="text-sm font-medium">New messages</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* 底部输入区 */}
      <div className="sticky bottom-0 z-20 w-full bg-white">
        <div className="absolute inset-x-0 -top-12 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        <div className="bg-white pb-6 pt-2">
          <div className="max-w-3xl md:max-w-4xl lg:max-w-5xl mx-auto px-4">
            <ChatInputBar 
              onSend={(text) => handleSend(text, scrollToBottom)} 
              disabled={isSending}
              tokenStats={tokenStats}
              maxModelTokens={(activeModelInfo as any)?.context_length || 128000}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default ChatArea;
