import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { ThemeProvider } from "@/components/ThemeProvider";
import { HeaderThemeSelector } from "@/components/HeaderThemeSelector";
import { LogoutButton } from "@/components/LogoutButton";

export const metadata: Metadata = {
  title: "推し活手帳",
  description: "推し活を管理するWebアプリ",
};

const ANTI_FOUC = `(function(){try{var t=localStorage.getItem('oshi-theme');var v=['default','red','blue','yellow','green','gray','white','black','purple','pink','orange'];if(t&&v.indexOf(t)>=0)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FOUC }} />
      </head>
      <body className="pt-[52px] pb-20">
        <ThemeProvider>
          <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[var(--c-border)]">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
              <h1 className="text-[var(--c-fg)] font-bold text-lg tracking-wide shrink-0">推し活手帳</h1>
              <div className="flex items-center gap-2">
                <HeaderThemeSelector />
                <LogoutButton />
              </div>
            </div>
          </header>
          <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
          <Navigation />
        </ThemeProvider>
      </body>
    </html>
  );
}
