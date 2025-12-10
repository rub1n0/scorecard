import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ScorecardProvider } from "@/context/ScorecardContext";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Scorecard Manager - Track Your KPIs",
  description: "Create and manage scorecards with interactive KPI visualizations and charts",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ScorecardProvider>{children}</ScorecardProvider>
      </body>
    </html>
  );
}
