"use client";

import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react"; // 引入图标

interface ChatInputBarProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInputBar({ onSend, disabled }: ChatInputBarProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    // 发送后重置高度
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
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
      `}
    >
      <textarea
        ref={textareaRef}
        className="flex-1 resize-none bg-transparent py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none max-h-[200px] min-h-[44px]"
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={disabled ? "AI 正在思考中..." : "输入消息..."}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{ overflow: "hidden" }} // 防止出现原生滚动条，除非超高
      />

      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className={`mb-1 mr-1 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200
          ${
            !value.trim() || disabled
              ? "bg-gray-100 text-gray-300 cursor-not-allowed"
              : "bg-gray-900 text-white shadow-md hover:bg-black hover:scale-105 active:scale-95"
          }
        `}
      >
        <ArrowUp size={18} strokeWidth={2.5} />
      </button>
    </motion.div>
  );
}