import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import TypingDots from "./TypingDots";
import { useTypewriter } from "../hooks/useTypewriter";
import { useMemo } from "react";
import CodeBlock from "./CodeBlock";
import { BrainCircuit, Info } from "lucide-react"; // 引入图标

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

// 1. 在这里定义所有你想 "提取并隐藏" 的标签名 (不带尖括号)
const METADATA_TAGS = [
  "affinity_status",
  "thought",
  "thinking",
  "analysis",
  "hidden",
  "sys_log",
  "StatusBlock"
];

// 2. (可选) 定义标签在界面上显示的中文标题
const TAG_LABELS: Record<string, string> = {
  affinity_status: "当前状态",
  thought: "思维链",
  thinking: "思考过程",
  analysis: "剧情分析",
  hidden: "隐藏信息",
  sys_log: "系统日志",
  StatusBlock: "状态模块"
};

// 3. 定义纯粹需要移除的包装标签 (内容保留，只删标签本身)
// 比如 <content>你好</content> -> 你好
const WRAPPER_TAGS = ["content", "response"];

// --- 解析逻辑 ---

type ExtractedBlock = {
  tag: string;
  label: string;
  content: string;
};

function parseContent(raw: string) {
  let cleanText = raw;
  const extractedBlocks: ExtractedBlock[] = [];

  // 1. 提取元数据标签 (内容会被移出正文)
  METADATA_TAGS.forEach((tag) => {
    // 正则解释：
    // <tag  Start
    // (?: \s[^>]*)?  可选的属性部分 (比如 <tag id="1">)
    // >
    // ([\s\S]*?)  捕获内容 (支持换行)
    // <\/tag>  End
    const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi");
    
    let match;
    while ((match = regex.exec(cleanText)) !== null) {
      extractedBlocks.push({
        tag: tag,
        label: TAG_LABELS[tag] || tag.toUpperCase(), // 如果没定义中文名，就显示大写标签名
        content: match[1].trim(),
      });
    }
    // 从原文中彻底移除这些块
    cleanText = cleanText.replace(regex, "");
  });

  // 2. 清理包装标签 (只删标签，保留内容)
  WRAPPER_TAGS.forEach((tag) => {
    const regex = new RegExp(`<\\/?${tag}(?:\\s[^>]*)?>`, "gi");
    cleanText = cleanText.replace(regex, "");
  });

  return {
    blocks: extractedBlocks,
    text: cleanText.trim(),
  };
}

export default function ChatMessage({ message, onTypingComplete }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  // 使用 useMemo 解析内容
  const { blocks, text: visibleText } = useMemo(() => {
    if (isUser) return { blocks: [], text: message.content };
    return parseContent(message.content);
  }, [message.content, isUser]);

  const shouldType =
    !isUser && !isSystem && message.isStreaming && !message.isLoading && !message.isHistory;

  const displayText = useTypewriter(
    visibleText,
    10,
    30,
    shouldType,
    onTypingComplete
  );

  return (
    <div className={`w-full flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex flex-col gap-2 ${
          isUser ? "text-left max-w-[70%]" : "text-left w-full"
        }`}
      >
        {/* --- 动态渲染提取出的所有元数据块 --- */}
        {!isUser && !isSystem && blocks.length > 0 && (
          <details className="group mb-1">
            <summary className="flex items-center gap-2 cursor-pointer list-none text-xs text-gray-400 hover:text-gray-600 transition-colors w-fit select-none">
              <BrainCircuit size={14} />
              <span>
                {blocks.length === 1 
                  ? `查看${blocks[0].label}` 
                  : "查看思考与状态"}
              </span>
            </summary>
            
            <div className="mt-2 flex flex-col gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
              {blocks.map((block, index) => (
                <div key={index} className="flex flex-col gap-1">
                   {/* 只有当有多个块时，才显示内部的小标题，区分不同类型的信息 */}
                   {blocks.length > 1 && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <Info size={10} />
                        {block.label}
                      </div>
                   )}
                   <div className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">
                     {block.content}
                   </div>
                   {/* 分割线 (除了最后一个) */}
                   {index < blocks.length - 1 && <div className="h-px bg-gray-200 my-1" />}
                </div>
              ))}
            </div>
          </details>
        )}

        {message.isLoading ? (
          <TypingDots />
        ) : isUser ? (
          <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed py-2 text-gray-800 bg-[#fafafa] px-3 rounded-xl shadow-sm">
            {message.content}
          </div>
        ) : isSystem ? (
          // System 消息的特殊样式
          <div className="whitespace-pre-wrap break-words text-[13px] leading-relaxed py-2 px-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 italic">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-[11px] font-medium text-blue-600 uppercase tracking-wider">系统消息</span>
            </div>
            <div className="text-blue-700">
              {message.content}
            </div>
          </div>
        ) : (
          <div className="w-full">
            <div className="prose prose-neutral max-w-none text-[15px] leading-relaxed text-gray-900 py-2">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  code(props: any) {
                    const { inline, className, children } = props;
                    const match = /language-(\w+)/.exec(className || "");
                    const lang = match?.[1] || "txt";
                    if (inline) {
                      return (
                        <code className="rounded bg-slate-100 px-1 py-0.5 text-[13px] text-pink-600">
                          {children}
                        </code>
                      );
                    }
                    return (
                      <div className="my-3 not-prose">
                        <CodeBlock language={lang} code={String(children).trim()} />
                      </div>
                    );
                  },
                }}
              >
                {displayText}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
