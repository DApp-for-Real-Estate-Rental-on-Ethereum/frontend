"use client"

import type React from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { AuthContext } from "@/hooks/useAuth"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { LoginPage } from "@/views/LoginPage"
import { BrowsePage } from "@/views/BrowsePage"
import { PropertyDetailPage } from "@/views/PropertyDetailPage"
import { AdminDashboard } from "@/views/admin/AdminDashboard"

function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode
  requiredRole?: string
}) {
  const { isAuthenticated, hasRole, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  if (requiredRole && !hasRole(requiredRole as any)) {
    return <Navigate to="/" />
  }

  return <>{children}</>
}

function AppContent() {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      <div className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<BrowsePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/property/:id" element={<PropertyDetailPage />} />

            {/* Protected Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </AuthContext.Provider>
  )
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}
