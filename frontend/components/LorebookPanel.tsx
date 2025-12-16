// frontend/components/LorebookPanel.tsx
"use client";

import { useRef, useState } from "react";
import { Book, Plus, Search, Trash2, Pencil, Check, X, Upload, FileJson, Download, Edit3, CheckCircle2 } from "lucide-react";
import { useMounted } from "@/hooks/useMounted";
import { useLorebookStore } from "@/store/useLorebookStore"; // Need UpdateEntry logic for nested component
import { LoreEntry } from "@/types/lorebook";
import { useLorebookPanelController } from "@/hooks/controllers/useLorebookPanelController";

type Props = {
  open: boolean;
  onClose: () => void;
  asPage?: boolean;
};

export function LorebookPanel({ open, onClose, asPage }: Props) {
  const isMounted = useMounted();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const {
      // Data
      lorebooks, currentBookId, currentBook, filteredEntries,
      search, bookName, bookDesc, bookEnabled, showBookEditor, entryEditor, toast,
      // Actions
      setSearch, setBookName, setBookDesc, setShowBookEditor, setEntryEditor,
      setCurrentLorebook,
      handleImport, handleExport,
      createLorebook, updateLorebook, deleteLorebook, renameLorebook,
      updateEntry, removeEntry, addEntry
  } = useLorebookPanelController();

  if (!open || !isMounted) return null;

  return (
    <div className={asPage ? "w-full h-full p-4" : "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"}>
      <div className={`w-full max-w-4xl bg-white rounded-[28px] shadow-2xl flex flex-col ${asPage ? "h-full shadow-none" : "max-h-[85vh]"}`}>
        
        {/* Header */}
        <div className="px-6 pt-6 pb-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-[#eaf4ff] text-[#0b57d0] rounded-xl">
               <Book size={24} />
             </div>
             <div>
               <h2 className="text-2xl font-medium text-[#1f1f1f]">Lorebook</h2>
               <p className="text-sm text-gray-500">世界书 / 知识库管理</p>
             </div>
          </div>
          {!asPage && <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500" onClick={onClose}><X size={22} /></button>}
        </div>

        {/* Current Book Toolbar */}
        <div className="px-6 py-2 shrink-0">
           <div className="bg-[#f0f4f9] rounded-2xl p-2 pl-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 min-w-0 flex items-center gap-3">
                 <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">当前书目:</span>
                 <select 
                    value={currentBookId ?? ""} 
                    onChange={(e)=>setCurrentLorebook(e.target.value)}
                    className="bg-transparent text-[#1f1f1f] font-medium text-sm outline-none cursor-pointer hover:underline min-w-[120px]"
                 >
                    {lorebooks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                 </select>
                 <button onClick={() => { if(currentBook) setShowBookEditor(true)}} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition"><Edit3 size={14}/></button>
              </div>
              
              <div className="flex items-center gap-2 pr-2">
                 <button onClick={() => createLorebook("新世界书")} className="px-3 py-1.5 rounded-full bg-white text-gray-600 text-xs font-medium shadow-sm hover:bg-gray-50 border border-gray-100">
                    + 新建
                 </button>
                 <div className="w-px h-4 bg-gray-300 mx-1"></div>
                 <button onClick={() => currentBook && updateLorebook(currentBook.id, { enabled: !bookEnabled })} className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${bookEnabled ? "bg-[#c2e7ff] text-[#001d35]" : "bg-gray-200 text-gray-500"}`}>
                    {bookEnabled ? "已启用" : "已禁用"}
                 </button>
                 <button onClick={() => currentBookId && deleteLorebook(currentBookId)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"><Trash2 size={16}/></button>
              </div>
           </div>
        </div>

        {/* Search & Actions */}
        <div className="px-6 py-3 flex items-center gap-3 shrink-0">
            <div className="relative flex-1 group">
               <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
               <input 
                  value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="搜索词条..."
                  className="w-full pl-11 pr-4 py-3 rounded-full bg-[#f0f4f9] border border-transparent outline-none focus:bg-white focus:border-blue-200 focus:shadow-md transition-all text-sm"
               />
            </div>
            
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-3 rounded-full bg-[#f0f4f9] text-[#444746] text-sm font-medium hover:bg-[#e0e5eb] transition">
                <Upload size={18}/> 导入
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-3 rounded-full bg-[#f0f4f9] text-[#444746] text-sm font-medium hover:bg-[#e0e5eb] transition">
                <Download size={18}/> 导出
            </button>
            
            <button onClick={async () => {
                const id = await addEntry({ keys: ["新词条"], content: "描述...", enabled: true });
                if(id && currentBook) setEntryEditor(currentBook.entries.find(e=>e.id===id) || null);
            }} className="flex items-center gap-2 pl-4 pr-5 py-3 rounded-full bg-[#d3e3fd] text-[#041e49] text-sm font-medium hover:bg-[#c2e7ff] shadow-sm transition">
                <Plus size={18} /> 新增
            </button>
            
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) handleImport(f); e.target.value="";}} />
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 space-y-2">
           {filteredEntries.map(entry => (
              <div key={entry.id} className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all ${entry.enabled ? "bg-white border-gray-100 hover:shadow-md" : "bg-gray-50 border-transparent opacity-70"}`}>
                 <div className="mt-1">
                    <button onClick={() => updateEntry(entry.id, { enabled: !entry.enabled })} className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${entry.enabled ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 bg-white"}`}>
                        {entry.enabled && <CheckCircle2 size={12} />}
                    </button>
                 </div>
                 <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setEntryEditor(entry)}>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[#1f1f1f] truncate hover:text-blue-600">{entry.comment || entry.keys[0] || "未命名"}</span>
                        {!entry.enabled && <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 rounded">已禁用</span>}
                    </div>
                    <div className="text-xs text-blue-600 font-mono mb-1 truncate">{entry.keys.join(", ")}</div>
                    <p className="text-sm text-gray-600 line-clamp-2">{entry.content}</p>
                 </div>
                 <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                    <button onClick={() => setEntryEditor(entry)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"><Pencil size={16}/></button>
                    <button onClick={() => removeEntry(entry.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"><Trash2 size={16}/></button>
                 </div>
              </div>
           ))}
           {filteredEntries.length === 0 && <div className="text-center py-10 text-gray-400">暂无条目</div>}
        </div>

        {toast && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#1f1f1f] text-white px-4 py-2 rounded-full shadow-lg text-sm">{toast}</div>}
      </div>
      
      {/* Editors */}
      {(showBookEditor || entryEditor) && (
         <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
             {showBookEditor ? (
                 <BookEditor onClose={() => setShowBookEditor(false)} bookName={bookName} setBookName={setBookName} bookDesc={bookDesc} setBookDesc={setBookDesc} onSave={()=>{ if(currentBookId) { renameLorebook(currentBookId, bookName); updateLorebook(currentBookId, {description: bookDesc}); setShowBookEditor(false); }}} />
             ) : (
                 <EntryEditor entry={entryEditor!} onClose={() => setEntryEditor(null)} />
             )}
         </div>
      )}
    </div>
  );
}

// Minimal Editor Components - kept local as they are pure UI for this panel
function BookEditor({ onClose, bookName, setBookName, bookDesc, setBookDesc, onSave }: any) {
    return (
        <div className="w-full max-w-lg bg-white rounded-[28px] p-6 shadow-2xl">
            <h3 className="text-xl font-medium mb-4">编辑世界书信息</h3>
            <div className="space-y-4">
                <Field label="名称" value={bookName} onChange={setBookName} />
                <Field label="描述" textarea value={bookDesc} onChange={setBookDesc} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
                <button onClick={onClose} className="px-5 py-2.5 rounded-full text-gray-600 hover:bg-gray-100 font-medium">取消</button>
                <button onClick={onSave} className="px-5 py-2.5 rounded-full bg-[#0b57d0] text-white font-medium hover:shadow-md">保存</button>
            </div>
        </div>
    )
}

function EntryEditor({ entry, onClose }: { entry: LoreEntry, onClose: () => void }) {
    // Ideally this component should also use a mini-controller or props, but for now we direct link to store for update
    // Or we can pass an `onSave` prop from the parent controller to keep it pure.
    // For simplicity, I'll keep the direct store use here as it's a sub-component.
    const { updateEntry } = useLorebookStore(); 
    const [local, setLocal] = useState(entry);
    const save = () => { updateEntry(entry.id, local); onClose(); }
    
    return (
        <div className="w-full max-w-2xl bg-white rounded-[28px] p-6 shadow-2xl flex flex-col max-h-[85vh]">
             <div className="flex justify-between items-center mb-4 shrink-0">
                 <h3 className="text-xl font-medium">编辑词条</h3>
                 <button onClick={save}><X size={20} className="text-gray-500"/></button>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                 <Field label="关键字 (逗号分隔)" value={local.keys.join(", ")} onChange={(v: string) => setLocal({...local, keys: v.split(",").map(s=>s.trim()).filter(Boolean)})} />
                 <Field label="内容" textarea value={local.content} onChange={(v: string) => setLocal({...local, content: v})} />
                 <Field label="备注" value={local.comment||""} onChange={(v: string) => setLocal({...local, comment: v})} />
                 <div className="flex items-center gap-2 p-3 bg-[#f0f4f9] rounded-xl cursor-pointer" onClick={()=>setLocal({...local, enabled: !local.enabled})}>
                     <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${local.enabled ? "bg-blue-600 border-blue-600 text-white" : "border-gray-400"}`}>
                         {local.enabled && <CheckCircle2 size={12}/>}
                     </div>
                     <span className="text-sm font-medium text-gray-700">启用该词条</span>
                 </div>
             </div>
             <div className="mt-4 shrink-0 flex justify-end">
                 <button onClick={save} className="px-6 py-2.5 rounded-full bg-[#0b57d0] text-white font-medium">完成</button>
             </div>
        </div>
    )
}

function Field({ label, value, onChange, textarea }: any) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-gray-500 ml-1">{label}</div>
      {textarea ? (
        <textarea
          className="w-full px-4 py-3 rounded-2xl bg-[#f0f4f9] border border-transparent text-sm text-gray-900 outline-none focus:bg-white focus:border-blue-500 focus:shadow-sm transition-all min-h-[120px] resize-none"
          value={value} onChange={(e) => onChange(e.target.value)}
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
