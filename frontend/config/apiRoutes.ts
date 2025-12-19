export const API_ROUTES = {
  CHARACTER: { // Renamed from CARDS to CHARACTER
    LIST: "/characters/",
    GET: (id: string) => `/characters/${id}`,
    CREATE: "/characters/",
    UPDATE: (id: string) => `/characters/${id}`,
    DELETE: (id: string) => `/characters/${id}`,
  },
  CHAT: {
    SESSIONS: "/sessions", // New endpoint for sessions
    GET_SESSION: (sessionId: string) => `/sessions/${sessionId}`,
    UPDATE_SESSION: (sessionId: string) => `/sessions/${sessionId}`,
    DELETE_SESSION: (sessionId: string) => `/sessions/${sessionId}`,

    MESSAGES: (sessionId: string) => `/sessions/${sessionId}/messages`, // Messages for a session
    ADD_MESSAGE: "/messages", // General endpoint for adding messages
    
    COMPLETION: "/completion", // Main chat interaction
    
    EXPORT_SESSION: (sessionId: string) => `/sessions/${sessionId}/export`,
    IMPORT_SESSION: (sessionId: string) => `/sessions/${sessionId}/import`,
  },
  LORE: { // Lorebook endpoints remain the same for now, assuming underlying models are not changed
    BOOKS: "/lore/books",
    BOOK_UPDATE: (id: string) => `/lore/books/${id}`,
    BOOK_DELETE: (id: string) => `/lore/books/${id}`,
    IMPORT: "/lore/import",
    ITEMS: "/lore/items",
    ITEM_UPDATE: (id: string) => `/lore/items/${id}`,
    ITEM_DELETE: (id: string) => `/lore/items/${id}`,
  },
  MODELS: { // Model endpoints remain the same
    LIST: "/models",
    ACTIVE: "/models/active",
  },
  PROMPTS: { // Prompt endpoints remain the same
    LIST: "/prompts",
    UPDATE: (id: string) => `/prompts/${id}`,
  }
};
