import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WF2.0 — Administration",
  description: "Back-office éditeurs scolaires",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
