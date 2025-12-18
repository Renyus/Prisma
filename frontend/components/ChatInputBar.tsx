"use client";

import { useState, useRef, KeyboardEvent, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, AlertCircle, Sparkles, Zap } from "lucide-react"; 
import { calculateTokenUsage } from "@/lib/tokenUtils";
import type { TokenStats } from "@/lib/types"; // 👈 确保这里引用了刚才修改的 types

interface ChatInputBarProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  tokenStats?: TokenStats | null;
  maxModelTokens?: number;
}

export default function ChatInputBar({ 
  onSend, 
  disabled, 
  tokenStats, 
  maxModelTokens = 128000 
}: ChatInputBarProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 1. Token 预留逻辑 (保留 10% 给回复)
  const reservedTokens = useMemo(() => {
    const calculated = Math.floor(maxModelTokens * 0.10);
    return Math.max(2000, Math.min(10000, calculated));
  }, [maxModelTokens]);

  // 2. 核心计算逻辑：融合输入预估 + 历史缓存数据
  const tokenUsage = useMemo(() => {
    // 基础消耗 (历史 + 系统)
    const baseContext = tokenStats ? (tokenStats.system + tokenStats.user + tokenStats.history) : 0;
    // 缓存命中 (直接从后端取，如果没有则为0)
    const cacheHit = tokenStats?.cacheHit || 0;
    
    // 计算当前输入带来的总消耗
    const usageResult = calculateTokenUsage(value, baseContext, maxModelTokens, reservedTokens);
    
    return {
      ...usageResult,
      cacheHitCount: cacheHit,
      // 计算缓存占总上限的百分比 (用于内圈渲染)
      // 例如：缓存了 64k，总上限 128k -> 内圈显示 50%
      cachePercentage: Math.min((cacheHit / maxModelTokens) * 100, 100)
    };
  }, [value, tokenStats, maxModelTokens, reservedTokens]);
  
  const canSend = useMemo(() => {
    return !disabled && value.trim() && !tokenUsage.isOverLimit;
  }, [disabled, value, tokenUsage.isOverLimit]);

  // 3. 谷歌风格颜色映射 (Gemini 配色)
  const theme = useMemo(() => {
    if (tokenUsage.isOverLimit) {
      return {
        ring: "text-rose-500",      
        bg: "bg-rose-50",           
        button: "bg-rose-500 hover:bg-rose-600 text-white", 
        text: "text-rose-600",
        shadow: "shadow-rose-100"   
      };
    }
    if (tokenUsage.percentage > 85) {
      return {
        ring: "text-amber-500",
        bg: "bg-[#F0F4F9]", 
        button: "bg-amber-500 hover:bg-amber-600 text-white",
        text: "text-amber-600",
        shadow: "shadow-amber-100"
      };
    }
    return {
      ring: "text-emerald-500",     // 正常状态：谷歌绿
      bg: "bg-[#F0F4F9]",           
      button: "bg-black hover:bg-gray-800 text-white", 
      text: "text-gray-400",        
      shadow: "shadow-gray-200"     
    };
  }, [tokenUsage]);

  // 4. 自动高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const text = value.trim();
    if (!text || disabled || tokenUsage.isOverLimit) return;
    onSend(text);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  // 5. 双层环形进度条参数配置
  
  // 外圈 (总消耗)：半径大，线条细
  const radiusOuter = 19;
  const circumOuter = 2 * Math.PI * radiusOuter;
  const offsetOuter = circumOuter - (Math.min(tokenUsage.percentage, 100) / 100) * circumOuter;

  // 内圈 (缓存命中)：半径小，代表"核心"部分已就绪
  const radiusInner = 14; 
  const circumInner = 2 * Math.PI * radiusInner;
  const offsetInner = circumInner - (Math.min(tokenUsage.cachePercentage, 100) / 100) * circumInner;
  
  // 只有当存在缓存数据时，才显示内圈
  const showCacheRing = tokenUsage.cacheHitCount > 0;

  return (
    <div className="w-full relative group font-sans">
      
      {/* 顶部状态提示 (仅在异常或紧张时显示) */}
      <AnimatePresence>
        {(tokenUsage.isOverLimit || tokenUsage.percentage > 85) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`absolute -top-8 right-0 text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1.5 ${theme.text} bg-white shadow-sm border border-gray-100`}
          >
            {tokenUsage.isOverLimit ? <AlertCircle size={10} /> : <Sparkles size={10} />}
            <span>{tokenUsage.isOverLimit ? "内容过长" : `剩余 ${tokenUsage.remainingTokens}`}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主输入容器 */}
      <motion.div
        layout
        className={`
          relative flex items-end gap-2 rounded-[28px] p-2 transition-all duration-300 ease-out
          ${tokenUsage.isOverLimit ? theme.bg : (isFocused ? "bg-white" : theme.bg)}
          ${isFocused ? `bg-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] ring-2 ring-blue-100/60 -translate-y-[1px]` : "hover:bg-[#E2E7EB] border border-transparent"}
        `}
      >
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none bg-transparent py-3 pl-4 pr-2 text-[15px] leading-relaxed text-gray-800 placeholder:text-gray-400 outline-none max-h-[200px] min-h-[48px]"
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={disabled ? "AI 正在思考中..." : "输入消息..."}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{ overflow: "hidden" }}
        />

        {/* 右下角控制区 */}
        <div className="flex items-center justify-center pb-1 pr-1 gap-3">
          
          {/* 打字时的 Token 计数显示 */}
          <AnimatePresence>
            {value.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex flex-col items-end"
              >
                 <span className={`text-[10px] font-mono font-medium ${theme.text}`}>
                   {tokenUsage.tokens}
                 </span>
                 {showCacheRing && (
                   <span className="text-[9px] text-amber-500 font-medium flex items-center gap-0.5">
                     <Zap size={8} fill="currentColor" />
                     Cache
                   </span>
                 )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 按钮 + 双层仪表盘 */}
          <div className="relative w-11 h-11 flex items-center justify-center">
            
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 44 44">
              {/* 1. 外圈底色 (浅灰) */}
              <circle className="text-gray-200/60" strokeWidth="2" stroke="currentColor" fill="transparent" r={radiusOuter} cx="22" cy="22" />
              
              {/* 2. 内圈底色 (极淡黄，仅缓存存在时显示) */}
              {showCacheRing && (
                <circle className="text-amber-100/50" strokeWidth="2" stroke="currentColor" fill="transparent" r={radiusInner} cx="22" cy="22" />
              )}

              {/* 3. 内圈进度 (黄色 - 缓存命中量) */}
              {showCacheRing && (
                <motion.circle
                  className="text-amber-400"
                  strokeWidth="2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r={radiusInner}
                  cx="22"
                  cy="22"
                  style={{ strokeDasharray: circumInner }}
                  animate={{ strokeDashoffset: offsetInner }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              )}

              {/* 4. 外圈进度 (绿色/红色 - 总消耗量) */}
              <motion.circle
                className={`${theme.ring} transition-colors duration-300`}
                strokeWidth="2"
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r={radiusOuter}
                cx="22"
                cy="22"
                style={{ strokeDasharray: circumOuter }}
                animate={{ strokeDashoffset: offsetOuter }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </svg>

            {/* 5. 发送按钮 (居中) */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={`
                relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
                ${!canSend 
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                  : `${theme.button} shadow-sm active:scale-90`
                }
              `}
            >
              <ArrowUp size={18} strokeWidth={3} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}