/**
 * 前端 Token 估算工具
 * 基于后端 token_utils.py 的逻辑实现
 */

export interface TokenEstimate {
  tokens: number;
  percentage: number;
  isOverLimit: boolean;
  remainingTokens: number;
}

/**
 * 估算文本的 Token 数量
 * 支持多种估算策略：
 * 1. 改进的手动估算（主要方案）
 * 
 * 策略：
 * - CJK 字符及全角符号: 按 2 token 计算 (安全高估，防止溢出)
 * - 其他 ASCII 字符: 按 0.5 token 计算 (更保守，防止复杂标点符号下溢出)
 * - 额外加上 buffer
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  
  // 简单的正则匹配 CJK 范围
  const cjkPattern = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af\uff00-\uffff]/g;
  const cjkMatches = text.match(cjkPattern) || [];
  const cjkCount = cjkMatches.length;
  const asciiCount = text.length - cjkCount;
  
  // 使用更保守的估算：ASCII 字符按 0.5 token 计算
  const estimated = (cjkCount * 2.0) + (asciiCount * 0.5);
  return Math.ceil(estimated) + 1; // 向上取整并加 buffer
}

/**
 * 计算完整的 Token 使用情况
 * @param inputText 用户输入的文本
 * @param contextTokens 已有上下文的 token 数
 * @param maxTokens 模型的最大 token 限制
 * @param reservedTokens 保留给系统和其他用途的 token 数
 */
export function calculateTokenUsage(
  inputText: string,
  contextTokens: number = 0,
  maxTokens: number = 4096,
  reservedTokens: number = 1000
): TokenEstimate {
  const inputTokenCount = estimateTokens(inputText);
  const totalTokens = contextTokens + inputTokenCount;
  const availableTokens = maxTokens - reservedTokens;
  const remainingTokens = Math.max(0, availableTokens - totalTokens);
  const percentage = Math.min(100, (totalTokens / availableTokens) * 100);
  
  return {
    tokens: totalTokens,
    percentage: Math.round(percentage * 10) / 10, // 保留一位小数
    isOverLimit: totalTokens > availableTokens,
    remainingTokens
  };
}

/**
 * 获取 Token 使用状态的颜色
 */
export function getTokenStatusColor(percentage: number, isOverLimit: boolean): string {
  if (isOverLimit) return "text-red-500";
  if (percentage >= 90) return "text-orange-500";
  if (percentage >= 75) return "text-yellow-600";
  return "text-gray-500";
}

/**
 * 获取 Token 使用状态的背景色
 */
export function getTokenStatusBgColor(percentage: number, isOverLimit: boolean): string {
  if (isOverLimit) return "bg-red-50 border-red-200";
  if (percentage >= 90) return "bg-orange-50 border-orange-200";
  if (percentage >= 75) return "bg-yellow-50 border-yellow-200";
  return "bg-gray-50 border-gray-200";
}
