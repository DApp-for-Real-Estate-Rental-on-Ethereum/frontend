"use client"

import { usePathname } from "next/navigation"
import { Header } from "./Header"

export function ConditionalHeader() {
  const pathname = usePathname()
  
  // Hide header on login and signup pages
  const hideHeader = pathname === "/login" || pathname === "/signup"
  
  if (hideHeader) {
    return null
  }
  
  return <Header />
}

