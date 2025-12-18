"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

export interface PopoverProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function Popover({ 
  trigger, 
  content, 
  className = "", 
  side = "top", 
  align = "center" 
}: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current && popoverRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();
      
      let top = 0;
      let left = 0;

      switch (side) {
        case "top":
          top = triggerRect.top - popoverRect.height - 8;
          break;
        case "bottom":
          top = triggerRect.bottom + 8;
          break;
        case "left":
          top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2;
          left = triggerRect.left - popoverRect.width - 8;
          break;
        case "right":
          top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2;
          left = triggerRect.right + 8;
          break;
      }

      // 水平对齐
      switch (align) {
        case "start":
          left = triggerRect.left;
          break;
        case "center":
          left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2;
          break;
        case "end":
          left = triggerRect.right - popoverRect.width;
          break;
      }

      // 边界检查
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      if (left < 8) left = 8;
      if (left + popoverRect.width > viewportWidth - 8) {
        left = viewportWidth - popoverRect.width - 8;
      }
      
      if (top < 8) top = triggerRect.bottom + 8;
      if (top + popoverRect.height > viewportHeight - 8) {
        top = triggerRect.top - popoverRect.height - 8;
      }

      setPosition({ top, left });
    }
  }, [isOpen, side, align]);

  const handleClickOutside = (event: MouseEvent) => {
    if (
      popoverRef.current && 
      !popoverRef.current.contains(event.target as Node) &&
      triggerRef.current &&
      !triggerRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <>
      <div 
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-block"
      >
        {trigger}
      </div>
      
      {isOpen && (
        <div
          ref={popoverRef}
          className={`
            fixed z-50 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-xl
            animate-in fade-in zoom-in-95 duration-200 max-w-sm w-80
            ${className}
          `}
          style={{
            top: position.top,
            left: position.left,
          }}
        >
          {content}
        </div>
      )}
    </>
  );
}

export interface PopoverContentProps {
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function PopoverContent({ 
  title, 
  children, 
  onClose, 
  className = "" 
}: PopoverContentProps) {
  return (
    <div className={`p-4 ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 truncate pr-2">
            {title}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
      <div className="text-sm text-gray-700 leading-relaxed">
        {children}
      </div>
    </div>
  );
}
