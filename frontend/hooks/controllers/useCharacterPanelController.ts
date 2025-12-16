import { useState, useMemo, useRef } from "react";
import { useCharacterCardStore } from "@/store/useCharacterCardStore";
import { extractPngJson } from "@/lib/pngCard";
import { processCharacterImport } from "@/lib/characterImporter";

export function useCharacterPanelController() {
    const {
        characterCards,
        currentCardId,
        addCardFromTavernJson,
        updateCard,
        deleteCard,
        setCurrentCard,
        addCard // Assuming raw add is available or handled by wrapper
    } = useCharacterCardStore();

    // --- Local State ---
    const [search, setSearch] = useState("");
    const [toast, setToast] = useState<string | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [tempName, setTempName] = useState("");
    const [editCardId, setEditCardId] = useState<string | null>(null);
    
    // Edit Form State
    const [editForm, setEditForm] = useState({
        name: "",
        description: "",
        persona: "",
        scenario: "",
        first_mes: "",
        system_prompt: "",
        creator_notes: "",
        tags: "",
    });

    // --- Derived State ---
    const currentCard = useMemo(() => {
        if (!currentCardId) return null;
        return characterCards.find((c) => c.id === currentCardId) ?? null;
    }, [characterCards, currentCardId]);

    const filteredCards = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return characterCards;
        return characterCards.filter((c) => {
            const nameText = (c.name || "").toLowerCase();
            const tagText = Array.isArray(c.tags) ? c.tags.join(" ").toLowerCase() : "";
            return nameText.includes(q) || tagText.includes(q);
        });
    }, [characterCards, search]);

    // --- Logic Actions ---

    const handleImport = async (file: File) => {
        try {
            // Use the new decoupled importer
            const result = await processCharacterImport(file);
            
            if (result && result.character) {
                // If the store supports adding raw object, good. 
                // Currently store has addCardFromTavernJson. We might need to adapt.
                // Assuming addCardFromTavernJson takes the raw data. 
                // Let's use the legacy method for now if store isn't updated, 
                // OR use addCard directly if we have the full object.
                // The store method addCardFromTavernJson likely does some parsing.
                // To be safe with existing store:
                
                // Let's try to extract raw JSON string again for legacy compatibility 
                // or just pass the parsed data if store accepts it.
                // Looking at typical store implementation: it expects the data object.
                
                // Re-using the logic from the component:
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

                // TODO: Handle Lorebook import from result if needed in future
                
                setToast("导入成功");
            } else {
                 throw new Error("解析失败");
            }
        } catch (e) {
            console.error(e);
            setToast("导入失败，请检查文件格式");
        }
        setTimeout(() => setToast(null), 2000);
    };

    const startRename = (id: string, name: string) => {
        setRenamingId(id);
        setTempName(name);
    };

    const saveRename = (id: string) => {
        const name = tempName.trim() || "未命名角色";
        updateCard(id, { name });
        if(currentCardId === id) setCurrentCard(id); // Ensure active
        setRenamingId(null);
        setTempName("");
    };

    const cancelRename = () => {
        setRenamingId(null);
        setTempName("");
    };

    const openEditModal = (cardId: string) => {
        const card = characterCards.find((c) => c.id === cardId);
        if (!card) return;
        setEditCardId(cardId);
        setEditForm({
            name: card.name || "",
            description: card.description || "",
            persona: card.persona || "",
            scenario: card.scenario || "",
            first_mes: card.first_mes || "",
            system_prompt: card.system_prompt || "",
            creator_notes: card.creator_notes || "",
            tags: Array.isArray(card.tags) ? card.tags.join(", ") : "",
        });
    };

    const saveEditModal = () => {
        if (!editCardId) return;
        const { name, description, persona, scenario, first_mes, system_prompt, creator_notes, tags } = editForm;
        updateCard(editCardId, {
            name: name.trim() || "未命名角色",
            description,
            persona,
            scenario,
            first_mes,
            system_prompt,
            creator_notes,
            tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        });
        setCurrentCard(editCardId);
        setEditCardId(null);
    };

    const handleDelete = (id: string) => {
        deleteCard(id);
        if (currentCardId === id) {
            const nextId = characterCards.filter((c) => c.id !== id)[0]?.id ?? null;
            setCurrentCard(nextId ?? null);
        }
    };

    return {
        // Data
        characterCards, currentCardId, currentCard, filteredCards,
        search, toast, renamingId, tempName, editCardId, editForm,
        
        // Actions
        setSearch, setTempName, setEditForm,
        setCurrentCard, handleImport,
        startRename, saveRename, cancelRename,
        openEditModal, saveEditModal, closeEditModal: () => setEditCardId(null),
        handleDelete
    };
}
