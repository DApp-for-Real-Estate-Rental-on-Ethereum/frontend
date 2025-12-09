"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { apiClient } from "@/lib/services/api"

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
        if (err.errorData) {
          console.error("Full error details:", {
            errorData: err.errorData,
            responseText: err.responseText,
            status: err.status
          })
          // ErrorResponse format: { timestamp, status, error, message, path }
          if (err.errorData.message) {
            errorMessage = err.errorData.message
          } else if (err.errorData.error) {
            errorMessage = err.errorData.error
          } else if (err.errorData.raw) {
            errorMessage = err.errorData.raw
          }
        }
        
        // If we have responseText, log it for debugging
        if (err.responseText) {
          console.error("Raw response text:", err.responseText)
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <Image src="/logo.svg" alt="DeRent5" width={120} height={40} className="h-12 w-auto" />
          </div>

          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Create Your Account</h1>
          <p className="text-center text-gray-600 mb-8">Join DeRent5 and start your journey</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                  placeholder="John"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                placeholder="+212 6XX XXX XXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Birthday</label>
              <input
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-teal-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}

