"use client";

import { Users, Library, Settings2,  } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

const routeItems = [
  { label: "角色卡",  icon: Users, href: "/character-setup" },
  { label: "世界书",   icon: Library,        href: "/lorebook" },
  
];

interface SidebarNavigationProps {
  collapsed: boolean;
  onOpenCharacterPanel?: () => void;
  onOpenLorebookPanel?: () => void;
  
}

export function SidebarNavigation({ 
    collapsed,
    onOpenCharacterPanel, 
    onOpenLorebookPanel, 
    
}: SidebarNavigationProps) {
    const router = useRouter();
    const pathname = usePathname();

    return (
        <nav className="flex flex-col gap-1">
            {routeItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href; 
                
                return (
                    <button
                        key={item.href}
                        title={collapsed ? item.label : ""}
                        onClick={() => {
                            if (item.href === "/character-setup" && onOpenCharacterPanel) return onOpenCharacterPanel();
                            if (item.href === "/lorebook" && onOpenLorebookPanel) return onOpenLorebookPanel();
                             
                            router.push(item.href);
                        }}
                        className={`
                            group flex items-center transition-all duration-200 relative
                            ${collapsed 
                                ? "justify-center w-10 h-10 rounded-full mx-auto" // 收起模式：居中圆形
                                : "w-full gap-4 px-4 py-3 rounded-full" // 展开模式：长条药丸
                            }
                            ${active 
                                ? "bg-[#D3E3FD] text-[#041E49]" // Google Active Blue
                                : "text-[#444746] hover:bg-gray-200/50"
                            }
                        `}
                    >
                        <Icon 
                            size={collapsed ? 20 : 20} 
                            className={active ? "text-[#041E49]" : "text-[#444746] group-hover:text-[#1F1F1F]"} 
                            strokeWidth={2} 
                        />
                        
                        {!collapsed && (
                            <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                        )}
                    </button>
                );
            })}
        </nav>
    );
}