'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, 
  Calendar, 
  Download,
  Share2,
  RotateCcw,
  Settings,
  Sparkles,
  Map,
  ChevronDown,
  X,
  Plane,
  MapPin,
  Clock
} from 'lucide-react';
import { useTripStore, TripAirport } from '@/store/tripStore';
import { Button } from '@/components/ui/Button';
import { formatDate, generateId } from '@/lib/utils';
import { MUNICH_ALPS_TRIP } from '@/lib/sampleTrips';
import { PriceCalendar } from '@/components/ui/PriceCalendar';
import { AirportSearch, Airport } from '@/components/ui/AirportSearch';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export function Header() {
  const { 
    currentTrip, 
    updateTrip, 
    resetTrip, 
    homeAirport,
    setHomeAirport,
    destinationAirport,
    returnAirport,
  } = useTripStore();
  
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showHomeAirportPicker, setShowHomeAirportPicker] = useState(false);
  const startCalendarRef = useRef<HTMLDivElement>(null);
  const homeAirportRef = useRef<HTMLDivElement>(null);
  
  // Get destination cities from stops
  const destinationCities = currentTrip?.stops.map(s => s.location.city).filter(Boolean) || [];
  
  // Calculate trip duration from stops
  const totalNights = currentTrip?.stops.reduce((sum, s) => sum + (s.daysPlanned || 0), 0) || 0;
  const totalStops = currentTrip?.stops.length || 0;
  
  // Calculate total driving time
  const totalDrivingMinutes = currentTrip?.stops.reduce((sum, s, i) => {
    if (i === 0) return 0;
    return sum + (s.distanceFromPrev ? Math.round(s.distanceFromPrev / 80 * 60) : 0);
  }, 0) || 0;
  const drivingHours = Math.floor(totalDrivingMinutes / 60);
  const drivingMins = totalDrivingMinutes % 60;
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (startCalendarRef.current && !startCalendarRef.current.contains(e.target as Node)) {
        setShowStartCalendar(false);
      }
      if (homeAirportRef.current && !homeAirportRef.current.contains(e.target as Node)) {
        setShowHomeAirportPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleReset = () => {
    if (confirm('Are you sure you want to reset your trip? This cannot be undone.')) {
      resetTrip();
      toast.success('Trip reset successfully');
    }
  };
  
  const handleExport = () => {
    if (!currentTrip || currentTrip.stops.length === 0) {
      toast.error('Add some destinations first!');
      return;
    }
    
    const tripData = JSON.stringify(currentTrip, null, 2);
    const blob = new Blob([tripData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTrip.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Trip exported successfully!');
  };
  
  const handleLoadSampleTrip = () => {
    const trip = {
      ...MUNICH_ALPS_TRIP,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      stops: MUNICH_ALPS_TRIP.stops.map(stop => ({
        ...stop,
        id: generateId(),
      })),
    };
    
    updateTrip(trip);
    toast.success('Loaded Alpine Adventure trip! 🏔️');
  };
  
  const handleStartDateSelect = (date: Date) => {
    updateTrip({ startDate: date });
    setShowStartCalendar(false);
    
    // Auto-calculate end date based on total nights
    if (totalNights > 0) {
      const newEndDate = new Date(date);
      newEndDate.setDate(newEndDate.getDate() + totalNights);
      updateTrip({ endDate: newEndDate });
    }
  };
  
  const handleHomeAirportChange = (airports: Airport[]) => {
    if (airports.length > 0) {
      const airport = airports[0];
      setHomeAirport({
        code: airport.code,
        icao: airport.icao,
        name: airport.name,
        city: airport.city,
        country: airport.country,
        countryCode: airport.countryCode,
        lat: airport.lat,
        lng: airport.lng,
      });
      setShowHomeAirportPicker(false);
      toast.success(`Home airport set to ${airport.code}`);
    }
  };
  
  const formatDisplayDate = (date: Date | null): string => {
    if (!date) return 'Select date';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Check if price analysis is available
  const canShowPriceAnalysis = homeAirport && destinationCities.length > 0;
  
  // Build origin airports array for price calendar (use home airport)
  const originAirportsForCalendar = homeAirport ? [homeAirport] : [];
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 glass-strong border-b border-slate-700/50">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-alpine-400 via-alpine-500 to-alpine-600 flex items-center justify-center shadow-lg shadow-alpine-500/30">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-semibold text-white tracking-tight">
              Voyage
            </h1>
            <p className="text-[10px] text-slate-400 -mt-0.5 tracking-wider uppercase">
              Road Trip Planner
            </p>
          </div>
        </div>
        
        {/* Center - Home Airport + Trip Info + Dates */}
        <div className="flex items-center gap-3">
          {/* Home Airport Selector */}
          <div className="relative" ref={homeAirportRef}>
            <button
              onClick={() => setShowHomeAirportPicker(!showHomeAirportPicker)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all',
                homeAirport 
                  ? 'bg-alpine-500/10 border-alpine-500/30 text-alpine-300' 
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600',
                showHomeAirportPicker && 'ring-2 ring-alpine-500/50'
              )}
            >
              <Plane size={14} />
              <span className="text-sm font-medium">
                {homeAirport ? homeAirport.code : 'Set Home'}
              </span>
              <ChevronDown size={12} />
            </button>
            
            {/* Home airport picker dropdown */}
            <AnimatePresence>
              {showHomeAirportPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'absolute top-full left-0 mt-2 z-[100]',
                    'bg-slate-900 border border-slate-700 rounded-xl shadow-2xl',
                    'p-4 w-[320px]'
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-white">Home Airport</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Your base for flights</p>
                    </div>
                    <button
                      onClick={() => setShowHomeAirportPicker(false)}
                      className="p-1 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  <AirportSearch
                    value={homeAirport ? [{
                      code: homeAirport.code,
                      icao: homeAirport.icao || '',
                      name: homeAirport.name,
                      city: homeAirport.city,
                      country: homeAirport.country || '',
                      countryCode: homeAirport.countryCode || '',
                      type: 'AIRPORT',
                      lat: homeAirport.lat || 0,
                      lng: homeAirport.lng || 0,
                    }] : []}
                    onChange={handleHomeAirportChange}
                    placeholder="Search your home airport..."
                    multiple={false}
                    maxSelections={1}
                  />
                  
                  {homeAirport && (
                    <button
                      onClick={() => {
                        setHomeAirport(null);
                        toast('Home airport cleared');
                      }}
                      className="mt-3 text-xs text-slate-500 hover:text-slate-400"
                    >
                      Clear home airport
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Trip Summary */}
          {totalStops > 0 && (
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-800/30 border border-slate-700/30">
              <div className="flex items-center gap-1.5 text-xs">
                <MapPin size={12} className="text-sunset-400" />
                <span className="text-slate-300">{totalStops} stops</span>
              </div>
              <div className="w-px h-4 bg-slate-700" />
              <div className="flex items-center gap-1.5 text-xs">
                <Calendar size={12} className="text-alpine-400" />
                <span className="text-slate-300">{totalNights} nights</span>
              </div>
              {drivingHours > 0 && (
                <>
                  <div className="w-px h-4 bg-slate-700" />
                  <div className="flex items-center gap-1.5 text-xs">
                    <Clock size={12} className="text-purple-400" />
                    <span className="text-slate-300">{drivingHours}h{drivingMins > 0 ? ` ${drivingMins}m` : ''}</span>
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-700/50">
            <Calendar size={14} className="text-sunset-400" />
            
            {/* Start date picker */}
            <div className="relative" ref={startCalendarRef}>
              <button
                onClick={() => setShowStartCalendar(!showStartCalendar)}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-lg transition-colors',
                  'hover:bg-slate-700/50 text-sm',
                  showStartCalendar && 'bg-slate-700/50'
                )}
              >
                <span className={currentTrip?.startDate ? 'text-white' : 'text-slate-400'}>
                  {formatDisplayDate(currentTrip?.startDate || null)}
                </span>
                <ChevronDown size={12} className="text-slate-500" />
              </button>
              
              {/* Start date calendar dropdown */}
              <AnimatePresence>
                {showStartCalendar && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      'absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[100]',
                      'bg-slate-900 border border-slate-700 rounded-xl shadow-2xl',
                      'p-4 min-w-[340px]'
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-700">
                      <div>
                        <h3 className="font-medium text-white">Start Date</h3>
                        {canShowPriceAnalysis && (
                          <p className="text-xs text-alpine-400 flex items-center gap-1 mt-0.5">
                            <Sparkles size={10} />
                            Price analysis enabled
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setShowStartCalendar(false)}
                        className="p-1 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    
                    {/* Trip info */}
                    {totalNights > 0 && (
                      <div className="flex items-center gap-2 mb-3 text-xs">
                        <span className="text-slate-400">Trip duration:</span>
                        <span className="text-white font-medium">{totalNights} nights</span>
                        <span className="text-slate-500">→ End date auto-calculated</span>
                      </div>
                    )}
                    
                    {/* Flight route indicator */}
                    {homeAirport && destinationAirport && (
                      <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-alpine-500/10 border border-alpine-500/20">
                        <Plane size={12} className="text-alpine-400" />
                        <span className="text-xs text-alpine-300">
                          {homeAirport.code} → {destinationAirport.code}
                          {returnAirport && returnAirport.code !== destinationAirport.code && ` → ${returnAirport.code}`}
                        </span>
                      </div>
                    )}
                    
                    {!homeAirport && (
                      <div className="mb-3 p-2 rounded-lg bg-slate-800/50 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Plane size={12} />
                          <span>Set your home airport above to see price analysis</span>
                        </div>
                      </div>
                    )}
                    
                    <PriceCalendar
                      selectedDate={currentTrip?.startDate ? new Date(currentTrip.startDate) : null}
                      onDateSelect={handleStartDateSelect}
                      originAirports={originAirportsForCalendar}
                      destinationCities={destinationCities}
                      tripDuration={totalNights || 7}
                      destinationAirport={destinationAirport?.code}
                      returnAirport={returnAirport?.code}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <span className="text-slate-600">→</span>
            
            {/* End date (auto-calculated) */}
            <span className={cn(
              'text-sm px-2 py-0.5',
              currentTrip?.endDate ? 'text-white' : 'text-slate-500'
            )}>
              {currentTrip?.endDate 
                ? formatDisplayDate(currentTrip.endDate)
                : totalNights > 0 ? 'Auto' : '—'
              }
            </span>
          </div>
        </div>
        
        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          {(!currentTrip || currentTrip.stops.length === 0) && (
            <Button 
              variant="primary" 
              size="sm"
              onClick={handleLoadSampleTrip}
              className="gap-1.5"
            >
              <Map size={16} />
              <span className="hidden sm:inline">Load Sample</span>
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleExport}
            className="gap-1.5"
          >
            <Download size={16} />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => toast('Sharing coming soon!', { icon: '🔗' })}
            className="gap-1.5"
          >
            <Share2 size={16} />
          </Button>
          
          <div className="w-px h-6 bg-slate-700" />
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw size={16} />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => toast('Settings coming soon!', { icon: '⚙️' })}
          >
            <Settings size={16} />
          </Button>
        </div>
      </div>
    </header>
  );
}
