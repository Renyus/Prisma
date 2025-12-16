// frontend/components/ChatArea.tsx
"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
import { MessageSquareDashed, Check } from "lucide-react";

import ChatInputBar from "./ChatInputBar";
import ChatMessage from "./ChatMessage";
import { useMounted } from "@/hooks/useMounted";
import { useChatController } from "@/hooks/controllers/useChatController";

export type ChatAreaHandle = {
  startNewChat: () => void;
  reloadHistory: () => Promise<void>;
};

const ChatArea = forwardRef<ChatAreaHandle>((_, ref) => {
  const isMounted = useMounted();
  const listRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // --- UI State (Visual Only) ---
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  // --- Logic Controller ---
  const {
    // Data
    messages, isSending, lastUsedLore, availableModels, activeModelInfo,
    title, displayedModelName, displayedVendorName, isOnline,
    userName, currentModel, currentCard,
    // Actions
    setUserName, setCurrentModel, handleSend, handleTypingFinished,
    startNewChat, reloadHistory
  } = useChatController();

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
      startNewChat,
      reloadHistory
  }), [startNewChat, reloadHistory]);

  // Click Outside for Model Menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto Scroll
  const scrollToBottom = () => {
    if (!listRef.current) return;
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      }
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const onSendWrapper = (text: string) => {
      handleSend(text, scrollToBottom);
  };

  const onTypingCompleteWrapper = (id: string) => {
      handleTypingFinished(id);
      scrollToBottom();
  }

  if (!isMounted) {
      return <div className="flex-1 w-full bg-white" />; // SSR Placeholder
  }

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 bg-white">
      {/* 顶部状态栏 */}
      <div className="pt-10 pb-2 w-full px-8 flex justify-between items-end gap-3 relative z-10">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          {title}
        </h1>

        {/* 右侧 API 信息 (药丸) */}
        <div className="relative flex items-center gap-2" ref={menuRef}>

          {/* 用户名输入框 */}
          <div className="hidden md:flex items-center group bg-white/60 backdrop-blur border border-gray-200 rounded-full px-3 py-1.5 transition-all hover:border-purple-300 hover:shadow-sm hover:w-40 w-24 overflow-hidden">
             <span className="text-[10px] text-gray-400 mr-2 select-none shrink-0">ID:</span>
             <input 
               type="text" 
               value={userName}
               onChange={(e) => setUserName(e.target.value)}
               className="bg-transparent text-xs font-medium text-gray-700 w-full focus:outline-none placeholder:text-gray-300"
               placeholder={ (currentCard as any)?.user_alias ? `${(currentCard as any).user_alias}` : "User" }
               title="设置你的名字 (留空则使用角色卡默认称呼)"
             />
          </div>

            <button
              onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
              disabled={!isOnline}
              title={isOnline ? "点击切换对话模型" : "API 连接中..."}
              className={`
                group flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm backdrop-blur-md transition-all duration-300 ease-out cursor-pointer
                ${isOnline 
                  ? "bg-white/70 border-emerald-200/50 hover:border-emerald-300 hover:shadow-emerald-100/50 hover:-translate-y-0.5" 
                  : "bg-white/40 border-gray-200 text-gray-400 cursor-not-allowed"
                }
              `}
            >
              <div className="flex items-center gap-1.5">
                <div className="relative flex h-2 w-2">
                  {isOnline ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-300"></span>
                  )}
                </div>
                <span className={`text-[10px] font-bold tracking-wide uppercase transition-colors duration-300 truncate max-w-[150px] ${isOnline ? "text-gray-700" : "text-gray-400"}`}>
                  {displayedModelName}
                </span>
              </div>
              <div className="w-px h-2.5 bg-gray-200"></div>
              <span className={`text-[9px] font-medium uppercase tracking-wider transition-colors duration-300 ${isOnline ? "text-gray-400 group-hover:text-emerald-600/70" : "text-gray-400"}`}>
                {displayedVendorName}
              </span>
            </button>

            {/* 模型选择菜单 Dropdown */}
            {isModelMenuOpen && isOnline && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white/90 backdrop-blur-xl border border-gray-100 rounded-xl shadow-xl overflow-hidden py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-3 py-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <span>可用模型 (Available Models)</span>
                        <span className="text-[9px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-500">{availableModels.length}</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {availableModels.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <p className="text-xs text-gray-500 mb-1">未能获取模型列表</p>
                                <p className="text-[10px] text-gray-400">请检查后端连接或 Key 权限</p>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => {
                                        setCurrentModel(""); 
                                        setIsModelMenuOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-gray-50 flex items-center justify-between group border-b border-gray-50
                                        ${!currentModel ? "bg-gray-50 text-gray-900 font-bold" : "text-gray-500 italic"}
                                    `}
                                >
                                    <span className="truncate pr-2">跟随系统默认 ({activeModelInfo?.name})</span>
                                    {!currentModel && <Check size={12} className="text-gray-600" />}
                                </button>

                                {availableModels.map((model) => (
                                    <button
                                        key={model.id}
                                        onClick={() => {
                                            setCurrentModel(model.id);
                                            setIsModelMenuOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-emerald-50/50 flex items-center justify-between group
                                            ${currentModel === model.id ? "bg-emerald-50/30 text-emerald-700 font-medium" : "text-gray-600"}
                                        `}
                                    >
                                        <span className="truncate pr-2" title={model.id}>{model.name}</span>
                                        {currentModel === model.id && <Check size={12} className="text-emerald-600" />}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    {/* 进度条 */}
    {isSending && (
      <div className="w-full h-[2px] bg-white overflow-hidden">
           <div className="w-full h-full bg-gradient-to-r from-transparent via-blue-400/50 to-transparent animate-shimmer" style={{ backgroundSize: "200% 100%" }} />
      </div>
    )}
    <style jsx>{`
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      .animate-shimmer {
        animation: shimmer 1.5s infinite linear;
      }
    `}</style>

    {/* 消息区域 */}
    <div ref={listRef} className="flex-1 overflow-y-auto min-h-0 scroll-smooth">
      <div className="max-w-3xl md:max-w-4xl lg:max-w-5xl mx-auto px-4 pb-24 pt-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 opacity-60">
            <MessageSquareDashed size={48} className="mb-3 text-gray-300" />
            <p className="text-sm">暂无对话记录</p>
            <p className="text-xs mt-1">请选择一个角色并开始聊天</p>
          </div>
        ) : (
          messages.map((message, idx) => (
            <div key={message.id}>
              <ChatMessage
                message={message}
                onTypingComplete={() => onTypingCompleteWrapper(message.id)}
              />
              {idx !== messages.length - 1 && <div className="my-6" />}
            </div>
          ))
        )}

        {lastUsedLore && (
          <div className="mt-4 mb-2">
            <details className="group rounded-2xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs text-gray-600">
              <summary className="flex items-center justify-between cursor-pointer list-none text-sm text-gray-700 font-medium">
                世界书触发预览
                <span className="text-[11px] text-gray-400 group-open:hidden">展开</span>
                <span className="text-[11px] text-gray-400 hidden group-open:inline">收起</span>
              </summary>
              <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-gray-900 text-gray-50 p-3 max-h-52 overflow-y-auto text-xs font-sans">
                {lastUsedLore}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>

    {/* 底部输入栏 */}
    <div className="sticky bottom-0 z-20 w-full bg-white">
       <div className="absolute inset-x-0 -top-12 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      <div className="bg-white pb-6 pt-2">
        <div className="max-w-xs md:max-w-3xl lg:max-w-4xl mx-auto px-4">
          <ChatInputBar onSend={onSendWrapper} disabled={isSending} />
          <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-gray-400 select-none">
            <span className="flex items-center gap-1">
              <kbd className="font-sans px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-500">↵</kbd>
              <span>发送</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-sans px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-500">Shift</kbd>
              <span>+</span>
              <kbd className="font-sans px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-500">↵</kbd>
              <span>换行</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
});

export default ChatArea;
