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
import { Eye, EyeOff, Loader2, Mail, CheckCircle, AlertTriangle } from "lucide-react"
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
      await apiClient.auth.verifyResetCode(email, resetCode)
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
      await apiClient.auth.resetPasswordWithCode(email, resetCode, newPassword)
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <Image src="/logo.svg" alt="DeRent5" width={120} height={40} className="h-12 w-auto" />
          </div>

          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Reset Password</h1>
          <p className="text-center text-gray-600 mb-8">
            {step === "email" && "Enter your email address and we'll send you a reset code."}
            {step === "code" && "Enter the reset code sent to your email."}
            {step === "password" && "Enter your new password."}
          </p>

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <p className="text-green-700">{successMessage}</p>
              </div>
            </div>
          )}

          {resendSuccess && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-blue-600 mr-2" />
                <p className="text-blue-700">Reset code has been resent to your email!</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Step 1: Email */}
          {step === "email" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="mt-2"
                />
              </div>

              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={isLoading}>
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
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="resetCode" className="text-sm font-medium text-gray-700">
                  Reset Code
                </Label>
                <Input
                  id="resetCode"
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  required
                  className="mt-2 text-center text-2xl font-mono tracking-widest"
                />
                <p className="text-xs text-gray-500 mt-2">Check your email for the reset code</p>
              </div>

              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={isLoading}>
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
                className="w-full"
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
              <div>
                <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                  New Password
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Must be 8-20 characters with uppercase, lowercase, number, and special character
                </p>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm Password
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={isLoading}>
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

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-teal-600 hover:underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
