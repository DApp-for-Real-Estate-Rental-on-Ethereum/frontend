"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [email, setEmail] = useState("nitixaj335@roratu.com")
  const [password, setPassword] = useState("Test123@")
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-white/20 shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8 space-y-2">
            <Link href="/" className="mb-4 transition-transform hover:scale-105">
              <Image src="/logo.svg" alt="DeRent5" width={140} height={48} className="h-14 w-auto drop-shadow-sm" priority />
            </Link>
            <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white tracking-tight">Welcome Back</h1>
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm">Sign in to manage your bookings and properties</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/50 dark:bg-slate-950/50 border-gray-200 dark:border-slate-800 focus:ring-teal-500 focus:border-teal-500 transition-all"
                placeholder="name@example.com"

                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-teal-600 hover:text-teal-700 hover:underline dark:text-teal-400"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/50 dark:bg-slate-950/50 border-gray-200 dark:border-slate-800 focus:ring-teal-500 focus:border-teal-500 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {successMessage && (
              <div className="flex items-start gap-3 p-3 bg-green-50/80 border border-green-100 text-green-700 rounded-lg text-sm dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{successMessage}</p>
                  <Link href="/verify" className="text-teal-700 dark:text-teal-400 hover:underline font-semibold mt-1 inline-block">
                    Verify account now &rarr;
                  </Link>
                </div>
              </div>
            )}

            {searchParams.get("verified") === "true" && (
              <div className="flex items-center gap-3 p-3 bg-green-50/80 border border-green-100 text-green-700 rounded-lg text-sm dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>Account verified! You may now sign in.</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-3 bg-red-50/80 border border-red-100 text-red-700 rounded-lg text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-medium shadow-lg shadow-teal-500/20 transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-gray-100 dark:border-white/10">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Don't have an account?{" "}
              <Link href="/signup" className="text-teal-600 hover:text-teal-700 font-semibold hover:underline dark:text-teal-400 transition-colors">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
