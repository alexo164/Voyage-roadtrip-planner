'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Route,
  Hotel,
  Plane,
  Bot,
  TrendingDown,
  Plus,
  Trash2,
  GripVertical,
  Car,
  Star,
  ExternalLink
} from 'lucide-react';
import { useTripStore } from '@/store/tripStore';
import { useTripAdvisor, usePriceOptimizer, useHotelSearch } from '@/hooks/useTrip';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StopCard } from './StopCard';
import { TripStats } from './TripStats';
import { DestinationSearch } from './DestinationSearch';
import { PriceChart } from '@/components/optimizer/PriceChart';
import { OptimalDates } from '@/components/optimizer/OptimalDates';
import { formatDistance, formatDuration, formatPrice, getCountryFlag } from '@/lib/utils';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'stops', label: 'Route', icon: Route },
  { id: 'hotels', label: 'Hotels', icon: Hotel },
  { id: 'flights', label: 'Flights', icon: Plane },
  { id: 'advisor', label: 'AI Advisor', icon: Bot },
  { id: 'optimize', label: 'Optimizer', icon: TrendingDown },
] as const;

export function TripSidebar() {
  const { 
    currentTrip, 
    route,
    isSidebarOpen, 
    toggleSidebar, 
    activeTab, 
    setActiveTab,
    updateTrip,
  } = useTripStore();
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [tripName, setTripName] = useState(currentTrip?.name || 'My Road Trip');
  
  const handleNameSave = () => {
    updateTrip({ name: tripName });
    setIsEditingName(false);
  };
  
  return (
    <>
      {/* Collapse button */}
      <button
        onClick={toggleSidebar}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 z-20 w-6 h-16 glass-strong rounded-r-lg',
          'flex items-center justify-center text-slate-400 hover:text-white',
          'transition-all duration-300',
          isSidebarOpen ? 'left-[400px]' : 'left-0'
        )}
      >
        {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
      
      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 left-0 w-[400px] h-full z-10 glass-strong border-r border-slate-700/50 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-alpine-500 to-alpine-600 flex items-center justify-center shadow-lg shadow-alpine-500/20">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  {isEditingName ? (
                    <Input
                      value={tripName}
                      onChange={(e) => setTripName(e.target.value)}
                      onBlur={handleNameSave}
                      onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                      autoFocus
                      className="h-8 text-lg font-semibold"
                    />
                  ) : (
                    <h1 
                      className="text-xl font-display font-semibold text-white cursor-pointer hover:text-alpine-400 transition-colors"
                      onClick={() => setIsEditingName(true)}
                    >
                      {currentTrip?.name || 'My Road Trip'}
                    </h1>
                  )}
                  <p className="text-sm text-slate-400">
                    {currentTrip?.stops.length || 0} stops · {currentTrip?.totalDays || 0} days
                  </p>
                </div>
              </div>
              
              {/* Trip stats summary */}
              {route && route.totalDistance > 0 && (
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Route size={14} className="text-alpine-400" />
                    <span>{formatDistance(route.totalDistance)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock size={14} className="text-sunset-400" />
                    <span>{formatDuration(route.totalDrivingTime)} driving</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-slate-700/50 px-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium transition-all',
                    activeTab === tab.id
                      ? 'text-alpine-400 border-b-2 border-alpine-400'
                      : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
            
            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'stops' && <StopsTabContent />}
              {activeTab === 'hotels' && <HotelsTabContent />}
              {activeTab === 'flights' && <FlightsTabContent />}
              {activeTab === 'advisor' && <AdvisorTabContent />}
              {activeTab === 'optimize' && <OptimizerTabContent />}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

function StopsTabContent() {
  const { currentTrip, route, reorderStops } = useTripStore();
  const stops = currentTrip?.stops || [];
  
  // Drag and drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };
  
  const handleDragOver = (index: number) => {
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index);
    }
  };
  
  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      reorderStops(dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };
  
  return (
    <div className="space-y-4">
      {/* Destination Search */}
      <DestinationSearch />
      
      {/* Trip overview stats */}
      <TripStats />
      
      {/* Stops list */}
      <div className="space-y-3">
        {stops.length === 0 ? (
          <Card variant="glass" className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-slate-400 mb-2">No destinations yet</p>
            <p className="text-sm text-slate-500">
              Search above or click on the map to add stops
            </p>
          </Card>
        ) : (
          stops.map((stop, index) => (
            <div key={stop.id}>
              <StopCard 
                stop={stop} 
                index={index}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                isDragging={dragIndex === index}
                isDragOver={dragOverIndex === index}
              />
              
              {/* Route segment info */}
              {index < stops.length - 1 && route?.segments[index] && (
                <div className="flex items-center justify-center gap-3 py-2 text-xs text-slate-500">
                  <div className="h-px flex-1 bg-slate-700/50" />
                  <div className="flex items-center gap-2">
                    <Car size={12} />
                    <span>{formatDistance(route.segments[index].distance)}</span>
                    <span>·</span>
                    <span>{formatDuration(route.segments[index].duration)}</span>
                  </div>
                  <div className="h-px flex-1 bg-slate-700/50" />
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Add destination hint */}
      {stops.length > 0 && (
        <p className="text-center text-sm text-slate-500 pt-4">
          Drag stops to reorder · Click map to add more
        </p>
      )}
    </div>
  );
}

function HotelsTabContent() {
  const { currentTrip, selectedStopId } = useTripStore();
  const { searchHotels, hotels, isLoading } = useHotelSearch();
  const selectedStop = currentTrip?.stops.find(s => s.id === selectedStopId);
  
  const handleSearch = () => {
    if (selectedStop) {
      searchHotels(selectedStop.location.city);
    }
  };
  
  if (!selectedStop) {
    return (
      <Card variant="glass" className="text-center py-8">
        <Hotel className="w-12 h-12 mx-auto mb-4 text-slate-500" />
        <p className="text-slate-400 mb-2">Select a destination</p>
        <p className="text-sm text-slate-500">
          Choose a stop from the Route tab to search for hotels
        </p>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">{selectedStop.location.name}</h3>
          <p className="text-sm text-slate-400">
            {selectedStop.daysPlanned} night{selectedStop.daysPlanned !== 1 ? 's' : ''}
          </p>
        </div>
        <Badge variant="info">
          {getCountryFlag(selectedStop.location.countryCode)} {selectedStop.location.country}
        </Badge>
      </div>
      
      <Button onClick={handleSearch} isLoading={isLoading} className="w-full">
        Search Hotels
      </Button>
      
      {/* Hotel results */}
      <div className="space-y-3">
        {hotels.length > 0 ? (
          hotels.map((hotel) => (
            <Card key={hotel.id} variant="default" hover className="p-3">
              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0">
                  {hotel.imageUrl ? (
                    <img 
                      src={hotel.imageUrl} 
                      alt={hotel.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Hotel className="w-8 h-8 text-slate-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white truncate">{hotel.name}</h4>
                  <p className="text-xs text-slate-400 truncate">{hotel.address}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-sunset-400 fill-sunset-400" />
                      <span className="text-sm text-white">{hotel.rating}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      ({hotel.reviewCount} reviews)
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-semibold text-alpine-400">
                      {formatPrice(hotel.pricePerNight, hotel.currency)}
                    </span>
                    <span className="text-xs text-slate-400">/ night</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {hotel.amenities.slice(0, 3).map((amenity: string) => (
                  <Badge key={amenity} variant="default" size="sm">
                    {amenity}
                  </Badge>
                ))}
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full mt-3"
                onClick={() => window.open(hotel.bookingUrl, '_blank')}
              >
                <ExternalLink size={14} />
                View on Booking.com
              </Button>
            </Card>
          ))
        ) : isLoading ? (
          [1, 2, 3].map((i) => (
            <Card key={i} variant="default" className="p-3">
              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-lg bg-slate-700 shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-slate-700 rounded shimmer" />
                  <div className="h-3 w-1/2 bg-slate-700 rounded shimmer" />
                  <div className="flex justify-between items-end">
                    <div className="h-3 w-16 bg-slate-700 rounded shimmer" />
                    <div className="h-5 w-20 bg-slate-700 rounded shimmer" />
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <p className="text-center text-sm text-slate-500">
            Click "Search Hotels" to find accommodations
          </p>
        )}
      </div>
    </div>
  );
}

function FlightsTabContent() {
  return (
    <div className="space-y-4">
      <Card variant="glass" className="text-center py-8">
        <Plane className="w-12 h-12 mx-auto mb-4 text-slate-500" />
        <p className="text-slate-400 mb-2">Flight Search</p>
        <p className="text-sm text-slate-500 mb-4">
          Search for flights to your first destination and return flights home
        </p>
        <Button variant="secondary" size="sm" disabled>
          Coming Soon
        </Button>
      </Card>
      
      <Card variant="default" className="p-4">
        <h4 className="font-medium text-white mb-3">To enable flight search:</h4>
        <ul className="space-y-2 text-sm text-slate-400">
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-alpine-400" />
            Configure Amadeus API credentials
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-alpine-400" />
            Set your home airport in settings
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-alpine-400" />
            Add trip dates in the header
          </li>
        </ul>
      </Card>
    </div>
  );
}

function AdvisorTabContent() {
  const { advisorMessages, isAdvisorLoading, currentTrip } = useTripStore();
  const { sendMessage, analyzeTrip, tripAnalysis } = useTripAdvisor();
  const [message, setMessage] = useState('');
  
  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage(message);
    setMessage('');
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-3 mb-4 overflow-y-auto">
        {advisorMessages.length === 0 ? (
          <div className="space-y-4">
            <Card variant="glass" className="text-center py-6">
              <Bot className="w-12 h-12 mx-auto mb-4 text-alpine-400" />
              <p className="text-white font-medium mb-2">AI Trip Advisor</p>
              <p className="text-sm text-slate-400 mb-4">
                Get personalized advice for your road trip!
              </p>
              
              {currentTrip && currentTrip.stops.length > 0 && (
                <Button 
                  onClick={analyzeTrip} 
                  isLoading={isAdvisorLoading}
                  className="mb-4"
                >
                  Analyze My Trip
                </Button>
              )}
            </Card>
            
            <Card variant="default" className="p-4">
              <p className="text-sm text-slate-400 mb-3">Quick questions:</p>
              <div className="space-y-2">
                {[
                  'Is my trip duration realistic?',
                  'Best time of year to visit the Alps',
                  'Tips for driving in Austria/Switzerland',
                  'Must-see stops between Munich and Zurich',
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    className="w-full text-left text-sm text-slate-400 hover:text-alpine-400 py-2 px-3 rounded-lg hover:bg-slate-700/30 transition-colors"
                    onClick={() => setMessage(suggestion)}
                  >
                    → {suggestion}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          advisorMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'p-3 rounded-xl text-sm',
                msg.role === 'user'
                  ? 'bg-alpine-500/20 text-alpine-100 ml-8'
                  : 'bg-slate-700/50 text-slate-200 mr-8'
              )}
            >
              {msg.content}
            </div>
          ))
        )}
        
        {isAdvisorLoading && (
          <div className="bg-slate-700/50 text-slate-400 p-3 rounded-xl text-sm mr-8">
            <span className="loading-dots">Thinking</span>
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask about your trip..."
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button onClick={handleSend} disabled={!message.trim() || isAdvisorLoading}>
          Send
        </Button>
      </div>
    </div>
  );
}

function OptimizerTabContent() {
  const { currentTrip, priceAnalysis, isPriceLoading } = useTripStore();
  const { optimizePrices } = usePriceOptimizer();
  
  if (priceAnalysis) {
    return (
      <div className="space-y-4">
        <PriceChart 
          data={priceAnalysis.pricesByDate} 
          currency={priceAnalysis.currency}
          highlightMonth={new Date(priceAnalysis.optimalStartDate).getMonth()}
        />
        <OptimalDates analysis={priceAnalysis} />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <Card variant="glass" className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sunset-500 to-sunset-600 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Price Optimizer</h3>
            <p className="text-sm text-slate-400">Find the cheapest time to travel</p>
          </div>
        </div>
        
        <p className="text-sm text-slate-400 mb-4">
          Our ML model analyzes historical pricing data for hotels, flights, and car rentals to find the optimal travel window.
        </p>
        
        <Button 
          className="w-full" 
          onClick={optimizePrices}
          disabled={!currentTrip?.stops.length || isPriceLoading}
          isLoading={isPriceLoading}
        >
          {isPriceLoading ? 'Analyzing...' : 'Analyze Best Dates'}
        </Button>
      </Card>
      
      {/* Sample optimization results preview */}
      <Card variant="default" className="p-4">
        <h4 className="font-medium text-white mb-3">What we analyze:</h4>
        <ul className="space-y-2 text-sm text-slate-400">
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-alpine-400" />
            Hotel price trends by season
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sunset-400" />
            Flight prices from your airport
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            Car rental availability & rates
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            Local events & peak seasons
          </li>
        </ul>
      </Card>
    </div>
  );
}
