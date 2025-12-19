"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Info, ChessKnight, ChessKing, ChevronDown, ChevronRight, Terminal } from "lucide-react"; 

import TypingDots from "./TypingDots";
import CodeBlock from "./CodeBlock";
import { useTypewriter } from "../hooks/useTypewriter";
import { replacePlaceholders } from "../lib/placeholderUtils";
import { useChatSettingsStore } from "../store/useChatSettingsStore";
import { useCharacterCardStore } from "../store/useCharacterCardStore";

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessageModel = {
  id: string;
  role: ChatRole;
  content: string;
  isLoading?: boolean;
  isStreaming?: boolean;
  isHistory?: boolean;
};

type ChatMessageProps = {
  message: ChatMessageModel;
  onTypingComplete?: () => void;
};

// --- 配置区域 ---
const METADATA_TAGS = [
  "affinity_status", "thought", "thinking", "analysis", "hidden", "sys_log", "StatusBlock"
];

const TAG_LABELS: Record<string, string> = {
  affinity_status: "当前状态",
  thought: "思维链",
  thinking: "思考过程",
  analysis: "剧情分析",
  hidden: "隐藏信息",
  sys_log: "系统日志",
  StatusBlock: "状态模块"
};

const WRAPPER_TAGS = ["content", "response"];

// --- 解析逻辑 ---
type ExtractedBlock = { tag: string; label: string; content: string; };

function parseContent(raw: string, userName: string, charName: string) {
  let cleanText = raw;
  const extractedBlocks: ExtractedBlock[] = [];

  METADATA_TAGS.forEach((tag) => {
    const regex = new RegExp(`<${tag}(?:\s[^>]*)?>([\s\S]*?)<\/${tag}>`, "gi");
    let match;
    while ((match = regex.exec(cleanText)) !== null) {
      extractedBlocks.push({
        tag: tag,
        label: TAG_LABELS[tag] || tag.toUpperCase(),
        content: match[1].trim(),
      });
    }
    cleanText = cleanText.replace(regex, "");
  });

  WRAPPER_TAGS.forEach((tag) => {
    const regex = new RegExp(`<\/?${tag}(?:\s[^>]*)?>`, "gi");
    cleanText = cleanText.replace(regex, "");
  });

  extractedBlocks.forEach(block => {
    block.content = replacePlaceholders(block.content, userName, charName);
  });
  cleanText = replacePlaceholders(cleanText.trim(), userName, charName);

  return { blocks: extractedBlocks, text: cleanText };
}

export default function ChatMessage({ message, onTypingComplete }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  
  const { userName } = useChatSettingsStore();
  const { characters, currentCharacterId } = useCharacterCardStore(); // Renamed
  
  const currentCharacter = characters.find(c => c.id === currentCharacterId); // Renamed
  const charName = currentCharacter?.name || "Character";
  const finalUserName = userName || "User";

  const { blocks, text: visibleText } = useMemo(() => {
    if (isUser) return { blocks: [], text: message.content };
    return parseContent(message.content, finalUserName, charName);
  }, [message.content, isUser, finalUserName, charName]);

  const shouldType = !isUser && !isSystem && message.isStreaming && !message.isLoading && !message.isHistory;
  
  const displayText = useTypewriter(
    visibleText,
    10, 
    30, 
    shouldType, 
    onTypingComplete
  );

  return (
    <div className={`w-full flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
      <div className={`flex gap-4 max-w-[95%] md:max-w-[85%] lg:max-w-[80%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        
        {/* 头像区域 (Gemini Style Icon) */}
        <div className="flex-shrink-0 mt-1">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-[#1F1F1F] flex items-center justify-center text-white shadow-sm">
               <ChessKing size={16} />
            </div>
          ) : isSystem ? (
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
               <Terminal size={16} />
            </div>
          ) : (
            <div className={`w-8 h-8 flex items-center justify-center rounded-full bg-emerald-50 border border-emerald-100/50 text-emerald-600 ${message.isStreaming ? "animate-pulse" : ""}`}>
               {/* 使用 SVG 或 Lucide Icon 模拟 Gemini Sparkle */}
               <ChessKnight size={20} className={message.isStreaming ? "text-indigo-500" : "text-emerald-600"} />
            </div>
          )}
        </div>

        {/* 消息内容区域 */}
        <div className={`flex flex-col min-w-0 ${isUser ? "items-end" : "items-start"}`}>
          
          {/* 1. 用户名 (可选，仅 AI 侧显示) */}
          {!isUser && !isSystem && (
            <span className="text-[13px] font-medium text-[#1F1F1F] mb-1 ml-1">
              {charName}
            </span>
          )}

          {/* 2. 思维链 / 元数据块 (Collapsible Chips) */}
          {!isUser && !isSystem && blocks.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 w-full">
              {blocks.map((block, idx) => (
                <CollapsibleBlock key={idx} block={block} />
              ))}
            </div>
          )}

          {/* 3. 核心气泡 */}
          {message.isLoading ? (
             <div className="mt-2 ml-1">
               <TypingDots />
             </div>
          ) : (
            <div 
              className={`
                relative text-[15px] leading-relaxed break-words
                ${isUser 
                  ? "bg-[#F0F4F9] text-[#1F1F1F] px-5 py-3.5 rounded-[24px] rounded-tr-sm" 
                  : isSystem 
                    ? "bg-gray-50 border border-gray-200 text-gray-600 px-4 py-3 rounded-xl w-full"
                    : "bg-transparent text-[#1F1F1F] py-1 px-1 w-full" /* AI 无背景 */
                }
              `}
            >
              <div className={`prose prose-neutral max-w-none 
                ${isUser ? "prose-p:my-0 prose-p:leading-relaxed" : "prose-p:leading-8 prose-p:tracking-[0.015em] prose-li:leading-8 prose-p:text-[#2d2d2d]"}
                prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[#1F1F1F] prose-code:font-mono prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none
              `}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    // 自定义 CodeBlock 渲染
                    code(props: any) {
                      const { inline, className, children } = props;
                      const match = /language-(\w+)/.exec(className || "");
                      const lang = match?.[1] || "text";
                      if (inline) {
                        return <code>{children}</code>;
                      }
                      return (
                        <div className="not-prose my-3">
                           <CodeBlock language={lang} code={String(children).trim()} />
                        </div>
                      );
                    },
                    // 移除默认的 p 标签边距 (针对用户消息)
                    p({children}) {
                      return <p className={isUser ? "mb-0" : "mb-3 last:mb-0"}>{children}</p>
                    }
                  }}
                >
                  {displayText}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- 子组件：可折叠的思维块 ---
function CollapsibleBlock({ block }: { block: ExtractedBlock }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          group flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 text-xs font-medium w-fit
          ${isOpen 
            ? "bg-indigo-50 border-indigo-100 text-indigo-700" 
            : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"}
        `}
      >
        <BrainCircuit size={14} className={isOpen ? "text-indigo-500" : "text-gray-400"} />
        <span>{isOpen ? "收起" : "展开"}{block.label}</span>
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600 font-mono whitespace-pre-wrap leading-relaxed">
              {block.content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
