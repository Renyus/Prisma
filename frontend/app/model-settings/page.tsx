"use client";

import { useEffect, useState } from "react";
import { listModels } from "@/lib/backendClient";
import { useChatSettingsStore } from "@/store/useChatSettingsStore";
import { Save } from "lucide-react";

export default function ModelSettingsPage() {
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentModel = useChatSettingsStore((s) => s.currentModel);
  const setCurrentModel = useChatSettingsStore((s) => s.setCurrentModel);
  
  const temperature = useChatSettingsStore((s) => s.temperature);
  const setTemperature = useChatSettingsStore((s) => s.setTemperature);
  
  const maxTokens = useChatSettingsStore((s) => s.maxTokens);
  const setMaxTokens = useChatSettingsStore((s) => s.setMaxTokens);

  useEffect(() => {
    listModels()
      .then((res) => {
        setModels(res.models);
        // 如果当前没有选中模型，默认选第一个
        if (!currentModel && res.models.length > 0) {
            setCurrentModel(res.models[0].id);
        }
      })
      .catch((e) => console.error("Failed to load models", e))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <h1 className="text-2xl font-bold text-gray-800">模型设置</h1>
      </div>

      <div className="space-y-6">
        {/* 模型选择 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">选择模型 (Model)</label>
          <select
            value={currentModel || ""}
            onChange={(e) => setCurrentModel(e.target.value)}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            disabled={isLoading}
          >
            {isLoading ? (
              <option>加载中...</option>
            ) : (
              models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))
            )}
          </select>
          <p className="text-xs text-gray-500">
            优先使用后端 .env 配置的模型，但您可以在此覆盖。
          </p>
        </div>

        {/* Temperature */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium text-gray-700">随机性 (Temperature)</label>
            <span className="text-sm text-gray-500">{temperature.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <p className="text-xs text-gray-500">
            值越高回复越有创意，值越低回复越严谨 (默认 0.7-1.0)。
          </p>
        </div>

        {/* Max Tokens */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium text-gray-700">最大回复长度 (Max Tokens)</label>
            <span className="text-sm text-gray-500">{maxTokens}</span>
          </div>
          <input
            type="range"
            min="100"
            max="8192"
            step="100"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      </div>
      
      <div className="pt-4 flex justify-end">
        <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium bg-emerald-50 px-3 py-1.5 rounded-full">
            <Save size={14} />
            <span>设置已自动保存</span>
        </div>
      </div>
    </div>
  );
}