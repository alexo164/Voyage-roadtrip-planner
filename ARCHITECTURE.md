# Road Trip Planner - Architecture & Planning Document

## 🎯 Project Overview

A comprehensive web application for planning road trips across multiple cities and countries, with intelligent recommendations for accommodations, flights, and optimal travel timing.

### Core Use Case
Planning a road trip from Munich across Austria and Switzerland, determining:
- Best time of year for the trip
- Optimal days to spend at each destination
- Most cost-effective booking strategy

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Interactive │  │    Trip      │  │    AI Trip Advisor   │   │
│  │     Map      │  │   Planner    │  │    (Chat Interface)  │   │
│  │  (Mapbox)    │  │   Sidebar    │  │                      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Hotel      │  │   Flight     │  │   Price Optimizer    │   │
│  │   Search     │  │   Search     │  │     Dashboard        │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Next.js API Routes)                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Trip API   │  │  Search API  │  │   OpenAI Integration │   │
│  │              │  │  (Hotels,    │  │   (Trip Advisor)     │   │
│  │              │  │   Flights)   │  │                      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Routing &   │  │   Pricing    │  │   Data Aggregation   │   │
│  │  Directions  │  │   ML Model   │  │      Service         │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                           │
├─────────────────────────────────────────────────────────────────┤
│  • Mapbox/Leaflet - Maps & Directions                           │
│  • Booking.com API - Hotel/Accommodation Search                  │
│  • Amadeus/Skyscanner API - Flight Search                        │
│  • OpenAI API - Trip Advisor Assistant                           │
│  • OpenRouteService - Route Planning                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Maps**: Mapbox GL JS (or Leaflet as fallback)
- **State Management**: Zustand
- **Charts**: Recharts (for price analysis)

### Backend
- **API**: Next.js API Routes
- **Database**: SQLite (for local storage) / PostgreSQL (production)
- **ORM**: Prisma

### External APIs
- **Mapbox** - Interactive maps and directions
- **OpenAI GPT-4** - Trip advisor chatbot
- **Booking.com Affiliate API** - Accommodation search
- **Amadeus API** - Flight search and pricing
- **OpenRouteService** - Alternative routing

### ML Component
- **TensorFlow.js** or **Python microservice** for price prediction
- Historical pricing data analysis
- Seasonal trend detection

---

## 🗂️ Project Structure

```
TripPlanner/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Main dashboard
│   │   ├── layout.tsx          # Root layout
│   │   ├── globals.css         # Global styles
│   │   └── api/                # API routes
│   │       ├── trip/           # Trip CRUD operations
│   │       ├── search/         # Hotel/Flight search
│   │       ├── advisor/        # OpenAI integration
│   │       └── optimize/       # Price optimization
│   │
│   ├── components/
│   │   ├── map/                # Map components
│   │   │   ├── TripMap.tsx     # Main map component
│   │   │   ├── StopMarker.tsx  # Location markers
│   │   │   └── RouteLayer.tsx  # Route visualization
│   │   │
│   │   ├── planner/            # Trip planning components
│   │   │   ├── TripSidebar.tsx # Main planning sidebar
│   │   │   ├── StopCard.tsx    # Individual stop card
│   │   │   ├── DatePicker.tsx  # Date selection
│   │   │   └── DurationInput.tsx
│   │   │
│   │   ├── search/             # Search components
│   │   │   ├── HotelSearch.tsx
│   │   │   ├── FlightSearch.tsx
│   │   │   └── SearchResults.tsx
│   │   │
│   │   ├── advisor/            # AI advisor
│   │   │   ├── ChatInterface.tsx
│   │   │   └── TripAnalysis.tsx
│   │   │
│   │   ├── optimizer/          # Price optimization
│   │   │   ├── PriceChart.tsx
│   │   │   ├── OptimalDates.tsx
│   │   │   └── CostBreakdown.tsx
│   │   │
│   │   └── ui/                 # Shared UI components
│   │
│   ├── lib/
│   │   ├── api/                # API client functions
│   │   ├── utils/              # Utility functions
│   │   └── ml/                 # ML model utilities
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useTrip.ts
│   │   ├── useMap.ts
│   │   └── useSearch.ts
│   │
│   ├── store/                  # Zustand stores
│   │   └── tripStore.ts
│   │
│   └── types/                  # TypeScript types
│       └── index.ts
│
├── prisma/
│   └── schema.prisma           # Database schema
│
├── public/
│   └── assets/
│
├── ml/                         # Python ML service (optional)
│   ├── price_predictor.py
│   └── requirements.txt
│
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── .env.local
```

---

## 🔑 Key Features

### 1. Interactive Map
- Add/remove stops by clicking on map
- Drag stops to reorder
- Visualize route between all stops
- Distance and driving time calculations
- Country border crossings highlighted

### 2. Trip Planning Sidebar
- List of all stops with details
- Days allocation per stop
- Total trip duration
- Start/end date selection
- Origin airport selection

### 3. AI Trip Advisor
- Chat interface powered by OpenAI
- Analyzes if trip is achievable
- Suggests optimal route order
- Recommends days per destination
- Provides local insights and tips

### 4. Accommodation Search
- Booking.com integration
- Filter by price, rating, amenities
- Price comparison across dates
- Direct booking links

### 5. Flight Search
- Search flights from origin to first stop
- Return flights from last stop
- Price calendar view
- Multi-city options

### 6. Price Optimizer (ML)
- Analyzes historical pricing trends
- Identifies cheapest travel periods
- Considers:
  - Hotel seasonality
  - Flight price patterns
  - Car rental fluctuations
  - Local events/holidays
- Outputs optimal travel window

---

## 📊 Data Models

```typescript
interface Trip {
  id: string;
  name: string;
  originAirport: Airport;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  stops: Stop[];
  status: 'planning' | 'booked' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

interface Stop {
  id: string;
  tripId: string;
  order: number;
  location: Location;
  daysPlanned: number;
  accommodation?: Accommodation;
  notes: string;
}

interface Location {
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface Accommodation {
  id: string;
  name: string;
  type: 'hotel' | 'apartment' | 'hostel' | 'airbnb';
  pricePerNight: number;
  rating: number;
  bookingUrl: string;
}

interface RouteSegment {
  from: Stop;
  to: Stop;
  distance: number; // km
  duration: number; // minutes
  polyline: string;
}

interface PriceAnalysis {
  tripId: string;
  optimalStartDate: Date;
  optimalEndDate: Date;
  estimatedSavings: number;
  pricesByMonth: MonthlyPrice[];
  breakdown: {
    hotels: number;
    flights: number;
    carRental: number;
    total: number;
  };
}
```

---

## 🔌 API Endpoints

### Trip Management
- `POST /api/trip` - Create new trip
- `GET /api/trip/:id` - Get trip details
- `PUT /api/trip/:id` - Update trip
- `DELETE /api/trip/:id` - Delete trip
- `POST /api/trip/:id/stops` - Add stop to trip
- `PUT /api/trip/:id/stops/:stopId` - Update stop
- `DELETE /api/trip/:id/stops/:stopId` - Remove stop

### Search
- `POST /api/search/hotels` - Search accommodations
- `POST /api/search/flights` - Search flights
- `POST /api/search/car-rental` - Search car rentals
- `GET /api/search/route` - Calculate route between stops

### AI Advisor
- `POST /api/advisor/analyze` - Analyze trip feasibility
- `POST /api/advisor/chat` - Chat with trip advisor
- `GET /api/advisor/suggestions` - Get optimization suggestions

### Price Optimization
- `POST /api/optimize/prices` - Get price analysis
- `GET /api/optimize/calendar/:tripId` - Get price calendar
- `GET /api/optimize/best-dates/:tripId` - Get optimal dates

---

## 🎨 UI Design Concepts

### Color Palette
- **Primary**: Deep teal (#0D9488)
- **Secondary**: Warm amber (#F59E0B)
- **Background**: Off-white (#FAFAF9)
- **Dark mode**: Slate (#1E293B)
- **Accent**: Coral (#FF6B6B)

### Layout
- Full-width map as main canvas
- Collapsible sidebar for trip planning
- Bottom sheet for search results (mobile)
- Floating AI chat button
- Price optimizer in modal/drawer

---

## 🚀 Development Phases

### Phase 1: Foundation (Week 1)
- [x] Project setup
- [ ] Map integration with stop markers
- [ ] Basic trip planning sidebar
- [ ] Route calculation and display

### Phase 2: Core Features (Week 2)
- [ ] OpenAI advisor integration
- [ ] Hotel search (mock data initially)
- [ ] Flight search (mock data initially)
- [ ] Trip persistence (local storage)

### Phase 3: API Integration (Week 3)
- [ ] Booking.com API integration
- [ ] Amadeus flight API integration
- [ ] Car rental API integration
- [ ] Real-time pricing

### Phase 4: ML & Optimization (Week 4)
- [ ] Price data collection
- [ ] ML model for price prediction
- [ ] Optimal timing calculator
- [ ] Price calendar visualization

### Phase 5: Polish (Week 5)
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] User authentication (optional)
- [ ] Trip sharing features

---

## 🔐 Environment Variables

```env
# Map Services
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

# OpenAI
OPENAI_API_KEY=your_openai_key

# Booking.com (Affiliate API)
BOOKING_AFFILIATE_ID=your_affiliate_id
BOOKING_API_KEY=your_booking_key

# Amadeus (Flight Search)
AMADEUS_API_KEY=your_amadeus_key
AMADEUS_API_SECRET=your_amadeus_secret

# Database
DATABASE_URL=file:./dev.db
```

---

## 📝 Notes for Munich-Austria-Switzerland Trip

### Suggested Stops
1. **Munich** (Start) - 1-2 days
2. **Salzburg, Austria** - 2 days
3. **Hallstatt, Austria** - 1 day
4. **Innsbruck, Austria** - 2 days
5. **Zürich, Switzerland** - 2 days
6. **Interlaken, Switzerland** - 2 days
7. **Lucerne, Switzerland** - 1-2 days
8. **Back to Munich** or fly out

### Considerations
- **Best time**: Late spring (May-June) or early fall (September)
- **Avoid**: Peak summer (July-August) - crowded and expensive
- **Winter**: Great for skiing but many mountain passes closed
- **Total recommended days**: 10-14 days
- **Key scenic drives**: Grossglockner High Alpine Road, Swiss Alps

---

*This document will be updated as the project evolves.*

