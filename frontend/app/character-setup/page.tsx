"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { CharacterSection } from "@/components/character/CharacterSection";
import { TextArea, TextInput } from "@/components/character/Inputs";
import { extractPngJson } from "@/lib/pngCard";
import { useCharacterCardStore } from "@/store/useCharacterCardStore";

export default function CharacterSetupPage() {
  const characterCards = useCharacterCardStore((s) => s.characterCards);
  const currentCardId = useCharacterCardStore((s) => s.currentCardId);
  const addCardFromTavernJson = useCharacterCardStore((s) => s.addCardFromTavernJson);
  const updateCard = useCharacterCardStore((s) => s.updateCard);
  const deleteCard = useCharacterCardStore((s) => s.deleteCard);
  const setCurrentCard = useCharacterCardStore((s) => s.setCurrentCard);
  const fetchCards = useCharacterCardStore((s) => s.fetchCards);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  useEffect(() => {
    if (!currentCardId && characterCards.length > 0) {
      setCurrentCard(characterCards[0].id);
    }
  }, [characterCards, currentCardId, setCurrentCard]);

  const currentCard = useMemo(
    () => (currentCardId ? characterCards.find((c) => c.id === currentCardId) ?? null : null),
    [characterCards, currentCardId]
  );

  const get = useMemo(() => {
    return (key: keyof NonNullable<typeof currentCard>) => {
      if (!currentCard) return "";
      return (currentCard as any)[key] ?? "";
    };
  }, [currentCard]);

  const ensureCurrent = () => {
    if (!currentCardId && characterCards[0]) {
      setCurrentCard(characterCards[0].id);
      return characterCards[0].id;
    }
    return currentCardId;
  };

  const updateField = (key: keyof NonNullable<typeof currentCard>, value: any) => {
    const id = ensureCurrent();
    if (!id) {
      const temp = {
        name: "未命名角色",
        description: "",
        persona: "",
        scenario: "",
        first_mes: "",
        system_prompt: "",
        creator_notes: "",
        tags: [],
      };
      addCardFromTavernJson(temp);
      return;
    }
    updateCard(id, { [key]: value } as any);
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
      addCardFromTavernJson(data, file.name);
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
              {currentCard?.name || "选择角色卡"}
            </button>
            {dropdownOpen && (
              <div
                className="absolute z-50 mt-2 w-64 rounded-2xl border border-gray-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="max-h-64 overflow-y-auto py-2">
                  {characterCards.map((card) => (
                    <div
                      key={card.id}
                      className={`flex items-center justify-between px-3 py-2 text-sm ${
                        card.id === currentCardId ? "bg-gray-100" : "hover:bg-gray-50"
                      }`}
                    >
                      <button
                        className="text-left flex-1 truncate"
                        onClick={() => {
                          setCurrentCard(card.id);
                          setDropdownOpen(false);
                        }}
                      >
                        {card.name || "未命名角色"}
                      </button>
                      <button
                        className="p-1 text-gray-500 hover:text-red-500"
                        onClick={() => {
                          deleteCard(card.id);
                          if (card.id === currentCardId) {
                            const next = characterCards.find((c) => c.id !== card.id);
                            setCurrentCard(next?.id ?? null);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {characterCards.length === 0 && (
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
          <TextArea
            label="起始消息（first_mes）"
            rows={3}
            value={get("first_mes")}
            onChange={(e) => updateField("first_mes", e.target.value)}
          />
          <TextArea
            label="系统提示（system_prompt）"
            rows={3}
            value={get("system_prompt")}
            onChange={(e) => updateField("system_prompt", e.target.value)}
          />
          <TextArea
            label="作者备注（creator_notes）"
            rows={3}
            value={get("creator_notes")}
            onChange={(e) => updateField("creator_notes", e.target.value)}
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
