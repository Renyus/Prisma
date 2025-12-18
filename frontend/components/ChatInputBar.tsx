"use client";

import { useState, useRef, KeyboardEvent, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, AlertCircle, Sparkles } from "lucide-react"; 
import { calculateTokenUsage } from "@/lib/tokenUtils";
import type { TokenStats } from "@/lib/types";

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
  
  // 1. Token 计算逻辑
  const reservedTokens = useMemo(() => {
    const calculated = Math.floor(maxModelTokens * 0.10);
    return Math.max(2000, Math.min(10000, calculated));
  }, [maxModelTokens]);

  const tokenUsage = useMemo(() => {
    if (!tokenStats) {
      return { tokens: 0, percentage: 0, isOverLimit: false, remainingTokens: maxModelTokens };
    }
    const contextTokens = tokenStats.system + tokenStats.user + tokenStats.history;
    return calculateTokenUsage(value, contextTokens, maxModelTokens, reservedTokens);
  }, [value, tokenStats, maxModelTokens, reservedTokens]);
  
  const canSend = useMemo(() => {
    return !disabled && value.trim() && !tokenUsage.isOverLimit;
  }, [disabled, value, tokenUsage.isOverLimit]);

  // 2. 谷歌风格颜色映射 (Gemini 配色)
  const theme = useMemo(() => {
    if (tokenUsage.isOverLimit) {
      return {
        ring: "text-rose-500",      // 进度环颜色
        bg: "bg-rose-50",           // 容器背景（溢出时）
        button: "bg-rose-500 hover:bg-rose-600 text-white", // 按钮颜色
        text: "text-rose-600",      // 提示字颜色
        shadow: "shadow-rose-100"   // 聚焦阴影
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
      ring: "text-emerald-500",     // 正常状态：谷歌绿/蓝
      bg: "bg-[#F0F4F9]",           // 正常背景：谷歌灰
      button: "bg-black hover:bg-gray-800 text-white", // 正常按钮：深黑
      text: "text-gray-400",        // 正常文字：灰色
      shadow: "shadow-gray-200"     // 正常阴影
    };
  }, [tokenUsage]);

  // 3. 自动高度
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

  // 4. 环形进度条参数
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(tokenUsage.percentage, 100) / 100) * circumference;

  return (
    <div className="w-full relative group font-sans">
      
      {/* 顶部状态提示 (仅在异常/紧张时显示) */}
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

      {/* 主输入容器：Gemini 风格 */}
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

        {/* 右下角控制区：环形进度 + 按钮 */}
        <div className="flex items-center justify-center pb-1 pr-1 gap-3">
          
          {/* Token 数字 (打字时显示) */}
          <AnimatePresence>
            {value.length > 0 && (
              <motion.span 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={`text-[10px] font-mono font-medium ${theme.text}`}
              >
                {tokenUsage.tokens}
              </motion.span>
            )}
          </AnimatePresence>

          {/* 按钮 + 环形进度条容器 */}
          <div className="relative w-10 h-10 flex items-center justify-center">
            
            {/* 1. 环形进度背景 (浅色圈) */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 44 44">
              <circle
                className="text-gray-200"
                strokeWidth="2.5"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="22"
                cy="22"
              />
              {/* 2. 环形进度 (动态颜色圈) */}
              <motion.circle
                className={`${theme.ring} transition-colors duration-300`}
                strokeWidth="2.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="22"
                cy="22"
                style={{
                  strokeDasharray: circumference,
                }}
                animate={{
                  strokeDashoffset: strokeDashoffset
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </svg>

            {/* 3. 发送按钮 (居中) */}
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