import { nanoid } from 'nanoid';
import { TavernCardV2Data, CharacterCard, TavernCardV2CharacterBook } from '../types/character';
import { extractPngJson } from './pngCard';
import { Lorebook, LoreEntry } from '../types/lorebook';

// --- Types ---

export interface ImportResult {
    character: CharacterCard;
    lorebook?: Lorebook; // Optional embedded lorebook
    warnings: string[];
}

// --- Main Import Function ---

export async function processCharacterImport(
    file: File, 
    userId: string = "local-user"
): Promise<ImportResult | null> {
    const buffer = await file.arrayBuffer();
    
    // 1. Extract Raw JSON (supports PNG and pure JSON)
    let rawJson: any = null;
    
    if (file.type === "application/json" || file.name.endsWith(".json")) {
        try {
            const text = new TextDecoder().decode(buffer);
            rawJson = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse JSON", e);
            return null;
        }
    } else {
        // Assume PNG
        const extracted = await extractPngJson(buffer);
        if (extracted) {
            try {
                rawJson = JSON.parse(extracted);
            } catch (e) {
                console.error("Failed to parse extracted JSON", e);
                return null;
            }
        }
    }
    
    if (!rawJson) return null;

    // 2. Normalize Data (Handle V1/V2 differences)
    // Most cards wrapping the data in a "data" field (V2 spec), or just flat (V1)
    // Spec: https://github.com/SillyTavern/SillyTavern/blob/release/docs/CHARACTER_CARD_SPEC_V2.md
    
    let data: TavernCardV2Data;
    let specVersion = "1.0";
    
    if (rawJson.spec === "chara_card_v2" && rawJson.data) {
        specVersion = "2.0";
        data = rawJson.data;
    } else if (rawJson.name) {
        // V1 style or flat format
        data = rawJson;
    } else {
        // Unknown format
        return null;
    }

    const warnings: string[] = [];

    // 3. Construct Character Object
    const character: CharacterCard = {
        id: nanoid(),
        name: data.name || "Unknown",
        description: data.description || "",
        persona: data.personality || data.mes_example || "", // V2 uses personality
        scenario: data.scenario || "",
        first_mes: data.first_mes || "",
        system_prompt: data.system_prompt || "",
        creator_notes: data.creator_notes || "",
        tags: data.tags || [],
        alternate_greetings: data.alternate_greetings || [],
        source_filename: file.name
    };

    // 4. Extract Embedded Lorebook (if any)
    let lorebook: Lorebook | undefined = undefined;
    
    if (data.character_book && data.character_book.entries && data.character_book.entries.length > 0) {
        lorebook = convertCharacterBookToLorebook(data.character_book, character.name, userId);
        warnings.push(`Detected embedded Lorebook with ${lorebook.entries.length} entries.`);
    }

    return { character, lorebook, warnings };
}

// --- Helpers ---

function convertCharacterBookToLorebook(cb: TavernCardV2CharacterBook, charName: string, userId: string): Lorebook {
    const bookId = nanoid();
    
    const entries: LoreEntry[] = cb.entries.map(entry => {
        // Normalize keys
        let keys: string[] = [];
        if (entry.keys) keys = entry.keys; // Already array?
        // Sometimes keys are string "key1,key2" ? Spec says array of strings.
        
        return {
            id: nanoid(),
            lorebookId: bookId,
            keys: keys,
            content: entry.content || "",
            comment: entry.comment || "",
            enabled: entry.enabled !== false, // default true
            priority: entry.priority || 10,
            order: entry.order || 100,
            probability: 100, // standard
            
            // Flags
            useRegex: !!entry.use_regex,
            caseSensitive: false, // Default usually false
            matchWholeWord: false, 
            exclude: false,
            constant: !!entry.constant,
            contextual: true, // Default
            authorsNote: false
        };
    });

    return {
        id: bookId,
        userId: userId,
        name: cb.name || `${charName}'s Lorebook`,
        description: cb.description || "Imported from Character Card",
        isActive: true,
        entries: entries,
        createdAt: new Date().toISOString(), // Placeholder
        updatedAt: new Date().toISOString()
    };
}
