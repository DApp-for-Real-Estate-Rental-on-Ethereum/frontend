"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiClient } from "@/lib/services/api"
import { Loader2, AlertCircle, Calendar } from "lucide-react"

interface APIError extends Error {
  errorData?: {
    message?: string
    error?: string
    raw?: string
  }
  responseText?: string
  status?: number
}

export default function SignUpPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    birthday: "",
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    // Backend validation requirements:
    // Password must be 8-20 characters, include uppercase, lowercase, number, and special character
    const passwordRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{8,20}$/
    if (!passwordRegex.test(formData.password)) {
      setError(
        "Password must be 8-20 characters long and include at least one uppercase letter, " +
        "one lowercase letter, one number, and one special character (@#$%^&+=!)"
      )
      return
    }

    // Phone number validation (10-15 digits)
    const phoneRegex = /^\d{10,15}$/
    const phoneDigits = formData.phoneNumber.replace(/\D/g, "") // Remove non-digits
    if (!phoneRegex.test(phoneDigits)) {
      setError("Phone number must be 10 to 15 digits")
      return
    }

    // Birthday validation (must be 18+ years old)
    if (formData.birthday) {
      const birthday = new Date(formData.birthday)
      const today = new Date()
      let age = today.getFullYear() - birthday.getFullYear()
      const monthDiff = today.getMonth() - birthday.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
        age = age - 1
      }
      if (age < 18) {
        setError("You must be at least 18 years old to register")
        return
      }
    }

    if (!formData.birthday) {
      setError("Birthday is required")
      return
    }

    setIsLoading(true)

    try {
      // Call real API
      await apiClient.auth.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        birthday: formData.birthday, // Already in YYYY-MM-DD format from date input
        phoneNumber: phoneDigits, // Send only digits
      })

      // After successful registration, redirect to verify page with email
      router.push(`/verify?email=${encodeURIComponent(formData.email)}`)
    } catch (err: any) {
      // Handle API errors
      let errorMessage = "Registration failed. Please try again."

      if (err instanceof Error) {
        errorMessage = err.message

        // Check if it's a connection error
        if (err.message.includes("Backend server is not available") ||
          err.message.includes("Cannot connect to backend")) {
          errorMessage =
            "Cannot connect to the server. Please make sure the backend service is running. " +
            "If you're in development mode, you can use mock data by setting NEXT_PUBLIC_USE_MOCK_API=true"
        }

        // If we have errorData from the API, use it
        const apiError = err as APIError
        if (apiError.errorData) {
          console.error("Full error details:", {
            errorData: apiError.errorData,
            responseText: apiError.responseText,
            status: apiError.status
          })
          // ErrorResponse format: { timestamp, status, error, message, path }
          if (apiError.errorData.message) {
            errorMessage = apiError.errorData.message
          } else if (apiError.errorData.error) {
            errorMessage = apiError.errorData.error
          } else if (apiError.errorData.raw) {
            errorMessage = apiError.errorData.raw
          }
        }

        // If we have responseText, log it for debugging
        if (apiError.responseText) {
          console.error("Raw response text:", apiError.responseText)
        }
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (typeof err === "string") {
        errorMessage = err
      }

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4 pb-12">
      <Card className="w-full max-w-lg backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-white/20 shadow-2xl overflow-hidden mt-8">
        <div className="p-8">
          <div className="flex flex-col items-center mb-6 space-y-2">
            <Link href="/" className="mb-2 transition-transform hover:scale-105">
              <Image src="/logo.svg" alt="DeRent5" width={140} height={48} className="h-14 w-auto drop-shadow-sm" priority />
            </Link>
            <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white tracking-tight">Create an Account</h1>
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm">Join DeRent5 and start your journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="bg-white/50 dark:bg-slate-950/50 border-gray-200 dark:border-slate-800 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="John"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="bg-white/50 dark:bg-slate-950/50 border-gray-200 dark:border-slate-800 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="bg-white/50 dark:bg-slate-950/50 border-gray-200 dark:border-slate-800 focus:ring-teal-500 focus:border-teal-500"
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="bg-white/50 dark:bg-slate-950/50 border-gray-200 dark:border-slate-800 focus:ring-teal-500 focus:border-teal-500"
                placeholder="+212 6XX XXX XXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthday">Birthday</Label>
              <div className="relative">
                <Input
                  id="birthday"
                  type="date"
                  name="birthday"
                  value={formData.birthday}
                  onChange={handleInputChange}
                  className="bg-white/50 dark:bg-slate-950/50 border-gray-200 dark:border-slate-800 focus:ring-teal-500 focus:border-teal-500 pl-10"
                />
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="bg-white/50 dark:bg-slate-950/50 border-gray-200 dark:border-slate-800 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="bg-white/50 dark:bg-slate-950/50 border-gray-200 dark:border-slate-800 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Password must be 8-20 chars, with uppercase, lowercase, number & symbol.
            </p>

            {error && (
              <div className="flex items-center gap-3 p-3 bg-red-50/80 border border-red-100 text-red-700 rounded-lg text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-medium shadow-lg shadow-teal-500/20 transition-all duration-200 mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-gray-100 dark:border-white/10">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{" "}
              <Link href="/login" className="text-teal-600 hover:text-teal-700 font-semibold hover:underline dark:text-teal-400 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
