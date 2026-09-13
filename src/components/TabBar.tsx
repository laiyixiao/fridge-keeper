"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "冰箱", icon: "fridge" },
  { href: "/add", label: "录入", icon: "plus" },
  { href: "/recipes", label: "菜谱", icon: "recipe" },
  { href: "/settings", label: "设置", icon: "settings" },
];

function Icon({ name, active }: { name: string; active: boolean }) {
  const p = {
    width: 23,
    height: 23,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: active ? 2 : 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "fridge":
      return (
        <svg {...p}>
          <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
          <line x1="5" y1="10" x2="19" y2="10" />
          <line x1="8" y1="6" x2="8" y2="7.5" />
          <line x1="8" y1="13" x2="8" y2="15.5" />
        </svg>
      );
    case "plus":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8.5" x2="12" y2="15.5" />
          <line x1="8.5" y1="12" x2="15.5" y2="12" />
        </svg>
      );
    case "recipe":
      return (
        <svg {...p}>
          <path d="M8 3v7M6 3v4.5a2 2 0 0 0 4 0V3M8 10v11" />
          <path d="M17 3c-1.4 0-2.2 2-2.2 4.2 0 1.8 .9 2.8 2.2 2.8s2.2-1 2.2-2.8C19.2 5 18.4 3 17 3zM17 10v11" />
        </svg>
      );
    case "settings":
      return (
        <svg {...p}>
          <line x1="4" y1="8" x2="20" y2="8" />
          <circle cx="9" cy="8" r="2.3" fill="var(--card)" />
          <line x1="4" y1="16" x2="20" y2="16" />
          <circle cx="15" cy="16" r="2.3" fill="var(--card)" />
        </svg>
      );
    default:
      return null;
  }
}

export default function TabBar() {
  const path = usePathname();
  return (
    <nav
      className="tabbar fixed inset-x-0 bottom-0 z-50 border-t"
      style={{ borderColor: "var(--line)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className="group relative flex flex-1 flex-col items-center gap-1 pb-2 pt-2.5"
            >
              <span
                className={`absolute top-0 h-[3px] w-7 rounded-full transition-colors duration-200 ${
                  active ? "bg-[var(--accent)]" : "bg-transparent"
                }`}
              />
              <span
                className={
                  active
                    ? "text-[var(--accent)]"
                    : "text-stone-400 transition-colors group-hover:text-stone-600"
                }
              >
                <Icon name={t.icon} active={active} />
              </span>
              <span
                className={`text-[11px] transition-colors ${
                  active ? "font-semibold text-[var(--accent)]" : "font-medium text-stone-400 group-hover:text-stone-600"
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
