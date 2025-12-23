
"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/services/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, MapPin, Bed, Bath, User } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface Recommendation {
    property_id: string
    score: number
    daily_price: number
    city: string
    capacity: number
    bedrooms: number
    bathrooms: number
    title: string
}

export function RecommendedProperties() {
    const { user } = useAuth()
    const [recommendations, setRecommendations] = useState<Recommendation[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchRecs() {
            if (!user?.id) {
                setLoading(false)
                return
            }
            try {
                const tenantId = Number(user.id);
                const data = await apiClient.recommendations.getForTenant(tenantId, 3)
                if (data && data.recommendations) {
                    setRecommendations(data.recommendations)
                }
            } catch (err) {
                console.error("Failed to load recommendations", err)
            } finally {
                setLoading(false)
            }
        }
        fetchRecs()
    }, [user])

    if (loading) {
        return null; // Don't show anything while loading to avoid layout shift, or show skeleton
    }

    if (!user || recommendations.length === 0) {
        return null
    }

    return (
        <section className="container mx-auto px-4 py-12">
            <div className="text-center mb-10">
                <Badge variant="outline" className="mb-4 py-1 px-4 border-teal-200 bg-teal-50 text-teal-700 rounded-full">
                    <Sparkles className="w-3 h-3 mr-2 fill-teal-400 text-teal-600" />
                    AI-Powered
                </Badge>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
                    Recommended for You
                </h2>
                <p className="max-w-2xl mx-auto text-lg text-gray-600">
                    Based on your booking history, we think you'll love these properties.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {recommendations.map((rec) => (
                    <Card key={rec.property_id} className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300">
                        <div className="relative h-64 overflow-hidden">
                            <Image
                                src={`/houses_placeholder.png`} // Using user provided placeholder
                                alt={rec.title}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute top-4 left-4">
                                <Badge className="bg-white/90 text-teal-700 hover:bg-white backdrop-blur-sm shadow-sm border-0">
                                    {rec.score > 0.9 ? '99% Match' : `${Math.round(rec.score * 100)}% Match`}
                                </Badge>
                            </div>
                            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-bold text-teal-600">{rec.daily_price}</span>
                                    <span className="text-sm font-semibold text-gray-600">MAD / night</span>
                                </div>
                            </div>
                        </div>

                        <CardContent className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{rec.title}</h3>
                            <div className="flex items-center text-gray-500 text-sm mb-4">
                                <MapPin className="w-4 h-4 mr-1 text-teal-500" />
                                {rec.city}
                            </div>

                            <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-100">
                                <div className="flex flex-col items-center">
                                    <User className="w-5 h-5 text-gray-400 mb-1" />
                                    <span className="text-sm font-medium text-gray-700">{rec.capacity} Guests</span>
                                </div>
                                <div className="flex flex-col items-center border-l border-gray-100">
                                    <Bed className="w-5 h-5 text-gray-400 mb-1" />
                                    <span className="text-sm font-medium text-gray-700">{rec.bedrooms} Beds</span>
                                </div>
                                <div className="flex flex-col items-center border-l border-gray-100">
                                    <Bath className="w-5 h-5 text-gray-400 mb-1" />
                                    <span className="text-sm font-medium text-gray-700">{rec.bathrooms} Baths</span>
                                </div>
                            </div>

                            <Link href={`/property/${rec.property_id}`} passHref>
                                <Button className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white">
                                    View Details
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    )
}
