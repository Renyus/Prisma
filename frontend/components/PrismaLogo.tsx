import React from "react";

export default function PrismaLogo({ className = "", collapsed = false }: { className?: string, collapsed?: boolean }) {
  return (
    <div className={`font-sans select-none ${className}`}>
      {collapsed ? (
        // 折叠状态：只显示 "P."
        <span className="text-xl font-bold text-gray-800 tracking-tight">
          P<span className="text-emerald-500">.</span>
        </span>
      ) : (
        // 展开状态：完整 Wordmark
        <div className="flex flex-col">
          {/* 主标题 */}
          <h1 className="text-2xl font-bold text-gray-900 tracking-tighter leading-none flex items-baseline">
            Prisma
            {/* 这里的点是唯一的色彩点缀，起到画龙点睛的作用 */}
            
          </h1>
          
          {/* 副标题：极小的全大写字母，增加层次感 */}
          
        </div>
      )}
    </div>
  );
}