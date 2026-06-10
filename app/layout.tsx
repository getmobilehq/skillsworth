import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prove Your Worth — TTS Nigeria",
  description:
    "What is your skill worth? Pick any skill, take a live timed test, and prove it. Dignified Work for a Digital Future.",
};

export const viewport: Viewport = {
  themeColor: "#004931",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
