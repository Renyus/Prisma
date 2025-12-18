// frontend/components/settings/PromptPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { Settings2, Save, Info, ChevronDown, CheckCircle2, X } from "lucide-react";
import { usePromptPanelController } from "@/hooks/controllers/usePromptPanelController";
import type { PromptModule } from "@/services/PromptService";

interface PromptPanelProps {
  open: boolean; 
  onClose: () => void;
}

export default function PromptPanel({ open, onClose }: PromptPanelProps) {
  const { modules, isLoading, handleUpdate } = usePromptPanelController();

  if (!open) return null;

  return (
    // 1. 遮罩层：复刻 CharacterCardPanel
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      
      {/* 2. 卡片容器：复刻 CharacterCardPanel */}
      <div className="w-full max-w-4xl bg-white rounded-[28px] shadow-2xl flex flex-col max-h-[85vh] relative">
        
        {/* 3. 关闭按钮：绝对定位 */}
        <button
          className="absolute right-6 top-6 h-10 w-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors z-10"
          onClick={onClose}
        >
          <X size={22} />
        </button>

        {/* Header 区域 */}
        <div className="px-6 pt-6 pb-2 flex items-center gap-3 shrink-0">
            <div className="p-2.5 bg-[#f3e8ff] text-[#9333ea] rounded-xl">
               <Settings2 size={24} />
            </div>
            <div>
               <h2 className="text-2xl font-medium text-[#1f1f1f]">参数调整</h2>
               <p className="text-sm text-gray-500">模型提示词全局参数/破甲/叙事质量/COT控制/视角控制</p>
            </div>
        </div>

        {/* 信息提示条 */}
        <div className="px-6 py-4 shrink-0">
           <div className="bg-[#f0f4f9] rounded-2xl p-4 flex items-start gap-3 text-sm text-[#444746]">
              <Info className="w-5 h-5 text-[#0b57d0] shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                 <span className="font-medium text-[#1f1f1f] block mb-1">运行机制</span>
                 模块会按照 <strong>位置权重</strong> 插入提示词
                 <br />
                 <span className="opacity-80">
                 权重值越大，位置越靠近底部（生效优先级越高）。 推荐配置：破甲 (90) → CoT (100)。
                 </span>
              </div>
           </div>
        </div>

        {/* 列表区域：带滚动条 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 space-y-3">
          {isLoading && modules.length === 0 ? (
            <div className="py-20 text-center text-gray-400 animate-pulse">
               Loading configuration...
            </div>
          ) : (
            modules.map((mod) => (
              <ModuleItem key={mod.id} module={mod} onUpdate={handleUpdate} />
            ))
          )}
          <div className="h-2"></div>
        </div>

      </div>
    </div>
  );
}

// --- 子组件：单个模块项 ---
// 保留其内部 UI 状态逻辑，因为它负责表单的临时编辑
function ModuleItem({ module, onUpdate }: { module: PromptModule; onUpdate: (id: string, data: Partial<PromptModule>) => void; }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localContent, setLocalContent] = useState(module.content);
  const [localPos, setLocalPos] = useState(module.position.toString());
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setLocalContent(module.content);
    setLocalPos(module.position.toString());
    setIsDirty(false);
  }, [module.content, module.position]);

  const handleSave = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    await onUpdate(module.id, { content: localContent, position: parseInt(localPos) || 0 });
    setIsDirty(false);
    setIsExpanded(false);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(module.id, { is_enabled: !module.is_enabled });
  };

  return (
    <div 
      className={`
        group rounded-2xl border transition-all duration-200 overflow-hidden
        ${module.is_enabled 
            ? "bg-white border-gray-200 shadow-sm hover:shadow-md" 
            : "bg-gray-50 border-transparent opacity-75"
        }
      `}
    >
      {/* 标题栏 (点击展开) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-4 px-4 py-3.5 cursor-pointer select-none"
      >
        <button 
           onClick={handleToggle}
           className={`w-5 h-5 rounded-full border flex items-center justify-center transition shrink-0 ${module.is_enabled ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-400 bg-white"}`}
        >
           {module.is_enabled && <CheckCircle2 size={12} />}
        </button>

        <div className="flex-1 min-w-0">
           <div className="flex items-center gap-2 mb-0.5">
              <h3 className={`text-base font-medium truncate ${module.is_enabled ? "text-[#1f1f1f]" : "text-gray-500"}`}>
                {module.name}
              </h3>
              {!module.is_enabled && <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 rounded">Disabled</span>}
           </div>
           <div className="text-xs text-gray-500 font-mono flex gap-3">
              <span>ID: {module.id}</span>
              <span className={module.is_enabled ? "text-blue-600 font-bold" : ""}>POS: {module.position}</span>
           </div>
        </div>

        <div className={`text-gray-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
           <ChevronDown size={20} />
        </div>
      </div>

      {/* 编辑区域 */}
      {isExpanded && (
        <div className="px-4 pb-4 animate-in slide-in-from-top-2">
          <div className="pt-2 border-t border-gray-100 space-y-4">
             {/* 输入区域 */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div className="md:col-span-1">
                    <Field 
                        label="Weight (Position)" 
                        value={localPos} 
                        onChange={(v) => { setLocalPos(v); setIsDirty(true); }} 
                    />
                    <div className="mt-2 text-[11px] text-gray-400 leading-tight">
                        Higher value = Injected later = Higher priority.
                    </div>
                </div>
                <div className="md:col-span-3">
                    <Field 
                        label="Prompt Content" 
                        value={localContent} 
                        onChange={(v) => { setLocalContent(v); setIsDirty(true); }} 
                        textarea 
                    />
                </div>
             </div>

             {/* 底部按钮 */}
             <div className="flex justify-end gap-3 pt-2">
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                    className="px-5 py-2 rounded-full text-gray-600 hover:bg-gray-100 font-medium text-sm transition"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSave} 
                    disabled={!isDirty}
                    className={`
                        flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition shadow-sm
                        ${isDirty 
                            ? "bg-[#0b57d0] text-white hover:bg-[#0842a0] hover:shadow-md" 
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"}
                    `}
                >
                    <Save size={16} />
                    Save Changes
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) {
  return (
    <div className="space-y-1.5 w-full">
      <div className="text-xs font-medium text-gray-500 ml-1">{label}</div>
      {textarea ? (
        <textarea
          className="w-full px-4 py-3 rounded-2xl bg-[#f0f4f9] border border-transparent text-sm text-gray-900 outline-none focus:bg-white focus:border-blue-500 focus:shadow-sm transition-all min-h-[160px] resize-y font-mono leading-relaxed"
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
        />
      ) : (
        <input 
            type="number"
            className="w-full px-4 py-3 rounded-xl bg-[#f0f4f9] border border-transparent text-sm text-gray-900 outline-none focus:bg-white focus:border-blue-500 focus:shadow-sm transition-all font-mono"
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
        />
      )}
    </div>
  );
}
