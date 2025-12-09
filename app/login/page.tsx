"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [email, setEmail] = useState("poster@example.com")
  const [password, setPassword] = useState("password123")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccessMessage("Registration successful! Please check your email to verify your account.")
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await login(email, password)
      // Refresh router to update all components with new auth state
      router.refresh()
      router.push("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const loginAsAdmin = async () => {
    setIsLoading(true)
    try {
      await login("admin@example.com", "admin123")
      router.push("/admin")
    } catch (err) {
      setError("Admin login failed")
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

          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Welcome to DeRent5</h1>
          <p className="text-center text-gray-600 mb-8">Sign in to your account or become a host</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                placeholder="••••••••"
                required
              />
              <div className="mt-2 text-right">
                <Link href="/forgot-password" className="text-sm text-teal-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            {successMessage && (
              <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                {successMessage}
                <div className="mt-2">
                  <Link href="/verify" className="text-teal-600 hover:underline font-medium">
                    Click here to verify your account
                  </Link>
                </div>
              </div>
            )}
            {searchParams.get("verified") === "true" && (
              <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                Account verified successfully! You can now sign in.
              </div>
            )}
            {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Demo Accounts</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              onClick={async () => {
                setIsLoading(true)
                try {
                  await login("poster@example.com", "password123")
                  router.push("/post-property")
                } catch (err) {
                  setError("Login failed")
                } finally {
                  setIsLoading(false)
                }
              }}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              disabled={isLoading}
            >
              Become a Host (Demo)
            </Button>
            <Button
              type="button"
              onClick={loginAsAdmin}
              variant="outline"
              className="w-full bg-transparent"
              disabled={isLoading}
            >
              Login as Admin (Demo)
            </Button>
          </div>

          <p className="text-center text-sm text-gray-600 mt-6">
            Don't have an account?{" "}
            <Link href="/signup" className="text-teal-600 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
