import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Record Commons — A community video archive",
  description:
    "Record Commons is a moderated, searchable community archive of videos and their public context.",
  icons: { icon: "/record-commons-mark.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
