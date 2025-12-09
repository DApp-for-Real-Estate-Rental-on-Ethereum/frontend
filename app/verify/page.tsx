"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { apiClient } from "@/lib/services/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle, AlertTriangle, Mail } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailFromQuery = searchParams?.get("email") || ""

  const [email, setEmail] = useState(emailFromQuery)
  const [verificationCode, setVerificationCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setResendSuccess(false)

    if (!email || !verificationCode) {
      setError("Please enter your email and verification code")
      return
    }

    setIsLoading(true)

    try {
      await apiClient.auth.verify(email, verificationCode)
      setSuccess(true)
      setTimeout(() => {
        router.push("/login?verified=true")
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Verification failed. Please check your code and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      setError("Please enter your email address")
      return
    }

    setError("")
    setResendSuccess(false)
    setIsResending(true)

    try {
      await apiClient.auth.resendVerificationCode(email)
      setResendSuccess(true)
    } catch (err: any) {
      setError(err.message || "Failed to resend verification code. Please try again.")
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

          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Verify Your Account</h1>
          <p className="text-center text-gray-600 mb-8">
            Enter the verification code sent to your email address
          </p>

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <p className="text-green-700">Account verified successfully! Redirecting to login...</p>
              </div>
            </div>
          )}

          {resendSuccess && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-blue-600 mr-2" />
                <p className="text-blue-700">Verification code has been resent to your email!</p>
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

          <form onSubmit={handleVerify} className="space-y-4">
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
              <Label htmlFor="verificationCode" className="text-sm font-medium text-gray-700">
                Verification Code
              </Label>
              <Input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit code"
                maxLength={6}
                required
                className="mt-2 text-center text-2xl font-mono tracking-widest"
              />
              <p className="text-xs text-gray-500 mt-2">
                Check your email for the verification code
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              disabled={isLoading || success}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Account"
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <Button
              type="button"
              onClick={handleResend}
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
                  Resend Verification Code
                </>
              )}
            </Button>

            <p className="text-center text-sm text-gray-600">
              Already verified?{" "}
              <Link href="/login" className="text-teal-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

