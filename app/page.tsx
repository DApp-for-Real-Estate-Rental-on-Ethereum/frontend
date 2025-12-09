"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { apiClient } from "@/lib/services/api"
import type { Property } from "@/lib/types"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, MapPin, Star, DollarSign, Users, Layers, Leaf, Shield, Target } from "lucide-react"

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isFetching, setIsFetching] = useState(true)

  const getPropertyImage = (property: Property) => {
    if (!property.propertyImages || property.propertyImages.length === 0) {
      return null
    }
    const coverImage = property.propertyImages.find((img) => img.cover)
    return coverImage ? coverImage.url : property.propertyImages[0].url
  }

  const getImageUrl = (url: string | null | undefined) => {
    if (!url) return "/placeholder.jpg"
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url
    }
    if (url.startsWith("/uploads")) {
      return `http://localhost:8081${url}`
    }
    return url
  }

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setIsFetching(true)
        const data = await apiClient.properties.getAll()
        const approvedProperties = data.filter((p) => p.status === "APPROVED")
        setProperties(approvedProperties)
        setFilteredProperties(approvedProperties)
      } catch (error) {
        setProperties([])
        setFilteredProperties([])
      } finally {
        setIsFetching(false)
      }
    }

    fetchProperties()
  }, [])

  useEffect(() => {
    let filtered = [...properties]

    if (searchTerm) {
      filtered = filtered.filter(
        (property) =>
          property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.address.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.address.country.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }
    setFilteredProperties(filtered)
  }, [searchTerm, properties])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="bg-background py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
              Redefining Modern Living
            </h1>
            <div className="h-1 w-20 bg-primary mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative group">
              <div className="relative h-[500px] w-full rounded-3xl overflow-hidden shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]">
                <Image
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600"
                  alt="Modern Living Space"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-black/10" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {[
                { icon: DollarSign, title: "Optimized Pricing", desc: "Experience luxury living without the premium markup." },
                { icon: Users, title: "Vibrant Community", desc: "Connect with like-minded individuals in curated spaces." },
                { icon: Leaf, title: "Sustainable Living", desc: "Eco-friendly homes designed for a greener future." },
                { icon: Shield, title: "Secure & Private", desc: "Your safety and privacy are our top priorities." },
                { icon: Layers, title: "Hassle-Free Management", desc: "We handle maintenance so you can focus on living." },
                { icon: Target, title: "Flexible Terms", desc: "Lease structures enabling true freedom." }
              ].map((feature, idx) => (
                <div key={idx} className="flex flex-col items-center text-center p-6 rounded-2xl bg-card border hover:shadow-lg transition-all duration-300">
                  <div className="p-4 bg-primary/10 rounded-full mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="properties-section" className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 bg-secondary/30">
        {isFetching ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No properties currently available.</p>
          </div>
        ) : (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-4">Curated Residences</h2>
                <p className="text-muted-foreground max-w-2xl">
                  Explore our hand-picked selection of premium properties waiting to become your new home.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProperties.map((property) => (
                <Link href={`/property/${property.id}`} key={property.id} className="block group h-full">
                  <Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 border bg-card">
                    <div className="relative h-72 overflow-hidden">
                      <Image
                        src={getImageUrl(getPropertyImage(property))}
                        alt={property.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {user && property.status && (
                        <div className="absolute top-4 right-4">
                          <Badge variant="secondary" className="backdrop-blur-md bg-white/90 text-primary font-medium px-3 py-1">
                            {property.status}
                          </Badge>
                        </div>
                      )}
                      <button
                        className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full p-2.5 hover:bg-white hover:text-red-500 transition-colors shadow-sm"
                        onClick={(e) => {
                          e.preventDefault()
                          // Favorite logic here
                        }}
                      >
                        <Heart className="w-5 h-5 transition-colors" />
                      </button>
                    </div>

                    <div className="p-6">
                      <div className="mb-4">
                        <h3 className="font-bold text-xl mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                          {property.title}
                        </h3>
                        <div className="flex items-center text-muted-foreground text-sm">
                          <MapPin className="w-4 h-4 mr-2 text-primary" />
                          <span className="line-clamp-1">
                            {property.address.city}, {property.address.country}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-6 pb-6 border-b border-border">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-primary">
                              {property.dailyPrice?.toFixed(4) || property.price?.toFixed(4) || "N/A"}
                            </span>
                            <span className="text-sm text-muted-foreground font-medium">ETH / day</span>
                          </div>
                          {property.depositAmount && property.depositAmount > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Deposit: {property.depositAmount.toFixed(4)} ETH
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 bg-yellow-400/10 px-3 py-1.5 rounded-full">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-semibold">4.8</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{property.capacity} Guests</span>
                        </div>
                        {property.numberOfBedrooms && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{property.numberOfBedrooms}</span> Beds
                          </div>
                        )}
                        {property.numberOfBathrooms && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{property.numberOfBathrooms}</span> Baths
                          </div>
                        )}
                      </div>

                      {property.amenities && property.amenities.length > 0 && (
                        <div className="mt-6 flex flex-wrap gap-2">
                          {property.amenities.slice(0, 3).map((a) => (
                            <Badge key={a.id} variant="outline" className="text-xs font-normal bg-secondary/50 border-0">
                              {a.name}
                            </Badge>
                          ))}
                          {property.amenities.length > 3 && (
                            <Badge variant="outline" className="text-xs font-normal">
                              +{property.amenities.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-6 mt-12">
                <div className="relative h-64 rounded-2xl overflow-hidden shadow-lg">
                  <Image
                    src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300"
                    alt="Interior Design"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-end p-6">
                    <span className="text-white font-semibold">Premium Interiors</span>
                  </div>
                </div>
                <div className="relative h-48 rounded-2xl overflow-hidden shadow-lg">
                  <Image
                    src="https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=400&h=300"
                    alt="Clean Spaces"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="space-y-6">
                <div className="relative h-48 rounded-2xl overflow-hidden shadow-lg">
                  <Image
                    src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300"
                    alt="Guaranteed Quality"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="relative h-64 rounded-2xl overflow-hidden shadow-lg">
                  <Image
                    src="https://images.unsplash.com/photo-1512918760383-eda2723ad6e1?w=400&h=300"
                    alt="Lifestyle"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-primary/20 hover:bg-primary/10 transition-colors" />
                </div>
              </div>
            </div>

            <div className="lg:pl-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                Flexible Living, <br />
                <span className="text-primary">Uncompromised Quality.</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Whether you need a short-term sanctuary or a long-term residence, we adapt to your timeline.
                Our platform eliminates the complexities of traditional renting, offering streamlined verification,
                secure crypto payments, and a curated network of premium properties.
              </p>
              <Button
                size="lg"
                onClick={() => {
                  const element = document.getElementById('properties-section')
                  element?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="rounded-full px-8 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Find Your Home
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-secondary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative bg-card p-10 rounded-3xl shadow-sm border">
              <div className="absolute top-8 left-8 text-8xl text-primary/10 font-serif leading-none">"</div>
              <blockquote className="relative z-10">
                <p className="text-xl text-foreground/80 leading-relaxed mb-8 italic">
                  I was skeptical about using a crypto-based rental platform, but DeRent5 made it effortless.
                  The transparency in pricing and the quality of the verified listings exceeded my expectations.
                  It's not just renting; it's a new standard of living.
                </p>
                <footer className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg">
                    SE
                  </div>
                  <div>
                    <cite className="not-italic font-bold text-foreground block">Salma Essalhi</cite>
                    <span className="text-sm text-primary font-medium">Verified Tenant</span>
                  </div>
                </footer>
              </blockquote>
            </div>

            <div className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&h=600"
                alt="Luxury Exterior"
                fill
                className="object-cover"
              />
              <div className="absolute bottom-8 left-8 right-8">
                <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-lg">
                  <h3 className="text-2xl font-cursive text-primary text-center">
                    Welcome Home
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-foreground text-background py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <Image src="/logo1.svg" alt="DeRent5" width={120} height={40} className="mb-6 invert opacity-90" />
              <p className="text-muted-foreground text-sm">
                Next-generation rental management powered by blockchain transparency and modern design.
              </p>
            </div>

            {[
              { title: "Platform", links: ["Browse Homes", "List Property", "How it Works"] },
              { title: "Community", links: ["Host Stories", "Tenant Guidelines", "Events"] },
              { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Smart Contracts"] }
            ].map((col, idx) => (
              <div key={idx}>
                <h4 className="font-bold mb-6 text-lg">{col.title}</h4>
                <ul className="space-y-4 text-sm text-muted-foreground">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="hover:text-primary transition-colors hover:underline">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-border/20 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">© 2025 DeRent5. All rights reserved.</p>
            <div className="flex gap-6">
              {/* Social icons would go here */}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
