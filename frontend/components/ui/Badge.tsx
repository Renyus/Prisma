"use client";

import { forwardRef } from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "vector" | "keyword" | "secondary";
  size?: "sm" | "md" | "lg";
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    // 基础样式
    const baseClasses = "inline-flex items-center rounded-full border font-medium transition-all duration-200 hover:scale-105 hover:shadow-sm cursor-pointer";
    
    // 尺寸变体
    const sizeClasses = {
      "sm": "px-2 py-1 text-xs",
      "md": "px-3 py-1.5 text-sm", 
      "lg": "px-4 py-2 text-base",
    };
    
    // 颜色变体
    const variantClasses = {
      "default": "border-gray-200 bg-gray-100 text-gray-800 hover:bg-gray-200",
      "vector": "border-blue-200 bg-blue-100 text-blue-800 hover:bg-blue-200",
      "keyword": "border-green-200 bg-green-100 text-green-800 hover:bg-green-200",
      "secondary": "border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100",
    };
    
    return (
      <div
        ref={ref}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className || ""}`}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
