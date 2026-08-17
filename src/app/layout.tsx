import "./globals.css";
import TabBar from "@/components/TabBar";
export const metadata = {
  title: "冰箱管家",
  description: "冰箱食品管理与临期提醒",
  manifest: "/manifest.webmanifest",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900 pb-16">
        {children}
        <TabBar />
      </body>
    </html>
  );
}
