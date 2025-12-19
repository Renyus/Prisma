import { useState, useMemo, useRef } from "react";
import { useCharacterCardStore } from "@/store/useCharacterCardStore";
import { extractPngJson } from "@/lib/pngCard";
import { processCharacterImport } from "@/lib/characterImporter";
import type { CharacterUpdate } from "@/types/character";

export function useCharacterPanelController() {
    const {
        characters, // Renamed
        currentCharacterId, // Renamed
        addCharacterFromTavernJson, // Renamed
        updateCharacter, // Renamed
        deleteCharacter, // Renamed
        setCurrentCharacter, // Renamed
        addCharacter // Renamed
    } = useCharacterCardStore();

    // --- Local State ---
    const [search, setSearch] = useState("");
    const [toast, setToast] = useState<string | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [tempName, setTempName] = useState("");
    const [editCardId, setEditCardId] = useState<string | null>(null);
    
    // Edit Form State - Adjusted keys for new model
    const [editForm, setEditForm] = useState({
        name: "",
        description: "",
        persona: "",
        scenario: "",
        first_message: "", // Renamed
        // system_prompt: "", // DEPRECATED/MOVED to prompt_config. Logic needed.
        system_prompt_override: "", // New field for simple override
        creator: "", // Renamed from creator_notes
        tags: "",
        // user_alias: "", // DEPRECATED? Not in new schema directly, maybe part of metadata or prompt logic?
        // alternate_greetings: "", // Not in basic schema, maybe prompt_config?
        // source_filename: "", // Not in new schema
        avatar_url: "",
    });

    // --- Derived State ---
    const currentCharacter = useMemo(() => { // Renamed
        if (!currentCharacterId) return null;
        return characters.find((c) => c.id === currentCharacterId) ?? null;
    }, [characters, currentCharacterId]);

    const filteredCharacters = useMemo(() => { // Renamed
        const q = search.toLowerCase();
        if (!q) return characters;
        return characters.filter((c) => {
            const nameText = (c.name || "").toLowerCase();
            const tagText = Array.isArray(c.tags) ? c.tags.join(" ").toLowerCase() : "";
            return nameText.includes(q) || tagText.includes(q);
        });
    }, [characters, search]);

    // --- Logic Actions ---

    const handleImport = async (file: File) => {
        try {
            // Use the new decoupled importer
            const result = await processCharacterImport(file);
            
            if (result && result.character) {
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
                addCharacterFromTavernJson(data, file.name); // Renamed

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
        updateCharacter(id, { name }); // Renamed
        if(currentCharacterId === id) setCurrentCharacter(id); // Ensure active
        setRenamingId(null);
        setTempName("");
    };

    const cancelRename = () => {
        setRenamingId(null);
        setTempName("");
    };

    const openEditModal = (characterId: string) => {
        const character = characters.find((c) => c.id === characterId);
        if (!character) return;
        setEditCardId(characterId);
        setEditForm({
            name: character.name || "",
            description: character.description || "",
            persona: character.persona || "",
            scenario: character.scenario || "",
            first_message: character.first_message || "",
            system_prompt_override: character.system_prompt_override || "",
            creator: character.creator || "",
            tags: Array.isArray(character.tags) ? character.tags.join(", ") : "",
            avatar_url: character.avatar_url || "",
        });
    };

    const saveEditModal = () => {
        if (!editCardId) return;
        const { name, description, persona, scenario, first_message, system_prompt_override, creator, tags, avatar_url } = editForm;
        
        const updatePayload: CharacterUpdate = {
            name: name.trim() || "未命名角色",
            description,
            persona,
            scenario,
            first_message,
            system_prompt_override,
            creator,
            tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
            avatar_url,
        };

        updateCharacter(editCardId, updatePayload); // Renamed
        setCurrentCharacter(editCardId);
        setEditCardId(null);
    };

    const handleDelete = (id: string) => {
        deleteCharacter(id); // Renamed
        if (currentCharacterId === id) {
            const nextId = characters.filter((c) => c.id !== id)[0]?.id ?? null;
            setCurrentCharacter(nextId ?? null);
        }
    };

    return {
        // Data
        characters, currentCharacterId, currentCharacter, filteredCharacters,
        search, toast, renamingId, tempName, editCardId, editForm,
        
        // Actions
        setSearch, setTempName, setEditForm,
        setCurrentCharacter, handleImport,
        startRename, saveRename, cancelRename,
        openEditModal, saveEditModal, closeEditModal: () => setEditCardId(null),
        handleDelete
    };
}