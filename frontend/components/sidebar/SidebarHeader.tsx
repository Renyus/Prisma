"use client";

import { useRef } from "react";
import { Plus, MessageSquareX, Trash2, Download, Upload } from "lucide-react";

interface SidebarHeaderProps {
  isClearingCurrent: boolean;
  onClearHistory: (mode: "session" | "card") => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function SidebarHeader({ 
    isClearingCurrent, 
    onClearHistory, 
    onExport, 
    onImport 
}: SidebarHeaderProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    return (
        <div className="flex-shrink-0 px-4 pt-6 pb-2">
            {/* New Chat 按钮 */}
            <button
                onClick={() => onClearHistory("session")}
                disabled={isClearingCurrent}
                className="
                    group flex items-center gap-3 w-40 px-4 py-3.5 
                    bg-white hover:bg-gray-50 active:bg-[#d0d7de] shadow-lg hover:shadow-xl border border-gray-100
                    text-gray-900 font-bold rounded-2xl
                    transition-all duration-300 ease-in-out mb-4
                "
            >
                <Plus className="w-5 h-5 text-blue-600 transition-transform group-hover:rotate-90 duration-300" />
                <span className="text-sm tracking-wide">新对话</span>
            </button>
            
            {/* 操作按钮组 */}
            <div className="grid grid-cols-4 gap-2 mb-6">
                <button 
                    onClick={() => onClearHistory("session")}
                    className="col-span-2 flex items-center justify-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                    title="清空当前屏幕的对话"
                >
                    <MessageSquareX size={14} className="text-red-500" /> 
                    <span className="hidden lg:inline">清空会话</span>
                    <span className="inline lg:hidden">会话</span>
                </button>
                <button 
                    onClick={() => onClearHistory("card")}
                    className="col-span-2 flex items-center justify-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                    title="删除该角色的所有记忆"
                >
                    <Trash2 size={14} className="text-red-500" /> 
                    <span className="hidden lg:inline">清空全部</span>
                    <span className="inline lg:hidden">全部</span>
                </button>
                <button 
                    onClick={onExport}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-blue-50/50 hover:text-blue-600 transition-colors rounded-lg"
                    title="导出当前会话"
                >
                    <Download size={14} className="text-blue-500" /> 
                    <span className="hidden lg:inline">导出</span>
                </button>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-blue-50/50 hover:text-blue-600 transition-colors rounded-lg"
                    title="导入会话或角色卡"
                >
                    <Upload size={14} className="text-blue-500" /> 
                    <span className="hidden lg:inline">导入</span>
                </button>
            </div>
            
            <input ref={fileInputRef} type="file" accept="application/json,image/png" className="hidden" onChange={onImport} />
        </div>
    );
}
