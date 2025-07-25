export default function Footer() {
  return (
    <footer className="relative z-10 bg-white/80 backdrop-blur-md border-t border-gray-200/50 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          {/* Decorative Divider */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent w-32"></div>
            <div className="w-3 h-3 bg-gradient-to-br from-rose-400 to-gold-500 rounded-full"></div>
            <div className="h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent w-32"></div>
          </div>
          
          {/* Logo and Title */}
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-rose-400 to-gold-500 rounded-full flex items-center justify-center mb-4">
              <span className="text-white text-2xl">💒</span>
            </div>
            <h3 className="text-2xl font-playfair font-bold text-gray-800 mb-2">
              Notre Mariage
            </h3>
            <p className="text-gray-600">
              Système de gestion des invités et RSVP
            </p>
          </div>
          
          {/* Quick Links */}
          <div className="flex justify-center space-x-8 mb-8">
            <a href="/" className="text-gray-600 hover:text-rose-500 transition-colors">
              RSVP
            </a>
            <a href="/scan" className="text-gray-600 hover:text-rose-500 transition-colors">
              Scanner
            </a>
            <a href="/admin" className="text-gray-600 hover:text-rose-500 transition-colors">
              Admin
            </a>
          </div>
          
          {/* Copyright */}
          <div className="text-sm text-gray-500">
            <p>© 2024 Notre Mariage. Tous droits réservés.</p>
            <p className="mt-1">Créé avec 💕 pour célébrer l'amour</p>
          </div>
        </div>
      </div>
    </footer>
  )
} 