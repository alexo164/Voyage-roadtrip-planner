'use client';

import { useState, useEffect } from 'react';
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
  ExternalLink,
  Search,
  SlidersHorizontal,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowUpDown,
  Filter,
  Wallet,
  Award,
  Sparkles
} from 'lucide-react';
import { useTripStore, OriginAirport } from '@/store/tripStore';
import { useTripAdvisor, usePriceOptimizer } from '@/hooks/useTrip';
import { Accommodation, HotelFilters } from '@/types';
import { AirportSearch, Airport } from '@/components/ui/AirportSearch';
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
  { id: 'flights', label: 'Flights', icon: Plane },
  { id: 'hotels', label: 'Hotels', icon: Hotel },
  { id: 'advisor', label: 'AI Advisor', icon: Bot },
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
  
  // Wider sidebar for hotels tab
  const sidebarWidth = activeTab === 'hotels' ? 560 : 400;
  
  return (
    <>
      {/* Collapse button */}
      <button
        onClick={toggleSidebar}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 z-20 w-6 h-16 glass-strong rounded-r-lg',
          'flex items-center justify-center text-slate-400 hover:text-white',
          'transition-all duration-300'
        )}
        style={{ left: isSidebarOpen ? `${sidebarWidth}px` : '0px' }}
      >
        {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
      
      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -sidebarWidth, opacity: 0 }}
            animate={{ x: 0, opacity: 1, width: sidebarWidth }}
            exit={{ x: -sidebarWidth, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 left-0 h-full z-10 glass-strong border-r border-slate-700/50 flex flex-col"
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
              {activeTab === 'flights' && <FlightsTabContent />}
              {activeTab === 'hotels' && <HotelsTabContent />}
              {activeTab === 'advisor' && <AdvisorTabContent />}
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
  const { 
    currentTrip, 
    hotelsByStopId,
    isHotelSearching,
    hotelFilters,
    expandedHotelStopId,
    searchAllHotels,
    setHotelFilters,
    selectHotelForStop,
    clearHotelForStop,
    setExpandedHotelStopId,
    getTotalHotelCost,
    airportNightNeeded,
    destinationAirport,
  } = useTripStore();
  
  const [showFilters, setShowFilters] = useState(false);
  
  // Get stops that need hotels (stays with 1+ nights)
  const regularStopsWithNights = currentTrip?.stops.filter(
    (stop) => stop.stopType !== 'stopover' && stop.daysPlanned >= 1
  ) || [];
  
  // Create virtual "Airport Hotel" stop if needed
  const airportHotelStop = airportNightNeeded && destinationAirport ? {
    id: 'airport-hotel',
    location: {
      name: `Airport Hotel (${destinationAirport.code})`,
      address: `Near ${destinationAirport.name}`,
      city: destinationAirport.city,
      country: destinationAirport.country || '',
      lat: destinationAirport.lat || 0,
      lng: destinationAirport.lng || 0,
    },
    daysPlanned: 1,
    stopType: 'overnight' as const,
    notes: 'Arrival night - added due to late flight',
    isAirportHotel: true,
  } : null;
  
  // Combine airport hotel (first) with regular stops
  const staysWithNights = airportHotelStop 
    ? [airportHotelStop, ...regularStopsWithNights]
    : regularStopsWithNights;
  
  const { total: totalCost, currency, nights: totalNights } = getTotalHotelCost();
  
  // Count selected hotels
  const selectedHotelCount = staysWithNights.filter(s => s.accommodation).length;
  
  // Apply filters and sorting to hotels
  const getFilteredHotels = (hotels: Accommodation[]) => {
    let filtered = [...hotels];
    
    // Apply filters
    if (hotelFilters.minPrice !== undefined) {
      filtered = filtered.filter(h => h.pricePerNight >= hotelFilters.minPrice!);
    }
    if (hotelFilters.maxPrice !== undefined) {
      filtered = filtered.filter(h => h.pricePerNight <= hotelFilters.maxPrice!);
    }
    if (hotelFilters.minRating !== undefined) {
      filtered = filtered.filter(h => h.rating >= hotelFilters.minRating!);
    }
    if (hotelFilters.minStars !== undefined) {
      filtered = filtered.filter(h => (h.stars || 0) >= hotelFilters.minStars!);
    }
    
    // Apply sorting
    switch (hotelFilters.sortBy) {
      case 'price_low':
        filtered.sort((a, b) => a.pricePerNight - b.pricePerNight);
        break;
      case 'price_high':
        filtered.sort((a, b) => b.pricePerNight - a.pricePerNight);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'stars':
        filtered.sort((a, b) => (b.stars || 0) - (a.stars || 0));
        break;
      case 'reviews':
        filtered.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
    }
    
    return filtered;
  };
  
  if (staysWithNights.length === 0) {
    return (
      <Card variant="glass" className="text-center py-8">
        <Hotel className="w-12 h-12 mx-auto mb-4 text-slate-500" />
        <p className="text-slate-400 mb-2">No overnight stays planned</p>
        <p className="text-sm text-slate-500">
          Add destinations with at least 1 night stay to search for hotels
        </p>
      </Card>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header with search button and filters */}
      <div className="space-y-3 mb-4">
        <div className="flex gap-2">
          <Button 
            onClick={searchAllHotels} 
            isLoading={isHotelSearching} 
            className="flex-1"
          >
            <Search size={16} />
            Search All Hotels
          </Button>
          <Button
            variant={showFilters ? 'primary' : 'secondary'}
            onClick={() => setShowFilters(!showFilters)}
            className="px-3"
          >
            <SlidersHorizontal size={16} />
          </Button>
        </div>
        
        {/* Filters panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card variant="default" className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <Filter size={14} />
                    Filters & Sort
                  </h4>
                  <button 
                    onClick={() => setHotelFilters({ 
                      minPrice: undefined, 
                      maxPrice: undefined, 
                      minRating: undefined,
                      minStars: undefined,
                      sortBy: 'rating'
                    })}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Reset
                  </button>
                </div>
                
                {/* Sort by */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Sort by</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { value: 'rating', label: 'Rating' },
                      { value: 'price_low', label: 'Price ↑' },
                      { value: 'price_high', label: 'Price ↓' },
                      { value: 'stars', label: 'Stars' },
                      { value: 'reviews', label: 'Reviews' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setHotelFilters({ sortBy: option.value as HotelFilters['sortBy'] })}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                          hotelFilters.sortBy === option.value
                            ? 'bg-alpine-500 text-white'
                            : 'bg-slate-700/50 text-slate-400 hover:text-white'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Price range */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Min price (€)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={hotelFilters.minPrice || ''}
                      onChange={(e) => setHotelFilters({ 
                        minPrice: e.target.value ? Number(e.target.value) : undefined 
                      })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Max price (€)</label>
                    <Input
                      type="number"
                      placeholder="Any"
                      value={hotelFilters.maxPrice || ''}
                      onChange={(e) => setHotelFilters({ 
                        maxPrice: e.target.value ? Number(e.target.value) : undefined 
                      })}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                
                {/* Min rating */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Min rating</label>
                  <div className="flex gap-1.5">
                    {[null, 3.5, 4.0, 4.5].map((rating) => (
                      <button
                        key={rating || 'any'}
                        onClick={() => setHotelFilters({ minRating: rating || undefined })}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1',
                          hotelFilters.minRating === rating || (!hotelFilters.minRating && rating === null)
                            ? 'bg-alpine-500 text-white'
                            : 'bg-slate-700/50 text-slate-400 hover:text-white'
                        )}
                      >
                        {rating ? (
                          <>
                            <Star size={10} className="fill-current" />
                            {rating}+
                          </>
                        ) : 'Any'}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Min stars */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Hotel stars</label>
                  <div className="flex gap-1.5">
                    {[null, 3, 4, 5].map((stars) => (
                      <button
                        key={stars || 'any'}
                        onClick={() => setHotelFilters({ minStars: stars || undefined })}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1',
                          hotelFilters.minStars === stars || (!hotelFilters.minStars && stars === null)
                            ? 'bg-alpine-500 text-white'
                            : 'bg-slate-700/50 text-slate-400 hover:text-white'
                        )}
                      >
                        {stars ? `${stars}★+` : 'Any'}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Status summary */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            {staysWithNights.length} destination{staysWithNights.length !== 1 ? 's' : ''} · {
              staysWithNights.reduce((sum, s) => sum + s.daysPlanned, 0)
            } nights
          </span>
          <Badge variant={selectedHotelCount === staysWithNights.length ? 'success' : 'default'}>
            {selectedHotelCount}/{staysWithNights.length} selected
          </Badge>
        </div>
      </div>
      
      {/* Stops with hotels - scrollable */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {staysWithNights.map((stop, index) => {
          const hotels = getFilteredHotels(hotelsByStopId[stop.id] || []);
          const isExpanded = expandedHotelStopId === stop.id;
          const hasSearched = hotelsByStopId[stop.id] !== undefined;
          const isAirportHotel = 'isAirportHotel' in stop && stop.isAirportHotel;
          
          return (
            <Card key={stop.id} variant="default" className={cn(
              "overflow-hidden",
              isAirportHotel && "border-amber-500/30 bg-amber-500/5"
            )}>
              {/* Stop header */}
              <button
                onClick={() => setExpandedHotelStopId(isExpanded ? null : stop.id)}
                className="w-full p-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm',
                    stop.accommodation 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : isAirportHotel
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-700 text-slate-300'
                  )}>
                    {stop.accommodation ? <Check size={16} /> : isAirportHotel ? <Plane size={14} /> : (stop.order !== undefined ? stop.order + 1 : index)}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-white">{stop.location.name}</h4>
                      <span className="text-sm">{getCountryFlag(stop.location.countryCode)}</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {stop.daysPlanned} night{stop.daysPlanned !== 1 ? 's' : ''}
                      {stop.accommodation && (
                        <span className="text-emerald-400 ml-2">
                          · {formatPrice(stop.accommodation.pricePerNight * stop.daysPlanned, stop.accommodation.currency)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {stop.accommodation && (
                    <Badge variant="success" size="sm" className="mr-2">
                      Booked
                    </Badge>
                  )}
                  {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </button>
              
              {/* Expanded hotel list */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-700/50"
                  >
                    {/* Selected hotel */}
                    {stop.accommodation && (
                      <div className="p-3 bg-emerald-500/10 border-b border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-emerald-400 uppercase tracking-wide">Selected Hotel</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearHotelForStop(stop.id);
                            }}
                            className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1"
                          >
                            <X size={12} />
                            Remove
                          </button>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-16 h-16 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0">
                            {stop.accommodation.imageUrl ? (
                              <img 
                                src={stop.accommodation.imageUrl} 
                                alt={stop.accommodation.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Hotel className="w-6 h-6 text-slate-500" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-white truncate text-sm">{stop.accommodation.name}</h5>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1">
                                <Star size={10} className="text-sunset-400 fill-sunset-400" />
                                <span className="text-xs text-white">{stop.accommodation.rating}</span>
                              </div>
                              <span className="text-xs text-slate-400">
                                {formatPrice(stop.accommodation.pricePerNight, stop.accommodation.currency)}/night
                              </span>
                            </div>
                            <p className="text-xs text-emerald-400 mt-1 font-medium">
                              Total: {formatPrice(stop.accommodation.pricePerNight * stop.daysPlanned, stop.accommodation.currency)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Hotel options */}
                    <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                      {isHotelSearching ? (
                        <div className="flex items-center justify-center py-6 text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          <span className="text-sm">Searching hotels...</span>
                        </div>
                      ) : hotels.length > 0 ? (
                        hotels.map((hotel) => (
                          <HotelCard 
                            key={hotel.id} 
                            hotel={hotel} 
                            nights={stop.daysPlanned}
                            isSelected={stop.accommodation?.id === hotel.id}
                            onSelect={() => selectHotelForStop(stop.id, hotel)}
                          />
                        ))
                      ) : hasSearched ? (
                        <p className="text-center text-sm text-slate-500 py-4">
                          No hotels found matching your filters
                        </p>
                      ) : (
                        <p className="text-center text-sm text-slate-500 py-4">
                          Click "Search All Hotels" to find accommodations
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>
      
      {/* Total cost footer */}
      {selectedHotelCount > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mt-4 pt-4 border-t border-slate-700/50"
        >
          <Card variant="glass" className="p-4 bg-gradient-to-br from-alpine-500/20 to-emerald-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-alpine-500/30 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-alpine-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total Accommodation</p>
                  <p className="text-xs text-slate-500">{totalNights} nights · {selectedHotelCount} hotels</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{formatPrice(totalCost, currency)}</p>
                <p className="text-xs text-slate-400">
                  ~{formatPrice(totalCost / totalNights, currency)}/night avg
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// Hotel card component
function HotelCard({ 
  hotel, 
  nights, 
  isSelected, 
  onSelect 
}: { 
  hotel: Accommodation; 
  nights: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div 
      className={cn(
        'p-2.5 rounded-lg border transition-all cursor-pointer',
        isSelected 
          ? 'bg-emerald-500/10 border-emerald-500/50' 
          : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50'
      )}
      onClick={onSelect}
    >
      <div className="flex gap-3">
        <div className="w-16 h-16 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0">
          {hotel.imageUrl ? (
            <img 
              src={hotel.imageUrl} 
              alt={hotel.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Hotel className="w-6 h-6 text-slate-500" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h5 className="font-medium text-white truncate text-sm">{hotel.name}</h5>
            {isSelected && (
              <Check size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            )}
          </div>
          <p className="text-xs text-slate-500 truncate">{hotel.address}</p>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1">
              <Star size={10} className="text-sunset-400 fill-sunset-400" />
              <span className="text-xs text-white">{hotel.rating}</span>
            </div>
            <span className="text-xs text-slate-500">
              {hotel.reviewCount.toLocaleString()} reviews
            </span>
            {hotel.stars && (
              <span className="text-xs text-slate-400">{hotel.stars}★</span>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="text-sm font-semibold text-alpine-400">
                {formatPrice(hotel.pricePerNight, hotel.currency)}
              </span>
              <span className="text-xs text-slate-500">/night</span>
            </div>
            <span className="text-xs font-medium text-slate-300">
              Total: {formatPrice(hotel.pricePerNight * nights, hotel.currency)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-1.5 mt-2">
        {hotel.amenities.slice(0, 4).map((amenity: string) => (
          <Badge key={amenity} variant="default" size="sm" className="text-[10px]">
            {amenity}
          </Badge>
        ))}
      </div>
    </div>
  );
}

interface FlightResult {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  departure: { airport: string; time: string; date: string };
  arrival: { airport: string; time: string; date: string };
  duration: string;
  durationMinutes: number;
  stops: number;
  price: number;
  currency: string;
  cabinClass: string;
  seatsAvailable: number;
  bookingUrl: string;
  segments: {
    departure: { airport: string; time: string };
    arrival: { airport: string; time: string };
    airline: string;
    flightNumber: string;
    duration: string;
  }[];
}

// Grouped flight results by origin airport
interface FlightsByOrigin {
  origin: OriginAirport;
  outbound: FlightResult[];
  return: FlightResult[];
  cheapestOutbound: FlightResult | null;
  cheapestReturn: FlightResult | null;
}

function FlightsTabContent() {
  const { 
    currentTrip, 
    homeAirport,
    setHomeAirport,
    destinationAirport: storeDestAirport,
    returnAirport: storeReturnAirport,
  } = useTripStore();
  
  // Local state for airports (initialized from store)
  const [localDestAirport, setLocalDestAirport] = useState<Airport | null>(null);
  const [localReturnAirport, setLocalReturnAirport] = useState<Airport | null>(null);
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [directOnly, setDirectOnly] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [flightsByOrigin, setFlightsByOrigin] = useState<FlightsByOrigin[]>([]);
  const [selectedOutbound, setSelectedOutbound] = useState<FlightResult | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<FlightResult | null>(null);
  const [showLateArrivalPrompt, setShowLateArrivalPrompt] = useState(false);
  const [pendingOutboundFlight, setPendingOutboundFlight] = useState<FlightResult | null>(null);
  
  // Get first and last destinations for suggestions
  const firstStop = currentTrip?.stops[0];
  const lastStop = currentTrip?.stops[currentTrip.stops.length - 1];
  
  // Sync local destination airport from store (auto-detected)
  useEffect(() => {
    if (storeDestAirport && !localDestAirport) {
      setLocalDestAirport({
        code: storeDestAirport.code,
        icao: storeDestAirport.icao || '',
        name: storeDestAirport.name,
        city: storeDestAirport.city,
        country: storeDestAirport.country || '',
        countryCode: storeDestAirport.countryCode || '',
        type: 'AIRPORT',
        lat: storeDestAirport.lat || 0,
        lng: storeDestAirport.lng || 0,
      });
    }
  }, [storeDestAirport, localDestAirport]);
  
  // Sync local return airport from store (auto-detected)
  useEffect(() => {
    if (storeReturnAirport && !localReturnAirport) {
      setLocalReturnAirport({
        code: storeReturnAirport.code,
        icao: storeReturnAirport.icao || '',
        name: storeReturnAirport.name,
        city: storeReturnAirport.city,
        country: storeReturnAirport.country || '',
        countryCode: storeReturnAirport.countryCode || '',
        type: 'AIRPORT',
        lat: storeReturnAirport.lat || 0,
        lng: storeReturnAirport.lng || 0,
      });
    }
  }, [storeReturnAirport, localReturnAirport]);
  
  // Pre-populate departure date from trip start date
  useEffect(() => {
    if (currentTrip?.startDate && !departureDate) {
      const date = new Date(currentTrip.startDate);
      setDepartureDate(date.toISOString().split('T')[0]);
    }
  }, [currentTrip?.startDate, departureDate]);
  
  // Pre-populate return date from trip end date
  useEffect(() => {
    if (currentTrip?.endDate && !returnDate) {
      const date = new Date(currentTrip.endDate);
      setReturnDate(date.toISOString().split('T')[0]);
    }
  }, [currentTrip?.endDate, returnDate]);
  
  // Use local airports for search
  const destinationCode = localDestAirport?.code || '';
  const returnCode = localReturnAirport?.code || destinationCode;
  
  // Build origin airports array from home airport
  const originAirports = homeAirport ? [homeAirport] : [];
  
  // Get store actions for airport night
  const { setAirportNightNeeded, airportNightNeeded } = useTripStore();
  
  // Check if arrival time is late (after 6 PM)
  const isLateArrival = (arrivalTime: string): boolean => {
    const [hours] = arrivalTime.split(':').map(Number);
    return hours >= 18; // 6 PM or later
  };
  
  // Handle outbound flight selection with late arrival check
  const handleSelectOutbound = (flight: FlightResult) => {
    if (isLateArrival(flight.arrival.time)) {
      // Late arrival - show prompt
      setPendingOutboundFlight(flight);
      setShowLateArrivalPrompt(true);
    } else {
      // Normal arrival - select directly
      setSelectedOutbound(flight);
      setAirportNightNeeded(false);
    }
  };
  
  // Confirm late arrival with airport night
  const confirmAirportNight = (addNight: boolean) => {
    if (pendingOutboundFlight) {
      setSelectedOutbound(pendingOutboundFlight);
      setAirportNightNeeded(addNight);
    }
    setShowLateArrivalPrompt(false);
    setPendingOutboundFlight(null);
  };
  
  // Handle home airport selection change
  const handleHomeAirportChange = (airports: Airport[]) => {
    if (airports.length > 0) {
      const a = airports[0];
      setHomeAirport({
        code: a.code,
        icao: a.icao,
        name: a.name,
        city: a.city,
        country: a.country,
        countryCode: a.countryCode,
        lat: a.lat,
        lng: a.lng,
      });
    } else {
      setHomeAirport(null);
    }
  };
  
  const handleSearch = async () => {
    if (!destinationCode || !departureDate || originAirports.length === 0) return;
    
    setIsSearching(true);
    setFlightsByOrigin([]);
    
    try {
      // Search flights from ALL origin airports in parallel
      const searchPromises = originAirports.map(async (origin) => {
        const results: FlightsByOrigin = {
          origin,
          outbound: [],
          return: [],
          cheapestOutbound: null,
          cheapestReturn: null,
        };
        
        // Search outbound flights
        try {
          const outboundRes = await fetch('/api/search/flights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origin: origin.code,
              destination: destinationCode,
              departureDate,
              passengers,
              directOnly,
            }),
          });
          
          if (outboundRes.ok) {
            const { results: flights } = await outboundRes.json();
            results.outbound = flights;
            if (flights.length > 0) {
              results.cheapestOutbound = flights.reduce((min: FlightResult, f: FlightResult) => 
                f.price < min.price ? f : min, flights[0]);
            }
          }
        } catch (error) {
          console.error(`Outbound search failed for ${origin.code}:`, error);
        }
        
        // Search return flights if return date specified
        if (returnDate && returnCode) {
          try {
            const returnRes = await fetch('/api/search/flights', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                origin: returnCode,
                destination: origin.code,
                departureDate: returnDate,
                passengers,
                directOnly,
              }),
            });
            
            if (returnRes.ok) {
              const { results: flights } = await returnRes.json();
              results.return = flights;
              if (flights.length > 0) {
                results.cheapestReturn = flights.reduce((min: FlightResult, f: FlightResult) => 
                  f.price < min.price ? f : min, flights[0]);
              }
            }
          } catch (error) {
            console.error(`Return search failed for ${origin.code}:`, error);
          }
        }
        
        return results;
      });
      
      const results = await Promise.all(searchPromises);
      setFlightsByOrigin(results);
    } catch (error) {
      console.error('Flight search error:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Find the overall cheapest flights
  const allOutboundFlights = flightsByOrigin.flatMap(f => f.outbound);
  const allReturnFlights = flightsByOrigin.flatMap(f => f.return);
  const overallCheapestOutbound = allOutboundFlights.length > 0 
    ? allOutboundFlights.reduce((min, f) => f.price < min.price ? f : min, allOutboundFlights[0])
    : null;
  const overallCheapestReturn = allReturnFlights.length > 0
    ? allReturnFlights.reduce((min, f) => f.price < min.price ? f : min, allReturnFlights[0])
    : null;
  
  const totalFlightCost = (selectedOutbound?.price || 0) + (selectedReturn?.price || 0);
  
  // Calculate savings if user picks cheapest option
  const mostExpensiveOutbound = allOutboundFlights.length > 0
    ? Math.max(...allOutboundFlights.map(f => f.price))
    : 0;
  const potentialSavings = overallCheapestOutbound 
    ? mostExpensiveOutbound - overallCheapestOutbound.price 
    : 0;
  
  if (!firstStop) {
    return (
      <Card variant="glass" className="text-center py-8">
        <Plane className="w-12 h-12 mx-auto mb-4 text-slate-500" />
        <p className="text-slate-400 mb-2">Add destinations first</p>
        <p className="text-sm text-slate-500">
          Add stops to your trip to search for flights
        </p>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Late arrival prompt modal */}
      <AnimatePresence>
        {showLateArrivalPrompt && pendingOutboundFlight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md mx-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Late Arrival</h3>
                  <p className="text-sm text-slate-400">Your flight lands at night</p>
                </div>
              </div>
              
              <p className="text-slate-300 mb-4">
                Your flight lands at <strong className="text-white">{pendingOutboundFlight.arrival.time}</strong>. 
                Would you like to add a hotel night near the airport before starting your road trip?
              </p>
              
              <div className="bg-slate-900/50 rounded-lg p-3 mb-4 text-sm">
                <div className="flex items-center gap-2 text-slate-400">
                  <Plane size={14} />
                  <span>{pendingOutboundFlight.departure.airport} → {pendingOutboundFlight.arrival.airport}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 mt-1">
                  <MapPin size={14} />
                  <span>Arriving {pendingOutboundFlight.arrival.date} at {pendingOutboundFlight.arrival.time}</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => confirmAirportNight(false)}
                >
                  No, skip hotel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => confirmAirportNight(true)}
                >
                  <Hotel size={16} />
                  Yes, add night
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Airport night indicator */}
      {airportNightNeeded && selectedOutbound && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <Hotel size={16} className="text-amber-400" />
          <div className="flex-1">
            <p className="text-sm text-amber-300">
              Airport hotel night will be added to your trip
            </p>
            <p className="text-xs text-amber-400/70">
              Near {selectedOutbound.arrival.airport} on {selectedOutbound.arrival.date}
            </p>
          </div>
          <button
            onClick={() => setAirportNightNeeded(false)}
            className="p-1 hover:bg-amber-500/20 rounded text-amber-400"
          >
            <X size={14} />
          </button>
        </div>
      )}
      
      {/* Search form */}
      <Card variant="default" className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Plane className="w-5 h-5 text-alpine-400" />
          <h3 className="font-medium text-white">Flight Search</h3>
          <Badge variant="info" size="sm">Amadeus</Badge>
        </div>
        
        {/* Home Airport (single select) */}
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">
            From (your home airport)
            {homeAirport && <span className="text-alpine-400 ml-1">✓ Auto-saved</span>}
          </label>
          <AirportSearch
            value={homeAirport ? [{
              code: homeAirport.code,
              icao: homeAirport.icao || '',
              name: homeAirport.name,
              city: homeAirport.city,
              country: homeAirport.country || '',
              countryCode: homeAirport.countryCode || '',
              type: 'AIRPORT' as const,
              lat: homeAirport.lat || 0,
              lng: homeAirport.lng || 0,
            }] : []}
            onChange={handleHomeAirportChange}
            placeholder="Search your home airport..."
            multiple={false}
            maxSelections={1}
          />
        </div>
        
        {/* Destination airport (auto-detected from first stop) */}
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">
            To
            {storeDestAirport && localDestAirport?.code === storeDestAirport.code && (
              <span className="text-alpine-400 ml-1">• Auto-detected from first stop</span>
            )}
          </label>
          <AirportSearch
            value={localDestAirport ? [{
              code: localDestAirport.code,
              icao: localDestAirport.icao || '',
              name: localDestAirport.name,
              city: localDestAirport.city,
              country: localDestAirport.country,
              countryCode: localDestAirport.countryCode,
              type: 'AIRPORT' as const,
              lat: localDestAirport.lat,
              lng: localDestAirport.lng,
            }] : []}
            onChange={(airports) => setLocalDestAirport(airports[0] || null)}
            placeholder="Search destination airport..."
            multiple={false}
            maxSelections={1}
          />
        </div>
        
        {/* Return airport (auto-detected from last stop, shown when return date set) */}
        {returnDate && (
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">
              Return from
              {storeReturnAirport && localReturnAirport?.code === storeReturnAirport.code && (
                <span className="text-alpine-400 ml-1">• Auto-detected from last stop</span>
              )}
              {!localReturnAirport && localDestAirport && (
                <span className="text-slate-500 ml-1">(defaults to destination)</span>
              )}
            </label>
            <AirportSearch
              value={localReturnAirport ? [{
                code: localReturnAirport.code,
                icao: localReturnAirport.icao || '',
                name: localReturnAirport.name,
                city: localReturnAirport.city,
                country: localReturnAirport.country,
                countryCode: localReturnAirport.countryCode,
                type: 'AIRPORT' as const,
                lat: localReturnAirport.lat,
                lng: localReturnAirport.lng,
              }] : []}
              onChange={(airports) => setLocalReturnAirport(airports[0] || null)}
              placeholder="Same as destination (or search different)"
              multiple={false}
              maxSelections={1}
            />
          </div>
        )}
        
        {/* Dates */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Departure</label>
            <Input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Return</label>
            <Input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
        
        {/* Options */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Passengers</label>
            <select
              value={passengers}
              onChange={(e) => setPassengers(Number(e.target.value))}
              className="h-8 px-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-white"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={directOnly}
              onChange={(e) => setDirectOnly(e.target.checked)}
              className="rounded border-slate-600"
            />
            Direct flights only
          </label>
        </div>
        
        <Button 
          onClick={handleSearch} 
          isLoading={isSearching} 
          disabled={!departureDate || !homeAirport || !destinationCode}
          className="w-full"
        >
          <Search size={16} />
          Search Flights
        </Button>
      </Card>
      
      {/* Savings banner */}
      {potentialSavings > 10 && overallCheapestOutbound && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <Sparkles size={16} className="text-emerald-400" />
          <p className="text-sm text-emerald-300">
            Flying from <strong>{flightsByOrigin.find(f => f.outbound.some(fl => fl.id === overallCheapestOutbound.id))?.origin.code}</strong> saves up to <strong>{formatPrice(potentialSavings, 'EUR')}</strong>!
          </p>
        </div>
      )}
      
      {/* Grouped flight results by origin */}
      {flightsByOrigin.map((originData) => {
        const hasFlights = originData.outbound.length > 0 || originData.return.length > 0;
        if (!hasFlights) return null;
        
        return (
          <div key={originData.origin.code} className="space-y-2">
            {/* Outbound from this origin */}
            {originData.outbound.length > 0 && (
              <>
                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                  <Plane size={14} className="text-alpine-400" />
                  From {originData.origin.city} ({originData.origin.code}) → {localDestAirport?.city || destinationCode} ({destinationCode})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {originData.outbound.slice(0, 5).map((flight) => (
                    <FlightCard
                      key={flight.id}
                      flight={flight}
                      isSelected={selectedOutbound?.id === flight.id}
                      onSelect={() => handleSelectOutbound(flight)}
                      isCheapest={flight.id === overallCheapestOutbound?.id}
                    />
                  ))}
                </div>
              </>
            )}
            
            {/* Return to this origin */}
            {originData.return.length > 0 && (
              <>
                <h4 className="text-sm font-medium text-white flex items-center gap-2 mt-3">
                  <Plane size={14} className="text-sunset-400 rotate-180" />
                  Return {localReturnAirport?.city || localDestAirport?.city || returnCode} ({returnCode}) → {originData.origin.city} ({originData.origin.code})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {originData.return.slice(0, 5).map((flight) => (
                    <FlightCard
                      key={flight.id}
                      flight={flight}
                      isSelected={selectedReturn?.id === flight.id}
                      onSelect={() => setSelectedReturn(flight)}
                      isCheapest={flight.id === overallCheapestReturn?.id}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
      
      {/* No results message */}
      {flightsByOrigin.length > 0 && flightsByOrigin.every(f => f.outbound.length === 0 && f.return.length === 0) && (
        <Card variant="glass" className="text-center py-6">
          <Plane className="w-10 h-10 mx-auto mb-3 text-slate-500" />
          <p className="text-slate-400 mb-1">No flights found</p>
          <p className="text-sm text-slate-500">
            Try different dates or airports
          </p>
        </Card>
      )}
      
      {/* Total cost */}
      {(selectedOutbound || selectedReturn) && (
        <Card variant="glass" className="p-4 bg-gradient-to-br from-alpine-500/20 to-emerald-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Flights</p>
              <p className="text-xs text-slate-500">
                {selectedOutbound ? '1 outbound' : ''}
                {selectedOutbound && selectedReturn ? ' + ' : ''}
                {selectedReturn ? '1 return' : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{formatPrice(totalFlightCost * passengers, 'EUR')}</p>
              <p className="text-xs text-slate-400">{passengers} passenger{passengers > 1 ? 's' : ''}</p>
            </div>
          </div>
        </Card>
      )}
      
      {/* Loading state */}
      {isSearching && (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Searching flights via Amadeus...</span>
        </div>
      )}
    </div>
  );
}

function FlightCard({ 
  flight, 
  isSelected, 
  onSelect,
  isCheapest = false,
}: { 
  flight: FlightResult; 
  isSelected: boolean;
  onSelect: () => void;
  isCheapest?: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-all relative',
        isSelected
          ? 'bg-alpine-500/10 border-alpine-500/50'
          : isCheapest
            ? 'bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50'
            : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50'
      )}
    >
      {/* Best Deal badge */}
      {isCheapest && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full shadow-lg">
          <Award size={10} />
          BEST DEAL
        </div>
      )}
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white text-sm">{flight.airline}</span>
          <span className="text-xs text-slate-500">{flight.flightNumber}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {flight.stops === 0 && (
            <Badge variant="success" size="sm">Direct</Badge>
          )}
          {isSelected && <Check size={14} className="text-alpine-400" />}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className="text-lg font-semibold text-white">{flight.departure.time}</p>
          <p className="text-xs text-slate-400">{flight.departure.airport}</p>
        </div>
        
        <div className="flex-1 px-4">
          <div className="relative">
            <div className="h-px bg-slate-600" />
            <Plane size={12} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-500" />
          </div>
          <p className="text-center text-[10px] text-slate-500 mt-1">{flight.duration}</p>
        </div>
        
        <div className="text-center">
          <p className="text-lg font-semibold text-white">{flight.arrival.time}</p>
          <p className="text-xs text-slate-400">{flight.arrival.airport}</p>
        </div>
        
        <div className="text-right ml-4">
          <p className="text-lg font-bold text-alpine-400">{formatPrice(flight.price, flight.currency)}</p>
          <p className="text-[10px] text-slate-500">{flight.seatsAvailable} seats left</p>
        </div>
      </div>
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
