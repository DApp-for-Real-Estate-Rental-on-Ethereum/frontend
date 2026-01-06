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
import { RecommendedProperties } from "@/components/recommendations/RecommendedProperties"
import { Heart, MapPin, Star, DollarSign, Users, Layers, Leaf, Shield, Target, ArrowRight, Home } from "lucide-react"

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
    if (!url) return "/houses_placeholder.png"
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
          (property.address?.city || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (property.address?.country || "").toLowerCase().includes(searchTerm.toLowerCase()),
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
    <div className="min-h-screen bg-background text-foreground overflow-hidden">

      {/* HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center py-20 overflow-hidden">
        {/* Abstract Background Blobs */}
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] opacity-50 animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-20%] w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-[100px] opacity-50" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            <div className="space-y-8 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm">
                <Star className="w-4 h-4 fill-primary" />
                <span>#1 Decentralized Rental Platform</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
                Living <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-cyan-600">
                  Reimagined.
                </span>
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                Experience seamless, transparent, and secure rentals powered by blockchain technology. Find your dream home without the middleman.
              </p>

              <div className="flex gap-4">
                <Button
                  size="lg"
                  className="rounded-full px-8 h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-105 transition-all duration-300"
                  onClick={() => {
                    const element = document.getElementById('properties-section')
                    element?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  Explore Properties
                </Button>
                <Link href="/post-property">
                  <Button variant="outline" size="lg" className="rounded-full px-8 h-12 text-base font-semibold hover:bg-secondary/50">
                    List Your Space
                  </Button>
                </Link>
              </div>

              <div className="flex items-center gap-8 pt-8 border-t border-border/50">
                <div>
                  <div className="text-3xl font-bold text-foreground">2k+</div>
                  <div className="text-sm text-muted-foreground">Properties</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground">5k+</div>
                  <div className="text-sm text-muted-foreground">Happy Tenants</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground">100%</div>
                  <div className="text-sm text-muted-foreground">Secure</div>
                </div>
              </div>
            </div>

            <div className="relative group perspective-1000">
              <div className="relative h-[600px] w-full rounded-[2.5rem] overflow-hidden shadow-2xl transition-transform duration-700 hover:rotate-y-2 transform-style-3d border-8 border-white dark:border-white/5">
                <Image
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600"
                  alt="Modern Living Space"
                  fill
                  className="object-cover scale-105 group-hover:scale-110 transition-transform duration-700"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                <div className="absolute bottom-8 left-8 right-8">
                  <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white p-6 shadow-2xl">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold mb-1">Villa Azure</h3>
                        <p className="text-white/80 text-sm flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> Marrakech, Morocco
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">2,400 <span className="text-sm font-normal">MAD</span></div>
                        <div className="text-xs text-white/70">per night</div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-10 -right-10 p-4 bg-background rounded-2xl shadow-xl animate-bounce-slow">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <div className="absolute top-1/2 -left-12 p-4 bg-background rounded-2xl shadow-xl animate-bounce-slow delay-700">
                <Target className="w-8 h-8 text-cyan-500" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Recommended Properties Section - Only visible to logged-in users */}
      <RecommendedProperties />

      {/* CURATED LISTINGS */}
      <section id="properties-section" className="py-32 bg-secondary/30 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge variant="outline" className="mb-4 text-primary border-primary/20 bg-primary/5">
              Exclusive Listings
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Curated Residences</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore our hand-picked selection of premium properties waiting to become your new home.
            </p>
          </div>

          {isFetching ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-3xl border border-dashed">
              <p className="text-muted-foreground text-lg">No properties currently available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {filteredProperties.map((property) => (
                <Link href={`/property/${property.id}`} key={property.id} className="block group h-full">
                  <Card className="h-full overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border border-border/50 bg-card/50 backdrop-blur-sm rounded-3xl">
                    <div className="relative h-80 overflow-hidden">
                      <Image
                        src={getImageUrl(getPropertyImage(property))}
                        alt={property.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.srcset = ""
                          target.src = "/houses_placeholder.png"
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 transition-opacity duration-300" />

                      {user && property.status && (
                        <div className="absolute top-4 right-4 z-10">
                          <Badge className="backdrop-blur-md bg-white/20 hover:bg-white/30 text-white border-white/20 font-medium px-3 py-1">
                            {property.status}
                          </Badge>
                        </div>
                      )}

                      <div className="absolute bottom-4 left-4 right-4 z-10">
                        <div className="flex justify-between items-end">
                          <div>
                            <h3 className="font-bold text-white text-xl mb-1 line-clamp-1 group-hover:text-primary-foreground transition-colors">
                              {property.title}
                            </h3>
                            <div className="flex items-center text-white/80 text-sm">
                              <MapPin className="w-3.5 h-3.5 mr-1" />
                              <span className="line-clamp-1">
                                {property.address ? `${property.address.city}, ${property.address.country}` : "Location info"}
                              </span>
                            </div>
                          </div>
                          <div className="bg-white/20 backdrop-blur-md p-2 rounded-lg text-white font-bold">
                            {property.dailyPrice?.toFixed(0) || property.price?.toFixed(0) || "N/A"} MAD
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6 pb-6 border-b border-border/50">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" /> {property.capacity}
                          </div>
                          <div className="h-4 w-[1px] bg-border" />
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Home className="w-4 h-4" /> {property.numberOfBedrooms} Bd
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-bold text-sm">4.92</span>
                        </div>
                      </div>

                      {property.amenities && property.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {property.amenities.slice(0, 3).map((a) => (
                            <Badge key={a.id} variant="secondary" className="text-xs font-normal bg-secondary/50 hover:bg-secondary">
                              {a.name}
                            </Badge>
                          ))}
                          {property.amenities.length > 3 && (
                            <Badge variant="outline" className="text-xs font-normal border-dashed">
                              +{property.amenities.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-16 text-center">
            <Link href="/properties">
              <Button variant="outline" size="lg" className="rounded-full px-8 border-primary text-primary hover:bg-primary hover:text-white">
                View All Properties <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES OFFSET */}
      <section className="py-32 bg-foreground text-background overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
                Why <span className="text-primary">DeRent5</span> is <br /> the future of renting.
              </h2>
              <div className="space-y-8">
                {[
                  { title: "Smart Contracts", desc: "Automated lease agreements that function without manual oversight.", icon: Layers },
                  { title: "Zero Hidden Fees", desc: "Transparent pricing powered by blockchain immutability.", icon: DollarSign },
                  { title: "Instant Verification", desc: "Decentralized identity verification for immediate trust.", icon: Shield },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-6 group">
                    <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300 shrink-0">
                      <item.icon className="w-6 h-6 text-white group-hover:text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                      <p className="text-white/60 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative h-[600px] w-full rounded-[3rem] overflow-hidden border border-white/10">
                <Image
                  src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=1000"
                  alt="Future Living"
                  fill
                  className="object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                <div className="absolute bottom-12 left-12 right-12">
                  <div className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-white opacity-80">
                    2025
                  </div>
                  <p className="text-white/80 mt-4 text-lg">Awarded Best Decentralized App Interface</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* TESTIMONIALS */}
      <section className="py-32 bg-background relative overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] w-[500px] h-[500px] bg-secondary rounded-full blur-[80px] opacity-60" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Trusted by Thousands</h2>
            <p className="text-muted-foreground">Don't just take our word for it.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {[1, 2].map((i) => (
              <Card key={i} className="p-10 rounded-[2rem] border-0 shadow-lg bg-card/50 hover:bg-card transition-colors">
                <div className="flex gap-1 text-yellow-400 mb-6">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-5 h-5 fill-current" />)}
                </div>
                <p className="text-xl leading-relaxed mb-8 font-medium">
                  "We found our dream apartment in Casablanca within hours. The crypto payment was instant, and the smart contract gave us peace of mind that no other platform could offer."
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-teal-600 to-cyan-600" />
                  <div>
                    <div className="font-bold text-lg">Amine & Sarah</div>
                    <div className="text-primary text-sm font-medium">Verified Tenants</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FOOTER */}
      <footer className="bg-foreground text-background py-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl md:text-7xl font-bold mb-8 tracking-tighter">Ready to move in?</h2>
          <p className="text-white/60 text-xl max-w-2xl mx-auto mb-12">
            Join the fastest growing decentralized real estate network today.
          </p>
          <div className="flex justify-center gap-6">
            <Link href="/signup">
              <Button size="lg" className="h-16 px-10 rounded-full text-lg bg-white text-black hover:bg-white/90">
                Get Started Now
              </Button>
            </Link>
          </div>

          <div className="mt-24 pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-white/40 text-sm">
            <p>© 2025 DeRent5 Inc. Built on Ethereum.</p>
            <div className="flex gap-8 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
