"use client";

import { forwardRef } from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "vector" | "keyword" | "secondary";
  size?: "sm" | "md" | "lg";
  priority?: number;
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", size = "md", priority, ...props }, ref) => {
    // 基础样式
    const baseClasses = "inline-flex items-center rounded-full border font-medium transition-all duration-200 hover:scale-105 hover:shadow-sm cursor-pointer";
    
    // 尺寸变体
    const sizeClasses = {
      "sm": "px-2 py-1 text-xs",
      "md": "px-3 py-1.5 text-sm", 
      "lg": "px-4 py-2 text-base",
    };
    
    // 优先级颜色深度映射
    const getPriorityColorClasses = (variant: string, priority?: number) => {
      if (!priority) {
        // 无优先级时使用默认颜色
        const defaultClasses = {
          "default": "border-gray-200 bg-gray-100 text-gray-800 hover:bg-gray-200",
          "vector": "border-blue-200 bg-blue-100 text-blue-800 hover:bg-blue-200",
          "keyword": "border-green-200 bg-green-100 text-green-800 hover:bg-green-200",
          "secondary": "border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100",
        };
        return defaultClasses[variant as keyof typeof defaultClasses] || defaultClasses.default;
      }
      
      // 根据优先级调整颜色深度
      const intensity = priority >= 80 ? "dark" : priority >= 50 ? "medium" : "light";
      
      const priorityClasses = {
        default: {
          light: "border-gray-200 bg-gray-100 text-gray-800 hover:bg-gray-200",
          medium: "border-gray-300 bg-gray-200 text-gray-900 hover:bg-gray-300",
          dark: "border-gray-400 bg-gray-300 text-gray-900 hover:bg-gray-400",
        },
        vector: {
          light: "border-blue-200 bg-blue-100 text-blue-800 hover:bg-blue-200",
          medium: "border-blue-300 bg-blue-200 text-blue-900 hover:bg-blue-300",
          dark: "border-blue-400 bg-blue-300 text-blue-900 hover:bg-blue-400",
        },
        keyword: {
          light: "border-green-200 bg-green-100 text-green-800 hover:bg-green-200",
          medium: "border-green-300 bg-green-200 text-green-900 hover:bg-green-300",
          dark: "border-green-400 bg-green-300 text-green-900 hover:bg-green-400",
        },
        secondary: {
          light: "border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100",
          medium: "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200",
          dark: "border-gray-300 bg-gray-200 text-gray-800 hover:bg-gray-300",
        },
      };
      
      return priorityClasses[variant as keyof typeof priorityClasses]?.[intensity as keyof typeof priorityClasses.default] || priorityClasses.default.light;
    };
    
    // 呼吸灯边框效果（极高优先级）
    const hasBreathingEffect = priority && priority >= 80;
    const breathingClasses = hasBreathingEffect ? "animate-pulse shadow-lg" : "";
    
    // 呼吸灯边框颜色
    const getBreathingBorderColor = (variant: string) => {
      const borderColors = {
        default: "border-gray-400",
        vector: "border-blue-400", 
        keyword: "border-green-400",
        secondary: "border-gray-300",
      };
      return borderColors[variant as keyof typeof borderColors] || borderColors.default;
    };
    
    const breathingBorderClass = hasBreathingEffect ? getBreathingBorderColor(variant) : "";
    
    return (
      <div
        ref={ref}
        className={[
          baseClasses,
          sizeClasses[size],
          getPriorityColorClasses(variant, priority),
          breathingClasses,
          breathingBorderClass,
          className || ""
        ].join(" ")}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
