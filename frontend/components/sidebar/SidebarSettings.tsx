"use client";

import { Info, SlidersHorizontal, Brain, Cpu } from "lucide-react";
import CollapsibleCard from "../ui/CollapsibleCard";

interface SidebarSettingsProps {
    currentCard: any;
    currentBook: any;
    contextMessages: number;
    contextTokens: number;
    memoryEnabled: boolean;
    memoryLimit: number;
    temperature: number;
    topP: number;
    frequencyPenalty: number;
    maxTokens: number;
    
    // Actions
    setPreset: (preset: "light" | "normal" | "long") => void;
    setMemoryEnabled: (v: boolean) => void;
    setMemoryLimit: (v: number) => void;
    setTemperature: (v: number) => void;
    setTopP: (v: number) => void;
    setFrequencyPenalty: (v: number) => void;
    setMaxTokens: (v: number) => void;
    
    currentPreset: "light" | "normal" | "long";
}

export function SidebarSettings({
    currentCard, currentBook,
    contextMessages, contextTokens,
    memoryEnabled, memoryLimit,
    temperature, topP, frequencyPenalty, maxTokens,
    setPreset, setMemoryEnabled, setMemoryLimit,
    setTemperature, setTopP, setFrequencyPenalty, setMaxTokens,
    currentPreset
}: SidebarSettingsProps) {

    const presetBtnClass = (k: "light" | "normal" | "long") =>
        [
          "px-3 py-1 rounded-lg text-[10px] border transition-all duration-200 font-medium",
          currentPreset === k
            ? "bg-gray-800 text-white border-transparent shadow-sm"
            : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300",
        ].join(" ");

    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-6 space-y-3">
        {/* 状态卡片 */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 mx-1 mb-2">
             <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <Info size={12} />
                <span>Status</span>
             </div>
             <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-xs text-gray-500">Character:</span>
                    <span className="text-xs font-medium text-gray-800 truncate flex-1 text-right">{currentCard?.name || "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${currentBook?.enabled!==false ? "bg-blue-500" : "bg-gray-300"}`}></div>
                    <span className="text-xs text-gray-500">Lorebook:</span>
                    <span className="text-xs font-medium text-gray-800 truncate flex-1 text-right">{currentBook?.name || "-"}</span>
                </div>
             </div>
        </div>

        {/* 折叠设置 */}
        <div className="flex flex-col gap-2 mx-1">
            <CollapsibleCard title="Context" icon={SlidersHorizontal} className="bg-white shadow-sm border-gray-100">
                <div className="space-y-3 pt-1">
                    <div className="flex gap-2 justify-between">
                        <button className={presetBtnClass("light")} onClick={() => setPreset("light")}>省流</button>
                        <button className={presetBtnClass("normal")} onClick={() => setPreset("normal")}>标准</button>
                        <button className={presetBtnClass("long")} onClick={() => setPreset("long")}>长文</button>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 font-mono bg-gray-50 p-1.5 rounded-md">
                        <span>MSG: {contextMessages}</span>
                        <span>TOK: {contextTokens}</span>
                    </div>
                </div>
            </CollapsibleCard>

            <CollapsibleCard 
                title="Memory (RAG)" 
                icon={Brain} 
                className="bg-white shadow-sm border-gray-100"
                headerAction={
                    <input 
                        type="checkbox" 
                        checked={memoryEnabled} 
                        onChange={(e) => { e.stopPropagation(); setMemoryEnabled(e.target.checked); }}
                        className="h-4 w-7 appearance-none rounded-full bg-gray-200 transition-colors cursor-pointer checked:bg-blue-500 checked:after:translate-x-3 after:absolute after:top-[2px] after:left-[2px] after:h-3 after:w-3 after:rounded-full after:bg-white after:shadow after:transition-transform relative"
                    />
                }
            >
                <div className="pt-2 px-1">
                   <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                       <span>Limit</span>
                       <span className="font-mono">{memoryLimit}</span>
                   </div>
                   <input type="range" min={1} max={100} value={memoryLimit} onChange={(e)=>setMemoryLimit(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>
            </CollapsibleCard>

            <CollapsibleCard title="Parameters" icon={Cpu} className="bg-white shadow-sm border-gray-100">
                <div className="space-y-4 pt-1 px-1">
                     <ParamSlider label="Temp" value={temperature} setValue={setTemperature} min={0} max={2} step={0.1} />
                     <ParamSlider label="Top P" value={topP} setValue={setTopP} min={0} max={1} step={0.05} />
                     <ParamSlider label="Penalty" value={frequencyPenalty} setValue={setFrequencyPenalty} min={-2} max={2} step={0.1} />
                     <ParamSlider label="Max Tokens" value={maxTokens} setValue={setMaxTokens} min={100} max={8192} step={100} />
                </div>
            </CollapsibleCard>
        </div>
      </div>
    );
}

function ParamSlider({ label, value, setValue, min, max, step }: any) {
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] text-gray-500">
                <span>{label}</span>
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded-lg text-gray-700 font-semibold">{value}</span>
            </div>
            <input 
                type="range" min={min} max={max} step={step} value={value} 
                onChange={(e) => setValue(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-600 hover:accent-gray-800 transition-all"
            />
        </div>
    )
}
