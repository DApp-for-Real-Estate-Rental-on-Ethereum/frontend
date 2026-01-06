"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2, Mail, CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react"
import { apiClient } from "@/lib/services/api"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<"email" | "code" | "password">("email")
  const [email, setEmail] = useState("")
  const [resetCode, setResetCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [resendSuccess, setResendSuccess] = useState(false)

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    setIsLoading(true)

    try {
      await apiClient.auth.forgotPassword(email)
      setSuccessMessage("Password reset code has been sent to your email. Please check your inbox.")
      setStep("code")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send password reset code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await apiClient.auth.verifyResetToken(resetCode)
      setStep("password")
      setSuccessMessage("Code verified successfully! Now enter your new password.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid reset code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{8,20}$/
    if (!passwordRegex.test(newPassword)) {
      setError(
        "Password must be 8-20 characters long, include at least one uppercase letter, one lowercase letter, one number, and one special character."
      )
      return
    }

    setIsLoading(true)

    try {
      await apiClient.auth.resetPassword(resetCode, newPassword)
      setSuccessMessage("Password reset successfully! Redirecting to login...")
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!email) {
      setError("Please enter your email address")
      return
    }

    setError("")
    setResendSuccess(false)
    setIsResending(true)

    try {
      await apiClient.auth.forgotPassword(email)
      setResendSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend reset code. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-white/20 shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center mb-6 space-y-2">
            <Link href="/" className="mb-2 transition-transform hover:scale-105">
              <Image src="/logo.svg" alt="DeRent5" width={140} height={48} className="h-14 w-auto drop-shadow-sm" priority />
            </Link>
            <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white tracking-tight">Reset Password</h1>
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
              {step === "email" && "Enter your email address to receive a code."}
              {step === "code" && "Enter the 6-digit code sent to your email."}
              {step === "password" && "Secure your account with a new password."}
            </p>
          </div>

          {successMessage && !resendSuccess && (
            <div className="mb-6 p-4 bg-green-50/80 border border-green-100 text-green-700 rounded-lg dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium">{successMessage}</p>
              </div>
            </div>
          )}

          {resendSuccess && (
            <div className="mb-6 p-4 bg-blue-50/80 border border-blue-100 text-blue-700 rounded-lg dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
              <div className="flex items-start">
                <Mail className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium">Reset code has been resent to your email!</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50/80 border border-red-100 text-red-700 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Step 1: Email */}
          {step === "email" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="bg-white/50 dark:bg-slate-950/50 border-gray-200 dark:border-slate-800 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-medium shadow-lg shadow-teal-500/20 transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Code"
                )}
              </Button>
            </form>
          )}

          {/* Step 2: Code */}
          {step === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-display">Email Address</Label>
                <Input
                  id="email-display"
                  type="email"
                  value={email}
                  disabled
                  className="bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resetCode">Reset Code</Label>
                <Input
                  id="resetCode"
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  className="text-center text-3xl font-mono tracking-widest bg-white/50 dark:bg-slate-950/50 border-gray-200 dark:border-slate-800 focus:ring-teal-500 focus:border-teal-500 py-3"
                />
                <p className="text-xs text-gray-500 text-center">Check your inbox for the 6-digit code</p>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-medium shadow-lg shadow-teal-500/20 transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>

              <Button
                type="button"
                onClick={handleResendCode}
                variant="outline"
                className="w-full border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800 dark:border-teal-800 dark:text-teal-400 dark:hover:bg-teal-900/30"
                disabled={isResending || !email}
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Resend Code
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === "password" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pr-10 bg-white/50 dark:bg-slate-950/50 border-gray-200 dark:border-slate-800 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Must be 8-20 characters with uppercase, lowercase, number, and special character
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pr-10 bg-white/50 dark:bg-slate-950/50 border-gray-200 dark:border-slate-800 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-medium shadow-lg shadow-teal-500/20 transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          )}

          <div className="mt-8 text-center pt-6 border-t border-gray-100 dark:border-white/10">
            <Link href="/login" className="inline-flex items-center text-sm text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
