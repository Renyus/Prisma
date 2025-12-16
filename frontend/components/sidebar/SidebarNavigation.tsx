"use client";

import { UserCircle2, Book, Sparkles } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

const routeItems = [
  { label: "角色卡 (Character)",  icon: UserCircle2, href: "/character-setup" },
  { label: "世界书 (Lorebook)",   icon: Book,        href: "/lorebook" },
  { label: "系统微调 (Prompts)",  icon: Sparkles,    href: "/prompts" }, 
];

interface SidebarNavigationProps {
  onOpenCharacterPanel?: () => void;
  onOpenLorebookPanel?: () => void;
  onOpenPromptPanel?: () => void;
}

export function SidebarNavigation({ 
    onOpenCharacterPanel, 
    onOpenLorebookPanel, 
    onOpenPromptPanel 
}: SidebarNavigationProps) {
    const router = useRouter();
    const pathname = usePathname();

    return (
        <div className="flex-shrink-0 px-4 mb-4">
            <div className="space-y-1.5">
                {routeItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href; 
                    return (
                        <button
                            key={item.href}
                            onClick={() => {
                                if (item.href === "/character-setup" && onOpenCharacterPanel) return onOpenCharacterPanel();
                                if (item.href === "/lorebook" && onOpenLorebookPanel) return onOpenLorebookPanel();
                                if (item.href === "/prompts" && onOpenPromptPanel) return onOpenPromptPanel(); 
                                router.push(item.href);
                            }}
                            className={`
                                relative flex w-full items-center gap-4 px-4 py-3 rounded-full text-sm font-medium transition-all duration-200
                                ${active 
                                    ? "bg-blue-100/70 text-gray-900 before:content-[''] before:absolute before:left-0 before:top-1/4 before:h-1/2 before:w-1 before:bg-blue-600 before:rounded-r-full" 
                                    : "text-[#444746] hover:bg-[#e0e5eb]"
                                }
                            `}
                        >
                            <Icon size={20} className={active ? "text-blue-600" : "text-gray-600"} strokeWidth={2} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>
            <div className="border-t border-gray-300/50 mx-2 mt-4"></div>
        </div>
    );
}
