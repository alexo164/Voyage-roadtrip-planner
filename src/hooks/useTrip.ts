'use client';

import { useCallback, useState } from 'react';
import { useTripStore } from '@/store/tripStore';
import { TripAnalysis, PriceAnalysis } from '@/types';
import toast from 'react-hot-toast';

export function useTripAdvisor() {
  const { 
    currentTrip, 
    addAdvisorMessage, 
    setAdvisorLoading,
    isAdvisorLoading 
  } = useTripStore();
  
  const [tripAnalysis, setTripAnalysis] = useState<TripAnalysis | null>(null);
  
  const analyzeTrip = useCallback(async () => {
    if (!currentTrip || currentTrip.stops.length === 0) {
      toast.error('Add some destinations first!');
      return null;
    }
    
    setAdvisorLoading(true);
    
    try {
      const response = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip: currentTrip,
          type: 'analyze',
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze trip');
      }
      
      const { analysis } = await response.json();
      setTripAnalysis(analysis);
      toast.success('Trip analysis complete!');
      return analysis;
    } catch (error) {
      console.error('Trip analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze trip');
      return null;
    } finally {
      setAdvisorLoading(false);
    }
  }, [currentTrip, setAdvisorLoading]);
  
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;
    
    // Add user message
    addAdvisorMessage({ role: 'user', content: message });
    setAdvisorLoading(true);
    
    try {
      const response = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip: currentTrip,
          message,
          type: 'chat',
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }
      
      const { message: reply } = await response.json();
      addAdvisorMessage({ role: 'assistant', content: reply });
    } catch (error) {
      console.error('Chat error:', error);
      addAdvisorMessage({ 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please make sure your OpenAI API key is configured.' 
      });
    } finally {
      setAdvisorLoading(false);
    }
  }, [currentTrip, addAdvisorMessage, setAdvisorLoading]);
  
  return {
    analyzeTrip,
    sendMessage,
    tripAnalysis,
    isLoading: isAdvisorLoading,
  };
}

export function usePriceOptimizer() {
  const { currentTrip, setPriceAnalysis, setPriceLoading, isPriceLoading, priceAnalysis } = useTripStore();
  
  const optimizePrices = useCallback(async () => {
    if (!currentTrip || currentTrip.stops.length === 0) {
      toast.error('Add some destinations first!');
      return null;
    }
    
    setPriceLoading(true);
    
    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip: currentTrip,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to optimize prices');
      }
      
      const { analysis } = await response.json();
      setPriceAnalysis(analysis);
      toast.success('Price analysis complete!');
      return analysis;
    } catch (error) {
      console.error('Price optimization error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to optimize prices');
      return null;
    } finally {
      setPriceLoading(false);
    }
  }, [currentTrip, setPriceAnalysis, setPriceLoading]);
  
  return {
    optimizePrices,
    priceAnalysis,
    isLoading: isPriceLoading,
  };
}

export function useHotelSearch() {
  const [hotels, setHotels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const searchHotels = useCallback(async (location: string, filters?: any) => {
    if (!location) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/search/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, filters }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to search hotels');
      }
      
      const { results } = await response.json();
      setHotels(results);
      return results;
    } catch (error) {
      console.error('Hotel search error:', error);
      toast.error('Failed to search hotels');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return {
    searchHotels,
    hotels,
    isLoading,
  };
}

