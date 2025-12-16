"use client";

import { useState, ReactNode } from "react";
import { ChevronDown, LucideIcon } from "lucide-react";

interface CollapsibleCardProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  /**
   * 可选：放在标题右侧的额外操作组件（比如 RAG 的那个开关）
   * 如果传入这个，建议给它加 onClick={(e) => e.stopPropagation()} 防止触发折叠
   */
  headerAction?: ReactNode; 
}

export default function CollapsibleCard({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  className = "",
  headerAction,
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm transition-all duration-200 hover:shadow-md overflow-hidden ${className}`}
    >
      {/* 头部点击区域 */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none bg-white hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-2.5 text-gray-700">
          {Icon && <Icon size={18} className="text-gray-500" />}
          <span className="text-sm font-bold tracking-tight">{title}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* 如果有额外的开关/按钮，显示在这里 */}
          {headerAction && <div onClick={(e) => e.stopPropagation()}>{headerAction}</div>}
          
          {/* 旋转箭头 */}
          <div
            className={`text-gray-400 transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            <ChevronDown size={18} />
          </div>
        </div>
      </div>

      {/* 内容区域 (折叠动画) */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4 pt-0 border-t border-gray-50 mt-1">
          <div className="pt-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}