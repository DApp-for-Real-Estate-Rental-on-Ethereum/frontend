"use client"

import { useState } from "react"
import { Calendar, Building2, AlertTriangle, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface HostNavBarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

export function HostNavBar({ activeSection, onSectionChange }: HostNavBarProps) {
  const router = useRouter()
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const sections = [
    {
      id: "bookings",
      label: "Bookings",
      icon: Calendar,
      subSections: [
        { id: "paid", label: "Paid Bookings" },
        { id: "negotiations", label: "Pending Approvals" },
        { id: "current", label: "Current Bookings" },
        { id: "checkout-requests", label: "Checkout Requests" },
        { id: "calendar", label: "Calendar" },
      ],
    },
    {
      id: "properties",
      label: "Properties",
      icon: Building2,
      subSections: [
        { id: "my-properties", label: "All Properties" },
        { id: "draft", label: "Draft" },
        { id: "pending-approval", label: "Pending Approval" },
        { id: "approved", label: "Approved" },
        { id: "disapproved", label: "Disapproved" },
        { id: "suspended", label: "Suspended" },
        { id: "hidden", label: "Hidden" },
        { id: "add-property", label: "Add New Property" },
      ],
    },
    {
      id: "reclamations",
      label: "Reclamations",
      icon: AlertTriangle,
      subSections: [
        { id: "my-complaints", label: "My Complaints" },
        { id: "complaints-against-me", label: "Complaints Against Me" },
      ],
    },
  ]

  const handleSectionClick = (sectionId: string) => {
    if (openDropdown === sectionId) {
      setOpenDropdown(null)
    } else {
      setOpenDropdown(sectionId)
    }
  }

  const handleSubSectionClick = (subSectionId: string) => {
    // If "Add New Property", redirect to /post-property page
    if (subSectionId === "add-property") {
      router.push("/post-property")
      setOpenDropdown(null)
      return
    }
    onSectionChange(subSectionId)
    setOpenDropdown(null)
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6 overflow-visible">
      <div className="flex items-stretch divide-x divide-gray-200">
        {sections.map((section) => {
          const Icon = section.icon
          const isActive = section.subSections.some((sub) => sub.id === activeSection)
          const isOpen = openDropdown === section.id

          return (
            <div key={section.id} className="flex-1 relative overflow-visible">
              <button
                onClick={() => handleSectionClick(section.id)}
                className={`w-full px-4 py-3 text-center transition-colors ${
                  isActive
                    ? "bg-teal-600 text-white"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-600"}`} />
                  <span className={`text-xs font-semibold ${isActive ? "text-white" : "text-gray-900"}`}>
                    {section.label}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""} ${
                      isActive ? "text-white" : "text-gray-600"
                    }`}
                  />
                </div>
              </button>

              {/* Dropdown Menu */}
              {isOpen && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-xl z-[100] rounded-b-lg mt-1">
                  <div className="py-1">
                    {section.subSections.map((subSection) => (
                      <button
                        key={subSection.id}
                        onClick={() => handleSubSectionClick(subSection.id)}
                        className={`w-full px-4 py-2.5 text-left text-xs transition-colors ${
                          activeSection === subSection.id
                            ? "bg-teal-50 text-teal-700 font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {subSection.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

