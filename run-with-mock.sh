#!/bin/bash

# DeRent5 - Quick Start Script with Mock Data
# This script runs the Next.js app with mock API enabled

clear
echo "🏠 =========================================="
echo "   DeRent5 - Property Rental Platform"
echo "=========================================="
echo ""
echo "🚀 Starting with Mock Data..."
echo ""
echo "📊 Mock Data Includes:"
echo "  ✓ 3 Properties:"
echo "    - Luxury Downtown Apartment ($1,500/mo) ✅ APPROVED"
echo "    - Cozy Studio Near Beach ($950/mo) ⏳ PENDING"
echo "    - Modern Penthouse ($3,500/mo) ✅ APPROVED"
echo ""
echo "  ✓ 2 Test Users:"
echo "    - Poster: poster@example.com"
echo "    - Admin:  admin@example.com"
echo ""
echo "  ✓ 5 Property Types: Apartment, House, Studio, Condo, Villa"
echo "  ✓ 8 Amenities: WiFi, AC, Parking, Fitness, Pool, etc."
echo ""
echo "🔐 Login with any password (mock authentication)"
echo ""
echo "=========================================="
echo ""

# Set environment variable for mock API
export NEXT_PUBLIC_USE_MOCK_API=true

# Run on port 3002 since 3000 is occupied
npm run dev -- -p 3002

