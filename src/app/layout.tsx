import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";
import { DemoNote } from "@/components/demo/demo-note";
import { themeBootScript } from "@/lib/theme-script";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Tandem — a live room for the job hunt",
  description:
    "Collaborative kanban, brief, and whiteboard for Akhilendra Singh's job search. Live cursors, presence, comments, and offline CRDT sync. No accounts.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${display.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-dvh font-sans text-ink antialiased">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
        <DemoNote />
      </body>
    </html>
  );
}
