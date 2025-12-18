"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, BarChart3, Cpu, MessageSquare, Clock, Database, BookOpen, Brain } from "lucide-react";
import type { TokenStats } from "@/lib/types";

interface TokenStatsPanelProps {
  tokenStats: TokenStats | null;
  className?: string;
}

export default function TokenStatsPanel({ tokenStats, className = "" }: TokenStatsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!tokenStats) {
    return null;
  }

  const {
    system,
    user,
    history,
    budget_left,
    model_limits,
    lore_budget,
    estimation_method,
    smart_context_used,
    smart_context_tokens
  } = tokenStats;

  // 计算总使用量
  const totalUsed = system + user + history + (smart_context_used ? smart_context_tokens : 0);
  const contextWindow = model_limits?.context_window || 0;
  const maxOutput = model_limits?.max_output || 0;
  const safetyBuffer = model_limits?.safety_buffer || 0;
  const totalBudget = contextWindow - maxOutput - safetyBuffer;
  
  // 计算使用百分比
  const usedPercentage = totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0;
  const budgetLeftPercentage = totalBudget > 0 ? Math.round((budget_left / totalBudget) * 100) : 0;

  // 格式化数字
  const formatNumber = (num: number) => num.toLocaleString();

  // 获取估算方法显示名
  const getEstimationMethodName = (method: string) => {
    switch (method) {
      case "tiktoken":
        return "TikToken 精确估算";
      case "manual_conservative":
        return "手动保守估算";
      default:
        return method;
    }
  };

  return (
    <div className={`bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm ${className}`}>
      {/* 头部 - 可折叠 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Token 使用统计</span>
          <span className="text-xs text-gray-500">
            ({formatNumber(totalUsed)} / {formatNumber(totalBudget)})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* 使用进度条 */}
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                usedPercentage > 80 ? 'bg-red-500' : 
                usedPercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(usedPercentage, 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{usedPercentage}%</span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* 总体统计 */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-gray-500">总使用量</div>
              <div className="font-semibold text-gray-900">{formatNumber(totalUsed)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-gray-500">剩余预算</div>
              <div className="font-semibold text-gray-900">{formatNumber(budget_left)}</div>
            </div>
          </div>

          {/* 详细分解 */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">详细分解</div>
            
            {/* 系统提示词 */}
            <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <Cpu size={14} className="text-purple-600" />
                <span className="text-sm text-gray-700">系统提示词</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{formatNumber(system)}</span>
                <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500"
                    style={{ width: `${totalBudget > 0 ? Math.min((system / totalBudget) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 用户输入 */}
            <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-blue-600" />
                <span className="text-sm text-gray-700">用户输入</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{formatNumber(user)}</span>
                <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500"
                    style={{ width: `${totalBudget > 0 ? Math.min((user / totalBudget) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 历史记录 */}
            <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-green-600" />
                <span className="text-sm text-gray-700">历史记录</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{formatNumber(history)}</span>
                <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500"
                    style={{ width: `${totalBudget > 0 ? Math.min((history / totalBudget) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 智能上下文 */}
            {smart_context_used && smart_context_tokens > 0 && (
              <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <Brain size={14} className="text-indigo-600" />
                  <span className="text-sm text-gray-700">智能上下文</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{formatNumber(smart_context_tokens)}</span>
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500"
                      style={{ width: `${totalBudget > 0 ? Math.min((smart_context_tokens / totalBudget) * 100, 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 模型信息 */}
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">模型信息</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">上下文窗口:</span>
                <span className="font-medium">{formatNumber(contextWindow)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">最大输出:</span>
                <span className="font-medium">{formatNumber(maxOutput)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">安全缓冲:</span>
                <span className="font-medium">{formatNumber(safetyBuffer)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">估算方法:</span>
                <span className="font-medium">{getEstimationMethodName(estimation_method)}</span>
              </div>
            </div>
          </div>

          {/* 世界书预算信息 */}
          {lore_budget > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={14} className="text-orange-600" />
                <span className="text-xs font-medium text-gray-600">世界书预算</span>
              </div>
              <div className="text-xs text-gray-500">
                分配给世界书的 token 预算: {formatNumber(lore_budget)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
