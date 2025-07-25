import './globals.css'
import type { Metadata } from 'next'
import Navigation from '@/components/navigation'
import Footer from '@/components/footer'

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
        {/* Beautiful Background Pattern */}
        <div className="fixed inset-0 overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-amber-50 to-sage-50" />
          
          {/* Decorative Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-rose-200 to-transparent rounded-full blur-3xl" />
            <div className="absolute top-1/4 right-0 w-80 h-80 bg-gradient-to-bl from-gold-200 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-gradient-to-tr from-sage-200 to-transparent rounded-full blur-3xl" />
          </div>
          
          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, var(--primary-gold) 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }} />
          </div>
        </div>
        
        {/* Navigation */}
        <Navigation />
        
        {/* Content */}
        <div className="relative z-10 min-h-screen pt-16 flex flex-col">
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  )
}