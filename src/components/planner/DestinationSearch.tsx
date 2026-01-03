'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Loader2, X, Navigation } from 'lucide-react';
import { useTripStore } from '@/store/tripStore';
import { Location } from '@/types';
import { cn, getCountryFlag } from '@/lib/utils';
import toast from 'react-hot-toast';

interface SearchResult {
  id: string;
  place_name: string;
  text: string;
  center: [number, number]; // [lng, lat]
  context?: Array<{ id: string; text: string; short_code?: string }>;
}

export function DestinationSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  
  const { addStop } = useTripStore();
  
  // Search for destinations using Mapbox Geocoding API
  const searchDestinations = async (searchQuery: string) => {
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
      // Focus on places (cities, towns, etc.) and limit to Europe for better results
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?` +
        `access_token=${token}&` +
        `types=place,locality,neighborhood,poi&` +
        `limit=6&` +
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
      searchDestinations(query);
    }, 300);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);
  
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
    
    const location: Location = {
      name: result.text,
      city: result.text,
      country: countryContext?.text || 'Unknown',
      countryCode: countryContext?.short_code?.toUpperCase() || '',
      lat: result.center[1],
      lng: result.center[0],
      placeId: result.id,
    };
    
    addStop(location);
    toast.success(`Added ${location.name} to your trip!`);
    
    // Reset search
    setQuery('');
    setResults([]);
    setIsFocused(false);
  };
  
  const showDropdown = isFocused && (results.length > 0 || isSearching || query.length >= 2);
  
  return (
    <div className="relative">
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
          placeholder="Search for a destination..."
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
                
                return (
                  <button
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    className={cn(
                      'w-full px-4 py-3 flex items-center gap-3 text-left',
                      'hover:bg-slate-700/50 transition-colors'
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-alpine-500/20 flex items-center justify-center flex-shrink-0">
                      <MapPin size={16} className="text-alpine-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">
                          {result.text}
                        </span>
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
              <span className="text-sm">No destinations found</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

