import { useState, useMemo, useEffect } from "react";
import { useLorebookStore } from "@/store/useLorebookStore";
import { Lorebook, LoreEntry } from "@/types/lorebook";

export function useLorebookPanelController() {
    const {
        lorebooks,
        currentBookId,
        createLorebook, // Was addLorebook
        updateLorebook,
        deleteLorebook,
        setCurrentBook, // Was setCurrentLorebook
        importLorebook, // Was importLorebookFromJson
        updateEntry: updateEntryInStore,
        addEntry: addEntryToStore,
        removeEntry: removeEntryFromStore
    } = useLorebookStore();

    // --- Local State ---
    const [search, setSearch] = useState("");
    const [bookName, setBookName] = useState("");
    const [bookDesc, setBookDesc] = useState("");
    const [bookEnabled, setBookEnabled] = useState(true);
    const [showBookEditor, setShowBookEditor] = useState(false);
    const [entryEditor, setEntryEditor] = useState<LoreEntry | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    // --- Derived State ---
    const currentBook = useMemo(() => lorebooks.find((w) => w.id === currentBookId) ?? null, [currentBookId, lorebooks]);

    const filteredEntries = useMemo(() => {
        const list = currentBook?.entries ?? [];
        const q = search.trim().toLowerCase();
        if (!q) return list;
        return list.filter((e) => e.keys.join(" ").toLowerCase().includes(q) || e.content?.toLowerCase().includes(q) || e.comment?.toLowerCase().includes(q));
    }, [currentBook?.entries, search]);

    // --- Effects ---
    // Ensure a book is selected if none is active
    useEffect(() => {
        if (!currentBookId && lorebooks.length > 0) setCurrentBook(lorebooks[0].id);
    }, [currentBookId, lorebooks, setCurrentBook]);

    // Sync local state with current book
    useEffect(() => {
        setBookName(currentBook?.name ?? "");
        setBookDesc(currentBook?.description ?? "");
        setBookEnabled(currentBook?.enabled !== false);
    }, [currentBook]);

    // --- Logic Actions ---

    const handleImport = async (file: File) => {
        try {
            const text = await file.text();
            const json = JSON.parse(text);
            const id = await importLorebook(json, file.name);
            if (id) { 
                setCurrentBook(id); 
                setToast("导入成功"); 
            }
        } catch (e) { 
            console.error(e);
            setToast("导入失败：格式错误"); 
        }
        setTimeout(() => setToast(null), 2000);
    };

    const handleExport = () => {
        if (!currentBook) return;
        try {
            const blob = new Blob([JSON.stringify(currentBook, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${(currentBook.name || "lore").replace(/[^\w\s]/gi, '')}.json`;
            a.click();
            setToast("已导出");
        } catch (e) { setToast("导出失败"); }
        setTimeout(() => setToast(null), 2000);
    };

    const handleCreateLorebook = (name: string) => {
        createLorebook(name);
    };

    const renameLorebook = (id: string, name: string) => {
        updateLorebook(id, { name });
    };

    // Entry Wrappers
    const updateEntry = (id: string, data: Partial<LoreEntry>) => {
        if (!currentBookId) return;
        updateEntryInStore(id, data);
    };

    const removeEntry = (id: string) => {
        if (!currentBookId) return;
        removeEntryFromStore(id);
    };

    const addEntry = async (data: Partial<LoreEntry>) => {
        if (!currentBookId) return null;
        return addEntryToStore(data);
    };


    return {
        // Data
        lorebooks, currentBookId, currentBook, filteredEntries,
        search, bookName, bookDesc, bookEnabled, showBookEditor, entryEditor, toast,

        // Actions
        setSearch, setBookName, setBookDesc, setShowBookEditor, setEntryEditor,
        setCurrentLorebook: setCurrentBook, // Alias for component compatibility if needed, or update component
        handleImport, handleExport,
        createLorebook: handleCreateLorebook, 
        updateLorebook, deleteLorebook, renameLorebook,
        updateEntry, removeEntry, addEntry
    };
}
