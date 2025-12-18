"use client";

import { useState, useRef, KeyboardEvent, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowUp, AlertTriangle } from "lucide-react"; // 引入图标
import { calculateTokenUsage, getTokenStatusColor, getTokenStatusBgColor } from "@/lib/tokenUtils";
import type { TokenStats } from "@/lib/types";

interface ChatInputBarProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  tokenStats?: TokenStats | null;
  maxModelTokens?: number;
}

export default function ChatInputBar({ onSend, disabled, tokenStats, maxModelTokens = 128000 }: ChatInputBarProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 计算保留的 token 数（maxModelTokens 的 10%，限制在 2000-10000 之间）
  const reservedTokens = useMemo(() => {
    const calculated = Math.floor(maxModelTokens * 0.10);
    return Math.max(2000, Math.min(10000, calculated));
  }, [maxModelTokens]);

  // 计算当前输入的 Token 使用情况
  const tokenUsage = useMemo(() => {
    if (!tokenStats) {
      return {
        tokens: 0,
        percentage: 0,
        isOverLimit: false,
        remainingTokens: maxModelTokens
      };
    }
    
    // 计算已有上下文的 token 数（系统 + 用户 + 历史）
    const contextTokens = tokenStats.system + tokenStats.user + tokenStats.history;
    
    return calculateTokenUsage(
      value,
      contextTokens,
      maxModelTokens,
      reservedTokens // 使用动态计算的保留 token 数
    );
  }, [value, tokenStats, maxModelTokens, reservedTokens]);
  
  // 判断是否可以发送
  const canSend = useMemo(() => {
    return !disabled && value.trim() && !tokenUsage.isOverLimit;
  }, [disabled, value, tokenUsage.isOverLimit]);

  // 自动调整高度逻辑
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`; // 最大高度限制
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
    // 发送后重置高度
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div className="space-y-2">
      {/* Token 计数器 */}
      {tokenStats && (
        <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs transition-all duration-200 ${getTokenStatusBgColor(tokenUsage.percentage, tokenUsage.isOverLimit)}`}>
          <div className="flex items-center gap-2">
            <span className={`font-medium ${getTokenStatusColor(tokenUsage.percentage, tokenUsage.isOverLimit)}`}>
              {tokenUsage.tokens} / {maxModelTokens - reservedTokens} tokens
            </span>
            {tokenUsage.isOverLimit && (
              <AlertTriangle size={12} className="text-red-500" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`${getTokenStatusColor(tokenUsage.percentage, tokenUsage.isOverLimit)}`}>
              {tokenUsage.percentage}%
            </span>
            <span className="text-gray-400">
              剩余 {tokenUsage.remainingTokens}
            </span>
          </div>
        </div>
      )}
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`relative flex items-end gap-2 rounded-[50px] border bg-white p-2 shadow-[0_2px_15px_rgba(0,0,0,0.05)] transition-all duration-200 ease-in-out
          ${
            isFocused
              ? "border-gray-400 ring-4 ring-gray-100 shadow-md"
              : "border-gray-200"
          }
          ${tokenUsage.isOverLimit ? "border-red-300 bg-red-50/30" : ""}
        `}
      >
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none bg-transparent py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none max-h-[200px] min-h-[44px]"
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={disabled ? "你老婆正在思考中..." : "输入消息..."}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{ overflow: "hidden" }} // 防止出现原生滚动条，除非超高
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={`mb-1 mr-1 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200
            ${
              !canSend
                ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                : tokenUsage.isOverLimit
                ? "bg-red-500 text-white shadow-md hover:bg-red-600"
                : "bg-gray-900 text-white shadow-md hover:bg-black hover:scale-105 active:scale-95"
            }
          `}
          title={tokenUsage.isOverLimit ? "输入内容超出 Token 限制" : "发送消息"}
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>
      </motion.div>
    </div>
  );
}
