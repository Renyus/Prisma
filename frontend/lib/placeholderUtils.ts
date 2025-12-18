/**
 * 角色卡占位符替换工具
 * 支持的占位符：{{user}}, {{char}}, {{User}}, {{Character}}
 */

/**
 * 替换文本中的占位符变量
 * @param text 要处理的文本
 * @param userName 用户名，默认为"User"
 * @param charName 角色名，默认为"Character"
 * @returns 替换后的文本
 */
export function replacePlaceholders(
  text: string, 
  userName: string = "User", 
  charName: string = "Character"
): string {
  if (!text) return text;
  
  const replacements: Record<string, string> = {
    '{{user}}': userName,
    '{{User}}': userName,
    '{{char}}': charName,
    '{{Character}}': charName,
  };
  
  let result = text;
  for (const [placeholder, replacement] of Object.entries(replacements)) {
    result = result.replace(new RegExp(escapeRegExp(placeholder), 'g'), replacement);
  }
  
  return result;
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 检查文本是否包含占位符
 */
export function hasPlaceholders(text: string): boolean {
  if (!text) return false;
  return /\{\{user\}\}|\{\{char\}\}|\{\{User\}\}|\{\{Character\}\}/.test(text);
}
