"use client";

import { useState, useEffect } from "react";
import { Info, SquareStack, FlaskConical, BookOpen, Zap, Thermometer, Activity } from "lucide-react";

interface SidebarSettingsProps {
    currentCharacter: any;
    currentBook: any;

    contextMessages: number;
    contextTokens: number;
    
    // Memory
    memoryEnabled: boolean;
    setMemoryEnabled: (v: boolean) => void;
    memoryLimit: number;
    setMemoryLimit: (v: number) => void;

    // Model Params
    temperature: number;
    setTemperature: (v: number) => void;
    topP: number;
    setTopP: (v: number) => void;
    frequencyPenalty: number;
    setFrequencyPenalty: (v: number) => void;
    maxTokens: number;
    setMaxTokens: (v: number) => void;
}

export function SidebarSettings({
    currentCharacter, currentBook,
    contextMessages, contextTokens,
    memoryEnabled, setMemoryEnabled,
    memoryLimit, setMemoryLimit,
    temperature, setTemperature,
    topP, setTopP,
    frequencyPenalty, setFrequencyPenalty,
    maxTokens, setMaxTokens
}: SidebarSettingsProps) {

    // 快捷预设 (影响 Context Length)
    const setPreset = (type: "light" | "normal" | "long") => {
        // 这里只是简单的视觉/逻辑示例，实际应去修改上层传入的 context 限制
        // 目前先假装它是只读展示，或者你可以通过 props 传入 setContextLimit
        console.log("Set preset:", type);
    };

    const presetBtnClass = (type: string) => `
        flex-1 py-1.5 rounded-xl text-xs font-medium transition-all duration-200
        hover:bg-white hover:shadow-sm text-gray-500 hover:text-[#1F1F1F]
    `;

    return (
      <div className="space-y-4 px-1 py-2">
        
        {/* 当前状态概览 (Information Density Optimized) */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100/50">
             <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 border-b border-gray-50 pb-2">
                    <div className={`w-2 h-2 rounded-full ${currentCharacter ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-gray-300"}`}></div>
                    <span className="text-sm text-[#444746]">角色卡</span>
                    <span className="text-sm  text-[#1F1F1F] truncate flex-1 text-right">{currentCharacter?.name || "未选择"}</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${currentBook?.enabled!==false ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" : "bg-gray-300"}`}></div>
                    <span className="text-sm text-[#444746]">世界书</span>
                    <span className="text-sm  text-[#1F1F1F] truncate flex-1 text-right">{currentBook?.name || "未加载"}</span>
                </div>
             </div>
        </div>

        {/* Context 控制 */}
        <div className="bg-white rounded-[20px] p-1 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2 text-[#444746]">
                <SquareStack size={16} />
                <span className="text-sm font-medium">上下文长度</span>
            </div>
            <div className="p-3 space-y-3">
                <div className="flex gap-1 bg-[#F0F4F9] p-1 rounded-2xl">
                    <button className={presetBtnClass("light")} onClick={() => setPreset("light")}>省流</button>
                    <button className={presetBtnClass("normal")} onClick={() => setPreset("normal")}>标准</button>
                    <button className={presetBtnClass("long")} onClick={() => setPreset("long")}>长文</button>
                </div>
                <div className="flex justify-between items-center px-2 py-1">
                    <span className="text-xs text-gray-400">当前消耗</span>
                    <div className="flex gap-3 text-xs font-mono font-medium text-[#444746]">
                        <span>MSG: {contextMessages}</span>
                        <span>TOK: {contextTokens}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* 记忆 (RAG) 设置 */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-[#444746]">
                    <FlaskConical size={16} />
                    <span className="text-sm font-medium">长期记忆 (RAG)</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={memoryEnabled} 
                        onChange={(e) => setMemoryEnabled(e.target.checked)} 
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>
            {memoryEnabled && (
                <div className="pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                   <ParamSlider 
                        label="检索条数" 
                        value={memoryLimit} 
                        setValue={setMemoryLimit} 
                        min={1} max={100} step={1} 
                        icon={<Zap size={14}/>}
                        isInt={true} // 确保是整数
                    />
                </div>
            )}
        </div>

        {/* 模型参数 - 现在全部可输入了 */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm space-y-6">
             <div className="flex items-center gap-2 text-[#444746] mb-2">
                <BookOpen size={16} />
                <span className="text-sm font-medium">模型参数</span>
             </div>
             
             <ParamSlider label="Temperature" value={temperature} setValue={setTemperature} min={0} max={2} step={0.1} icon={<Thermometer size={14}/>} />
             <ParamSlider label="Top P" value={topP} setValue={setTopP} min={0} max={1} step={0.05} icon={<Activity size={14}/>} />
             <ParamSlider label="Penalty" value={frequencyPenalty} setValue={setFrequencyPenalty} min={-2} max={2} step={0.1} icon={<Zap size={14}/>} />
             <ParamSlider 
                label="Max Tokens" 
                value={maxTokens} 
                setValue={setMaxTokens} 
                min={100} max={16384} step={16} 
                icon={<Info size={14}/>} 
                isInt={true} // 确保 tokens 不会出现小数
             />
        </div>
      </div>
    );
}

// --- 完美修复版 ParamSlider ---
// 包含：可编辑 Input、范围限制、Blur 提交、Enter 提交、整数支持
function ParamSlider({ label, value, setValue, min, max, step, icon, isInt = false }: any) {
    const [inputValue, setInputValue] = useState(value.toString());

    // 监听外部 value 变化 (比如切预设时)
    useEffect(() => {
        setInputValue(value.toString());
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    // 核心修复：提交逻辑
    const commitValue = () => {
        let numValue = parseFloat(inputValue);
        
        if (isNaN(numValue)) {
            setInputValue(value.toString());
            return;
        }

        // 如果强制整数 (如 Tokens, RAG Limit)
        if (isInt) {
            numValue = Math.round(numValue);
        }

        // 范围限制
        const clampedValue = Math.max(min, Math.min(max, numValue));
        
        setValue(clampedValue);
        setInputValue(clampedValue.toString());
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur(); // 触发 onBlur
        }
    };

    return (
        <div className="group">
            <div className="flex justify-between items-center mb-2">
                {/* 左侧 Label */}
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium group-hover:text-gray-800 transition-colors">
                    {icon}
                    <span>{label}</span>
                </div>
                
                {/* 右侧 Input (可编辑) */}
                <input
                    type="number"
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={commitValue}
                    onKeyDown={handleKeyDown}
                    step={step}
                    className="
                        font-mono text-xs font-bold text-[#1F1F1F] text-center
                        bg-gray-100 hover:bg-gray-200 focus:bg-white
                        w-16 py-1 rounded-md  /* w-16 保证大数字能放下 */
                        border border-transparent focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100
                        transition-all
                    "
                />
            </div>
            
            {/* 滑块轨道 */}
            <div className="relative h-6 flex items-center">
                <input 
                    type="range" min={min} max={max} step={step} 
                    value={value} 
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setValue(isInt ? Math.round(val) : val);
                    }}
                    className="
                        absolute w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
                        hover:bg-gray-300 transition-colors
                        focus:outline-none
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:bg-[#444746]
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:shadow-md
                        [&::-webkit-slider-thumb]:transition-transform
                        [&::-webkit-slider-thumb]:hover:scale-125
                        [&::-webkit-slider-thumb]:active:scale-110
                    "
                />
            </div>
        </div>
    )
}