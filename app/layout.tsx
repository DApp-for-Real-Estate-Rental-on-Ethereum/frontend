import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import { ConditionalHeader } from '@/components/layout/ConditionalHeader'
import { Toaster } from "@/components/ui/sonner"

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: 'DeRent5 - Premium Decentralized Living',
  description: 'Experience the future of rental management. Secure, transparent, and beautiful.',
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
      <body className={`${outfit.variable} font-sans antialiased bg-background text-foreground`}>
        <ConditionalHeader />
        <main className="min-h-screen">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  )
}
