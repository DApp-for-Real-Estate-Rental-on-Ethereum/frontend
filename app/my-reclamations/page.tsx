"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useRouter } from "next/navigation"
import { HostReclamations } from "@/components/host-dashboard/HostReclamations"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function MyReclamationsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"my-complaints" | "complaints-against-me">("my-complaints")

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            My Reclamations
          </h1>
          <p className="text-gray-600">Manage your reclamations and view complaints against you</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b border-gray-200">
          <Button
            variant={activeTab === "my-complaints" ? "default" : "ghost"}
            onClick={() => setActiveTab("my-complaints")}
            className={`rounded-b-none ${
              activeTab === "my-complaints"
                ? "bg-teal-600 text-white hover:bg-teal-700"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            My Complaints
          </Button>
          <Button
            variant={activeTab === "complaints-against-me" ? "default" : "ghost"}
            onClick={() => setActiveTab("complaints-against-me")}
            className={`rounded-b-none ${
              activeTab === "complaints-against-me"
                ? "bg-teal-600 text-white hover:bg-teal-700"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Complaints Against Me
          </Button>
        </div>

        {/* Content */}
        <HostReclamations ownerId={user.id} filter={activeTab} />
      </div>
    </div>
  )
}

