import "./globals.css";
import TabBar from "@/components/TabBar";
import { RecipesProvider } from "@/components/RecipesProvider";

export const metadata = {
  title: "冰箱管家",
  description: "冰箱食品管理与临期提醒",
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <RecipesProvider>
          <div className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-5">{children}</div>
          <TabBar />
        </RecipesProvider>
      </body>
    </html>
  );
}
