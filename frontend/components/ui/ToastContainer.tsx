"use client";

import { useToastStore } from "@/store/useToastStore";
import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-full shadow-lg bg-[#1f1f1f] text-white min-w-[300px] max-w-[90vw]"
          >
            {getIcon(toast.type)}
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function getIcon(type: string) {
  switch (type) {
    case "success":
      return <CheckCircle2 size={20} className="text-emerald-400" />;
    case "error":
      return <AlertCircle size={20} className="text-rose-400" />;
    case "warning":
      return <AlertCircle size={20} className="text-amber-400" />;
    default:
      return <Info size={20} className="text-blue-400" />;
  }
}
