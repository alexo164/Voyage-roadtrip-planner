'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Plane, Loader2, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Airport {
  code: string;        // IATA code (e.g., DUB)
  icao: string;        // ICAO code (e.g., EIDW)
  name: string;
  city: string;
  country: string;
  countryCode: string;
  type: 'AIRPORT';
  lat: number;
  lng: number;
}

interface AirportSearchProps {
  value: Airport[];
  onChange: (airports: Airport[]) => void;
  placeholder?: string;
  multiple?: boolean;
  maxSelections?: number;
  className?: string;
}

// Simple cache for airport search results with TTL (5 minutes)
const searchCache = new Map<string, { results: Airport[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedResults(key: string): Airport[] | null {
  const cached = searchCache.get(key);
  if (!cached) return null;
  
  // Check if cache is expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }
  
  return cached.results;
}

function setCachedResults(key: string, results: Airport[]): void {
  if (results.length > 0) {
    searchCache.set(key, { results, timestamp: Date.now() });
  }
}

export function AirportSearch({
  value = [],
  onChange,
  placeholder = 'Search airports...',
  multiple = false,
  maxSelections = 4,
  className,
}: AirportSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Airport[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Search airports
  const searchAirports = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    // Check cache first
    const cacheKey = searchQuery.toLowerCase();
    const cachedResults = getCachedResults(cacheKey);
    if (cachedResults) {
      setResults(cachedResults);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(`/api/search/airports?q=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      const airports: Airport[] = data.results || [];
      
      console.log(`Airport search for "${searchQuery}": ${airports.length} results`);
      
      // Only cache non-empty results
      setCachedResults(cacheKey, airports);
      
      setResults(airports);
    } catch (error) {
      console.error('Airport search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAirports(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchAirports]);

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

  const handleSelect = (airport: Airport) => {
    // Check if already selected
    if (value.some((a) => a.code === airport.code)) {
      return;
    }

    if (multiple) {
      // Check max selections
      if (value.length >= maxSelections) {
        return;
      }
      onChange([...value, airport]);
    } else {
      onChange([airport]);
    }

    setQuery('');
    setResults([]);
    setIsFocused(false);
  };

  const handleRemove = (code: string) => {
    onChange(value.filter((a) => a.code !== code));
  };

  const showDropdown = isFocused && (results.length > 0 || isSearching || query.length >= 2);
  const canAddMore = multiple && value.length < maxSelections;

  return (
    <div className={cn('relative', className)}>
      {/* Selected airports as chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((airport) => (
            <div
              key={airport.code}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm',
                'bg-alpine-500/20 text-alpine-300 border border-alpine-500/30'
              )}
            >
              <Plane size={12} />
              <span className="font-medium">{airport.code}</span>
              <span className="text-alpine-400/70">·</span>
              <span className="text-alpine-400/70 text-xs">{airport.city}</span>
              <button
                onClick={() => handleRemove(airport.code)}
                className="ml-1 p-0.5 hover:bg-alpine-500/30 rounded transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input - only show if can add more */}
      {(value.length === 0 || canAddMore) && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isSearching ? (
              <Loader2 size={16} className="text-slate-400 animate-spin" />
            ) : value.length > 0 ? (
              <Plus size={16} className="text-slate-400" />
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
            placeholder={value.length > 0 ? 'Add another airport...' : placeholder}
            className={cn(
              'w-full h-9 pl-10 pr-10 rounded-lg',
              'bg-slate-800/50 border border-slate-700/50',
              'text-white placeholder:text-slate-500 text-sm',
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
      )}

      {/* Results dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute top-full left-0 right-0 mt-2 z-50',
            'bg-slate-800 border border-slate-700/50 rounded-xl shadow-xl',
            'max-h-64 overflow-y-auto',
            'animate-fade-in'
          )}
        >
          {isSearching ? (
            <div className="p-4 text-center text-slate-400">
              <Loader2 size={20} className="animate-spin mx-auto mb-2" />
              <span className="text-sm">Searching airports...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="py-1">
              {results.map((airport, index) => {
                const isSelected = value.some((a) => a.code === airport.code);
                // Use a unique key combining code, type, and index to handle duplicate codes
                const uniqueKey = `${airport.code}-${airport.type}-${index}`;
                
                return (
                  <button
                    key={uniqueKey}
                    onClick={() => handleSelect(airport)}
                    disabled={isSelected}
                    className={cn(
                      'w-full px-3 py-2.5 flex items-center gap-3 text-left',
                      'transition-colors',
                      isSelected
                        ? 'bg-alpine-500/10 cursor-not-allowed opacity-50'
                        : 'hover:bg-slate-700/50'
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-alpine-500/20 text-alpine-400 font-bold text-xs">
                      {airport.code}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white text-sm truncate">
                          {airport.name}
                        </span>
                        {isSelected && (
                          <span className="text-xs text-alpine-400">Selected</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {airport.city}, {airport.country}
                      </p>
                    </div>
                    <Plane size={14} className="text-slate-500 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-slate-400">
              <Plane size={20} className="mx-auto mb-2 opacity-50" />
              <span className="text-sm">No airports found</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Helper text for multiple selection */}
      {multiple && value.length > 0 && value.length < maxSelections && (
        <p className="text-xs text-slate-500 mt-1.5">
          Add up to {maxSelections - value.length} more airport{maxSelections - value.length !== 1 ? 's' : ''} to compare prices
        </p>
      )}
    </div>
  );
}

