"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "@/hooks/useForm"
import { apiClient } from "@/services/api"
import { Mail, Lock, AlertCircle, Loader } from "lucide-react"

interface LoginFormValues {
  email: string
  password: string
}

export function LoginForm() {
  const navigate = useNavigate()
  const [apiError, setApiError] = useState<string | null>(null)
  const form = useForm<LoginFormValues>({
    email: "",
    password: "",
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      setApiError(null)

      // TODO: Replace with actual login API endpoint
      // For now, store mock user data
      const mockUser = {
        id: "1",
        email: values.email,
        firstName: "John",
        lastName: "Doe",
        roles: ["POSTER"],
      }

      apiClient.auth.setAuth("mock_token_" + Date.now(), mockUser)
      navigate("/browse")
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Login failed")
    }
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {apiError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-red-800 text-sm">{apiError}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="email"
            name="email"
            value={form.values.email}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            placeholder="your@email.com"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="password"
            name="password"
            value={form.values.password}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            placeholder="••••••••"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={form.loading}
        className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {form.loading && <Loader size={18} className="animate-spin" />}
        {form.loading ? "Logging in..." : "Login"}
      </button>

      <p className="text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <button type="button" onClick={() => navigate("/signup")} className="text-teal-600 hover:underline font-medium">
          Sign Up
        </button>
      </p>

      <p className="text-center text-sm text-gray-600">
        <button
          type="button"
          onClick={() => navigate("/forgot-password")}
          className="text-gray-600 hover:text-teal-600"
        >
          Forgot password?
        </button>
      </p>
    </form>
  )
}
