import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "ClubSpark",
  description: "Book courts, manage memberships and more.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900">{children}</body>
    </html>
  )
}
