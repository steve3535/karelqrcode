import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Notre Mariage - RSVP',
  description: 'Confirmez votre présence et découvrez votre place pour notre mariage',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen">
        <div className="min-h-screen relative">
          <div className="fixed inset-0 bg-gradient-to-br from-amber-50 via-white to-amber-50 opacity-50" />
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}