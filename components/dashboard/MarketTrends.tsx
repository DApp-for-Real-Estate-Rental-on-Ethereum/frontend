"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/services/api"
import { MarketTrendsResponse, CityTrendResponse, MarketInsight } from "@/lib/types"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Minus, Loader2, Sparkles, MapPin } from "lucide-react"
import { toast } from "sonner"

export function MarketTrends() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<MarketTrendsResponse | null>(null)
    const [selectedCity, setSelectedCity] = useState<string>("all")
    const [periodMonths, setPeriodMonths] = useState<number>(12)

    useEffect(() => {
        fetchTrends()
    }, [periodMonths])

    const fetchTrends = async () => {
        try {
            setLoading(true)
            const response = await apiClient.marketTrends.getAllCities(periodMonths)
            setData(response)
        } catch (error) {
            console.error("Failed to fetch market trends:", error)
            toast.error("Failed to load market trends")
        } finally {
            setLoading(false)
        }
    }

    const getTrendIcon = (direction: string) => {
        switch (direction) {
            case "RISING": return <TrendingUp className="w-5 h-5 text-green-500" />
            case "DECLINING": return <TrendingDown className="w-5 h-5 text-red-500" />
            default: return <Minus className="w-5 h-5 text-gray-500" />
        }
    }

    const getTrendColor = (direction: string) => {
        switch (direction) {
            case "RISING": return "text-green-600 bg-green-50 border-green-200"
            case "DECLINING": return "text-red-600 bg-red-50 border-red-200"
            default: return "text-gray-600 bg-gray-50 border-gray-200"
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!data || data.trends.length === 0) {
        return (
            <div className="text-center py-20 text-muted-foreground">
                No market trend data available.
            </div>
        )
    }

    const filteredTrends = selectedCity === "all"
        ? data.trends
        : data.trends.filter(t => t.city === selectedCity)

    // Aggregate data for the chart if showing all cities, otherwise show single city
    // For 'all', we might just show the top 3 cities for comparison 
    const citiesToShow = selectedCity === "all" ? data.trends.slice(0, 3) : filteredTrends

    // Transform data for Recharts: needs array of objects with common key (period)
    // We assume periods match across cities (they should if fetched together)
    // Base x-axis on the first city's data points
    const chartData = citiesToShow[0]?.data_points.map((dp, idx) => {
        const point: any = { period: dp.period }
        citiesToShow.forEach(city => {
            point[city.city] = city.data_points[idx]?.avg_price_mad || 0
        })
        return point
    }) || []

    // City Colors for chart
    const colors = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Market Dashboard</h2>
                    <p className="text-muted-foreground">Real-time rental market insights and forecasts.</p>
                </div>
                <div className="flex gap-4">
                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                        <SelectTrigger className="w-[180px] bg-white/50 border-gray-200 rounded-xl focus:ring-teal-500 transition-all">
                            <SelectValue placeholder="Select City" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-md border-gray-100 rounded-xl shadow-xl">
                            <SelectItem value="all" className="focus:bg-teal-50 focus:text-teal-700 cursor-pointer">All Cities</SelectItem>
                            {data.trends.map(t => (
                                <SelectItem key={t.city} value={t.city} className="focus:bg-teal-50 focus:text-teal-700 cursor-pointer">{t.city}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={periodMonths.toString()} onValueChange={(v) => setPeriodMonths(parseInt(v))}>
                        <SelectTrigger className="w-[180px] bg-white/50 border-gray-200 rounded-xl focus:ring-teal-500 transition-all">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-md border-gray-100 rounded-xl shadow-xl">
                            <SelectItem value="6" className="focus:bg-teal-50 focus:text-teal-700 cursor-pointer">Last 6 Months</SelectItem>
                            <SelectItem value="12" className="focus:bg-teal-50 focus:text-teal-700 cursor-pointer">Last 12 Months</SelectItem>
                            <SelectItem value="24" className="focus:bg-teal-50 focus:text-teal-700 cursor-pointer">Last 24 Months</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTrends.map(trend => (
                    <Card key={trend.city} className="bg-white/80 backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-700 group-hover:text-teal-700 transition-colors">
                                <div className="p-2 bg-teal-50 rounded-lg group-hover:bg-teal-100 transition-colors">
                                    <MapPin className="w-4 h-4 text-teal-600" />
                                </div>
                                {trend.city}
                            </CardTitle>
                            {getTrendIcon(trend.trend_direction)}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900 mt-2">{trend.data_points[trend.data_points.length - 1]?.avg_price_mad.toFixed(0)} MAD</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                <span className={trend.price_change_percent > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                    {trend.price_change_percent > 0 ? "+" : ""}{trend.price_change_percent}%
                                </span>
                                <span className="text-gray-400 ml-1">last {periodMonths} months</span>
                            </p>
                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 uppercase font-semibold">Occupancy</span>
                                    <span className="font-semibold text-gray-700">{(trend.avg_occupancy * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-xs text-gray-500 uppercase font-semibold">Trend</span>
                                    <span className="font-semibold text-gray-700">{trend.trend_direction.toLowerCase().replace('_', ' ')}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 bg-white/80 backdrop-blur-md border border-white/20 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-900">Price Evolution (MAD)</CardTitle>
                        <CardDescription className="text-gray-500">Average daily rental rates over the selected period</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Legend />
                                    {citiesToShow.map((city, index) => (
                                        <Line
                                            key={city.city}
                                            type="monotone"
                                            dataKey={city.city}
                                            stroke={colors[index % colors.length]}
                                            strokeWidth={2}
                                            dot={{ r: 4 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-md border border-white/20 shadow-xl h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <Sparkles className="w-5 h-5 text-indigo-600" />
                            </div>
                            AI Insights
                        </CardTitle>
                        <CardDescription className="text-gray-500">Smart forecasts & market patterns</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {data.insights.filter(i => selectedCity === 'all' || i.city === selectedCity).length === 0 ? (
                            <p className="text-sm text-muted-foreground">No insights available for this selection.</p>
                        ) : (
                            data.insights
                                .filter(i => selectedCity === 'all' || i.city === selectedCity)
                                .slice(0, 5)
                                .map((insight, idx) => (
                                    <div key={idx} className="p-3 bg-muted/50 rounded-lg space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold uppercase text-indigo-600">{insight.city}</span>
                                            <Badge variant="secondary" className="text-[10px] h-5">{insight.insight_type.replace('_FORECAST', '')}</Badge>
                                        </div>
                                        <p className="text-sm font-medium">{insight.message}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="h-1.5 flex-1 bg-indigo-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500" style={{ width: `${insight.confidence * 100}%` }} />
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">{(insight.confidence * 100).toFixed(0)}% conf.</span>
                                        </div>
                                    </div>
                                ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
