"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { CharacterSection } from "@/components/character/CharacterSection";
import { TextArea, TextInput } from "@/components/character/Inputs";
import { extractPngJson } from "@/lib/pngCard";
import { useCharacterCardStore } from "@/store/useCharacterCardStore";
import type { CharacterUpdate, CharacterCreate } from "@/types/character";

export default function CharacterSetupPage() {
  const characters = useCharacterCardStore((s) => s.characters); // Renamed
  const currentCharacterId = useCharacterCardStore((s) => s.currentCharacterId); // Renamed
  const addCharacterFromTavernJson = useCharacterCardStore((s) => s.addCharacterFromTavernJson); // Renamed
  const updateCharacter = useCharacterCardStore((s) => s.updateCharacter); // Renamed
  const deleteCharacter = useCharacterCardStore((s) => s.deleteCharacter); // Renamed
  const setCurrentCharacter = useCharacterCardStore((s) => s.setCurrentCharacter); // Renamed
  const fetchCharacters = useCharacterCardStore((s) => s.fetchCharacters); // Renamed

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  useEffect(() => {
    if (!currentCharacterId && characters.length > 0) {
      setCurrentCharacter(characters[0].id);
    }
  }, [characters, currentCharacterId, setCurrentCharacter]);

  const currentCharacter = useMemo(
    () => (currentCharacterId ? characters.find((c) => c.id === currentCharacterId) ?? null : null),
    [characters, currentCharacterId]
  );

  const get = useMemo(() => {
    return (key: keyof NonNullable<typeof currentCharacter>) => {
      if (!currentCharacter) return "";
      return (currentCharacter as any)[key] ?? "";
    };
  }, [currentCharacter]);

  const ensureCurrent = () => {
    if (!currentCharacterId && characters[0]) {
      setCurrentCharacter(characters[0].id);
      return characters[0].id;
    }
    return currentCharacterId;
  };

  const updateField = (key: string, value: any) => {
    const id = ensureCurrent();
    if (!id) {
        // Handle creation via form if no current card (simplified)
        // In real app, might want explicit 'New' button
        // For now, let's just warn or return
        return;
    }
    // Type casting for generic update
    updateCharacter(id, { [key]: value } as any);
  };

  useEffect(() => {
    const handler = () => setDropdownOpen(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleImport = async (file: File) => {
    try {
      let jsonString: string | null = null;
      if (file.name.toLowerCase().endsWith(".png")) {
        const buffer = await file.arrayBuffer();
        jsonString = await extractPngJson(buffer);
      } else {
        jsonString = await file.text();
      }
      if (!jsonString) throw new Error("未找到角色卡数据");
      const parsed = JSON.parse(jsonString);
      const data = parsed.data ?? parsed;
      addCharacterFromTavernJson(data, file.name); // Renamed
      triggerToast("导入成功");
    } catch (e) {
      console.error(e);
      window.alert("导入失败，请检查文件格式");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold mb-8">角色设定</h1>

        <div className="mb-6 flex items-center gap-3">
          <button
            className="px-4 py-2 rounded-[999px] border border-gray-200 bg-white text-sm text-gray-800 shadow-sm transition hover:bg-gray-100"
            onClick={() => fileRef.current?.click()}
          >
            导入角色卡
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen((v) => !v);
              }}
              className="px-4 py-2 rounded-[999px] border border-gray-200 bg-white text-sm text-gray-800 shadow-sm transition hover:bg-gray-100"
            >
              {currentCharacter?.name || "选择角色卡"}
            </button>
            {dropdownOpen && (
              <div
                className="absolute z-50 mt-2 w-64 rounded-2xl border border-gray-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="max-h-64 overflow-y-auto py-2">
                  {characters.map((card) => (
                    <div
                      key={card.id}
                      className={`flex items-center justify-between px-3 py-2 text-sm ${
                        card.id === currentCharacterId ? "bg-gray-100" : "hover:bg-gray-50"
                      }`}
                    >
                      <button
                        className="text-left flex-1 truncate"
                        onClick={() => {
                          setCurrentCharacter(card.id); // Renamed
                          setDropdownOpen(false);
                        }}
                      >
                        {card.name || "未命名角色"}
                      </button>
                      <button
                        className="p-1 text-gray-500 hover:text-red-500"
                        onClick={() => {
                          deleteCharacter(card.id); // Renamed
                          if (card.id === currentCharacterId) {
                            const next = characters.find((c) => c.id !== card.id);
                            setCurrentCharacter(next?.id ?? null);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {characters.length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-500">暂无角色卡</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".json,.png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
          />
        </div>

        <CharacterSection title="角色卡">
          <TextInput
            label="名字"
            value={get("name")}
            onChange={(e) => updateField("name", e.target.value)}
          />
          <TextArea
            label="描述"
            rows={4}
            value={get("description")}
            onChange={(e) => updateField("description", e.target.value)}
          />
          <TextArea
            label="Persona"
            rows={4}
            value={get("persona")}
            onChange={(e) => updateField("persona", e.target.value)}
          />
          <TextArea
            label="Scenario"
            rows={4}
            value={get("scenario")}
            onChange={(e) => updateField("scenario", e.target.value)}
          />
          {/* Updated fields to match new schema */}
          <TextArea
            label="起始消息（first_message）" // Updated label and key
            rows={3}
            value={get("first_message")}
            onChange={(e) => updateField("first_message", e.target.value)}
          />
          <TextArea
            label="系统提示覆盖（system_prompt_override）" // Updated label and key
            rows={3}
            value={get("system_prompt_override")}
            onChange={(e) => updateField("system_prompt_override", e.target.value)}
          />
          <TextArea
            label="创建者（creator）" // Updated label and key
            rows={3}
            value={get("creator")}
            onChange={(e) => updateField("creator", e.target.value)}
          />
          <TextInput
            label="标签（逗号分隔）"
            placeholder="例如：战斗领主,正义"
            value={Array.isArray(get("tags")) ? (get("tags") as string[]).join(", ") : ""}
            onChange={(e) =>
              updateField(
                "tags",
                e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
              )
            }
          />
          {/* Removed legacy fields from UI: user_alias, alternate_greetings, source_filename */}
          {/* Added Avatar URL if needed */}
          <TextInput
            label="头像 URL"
            value={get("avatar_url")}
            onChange={(e) => updateField("avatar_url", e.target.value)}
          />
        </CharacterSection>

        <div className="mt-10 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-full rounded-[999px] border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm transition hover:bg-red-100"
          >
            返回
          </button>
          <button
            className="w-full rounded-[999px] border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm transition hover:bg-blue-100"
            onClick={() => triggerToast("保存成功")}
          >
            保存设定
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed right-6 bottom-6 rounded-2xl bg-white border border-gray-200 shadow-lg px-4 py-3 text-sm text-gray-800">
          {toast}
        </div>
      )}
    </div>
  );
}