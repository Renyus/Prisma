"use client";

import { useRef } from "react";
import { Plus, MessageCircleX, MessageCircleOff, ArrowDown, ArrowUp, ArrowRightToLine, ArrowLeftToLine, Loader } from "lucide-react";

interface SidebarHeaderProps {
  collapsed: boolean;
  toggleCollapse: () => void;
  isClearingCurrent: boolean;
  isExporting: boolean;  // 新增 Prop
  onClearHistory: (mode: "session" | "card") => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function SidebarHeader({ 
    collapsed,
    toggleCollapse,
    isClearingCurrent,
    isExporting,  // 解构
    onClearHistory, 
    onExport, 
    onImport 
}: SidebarHeaderProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    return (
        <div className="flex flex-col gap-4">
            {/* 第一行：Toggle + New Chat */}
            <div className={`flex items-center ${collapsed ? "flex-col gap-4" : "justify-between"}`}>
                
                {/* 汉堡开关 / 折叠按钮 */}
                <button 
                    onClick={toggleCollapse}
                    className="p-2 rounded-full hover:bg-gray-200/50 text-[#444746] transition-colors"
                >
                    {collapsed ? <ArrowRightToLine size={20} /> : <ArrowLeftToLine size={20} />}
                </button>

                {/* New Chat 按钮：响应式变化 */}
                <button
                    onClick={() => onClearHistory("session")}
                    disabled={isClearingCurrent}
                    className={`
                        group flex items-center justify-center
                        bg-[#D3E3FD] hover:bg-[#c2d7fc] text-[#041E49]
                        shadow-sm hover:shadow-md transition-all duration-300
                        ${collapsed 
                            ? "w-10 h-10 rounded-xl" // 收起时：方形图标
                            : "gap-3 px-4 py-3 rounded-2xl flex-1 ml-2" // 展开时：长胶囊
                        }
                    `}
                    title="新对话"
                >
                    <Plus className={`w-5 h-5 transition-transform duration-300 ${!collapsed && "group-hover:rotate-90"}`} />
                    {!collapsed && <span className="text-sm font-bold tracking-wide">新对话</span>}
                </button>
            </div>
            
            {/* 操作按钮组：仅展开时显示 */}
            {!collapsed && (
                <div className="grid grid-cols-4 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <ActionButton icon={<MessageCircleX size={16}/>} label="清空" onClick={() => onClearHistory("session")} color="hover:text-red-600 hover:bg-red-50" />
                    <ActionButton icon={<MessageCircleOff size={16}/>} label="删除" onClick={() => onClearHistory("card")} color="hover:text-red-600 hover:bg-red-50" />
                    <ActionButton 
                        icon={isExporting ? <Loader size={16} className="animate-spin text-blue-600" /> : <ArrowDown size={16}/>} 
                        label={isExporting ? "导出中" : "导出"} 
                        onClick={onExport} 
                        disabled={isExporting} // 禁用点击
                    />
                    <ActionButton icon={<ArrowUp size={16}/>} label="导入" onClick={() => fileInputRef.current?.click()} />
                </div>
            )}
            
            <input ref={fileInputRef} type="file" accept="application/json,image/png" className="hidden" onChange={onImport} />
        </div>
    );
}

function ActionButton({ icon, label, onClick, disabled, color = "text-[#444746] hover:bg-gray-200/50 hover:text-[#1F1F1F]" }: any) {
    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : color}`}
            title={label}
        >
            {icon}
            <span className="text-[10px] font-medium opacity-80">{label}</span>
        </button>
    )
}