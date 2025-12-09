"use client"

import { useState } from "react"
import { 
  Building2, 
  Users, 
  Calendar, 
  BarChart3,
  AlertTriangle,
  FileText,
  ChevronDown 
} from "lucide-react"

interface AdminNavBarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

export function AdminNavBar({ activeSection, onSectionChange }: AdminNavBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const sections = [
    {
      id: "properties",
      label: "Properties",
      icon: Building2,
      subSections: [
        { id: "all-properties", label: "All Properties" },
        { id: "pending-approval", label: "Pending Approval" },
        { id: "approved", label: "Approved" },
        { id: "suspended", label: "Suspended" },
        { id: "disapproved", label: "Disapproved" },
      ],
    },
    {
      id: "users",
      label: "Users",
      icon: Users,
      subSections: [
        { id: "all-users", label: "All Users" },
        { id: "admins", label: "Admins" },
        { id: "hosts", label: "Hosts" },
        { id: "tenants", label: "Tenants" },
        { id: "disabled", label: "Disabled Accounts" },
      ],
    },
    {
      id: "bookings",
      label: "Bookings",
      icon: Calendar,
      subSections: [
        { id: "all-bookings", label: "All Bookings" },
        { id: "pending-payment", label: "Pending Payment" },
        { id: "active", label: "Active Bookings" },
        { id: "completed", label: "Completed" },
        { id: "cancelled", label: "Cancelled" },
      ],
    },
    {
      id: "statistics",
      label: "Statistics",
      icon: BarChart3,
      subSections: [
        { id: "overview", label: "Overview" },
        { id: "revenue", label: "Revenue" },
        { id: "reports", label: "Reports" },
      ],
    },
    {
      id: "reclamations",
      label: "Reclamations",
      icon: FileText,
      subSections: [
        { id: "all-reclamations", label: "All Reclamations" },
        { id: "open-reclamations", label: "Open" },
        { id: "in-review-reclamations", label: "In Review" },
        { id: "resolved-reclamations", label: "Resolved" },
        { id: "rejected-reclamations", label: "Rejected" },
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
                className={`w-full px-3 py-3 text-center transition-colors ${
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

