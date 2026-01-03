'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Plane, Hotel, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OriginAirport } from '@/store/tripStore';

interface PriceData {
  flight: number;
  hotel: number;
  total: number;
}

interface DayPriceData {
  date: string;
  origins: Record<string, PriceData>;
  bestOrigin: string;
  bestPrice: number;
  hotelEstimate: number;
  tier: 'low' | 'mid' | 'high';
}

interface CalendarPriceResponse {
  prices: Record<string, DayPriceData>;
  priceRange: { min: number; max: number };
  source: 'amadeus' | 'mock';
}

interface PriceCalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  originAirports: OriginAirport[];
  destinationCities: string[];
  tripDuration: number;
  className?: string;
  hotelBudgetPerNight?: number;
  destinationAirport?: string; // IATA code
  returnAirport?: string; // IATA code
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function PriceCalendar({
  selectedDate,
  onDateSelect,
  originAirports,
  destinationCities,
  tripDuration,
  className,
  hotelBudgetPerNight = 100,
  destinationAirport,
  returnAirport,
}: PriceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = selectedDate || new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });
  
  const [priceData, setPriceData] = useState<CalendarPriceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const calendarRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Fetch price data when month or inputs change
  const fetchPrices = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Don't fetch if no origin airports or destinations
    if (originAirports.length === 0 || destinationCities.length === 0) {
      setPriceData(null);
      return;
    }
    
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/prices/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originAirports,
          destinationCities,
          destinationAirport,
          returnAirport,
          month: currentMonth.month,
          year: currentMonth.year,
          tripDuration,
          hotelBudgetPerNight,
        }),
        signal: abortControllerRef.current.signal,
      });
      
      if (response.ok) {
        const data = await response.json();
        setPriceData(data);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to fetch calendar prices:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [originAirports, destinationCities, destinationAirport, returnAirport, currentMonth, tripDuration, hotelBudgetPerNight]);
  
  useEffect(() => {
    fetchPrices();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPrices]);
  
  // Generate calendar days
  const generateCalendarDays = () => {
    const firstDay = new Date(currentMonth.year, currentMonth.month - 1, 1);
    const lastDay = new Date(currentMonth.year, currentMonth.month, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get day of week (0 = Sunday, adjust for Monday start)
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1; // Convert to Monday = 0
    
    const days: (number | null)[] = [];
    
    // Add empty cells for days before the first
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // Add the days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };
  
  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 1) {
        return { month: 12, year: prev.year - 1 };
      }
      return { month: prev.month - 1, year: prev.year };
    });
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 12) {
        return { month: 1, year: prev.year + 1 };
      }
      return { month: prev.month + 1, year: prev.year };
    });
  };
  
  const handleDateClick = (day: number) => {
    const date = new Date(currentMonth.year, currentMonth.month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date >= today) {
      onDateSelect(date);
    }
  };
  
  const handleDayHover = (day: number, e: React.MouseEvent) => {
    const dateStr = new Date(currentMonth.year, currentMonth.month - 1, day).toISOString().split('T')[0];
    setHoveredDate(dateStr);
    
    if (calendarRef.current) {
      const rect = calendarRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };
  
  const getTierColor = (tier: 'low' | 'mid' | 'high') => {
    switch (tier) {
      case 'low':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'mid':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/25';
      case 'high':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    }
  };
  
  const getTierBgColor = (tier: 'low' | 'mid' | 'high') => {
    switch (tier) {
      case 'low':
        return 'bg-emerald-500/10';
      case 'mid':
        return 'bg-amber-500/5';
      case 'high':
        return 'bg-rose-500/10';
    }
  };
  
  const days = generateCalendarDays();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const hoveredPriceData = hoveredDate && priceData?.prices[hoveredDate];
  
  return (
    <div ref={calendarRef} className={cn('relative', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white">
            {MONTHS[currentMonth.month - 1]} {currentMonth.year}
          </h3>
          {isLoading && (
            <p className="text-xs text-alpine-400 flex items-center justify-center gap-1 mt-1">
              <Loader2 size={12} className="animate-spin" />
              Analyzing prices...
            </p>
          )}
        </div>
        
        <button
          onClick={handleNextMonth}
          className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mb-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
          <span className="text-slate-400">Low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" />
          <span className="text-slate-400">Average</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-rose-500/30 border border-rose-500/50" />
          <span className="text-slate-400">High</span>
        </div>
      </div>
      
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="text-center text-xs text-slate-500 font-medium py-1"
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }
          
          const dateStr = new Date(currentMonth.year, currentMonth.month - 1, day).toISOString().split('T')[0];
          const date = new Date(currentMonth.year, currentMonth.month - 1, day);
          const isPast = date < today;
          const isSelected = selectedDate && 
            date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear();
          const isToday = date.getTime() === today.getTime();
          
          const dayPrice = priceData?.prices[dateStr];
          const tier = dayPrice?.tier || 'mid';
          
          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              onMouseEnter={(e) => handleDayHover(day, e)}
              onMouseLeave={() => setHoveredDate(null)}
              disabled={isPast}
              className={cn(
                'aspect-square rounded-lg flex flex-col items-center justify-center',
                'text-sm transition-all relative group',
                isPast
                  ? 'opacity-30 cursor-not-allowed bg-slate-800/30'
                  : 'cursor-pointer hover:ring-2 hover:ring-alpine-500/50',
                isSelected
                  ? 'ring-2 ring-alpine-500 bg-alpine-500/20'
                  : !isPast && getTierBgColor(tier),
                isToday && 'ring-1 ring-slate-500'
              )}
            >
              <span className={cn(
                'font-medium',
                isSelected ? 'text-alpine-300' : isPast ? 'text-slate-600' : 'text-white'
              )}>
                {day}
              </span>
              
              {/* Price indicator */}
              {dayPrice && !isPast && (
                <span className={cn(
                  'text-[9px] font-medium mt-0.5',
                  tier === 'low' && 'text-emerald-400',
                  tier === 'mid' && 'text-amber-400',
                  tier === 'high' && 'text-rose-400'
                )}>
                  {formatPrice(dayPrice.bestPrice)}
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Price tooltip */}
      {hoveredDate && hoveredPriceData && (
        <div
          className={cn(
            'absolute z-50 pointer-events-none',
            'bg-slate-800 border border-slate-700 rounded-xl shadow-xl',
            'p-3 min-w-[200px]',
            'animate-fade-in'
          )}
          style={{
            left: Math.min(tooltipPosition.x, 180),
            top: tooltipPosition.y + 20,
          }}
        >
          <div className="text-sm text-slate-400 mb-2">
            {new Date(hoveredDate).toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })}
          </div>
          
          {/* Best deal */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
            <div className={cn(
              'px-2 py-0.5 rounded text-xs font-bold',
              getTierColor(hoveredPriceData.tier)
            )}>
              {hoveredPriceData.tier === 'low' ? 'GREAT DEAL' : 
               hoveredPriceData.tier === 'mid' ? 'AVERAGE' : 'PEAK PRICE'}
            </div>
            <span className="text-white font-bold">
              {formatPrice(hoveredPriceData.bestPrice)}
            </span>
          </div>
          
          {/* Breakdown by origin */}
          <div className="space-y-1.5">
            <p className="text-xs text-slate-500 mb-1">Price by origin:</p>
            {Object.entries(hoveredPriceData.origins).map(([code, prices]) => (
              <div 
                key={code} 
                className={cn(
                  'flex items-center justify-between text-xs',
                  code === hoveredPriceData.bestOrigin && 'font-medium'
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Plane size={10} className="text-slate-500" />
                  <span className={code === hoveredPriceData.bestOrigin ? 'text-alpine-300' : 'text-slate-400'}>
                    {code}
                  </span>
                  {code === hoveredPriceData.bestOrigin && (
                    <span className="text-emerald-400 text-[10px]">✓ Best</span>
                  )}
                </div>
                <span className={code === hoveredPriceData.bestOrigin ? 'text-white' : 'text-slate-400'}>
                  {formatPrice(prices.flight)}
                </span>
              </div>
            ))}
          </div>
          
          {/* Hotel estimate */}
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-700">
            <div className="flex items-center gap-1.5">
              <Hotel size={10} className="text-slate-500" />
              <span className="text-slate-400">Hotels ({tripDuration} nights)</span>
            </div>
            <span className="text-slate-400">{formatPrice(hoveredPriceData.hotelEstimate)}</span>
          </div>
        </div>
      )}
      
      {/* No data message */}
      {!isLoading && originAirports.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-xl">
          <div className="text-center p-4">
            <Calendar size={24} className="mx-auto mb-2 text-slate-500" />
            <p className="text-sm text-slate-400">Add origin airports to see price analysis</p>
          </div>
        </div>
      )}
    </div>
  );
}

