'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Breadcrumb() {
  const pathname = usePathname()
  
  const getBreadcrumbItems = () => {
    if (pathname === '/') return [{ name: 'Home', href: '/', current: true }]
    
    const items = [{ name: 'Home', href: '/', current: false }]
    
    if (pathname === '/view-orders') {
      items.push({ name: 'View Orders', href: '/view-orders', current: true })
    } else if (pathname === '/profile') {
      items.push({ name: 'My Profile', href: '/profile', current: true })
    }
    
    return items
  }
  
  const breadcrumbItems = getBreadcrumbItems()
  
  if (breadcrumbItems.length === 1) return null
  
  return (
    <nav className="flex justify-center mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbItems.map((item, index) => (
          <li key={item.href}>
            {index === breadcrumbItems.length - 1 ? (
              <span className="text-gray-500 font-medium">{item.name}</span>
            ) : (
              <>
                <Link
                  href={item.href}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {item.name}
                </Link>
                <span className="mx-2 text-gray-400">/</span>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
