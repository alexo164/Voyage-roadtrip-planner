'use client';

import { useEffect, useRef } from 'react';
import { useTripStore, TripAirport } from '@/store/tripStore';

/**
 * Hook to auto-detect destination and return airports when stops change
 */
export function useAutoDetectAirports() {
  const { 
    currentTrip, 
    destinationAirport, 
    returnAirport, 
    setDestinationAirport, 
    setReturnAirport 
  } = useTripStore();
  
  const stops = currentTrip?.stops || [];
  const firstStop = stops[0];
  const lastStop = stops[stops.length - 1];
  
  // Track previous stop IDs to detect changes
  const prevFirstStopRef = useRef<string | null>(null);
  const prevLastStopRef = useRef<string | null>(null);
  
  // Fetch nearest airport for coordinates
  const fetchNearestAirport = async (lat: number, lng: number): Promise<TripAirport | null> => {
    try {
      const response = await fetch(`/api/search/airports/nearest?lat=${lat}&lng=${lng}&limit=1`);
      if (!response.ok) return null;
      
      const data = await response.json();
      const results = data.results || [];
      
      if (results.length > 0) {
        const airport = results[0];
        return {
          code: airport.code,
          icao: airport.icao,
          name: airport.name,
          city: airport.city,
          country: airport.country,
          countryCode: airport.countryCode,
          lat: airport.lat,
          lng: airport.lng,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching nearest airport:', error);
      return null;
    }
  };
  
  // Auto-detect destination airport when first stop changes
  useEffect(() => {
    const firstStopId = firstStop?.id;
    
    // Skip if first stop hasn't changed
    if (firstStopId === prevFirstStopRef.current) return;
    prevFirstStopRef.current = firstStopId || null;
    
    // If no first stop, clear destination airport
    if (!firstStop) {
      setDestinationAirport(null);
      return;
    }
    
    // Fetch nearest airport to first stop
    const { lat, lng } = firstStop.location;
    if (lat && lng) {
      fetchNearestAirport(lat, lng).then((airport) => {
        if (airport) {
          console.log(`Auto-detected destination airport: ${airport.code} (${airport.name})`);
          setDestinationAirport(airport);
        }
      });
    }
  }, [firstStop?.id, firstStop?.location.lat, firstStop?.location.lng, setDestinationAirport]);
  
  // Auto-detect return airport when last stop changes
  useEffect(() => {
    const lastStopId = lastStop?.id;
    
    // Skip if last stop hasn't changed
    if (lastStopId === prevLastStopRef.current) return;
    prevLastStopRef.current = lastStopId || null;
    
    // If no last stop, clear return airport
    if (!lastStop) {
      setReturnAirport(null);
      return;
    }
    
    // If last stop is same as first stop, use destination airport
    if (firstStop && lastStop.id === firstStop.id) {
      if (destinationAirport) {
        setReturnAirport(destinationAirport);
      }
      return;
    }
    
    // Fetch nearest airport to last stop
    const { lat, lng } = lastStop.location;
    if (lat && lng) {
      fetchNearestAirport(lat, lng).then((airport) => {
        if (airport) {
          console.log(`Auto-detected return airport: ${airport.code} (${airport.name})`);
          setReturnAirport(airport);
        }
      });
    }
  }, [lastStop?.id, lastStop?.location.lat, lastStop?.location.lng, firstStop?.id, destinationAirport, setReturnAirport]);
  
  return {
    destinationAirport,
    returnAirport,
  };
}

