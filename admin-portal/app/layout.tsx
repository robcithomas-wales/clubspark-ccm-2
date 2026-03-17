import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "ClubSpark Pilot Admin",
  description: "ClubSpark pilot admin portal",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}