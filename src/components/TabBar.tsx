"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "冰箱", icon: "🧊" },
  { href: "/add", label: "录入", icon: "➕" },
  { href: "/recipes", label: "菜谱", icon: "🍳" },
  { href: "/settings", label: "设置", icon: "⚙️" },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200/80 bg-white/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-md items-stretch px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className="group relative flex flex-1 flex-col items-center gap-0.5 py-2.5"
            >
              <span
                className={`text-[20px] leading-none transition-transform duration-150 ${
                  active ? "-translate-y-0.5" : "opacity-60 group-hover:opacity-100"
                }`}
              >
                {t.icon}
              </span>
              <span
                className={`text-[11px] font-medium transition-colors ${
                  active ? "text-teal-700" : "text-stone-400 group-hover:text-stone-600"
                }`}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
