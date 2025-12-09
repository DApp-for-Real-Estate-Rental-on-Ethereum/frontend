"use client"

import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { LoginForm } from "@/components/auth/LoginForm"

export function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate("/browse")
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <img src="/logo.svg" alt="DeRent5" className="h-10 w-auto mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-600 mt-2">Sign in to your account</p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
