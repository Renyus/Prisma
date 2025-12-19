// frontend/components/CharacterCardPanel.tsx
"use client";

import { useRef } from "react";
import { X, Upload, Search, Tag, Pencil, Trash2, Check, FileJson, Users } from "lucide-react";
import { useMounted } from "@/hooks/useMounted";
import { useCharacterPanelController } from "@/hooks/controllers/useCharacterPanelController";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CharacterCardPanel({ open, onClose }: Props) {
  const isMounted = useMounted();
  const pngFileRef = useRef<HTMLInputElement | null>(null);
  const jsonFileRef = useRef<HTMLInputElement | null>(null);
  
  const {
      // Data
      currentCharacterId, currentCharacter, filteredCharacters, // Renamed
      search, toast, renamingId, tempName, editCardId, editForm,
      // Actions
      setSearch, setTempName, setEditForm,
      setCurrentCharacter, handleImport, // Renamed
      startRename, saveRename, cancelRename,
      openEditModal, saveEditModal, closeEditModal,
      handleDelete
  } = useCharacterPanelController();

  if (!open || !isMounted) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
        {/* 卡片容器：Gemini 风格圆角和阴影 */}
        <div className="w-full max-w-4xl bg-white rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          
          {/* Header 区域 */}
          <div className="px-6 pt-6 pb-2 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-2xl font-medium text-[#1f1f1f]">Character Cards</h2>
              <p className="text-sm text-gray-500 mt-1">管理你的角色卡片集合</p>
            </div>
            <button
              className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              onClick={onClose}
            >
              <X size={22} />
            </button>
          </div>

          {/* 当前状态栏 */}
          <div className="px-6 py-2 shrink-0">
             <div className="bg-[#f0f4f9] rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="p-2 bg-white rounded-full text-blue-600 shadow-sm">
                   <Users size={20} />
                </div>
                <div>
                   <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Active</div>
                   <div className="text-sm font-semibold text-[#1f1f1f]">{currentCharacter?.name || "No Character Selected"}</div>
                </div>
             </div>
          </div>

          {/* 工具栏：搜索与导入 */}
          <div className="px-6 py-3 flex flex-col sm:flex-row items-center gap-3 shrink-0">
            {/* 搜索框：Google 风格 - 灰色背景，聚焦变白 */}
            <div className="relative flex-1 w-full group">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-600 transition-colors" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search characters..."
                className="w-full pl-11 pr-4 py-3 rounded-full bg-[#f0f4f9] border-2 border-transparent text-sm text-gray-800 outline-none transition-all focus:bg-white focus:border-blue-200 focus:shadow-md"
              />
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
                <button
                className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#d3e3fd] text-[#041e49] text-sm font-medium hover:bg-[#c2e7ff] transition-colors shadow-sm"
                onClick={() => pngFileRef.current?.click()}
                >
                <Upload size={18} />
                <span>Import PNG</span>
                </button>
                
                <button
                className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#f0f4f9] text-[#444746] text-sm font-medium hover:bg-[#e0e5eb] transition-colors"
                onClick={() => jsonFileRef.current?.click()}
                >
                <FileJson size={18} />
                <span>JSON</span>
                </button>
            </div>
            
            <input ref={pngFileRef} type="file" accept=".png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if(f) handleImport(f); e.target.value = ""; }} />
            <input ref={jsonFileRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if(f) handleImport(f); e.target.value = ""; }} />
          </div>

          {/* 列表区域 */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-6 space-y-1">
            {filteredCharacters.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <Users size={48} className="mb-2 opacity-20" />
                    <p>暂无角色卡</p>
                </div>
            ) : (
                filteredCharacters.map((card) => { // Variable name 'card' is fine, represents a character
                const applied = currentCharacterId === card.id;
                return (
                    <div
                    key={card.id}
                    className={`
                        group flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 border border-transparent
                        ${applied ? "bg-[#c2e7ff] text-[#001d35]" : "hover:bg-[#f0f4f9] hover:border-gray-100 text-gray-700"}
                    `}
                    >
                        <div className="min-w-0 flex-1 pr-4">
                            {renamingId === card.id ? (
                            <div className="flex items-center gap-2">
                                <input
                                autoFocus
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") saveRename(card.id);
                                    if (e.key === "Escape") cancelRename();
                                }}
                                className="flex-1 px-3 py-1.5 rounded-lg border border-blue-300 outline-none text-sm bg-white"
                                />
                                <button onClick={() => saveRename(card.id)} className="p-1.5 bg-blue-600 text-white rounded-full"><Check size={14} /></button>
                            </div>
                            ) : (
                            <div>
                                <div className="text-base font-medium truncate">{card.name}</div>
                                {card.tags && card.tags.length > 0 && (
                                    <div className="flex items-center gap-1.5 mt-0.5 text-xs opacity-60">
                                        <Tag size={12} />
                                        <span className="truncate">{card.tags.join(", ")}</span>
                                    </div>
                                )}
                            </div>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                            className={`p-2 rounded-full transition-colors ${applied ? "hover:bg-blue-300 text-blue-900" : "hover:bg-gray-200 text-gray-500"}`}
                            onClick={() => openEditModal(card.id)}
                            title="编辑"
                            >
                            <Pencil size={16} />
                            </button>
                            <button
                            className={`p-2 rounded-full transition-colors ${applied ? "hover:bg-blue-300 text-blue-900" : "hover:bg-red-100 text-gray-400 hover:text-red-500"}`}
                            onClick={() => handleDelete(card.id)}
                            title="删除"
                            >
                            <Trash2 size={16} />
                            </button>
                        </div>
                        
                        {!applied && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setCurrentCharacter(card.id); }} // Renamed
                                className="ml-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all"
                            >
                                Select
                            </button>
                        )}
                        {applied && (
                             <div className="ml-4 px-3 py-1 rounded-full bg-blue-600/10 text-blue-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                <Check size={12} strokeWidth={3} />
                                Active
                             </div>
                        )}
                    </div>
                );
                })
            )}
          </div>

          {toast && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-8 bg-[#1f1f1f] text-[#f2f2f2] px-6 py-3 rounded-full shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
              {toast}
            </div>
          )}
        </div>
      </div>

      {editCardId && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={saveEditModal}>
          <div className="w-full max-w-2xl bg-white rounded-[28px] shadow-2xl p-6 relative max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <button className="absolute right-5 top-5 p-2 rounded-full hover:bg-gray-100 text-gray-500" onClick={closeEditModal}>
              <X size={20} />
            </button>
            <h3 className="text-xl font-medium text-[#1f1f1f] mb-6">Edit Character</h3>
            <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2">
              <Field label="Name" value={editForm.name} onChange={(v: string) => setEditForm((s) => ({ ...s, name: v }))} />
              <Field label="Description" textarea value={editForm.description} onChange={(v: string) => setEditForm((s) => ({ ...s, description: v }))} />
              {/* Updated fields to match new schema/controller */}
              <Field label="First Message" textarea value={editForm.first_message} onChange={(v: string) => setEditForm((s) => ({ ...s, first_message: v }))} /> 
              <Field label="System Prompt Override" textarea value={editForm.system_prompt_override} onChange={(v: string) => setEditForm((s) => ({ ...s, system_prompt_override: v }))} />
              <div className="grid grid-cols-2 gap-4">
                  <Field label="Persona" textarea value={editForm.persona} onChange={(v: string) => setEditForm((s) => ({ ...s, persona: v }))} />
                  <Field label="Scenario" textarea value={editForm.scenario} onChange={(v: string) => setEditForm((s) => ({ ...s, scenario: v }))} />
              </div>
              <Field label="Creator" textarea value={editForm.creator} onChange={(v: string) => setEditForm((s) => ({ ...s, creator: v }))} />
              <Field label="Tags" value={editForm.tags} onChange={(v: string) => setEditForm((s) => ({ ...s, tags: v }))} />
              <Field label="Avatar URL" value={editForm.avatar_url} onChange={(v: string) => setEditForm((s) => ({ ...s, avatar_url: v }))} />
              {/* Removed fields not in editForm anymore: user_alias, alternate_greetings, source_filename */}
            </div>
             <div className="mt-6 flex justify-end gap-3">
               <button onClick={closeEditModal} className="px-6 py-2.5 rounded-full text-gray-600 hover:bg-gray-100 font-medium transition">Cancel</button>
               <button onClick={saveEditModal} className="px-6 py-2.5 rounded-full bg-[#0b57d0] text-white font-medium hover:bg-[#0842a0] shadow-md transition">Save Changes</button>
             </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, value, onChange, textarea }: any) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-gray-500 ml-1">{label}</div>
      {textarea ? (
        <textarea
          className="w-full px-4 py-3 rounded-2xl bg-[#f0f4f9] border border-transparent text-sm text-gray-900 outline-none focus:bg-white focus:border-blue-500 focus:shadow-sm transition-all min-h-[100px] resize-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input 
            className="w-full px-4 py-3 rounded-xl bg-[#f0f4f9] border border-transparent text-sm text-gray-900 outline-none focus:bg-white focus:border-blue-500 focus:shadow-sm transition-all"
            value={value} onChange={(e) => onChange(e.target.value)} 
        />
      )}
    </div>
  );
}