import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Wedding Seating - RSVP & Check-in',
  description: 'RSVP and find your seat at our wedding',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  )
}