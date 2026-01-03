'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Loader2, X, Navigation, Mountain, Route, Building2, Landmark, Globe } from 'lucide-react';
import { useTripStore } from '@/store/tripStore';
import { Location, DestinationType } from '@/types';
import { cn, getCountryFlag } from '@/lib/utils';
import toast from 'react-hot-toast';

interface SearchResult {
  id: string;
  place_name: string;
  text: string;
  center: [number, number]; // [lng, lat]
  place_type?: string[];
  properties?: {
    category?: string;
    maki?: string;
  };
  context?: Array<{ id: string; text: string; short_code?: string }>;
}

type SearchCategory = 'all' | 'cities' | 'scenic_routes' | 'mountain_passes' | 'landmarks';

interface CategoryConfig {
  label: string;
  icon: React.ElementType;
  types: string;
  description: string;
}

const SEARCH_CATEGORIES: Record<SearchCategory, CategoryConfig> = {
  all: {
    label: 'All',
    icon: Globe,
    types: 'place,locality,poi,poi.landmark,region,district,address',
    description: 'Search everything',
  },
  cities: {
    label: 'Cities',
    icon: Building2,
    types: 'place,locality,neighborhood',
    description: 'Cities & towns',
  },
  scenic_routes: {
    label: 'Routes',
    icon: Route,
    types: 'poi,poi.landmark,region,district',
    description: 'Scenic roads & drives',
  },
  mountain_passes: {
    label: 'Passes',
    icon: Mountain,
    types: 'poi,poi.landmark',
    description: 'Mountain passes',
  },
  landmarks: {
    label: 'Landmarks',
    icon: Landmark,
    types: 'poi,poi.landmark',
    description: 'Points of interest',
  },
};

// Helper to detect destination type from Mapbox result
function detectDestinationType(result: SearchResult, category: SearchCategory): DestinationType {
  const placeType = result.place_type?.[0] || '';
  const categoryStr = result.properties?.category?.toLowerCase() || '';
  const name = result.text.toLowerCase();
  const placeName = result.place_name.toLowerCase();
  
  // Check for mountain passes
  if (
    name.includes('pass') || 
    name.includes('col ') || 
    name.includes('passo') ||
    placeName.includes('pass') ||
    categoryStr.includes('mountain') ||
    category === 'mountain_passes'
  ) {
    return 'mountain_pass';
  }
  
  // Check for scenic routes
  if (
    name.includes('route') || 
    name.includes('way') ||
    name.includes('road') ||
    name.includes('drive') ||
    name.includes('highway') ||
    categoryStr.includes('road') ||
    category === 'scenic_routes'
  ) {
    return 'scenic_route';
  }
  
  // Check for landmarks/POIs
  if (placeType === 'poi' || placeType === 'poi.landmark' || category === 'landmarks') {
    return 'landmark';
  }
  
  // Check for regions
  if (placeType === 'region' || placeType === 'district') {
    return 'region';
  }
  
  // Cities/places
  if (placeType === 'place' || placeType === 'locality' || placeType === 'neighborhood') {
    return 'city';
  }
  
  return 'other';
}

// Get icon for destination type
function getDestinationIcon(destType: DestinationType) {
  switch (destType) {
    case 'mountain_pass':
      return Mountain;
    case 'scenic_route':
      return Route;
    case 'landmark':
      return Landmark;
    case 'region':
      return Globe;
    case 'city':
    default:
      return MapPin;
  }
}

// Get color class for destination type
function getDestinationColor(destType: DestinationType) {
  switch (destType) {
    case 'mountain_pass':
      return 'text-emerald-400 bg-emerald-500/20';
    case 'scenic_route':
      return 'text-amber-400 bg-amber-500/20';
    case 'landmark':
      return 'text-purple-400 bg-purple-500/20';
    case 'region':
      return 'text-cyan-400 bg-cyan-500/20';
    case 'city':
    default:
      return 'text-alpine-400 bg-alpine-500/20';
  }
}

export function DestinationSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  
  const { addStop } = useTripStore();
  
  // Search for destinations using Mapbox Geocoding API
  const searchDestinations = async (searchQuery: string, category: SearchCategory) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      return;
    }
    
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || token === 'pk.your_mapbox_public_token') {
      toast.error('Mapbox token required for search');
      return;
    }
    
    setIsSearching(true);
    
    try {
      const categoryConfig = SEARCH_CATEGORIES[category];
      
      // Build the search query - add category-specific keywords for better results
      let enhancedQuery = searchQuery;
      if (category === 'mountain_passes' && !searchQuery.toLowerCase().includes('pass')) {
        enhancedQuery = `${searchQuery} pass`;
      }
      if (category === 'scenic_routes' && !searchQuery.toLowerCase().includes('route') && !searchQuery.toLowerCase().includes('way')) {
        enhancedQuery = `${searchQuery} route`;
      }
      
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(enhancedQuery)}.json?` +
        `access_token=${token}&` +
        `types=${categoryConfig.types}&` +
        `limit=8&` +
        `language=en`
      );
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setResults(data.features || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      searchDestinations(query, activeCategory);
    }, 300);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, activeCategory]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSelectResult = (result: SearchResult) => {
    const context = result.context || [];
    const countryContext = context.find((c) => c.id.startsWith('country'));
    const regionContext = context.find((c) => c.id.startsWith('region'));
    const placeContext = context.find((c) => c.id.startsWith('place'));
    
    const destinationType = detectDestinationType(result, activeCategory);
    
    // For non-city destinations, use the place from context as the "city" if available
    const cityName = destinationType === 'city' 
      ? result.text 
      : (placeContext?.text || regionContext?.text || result.text);
    
    const location: Location = {
      name: result.text,
      city: cityName,
      country: countryContext?.text || 'Unknown',
      countryCode: countryContext?.short_code?.toUpperCase() || '',
      lat: result.center[1],
      lng: result.center[0],
      placeId: result.id,
      destinationType,
    };
    
    addStop(location);
    
    // Show destination type in toast
    const typeLabel = destinationType === 'mountain_pass' ? '🏔️ Mountain pass' 
      : destinationType === 'scenic_route' ? '🛣️ Scenic route'
      : destinationType === 'landmark' ? '🏛️ Landmark'
      : destinationType === 'region' ? '🌍 Region'
      : '📍 Destination';
    
    toast.success(`Added ${typeLabel}: ${location.name}!`);
    
    // Reset search
    setQuery('');
    setResults([]);
    setIsFocused(false);
  };
  
  const showDropdown = isFocused && (results.length > 0 || isSearching || query.length >= 2);
  
  return (
    <div className="relative">
      {/* Category tabs */}
      <div className="flex gap-1 mb-2 overflow-x-auto pb-1 scrollbar-hide">
        {(Object.entries(SEARCH_CATEGORIES) as [SearchCategory, CategoryConfig][]).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = activeCategory === key;
          return (
            <button
              key={key}
              onClick={() => {
                setActiveCategory(key);
                if (query.length >= 2) {
                  searchDestinations(query, key);
                }
              }}
              title={config.description}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap',
                'transition-all duration-200',
                isActive
                  ? 'bg-alpine-500 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
              )}
            >
              <Icon size={14} />
              {config.label}
            </button>
          );
        })}
      </div>
      
      {/* Search input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <Loader2 size={16} className="text-slate-400 animate-spin" />
          ) : (
            <Search size={16} className="text-slate-400" />
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={
            activeCategory === 'mountain_passes' 
              ? "Search mountain passes (e.g., Brenner, Grossglockner)..."
              : activeCategory === 'scenic_routes'
              ? "Search scenic routes (e.g., Route 66, Wild Atlantic Way)..."
              : activeCategory === 'landmarks'
              ? "Search landmarks and attractions..."
              : "Search for a destination..."
          }
          className={cn(
            'w-full h-10 pl-10 pr-10 rounded-xl',
            'bg-slate-800/50 border border-slate-700/50',
            'text-white placeholder:text-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-alpine-500/50 focus:border-alpine-500',
            'transition-all duration-200'
          )}
        />
        
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>
      
      {/* Results dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute top-full left-0 right-0 mt-2 z-50',
            'bg-slate-800 border border-slate-700/50 rounded-xl shadow-xl',
            'max-h-80 overflow-y-auto',
            'animate-fade-in'
          )}
        >
          {isSearching ? (
            <div className="p-4 text-center text-slate-400">
              <Loader2 size={20} className="animate-spin mx-auto mb-2" />
              <span className="text-sm">Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => {
                const context = result.context || [];
                const countryContext = context.find((c) => c.id.startsWith('country'));
                const countryCode = countryContext?.short_code?.toUpperCase() || '';
                
                // Detect destination type for icon and color
                const destType = detectDestinationType(result, activeCategory);
                const DestIcon = getDestinationIcon(destType);
                const colorClass = getDestinationColor(destType);
                
                // Get a label for the destination type
                const typeLabel = destType === 'mountain_pass' ? 'Pass'
                  : destType === 'scenic_route' ? 'Route'
                  : destType === 'landmark' ? 'Landmark'
                  : destType === 'region' ? 'Region'
                  : null;
                
                return (
                  <button
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    className={cn(
                      'w-full px-4 py-3 flex items-center gap-3 text-left',
                      'hover:bg-slate-700/50 transition-colors'
                    )}
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', colorClass.split(' ')[1])}>
                      <DestIcon size={16} className={colorClass.split(' ')[0]} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">
                          {result.text}
                        </span>
                        {typeLabel && (
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide',
                            colorClass
                          )}>
                            {typeLabel}
                          </span>
                        )}
                        {countryCode && (
                          <span className="text-sm">{getCountryFlag(countryCode)}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 truncate">
                        {result.place_name}
                      </p>
                    </div>
                    <Navigation size={14} className="text-slate-500 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-slate-400">
              <MapPin size={20} className="mx-auto mb-2 opacity-50" />
              <span className="text-sm">No {activeCategory === 'all' ? 'destinations' : SEARCH_CATEGORIES[activeCategory].description.toLowerCase()} found</span>
              {activeCategory !== 'all' && (
                <p className="text-xs mt-1 text-slate-500">
                  Try the "All" tab for broader results
                </p>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

