import type { Metadata } from "next";
import "./globals.css";
import { ScorecardProvider } from "@/context/ScorecardContext";

export const metadata: Metadata = {
  title: "Scorecard Manager - Track Your KPIs",
  description: "Create and manage scorecards with interactive KPI visualizations and charts",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ScorecardProvider>{children}</ScorecardProvider>
      </body>
    </html>
  );
}
