"use client"

import { LogOut, Menu, X } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export function Header() {
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/")
    router.refresh()
  }

  const isAdmin = user?.roles?.includes("ADMIN") ?? false
  const isPoster = user?.roles?.includes("POSTER") ?? false

  // Check if current route is active
  const isActive = (path: string) => pathname === path

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          {/* Logo - Left */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <Image src="/logo.svg" alt="DeRent5" width={120} height={40} className="h-10 w-auto" />
          </Link>

          {/* Desktop Navigation - Center */}
          <nav className="hidden md:flex items-center gap-2 flex-1 justify-center">
            {/* Navigation Links - Always visible */}
            <Link href="/">
              <Button 
                variant="ghost" 
                className={`text-gray-700 hover:text-teal-600 hover:bg-teal-50 ${
                  isActive("/") ? "text-teal-600 border-b-2 border-teal-600 rounded-none pb-1" : ""
                }`}
              >
                Home
              </Button>
            </Link>
            <Link href="/properties">
              <Button 
                variant="ghost" 
                className={`text-gray-700 hover:text-teal-600 hover:bg-teal-50 ${
                  isActive("/properties") ? "text-teal-600 border-b-2 border-teal-600 rounded-none pb-1" : ""
                }`}
              >
                Properties
              </Button>
            </Link>

            {isAuthenticated ? (
              <>
                {/* Authenticated User Links */}
                <Link href="/my-bookings">
                  <Button 
                    variant="ghost" 
                    className={`text-gray-700 hover:text-teal-600 hover:bg-teal-50 ${
                      isActive("/my-bookings") ? "text-teal-600 border-b-2 border-teal-600 rounded-none pb-1" : ""
                    }`}
                  >
                    My Bookings
                  </Button>
                </Link>

                {(isPoster || isAdmin) && (
                  <Link href="/host-dashboard">
                    <Button
                      variant="ghost"
                      className={`text-gray-700 hover:text-teal-600 hover:bg-teal-50 ${
                        isActive("/host-dashboard") ? "text-teal-600 border-b-2 border-teal-600 rounded-none pb-1" : ""
                      }`}
                    >
                      Host Dashboard
                    </Button>
                  </Link>
                )}

                {isAdmin && (
                  <Link href="/admin">
                    <Button 
                      variant="ghost" 
                      className={`text-gray-700 hover:text-teal-600 hover:bg-teal-50 ${
                        isActive("/admin") ? "text-teal-600 border-b-2 border-teal-600 rounded-none pb-1" : ""
                      }`}
                    >
                      Admin Dashboard
                    </Button>
                  </Link>
                )}

                {!isPoster && !isAdmin && (
                  <Button
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => router.push("/post-property")}
                  >
                    Become a Host
                  </Button>
                )}
              </>
            ) : (
              <>
                {/* Guest User Links */}
                <Button 
                  variant="outline" 
                  onClick={() => router.push("/login")}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  Sign In
                </Button>
                <Button
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={() => router.push("/post-property")}
                >
                  Become a Host
                </Button>
              </>
            )}
          </nav>

          {/* User Actions - Right */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0 ml-auto">
            {isAuthenticated ? (
              <>
                {/* User Profile */}
                <Link href="/profile">
                  <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors">
                    {user?.profileImage ? (
                      <img
                        src={(() => {
                          const url = user.profileImage
                          if (!url) return "/placeholder.jpg"
                          if (url.startsWith("http://") || url.startsWith("https://")) {
                            return url
                          }
                          // Profile pictures are stored in user-service (port 8082)
                          if (url.startsWith("/profile-pictures") || url.startsWith("/user-images")) {
                            return `http://localhost:8082${url}`
                          }
                          // If it's a relative path starting with /, assume it's from user-service
                          if (url.startsWith("/")) {
                            return `http://localhost:8082${url}`
                          }
                          return url
                        })()}
                        alt={user.firstName || "User"}
                        className="w-9 h-9 rounded-full object-cover border-2 border-gray-200"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    {!user?.profileImage && (
                      <div className="w-9 h-9 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {user?.firstName?.charAt(0)?.toUpperCase() || user?.lastName?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                    <div className="text-sm hidden lg:block">
                      <p className="font-medium text-gray-900">
                        {user?.firstName && user?.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user?.firstName || user?.email?.split("@")[0] || "User"}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {user?.roles?.map(r => {
                          if (r === "POSTER") return "Host"
                          if (r === "ADMIN") return "Admin"
                          return "User"
                        }).join(", ") || "User"}
                      </p>
                    </div>
                  </div>
                </Link>

                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden lg:inline">Logout</span>
                </Button>
              </>
            ) : null}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden pb-4 border-t border-gray-200">
            <div className="flex flex-col gap-2 pt-4">
              {/* Navigation Links - Always visible */}
              <Link
                href="/"
                className="block px-4 py-2.5 text-gray-700 hover:bg-teal-50 hover:text-teal-600 rounded-lg transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/properties"
                className="block px-4 py-2.5 text-gray-700 hover:bg-teal-50 hover:text-teal-600 rounded-lg transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Properties
              </Link>

              {isAuthenticated ? (
                <>
                  {/* Authenticated User Links */}
                  <Link
                    href="/my-bookings"
                    className="block px-4 py-2.5 text-gray-700 hover:bg-teal-50 hover:text-teal-600 rounded-lg transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Bookings
                  </Link>

                  {isPoster && (
                    <Button
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white mt-2"
                      onClick={() => {
                        router.push("/host-dashboard")
                        setIsMenuOpen(false)
                      }}
                    >
                      Host Dashboard
                    </Button>
                  )}

                  {isAdmin && (
                    <Button
                      variant="outline"
                      className="w-full border-gray-300 hover:bg-gray-50 mt-2"
                      onClick={() => {
                        router.push("/admin")
                        setIsMenuOpen(false)
                      }}
                    >
                      Admin Panel
                    </Button>
                  )}

                  {!isPoster && (
                    <Button
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white mt-2"
                      onClick={() => {
                        router.push("/post-property")
                        setIsMenuOpen(false)
                      }}
                    >
                      Become a Host
                    </Button>
                  )}

                  <div className="border-t border-gray-200 my-2"></div>

                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {user?.profileImage ? (
                      <img
                        src={(() => {
                          const url = user.profileImage
                          if (!url) return "/placeholder.jpg"
                          if (url.startsWith("http://") || url.startsWith("https://")) {
                            return url
                          }
                          // Profile pictures are stored in user-service (port 8082)
                          if (url.startsWith("/profile-pictures") || url.startsWith("/user-images")) {
                            return `http://localhost:8082${url}`
                          }
                          // If it's a relative path starting with /, assume it's from user-service
                          if (url.startsWith("/")) {
                            return `http://localhost:8082${url}`
                          }
                          return url
                        })()}
                        alt={user.firstName || "User"}
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    {!user?.profileImage && (
                      <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                        {user?.firstName?.charAt(0)?.toUpperCase() || user?.lastName?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {user?.firstName && user?.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user?.firstName || user?.email?.split("@")[0] || "User"}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {user?.roles?.map(r => {
                          if (r === "POSTER") return "Host"
                          if (r === "ADMIN") return "Admin"
                          return "User"
                        }).join(", ") || "User"}
                      </p>
                    </div>
                  </Link>

                  <Button
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 mt-2"
                    onClick={() => {
                      handleLogout()
                      setIsMenuOpen(false)
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  {/* Guest User Links */}
                  <div className="border-t border-gray-200 my-2"></div>
                  <Button
                    variant="outline"
                    className="w-full border-gray-300 hover:bg-gray-50"
                    onClick={() => {
                      router.push("/login")
                      setIsMenuOpen(false)
                    }}
                  >
                    Sign In
                  </Button>
                  <Button
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => {
                      router.push("/post-property")
                      setIsMenuOpen(false)
                    }}
                  >
                    Become a Host
                  </Button>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}

