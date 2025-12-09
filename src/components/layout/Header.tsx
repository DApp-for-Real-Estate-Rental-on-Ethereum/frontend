"use client"

import { LogOut, Menu, X } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useNavigate } from "react-router-dom"

export function Header() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const isAdmin = user?.roles.includes("ADMIN")
  const isPoster = user?.roles.includes("POSTER")

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.svg" alt="DeRent5" className="h-8 w-auto" />
            <span className="text-xl font-semibold text-gray-900 hidden sm:inline">DeRent5</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {isAuthenticated ? (
              <>
                <button onClick={() => navigate("/browse")} className="text-gray-700 hover:text-gray-900 font-medium">
                  Browse
                </button>

                {isPoster && (
                  <button
                    onClick={() => navigate("/my-properties")}
                    className="text-gray-700 hover:text-gray-900 font-medium"
                  >
                    My Properties
                  </button>
                )}

                {isPoster && (
                  <button
                    onClick={() => navigate("/create-property")}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 font-medium"
                  >
                    List Property
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={() => navigate("/admin/dashboard")}
                    className="text-gray-700 hover:text-gray-900 font-medium"
                  >
                    Admin Panel
                  </button>
                )}

                <button onClick={() => navigate("/profile")} className="text-gray-700 hover:text-gray-900 font-medium">
                  Profile
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-gray-700 hover:text-red-600 font-medium"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate("/login")} className="text-gray-700 hover:text-gray-900 font-medium">
                  Login
                </button>
                <button
                  onClick={() => navigate("/signup")}
                  className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 font-medium"
                >
                  Sign Up
                </button>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden pb-4 border-t border-gray-200">
            <div className="flex flex-col gap-3 pt-4">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => {
                      navigate("/browse")
                      setIsMenuOpen(false)
                    }}
                    className="block text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    Browse
                  </button>

                  {isPoster && (
                    <>
                      <button
                        onClick={() => {
                          navigate("/my-properties")
                          setIsMenuOpen(false)
                        }}
                        className="block text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        My Properties
                      </button>
                      <button
                        onClick={() => {
                          navigate("/create-property")
                          setIsMenuOpen(false)
                        }}
                        className="block text-left px-4 py-2 bg-teal-600 text-white rounded"
                      >
                        List Property
                      </button>
                    </>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => {
                        navigate("/admin/dashboard")
                        setIsMenuOpen(false)
                      }}
                      className="block text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      Admin Panel
                    </button>
                  )}

                  <button
                    onClick={() => {
                      navigate("/profile")
                      setIsMenuOpen(false)
                    }}
                    className="block text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      handleLogout()
                      setIsMenuOpen(false)
                    }}
                    className="block text-left px-4 py-2 text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      navigate("/login")
                      setIsMenuOpen(false)
                    }}
                    className="block text-left px-4 py-2 text-gray-700"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      navigate("/signup")
                      setIsMenuOpen(false)
                    }}
                    className="block text-left px-4 py-2 bg-teal-600 text-white rounded"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
