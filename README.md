# Voyage - Road Trip Planner 🚗

A comprehensive web application for planning road trips across Europe, with intelligent recommendations for accommodations, flights, and optimal travel timing.

![Voyage Road Trip Planner](https://via.placeholder.com/800x400/0d9488/ffffff?text=Voyage+Road+Trip+Planner)

## ✨ Features

### 🗺️ Interactive Map
- Click anywhere on the map to add destinations
- Visualize your complete route with driving distances
- Drag and reorder stops
- See country crossings and border information

### 📍 Trip Planning
- Manage multiple stops with customizable days per destination
- Real-time trip statistics (total distance, driving time)
- Smart pace analysis - know if your trip is too rushed or relaxed
- Export your trip as JSON for backup

### 🤖 AI Trip Advisor
- Powered by OpenAI GPT-4
- Analyze if your trip is achievable
- Get personalized recommendations for your route
- Ask questions about best times to visit, local tips, and more

### 🏨 Hotel Search
- Search accommodations at each destination
- Compare prices and ratings
- Direct booking links to Booking.com
- Filter by amenities and price range

### 💰 Price Optimizer
- ML-powered analysis of the best time to travel
- Historical price trends for hotels, flights, and car rentals
- Seasonal recommendations
- Save money with optimal travel window suggestions

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/trip-planner.git
cd trip-planner
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

4. Add your API keys to `.env.local`:
```env
# Required for map
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token

# Optional - enables AI advisor
OPENAI_API_KEY=sk-your_openai_key

# Optional - enables real hotel search
RAPIDAPI_KEY=your_rapidapi_key

# Optional - enables flight search
AMADEUS_API_KEY=your_amadeus_key
AMADEUS_API_SECRET=your_amadeus_secret
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🔑 API Keys

### Mapbox (Required for map)
1. Go to [mapbox.com](https://mapbox.com)
2. Create a free account
3. Copy your public token

### OpenAI (Required for AI advisor)
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an API key
3. Requires GPT-4 access for best results

### Booking.com via RapidAPI (Optional)
1. Go to [rapidapi.com](https://rapidapi.com)
2. Subscribe to Booking.com API
3. Copy your API key

### Amadeus (Optional for flights)
1. Go to [developers.amadeus.com](https://developers.amadeus.com)
2. Create a free account
3. Get your API key and secret

## 🗺️ Munich-Austria-Switzerland Trip Example

This app was designed for planning a road trip from Munich across Austria and Switzerland. Here's a suggested itinerary:

| Stop | Location | Recommended Days |
|------|----------|-----------------|
| 1 | Munich, Germany | 1-2 days |
| 2 | Salzburg, Austria | 2 days |
| 3 | Hallstatt, Austria | 1 day |
| 4 | Innsbruck, Austria | 2 days |
| 5 | Zürich, Switzerland | 2 days |
| 6 | Interlaken, Switzerland | 2 days |
| 7 | Lucerne, Switzerland | 1-2 days |
| 8 | Return to Munich | - |

**Best Time to Visit:** May-June or September for optimal weather and lower prices.

## 🛠️ Tech Stack

- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Maps:** Mapbox GL JS
- **Charts:** Recharts
- **Animations:** Framer Motion
- **AI:** OpenAI GPT-4

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API routes
│   │   ├── advisor/    # OpenAI integration
│   │   ├── optimize/   # Price optimization
│   │   └── search/     # Hotel/flight search
│   ├── page.tsx        # Main dashboard
│   └── layout.tsx      # Root layout
├── components/
│   ├── map/            # Map components
│   ├── planner/        # Trip planning UI
│   ├── optimizer/      # Price charts
│   ├── layout/         # Header, etc.
│   └── ui/             # Shared components
├── hooks/              # Custom React hooks
├── lib/                # Utilities
├── store/              # Zustand store
└── types/              # TypeScript types
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- Map tiles by [Mapbox](https://mapbox.com)
- Weather data styling inspired by [WeatherAPI](https://weatherapi.com)
- Icons by [Lucide](https://lucide.dev)

---

Made with ❤️ for road trip enthusiasts

