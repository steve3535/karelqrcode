import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Wedding RSVP System',
  description: 'Elegant RSVP and check-in management for your special day',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  )
}