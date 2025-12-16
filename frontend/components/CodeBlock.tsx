import { Copy } from "lucide-react";
import { useState } from "react";

type CodeBlockProps = {
  language?: string;
  code: string;
};

export default function CodeBlock({ language = "txt", code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("复制失败", err);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-subtle">
      <div className="flex items-center justify-between bg-gray-50 px-4 py-2 text-xs text-gray-700">
        <span className="uppercase tracking-wide">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-700 transition hover:bg-gray-100"
        >
          <Copy size={14} />
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre className="overflow-x-auto bg-white px-4 py-4 text-sm text-gray-800">
        <code className="block whitespace-pre-wrap break-words px-4">{code}</code>
      </pre>
    </div>
  );
}
