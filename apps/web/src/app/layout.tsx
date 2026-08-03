import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aether | Next-Generation Real-Time Collaborative Workspace",
  description:
    "Aether combines an infinite canvas, offline-first sync, event sourcing, and real-time collaboration with a minimal and premium design system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#050505] text-white antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
