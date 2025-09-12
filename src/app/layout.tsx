import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { TokenExpiryNotification } from '@/components/TokenExpiryNotification'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Scan2Ship - Logistics Management',
  description: 'Efficient logistics and shipping management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <TokenExpiryNotification />
        </AuthProvider>
      </body>
    </html>
  )
}