import Link from 'next/link'

export default function Navigation() {
  return (
    <nav className="bg-wedding-darkPink text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          Wedding Manager
        </Link>
        <div className="space-x-4">
          <Link href="/" className="hover:text-wedding-lightPink">
            RSVP
          </Link>
          <Link href="/scan" className="hover:text-wedding-lightPink">
            Check-In
          </Link>
          <Link href="/admin" className="hover:text-wedding-lightPink">
            Admin
          </Link>
        </div>
      </div>
    </nav>
  )
}