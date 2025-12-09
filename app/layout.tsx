import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ConditionalHeader } from '@/components/layout/ConditionalHeader'
import { Toaster } from "@/components/ui/sonner"

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'DeRent5 - Find Your Perfect Rental Property',
  description: 'Discover amazing rental properties at minimum living costs. Find apartments, houses, and more with flexible leases and premium amenities.',
  generator: 'DeRent5',
  icons: {
    icon: '/logo1.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <ConditionalHeader />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
