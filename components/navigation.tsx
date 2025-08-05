import Link from 'next/link'

export default function Navigation() {
  return (
    <nav className="bg-wedding-darkPink text-white p-3 md:p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex space-x-2 md:space-x-4 text-sm md:text-base">
          <Link href="/" className="hover:text-wedding-lightPink">
            RSVP
          </Link>
          <Link href="/scan" className="hover:text-wedding-lightPink">
            Check-in
          </Link>
          <Link href="/admin" className="hover:text-wedding-lightPink">
            Admin
          </Link>
          <Link href="/admin/tables" className="hover:text-wedding-lightPink">
            Tables
          </Link>
        </div>
      </div>
    </nav>
  )
}