"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "冰箱" },
  { href: "/add", label: "录入" },
  { href: "/recipes", label: "推菜" },
  { href: "/settings", label: "设置" },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t flex z-50">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href}
          className={`flex-1 text-center py-3 text-sm ${path === t.href ? "text-blue-600 font-semibold" : "text-gray-500"}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
