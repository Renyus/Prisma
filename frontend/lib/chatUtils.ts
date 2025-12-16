// 用于分离并隐藏 <thinking> 思考内容的辅助函数
export function parseThinkingContent(rawText: string): { thought: string | null; cleanContent: string } {
    const thinkingMatch = rawText.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    if (thinkingMatch) {
      const thought = thinkingMatch[1].trim();
      const cleanContent = rawText.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();
      return { thought, cleanContent };
    }
    return { thought: null, cleanContent: rawText };
}
