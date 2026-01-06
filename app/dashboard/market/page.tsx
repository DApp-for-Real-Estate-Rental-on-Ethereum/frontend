import { MarketTrends } from "@/components/dashboard/MarketTrends"

export default function MarketDashboardPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 py-10">
            <div className="container mx-auto px-4">
                <MarketTrends />
            </div>
        </div>
    )
}
