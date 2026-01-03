import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, Stop, Location, AdvisorMessage, TripRoute, PriceAnalysis, Accommodation, HotelFilters } from '@/types';
import { generateId, calculateDistanceKm, estimateDrivingMinutes } from '@/lib/utils';
import { fetchFullRoute, optimizeRouteOrder as optimizeOrder } from '@/lib/routing';

// Airport type
export interface TripAirport {
  code: string;        // IATA code (e.g., DUB)
  icao?: string;       // ICAO code (e.g., EIDW)
  name: string;
  city: string;
  country?: string;
  countryCode?: string;
  lat?: number;
  lng?: number;
}

// Alias for backwards compatibility
export type OriginAirport = TripAirport;

interface TripState {
  // Current trip
  currentTrip: Trip | null;
  
  // Home airport (user's base, persisted across trips)
  homeAirport: TripAirport | null;
  
  // Auto-detected airports from route
  destinationAirport: TripAirport | null;  // Nearest airport to first stop
  returnAirport: TripAirport | null;       // Nearest airport to last stop
  
  // Airport night (late arrival handling)
  airportNightNeeded: boolean;
  
  // Origin airports for flight search (legacy, will use homeAirport)
  originAirports: TripAirport[];
  
  // Route information
  route: TripRoute | null;
  
  // AI Advisor
  advisorMessages: AdvisorMessage[];
  isAdvisorLoading: boolean;
  
  // Price Analysis
  priceAnalysis: PriceAnalysis | null;
  isPriceLoading: boolean;
  
  // Hotel Search
  hotelsByStopId: Record<string, Accommodation[]>;
  isHotelSearching: boolean;
  hotelFilters: HotelFilters;
  expandedHotelStopId: string | null;
  
  // UI State
  selectedStopId: string | null;
  isSidebarOpen: boolean;
  activeTab: 'stops' | 'flights' | 'hotels' | 'advisor';
  
  // Actions
  createTrip: (name: string) => void;
  updateTrip: (updates: Partial<Trip>) => void;
  
  // Stop management
  addStop: (location: Location) => void;
  updateStop: (stopId: string, updates: Partial<Stop>) => void;
  removeStop: (stopId: string) => void;
  reorderStops: (fromIndex: number, toIndex: number) => void;
  
  // Selection
  selectStop: (stopId: string | null) => void;
  
  // UI
  toggleSidebar: () => void;
  setActiveTab: (tab: TripState['activeTab']) => void;
  
  // Advisor
  addAdvisorMessage: (message: Omit<AdvisorMessage, 'id' | 'timestamp'>) => void;
  setAdvisorLoading: (loading: boolean) => void;
  clearAdvisorMessages: () => void;
  
  // Route
  updateRoute: () => void;
  isRouteFetching: boolean;
  optimizeRouteOrder: () => Promise<void>;
  
  // Price Analysis
  setPriceAnalysis: (analysis: PriceAnalysis | null) => void;
  setPriceLoading: (loading: boolean) => void;
  
  // Hotel Search
  setHotelsByStopId: (stopId: string, hotels: Accommodation[]) => void;
  setHotelSearching: (loading: boolean) => void;
  setHotelFilters: (filters: Partial<HotelFilters>) => void;
  selectHotelForStop: (stopId: string, hotel: Accommodation) => void;
  clearHotelForStop: (stopId: string) => void;
  setExpandedHotelStopId: (stopId: string | null) => void;
  searchAllHotels: () => Promise<void>;
  getTotalHotelCost: () => { total: number; currency: string; nights: number };
  
  // Origin Airports (legacy)
  setOriginAirports: (airports: TripAirport[]) => void;
  addOriginAirport: (airport: TripAirport) => void;
  removeOriginAirport: (code: string) => void;
  
  // Home Airport
  setHomeAirport: (airport: TripAirport | null) => void;
  
  // Auto-detected airports
  setDestinationAirport: (airport: TripAirport | null) => void;
  setReturnAirport: (airport: TripAirport | null) => void;
  
  // Airport night
  setAirportNightNeeded: (needed: boolean) => void;
  
  // Reset
  resetTrip: () => void;
}

const DEFAULT_TRIP: Trip = {
  id: generateId(),
  name: 'My Road Trip',
  originAirport: undefined,
  startDate: null,
  endDate: null,
  totalDays: 0,
  stops: [],
  status: 'planning',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const DEFAULT_HOTEL_FILTERS: HotelFilters = {
  sortBy: 'rating',
};

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      currentTrip: { ...DEFAULT_TRIP },
      homeAirport: null,
      destinationAirport: null,
      returnAirport: null,
      airportNightNeeded: false,
      originAirports: [],
      route: null,
      advisorMessages: [],
      isAdvisorLoading: false,
      priceAnalysis: null,
      isPriceLoading: false,
      hotelsByStopId: {},
      isHotelSearching: false,
      hotelFilters: DEFAULT_HOTEL_FILTERS,
      expandedHotelStopId: null,
      selectedStopId: null,
      isSidebarOpen: true,
      activeTab: 'stops',
      isRouteFetching: false,
      
      createTrip: (name) => {
        set({
          currentTrip: {
            ...DEFAULT_TRIP,
            id: generateId(),
            name,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          route: null,
          advisorMessages: [],
          priceAnalysis: null,
        });
      },
      
      updateTrip: (updates) => {
        const { currentTrip } = get();
        if (!currentTrip) return;
        
        set({
          currentTrip: {
            ...currentTrip,
            ...updates,
            updatedAt: new Date(),
          },
        });
      },
      
      addStop: (location) => {
        const { currentTrip, updateRoute } = get();
        if (!currentTrip) return;
        
        const newStop: Stop = {
          id: generateId(),
          order: currentTrip.stops.length,
          location,
          stopType: 'stay',
          daysPlanned: 2, // Default 2 days
          notes: '',
        };
        
        const newStops = [...currentTrip.stops, newStop];
        // Only count days for stays, not stopovers (default to 'stay' for backwards compatibility)
        const totalDays = newStops.reduce((sum, s) => sum + ((s.stopType || 'stay') !== 'stopover' ? s.daysPlanned : 0), 0);
        
        set({
          currentTrip: {
            ...currentTrip,
            stops: newStops,
            totalDays,
            updatedAt: new Date(),
          },
          selectedStopId: newStop.id,
        });
        
        updateRoute();
      },
      
      updateStop: (stopId, updates) => {
        const { currentTrip, updateRoute } = get();
        if (!currentTrip) return;
        
        const newStops = currentTrip.stops.map((stop) =>
          stop.id === stopId ? { ...stop, ...updates } : stop
        );
        
        // Only count days for stays, not stopovers (default to 'stay' for backwards compatibility)
        const totalDays = newStops.reduce((sum, s) => sum + ((s.stopType || 'stay') !== 'stopover' ? s.daysPlanned : 0), 0);
        
        set({
          currentTrip: {
            ...currentTrip,
            stops: newStops,
            totalDays,
            updatedAt: new Date(),
          },
        });
        
        if (updates.location) {
          updateRoute();
        }
      },
      
      removeStop: (stopId) => {
        const { currentTrip, selectedStopId, updateRoute } = get();
        if (!currentTrip) return;
        
        const newStops = currentTrip.stops
          .filter((stop) => stop.id !== stopId)
          .map((stop, index) => ({ ...stop, order: index }));
        
        // Only count days for stays, not stopovers (default to 'stay' for backwards compatibility)
        const totalDays = newStops.reduce((sum, s) => sum + ((s.stopType || 'stay') !== 'stopover' ? s.daysPlanned : 0), 0);
        
        set({
          currentTrip: {
            ...currentTrip,
            stops: newStops,
            totalDays,
            updatedAt: new Date(),
          },
          selectedStopId: selectedStopId === stopId ? null : selectedStopId,
        });
        
        updateRoute();
      },
      
      reorderStops: (fromIndex, toIndex) => {
        const { currentTrip, updateRoute } = get();
        if (!currentTrip) return;
        
        const newStops = [...currentTrip.stops];
        const [removed] = newStops.splice(fromIndex, 1);
        newStops.splice(toIndex, 0, removed);
        
        // Update order numbers
        const reorderedStops = newStops.map((stop, index) => ({
          ...stop,
          order: index,
        }));
        
        set({
          currentTrip: {
            ...currentTrip,
            stops: reorderedStops,
            updatedAt: new Date(),
          },
        });
        
        updateRoute();
      },
      
      selectStop: (stopId) => {
        set({ selectedStopId: stopId });
      },
      
      toggleSidebar: () => {
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
      },
      
      setActiveTab: (tab) => {
        set({ activeTab: tab });
      },
      
      addAdvisorMessage: (message) => {
        set((state) => ({
          advisorMessages: [
            ...state.advisorMessages,
            {
              ...message,
              id: generateId(),
              timestamp: new Date(),
            },
          ],
        }));
      },
      
      setAdvisorLoading: (loading) => {
        set({ isAdvisorLoading: loading });
      },
      
      clearAdvisorMessages: () => {
        set({ advisorMessages: [] });
      },
      
      updateRoute: async () => {
        const { currentTrip } = get();
        if (!currentTrip || currentTrip.stops.length < 2) {
          set({ route: null, isRouteFetching: false });
          return;
        }
        
        const token = typeof window !== 'undefined' 
          ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN 
          : null;
        
        // If we have a Mapbox token, fetch real road routes
        if (token && token !== 'pk.your_mapbox_public_token') {
          set({ isRouteFetching: true });
          
          try {
            const routeData = await fetchFullRoute(currentTrip.stops, token);
            
            if (routeData) {
              set({
                route: {
                  ...routeData,
                  tripId: currentTrip.id,
                },
                isRouteFetching: false,
              });
              return;
            }
          } catch (error) {
            console.error('Failed to fetch road route:', error);
          }
          
          set({ isRouteFetching: false });
        }
        
        // Fallback: Calculate straight-line route segments
        const segments = [];
        let totalDistance = 0;
        let totalDrivingTime = 0;
        
        for (let i = 0; i < currentTrip.stops.length - 1; i++) {
          const from = currentTrip.stops[i];
          const to = currentTrip.stops[i + 1];
          
          const distance = calculateDistanceKm(
            from.location.lat,
            from.location.lng,
            to.location.lat,
            to.location.lng
          );
          
          const duration = estimateDrivingMinutes(distance);
          
          segments.push({
            fromStopId: from.id,
            toStopId: to.id,
            distance,
            duration,
            polyline: '',
          });
          
          totalDistance += distance;
          totalDrivingTime += duration;
        }
        
        set({
          route: {
            tripId: currentTrip.id,
            totalDistance,
            totalDrivingTime,
            segments,
          },
        });
      },
      
      setPriceAnalysis: (analysis) => {
        set({ priceAnalysis: analysis });
      },
      
      setPriceLoading: (loading) => {
        set({ isPriceLoading: loading });
      },
      
      // Hotel search actions
      setHotelsByStopId: (stopId, hotels) => {
        set((state) => ({
          hotelsByStopId: {
            ...state.hotelsByStopId,
            [stopId]: hotels,
          },
        }));
      },
      
      setHotelSearching: (loading) => {
        set({ isHotelSearching: loading });
      },
      
      setHotelFilters: (filters) => {
        set((state) => ({
          hotelFilters: { ...state.hotelFilters, ...filters },
        }));
      },
      
      selectHotelForStop: (stopId, hotel) => {
        const { currentTrip } = get();
        if (!currentTrip) return;
        
        const newStops = currentTrip.stops.map((stop) =>
          stop.id === stopId ? { ...stop, accommodation: hotel } : stop
        );
        
        set({
          currentTrip: {
            ...currentTrip,
            stops: newStops,
            updatedAt: new Date(),
          },
        });
      },
      
      clearHotelForStop: (stopId) => {
        const { currentTrip } = get();
        if (!currentTrip) return;
        
        const newStops = currentTrip.stops.map((stop) =>
          stop.id === stopId ? { ...stop, accommodation: undefined } : stop
        );
        
        set({
          currentTrip: {
            ...currentTrip,
            stops: newStops,
            updatedAt: new Date(),
          },
        });
      },
      
      setExpandedHotelStopId: (stopId) => {
        set({ expandedHotelStopId: stopId });
      },
      
      searchAllHotels: async () => {
        const { currentTrip, hotelFilters } = get();
        if (!currentTrip) return;
        
        // Get stops that need hotels (stays with 1+ nights)
        const staysWithNights = currentTrip.stops.filter(
          (stop) => stop.stopType !== 'stopover' && stop.daysPlanned >= 1
        );
        
        if (staysWithNights.length === 0) return;
        
        set({ isHotelSearching: true });
        
        try {
          // Search hotels for all stops in parallel
          const searchPromises = staysWithNights.map(async (stop) => {
            try {
              const response = await fetch('/api/search/hotels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  location: stop.location.city,
                  filters: {
                    minPrice: hotelFilters.minPrice,
                    maxPrice: hotelFilters.maxPrice,
                    minRating: hotelFilters.minRating,
                    sortBy: hotelFilters.sortBy === 'price_low' || hotelFilters.sortBy === 'price_high' 
                      ? 'price' 
                      : hotelFilters.sortBy === 'rating' || hotelFilters.sortBy === 'reviews'
                        ? 'rating'
                        : 'rating',
                  },
                }),
              });
              
              if (!response.ok) throw new Error('Search failed');
              
              const { results } = await response.json();
              return { stopId: stop.id, hotels: results };
            } catch (error) {
              console.error(`Hotel search failed for ${stop.location.city}:`, error);
              return { stopId: stop.id, hotels: [] };
            }
          });
          
          const results = await Promise.all(searchPromises);
          
          // Update state with all results
          const newHotelsByStopId: Record<string, Accommodation[]> = {};
          results.forEach(({ stopId, hotels }) => {
            newHotelsByStopId[stopId] = hotels;
          });
          
          set({ hotelsByStopId: newHotelsByStopId });
        } catch (error) {
          console.error('Hotel search error:', error);
        } finally {
          set({ isHotelSearching: false });
        }
      },
      
      getTotalHotelCost: () => {
        const { currentTrip } = get();
        if (!currentTrip) return { total: 0, currency: 'EUR', nights: 0 };
        
        let total = 0;
        let nights = 0;
        let currency = 'EUR';
        
        currentTrip.stops.forEach((stop) => {
          if (stop.accommodation && stop.stopType !== 'stopover' && stop.daysPlanned >= 1) {
            const stopNights = stop.daysPlanned;
            total += stop.accommodation.pricePerNight * stopNights;
            nights += stopNights;
            currency = stop.accommodation.currency;
          }
        });
        
        return { total, currency, nights };
      },
      
      // Origin Airports
      setOriginAirports: (airports) => {
        set({ originAirports: airports });
      },
      
      addOriginAirport: (airport) => {
        const { originAirports } = get();
        // Prevent duplicates
        if (originAirports.some(a => a.code === airport.code)) {
          return;
        }
        // Limit to 4 airports
        if (originAirports.length >= 4) {
          return;
        }
        set({ originAirports: [...originAirports, airport] });
      },
      
      removeOriginAirport: (code) => {
        const { originAirports } = get();
        set({ originAirports: originAirports.filter(a => a.code !== code) });
      },
      
      // Home Airport
      setHomeAirport: (airport) => {
        set({ homeAirport: airport });
        // Also sync to originAirports for backwards compatibility
        if (airport) {
          set({ originAirports: [airport] });
        }
      },
      
      // Auto-detected airports
      setDestinationAirport: (airport) => {
        set({ destinationAirport: airport });
      },
      
      setReturnAirport: (airport) => {
        set({ returnAirport: airport });
      },
      
      // Airport night
      setAirportNightNeeded: (needed) => {
        set({ airportNightNeeded: needed });
      },
      
      optimizeRouteOrder: async () => {
        const { currentTrip, updateRoute } = get();
        if (!currentTrip || currentTrip.stops.length < 3) {
          return; // Need at least 3 stops to optimize
        }
        
        const token = typeof window !== 'undefined' 
          ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN 
          : null;
        
        if (!token || token === 'pk.your_mapbox_public_token') {
          console.warn('Mapbox token required for route optimization');
          return;
        }
        
        set({ isRouteFetching: true });
        
        try {
          const optimizedOrder = await optimizeOrder(currentTrip.stops, token, true);
          
          if (optimizedOrder && optimizedOrder.length === currentTrip.stops.length) {
            // Reorder stops according to optimized order
            const reorderedStops = optimizedOrder.map((originalIndex, newIndex) => ({
              ...currentTrip.stops[originalIndex],
              order: newIndex,
            }));
            
            set({
              currentTrip: {
                ...currentTrip,
                stops: reorderedStops,
                updatedAt: new Date(),
              },
            });
            
            // Fetch the new route after reordering
            updateRoute();
          }
        } catch (error) {
          console.error('Failed to optimize route:', error);
        } finally {
          set({ isRouteFetching: false });
        }
      },
      
      resetTrip: () => {
        set({
          currentTrip: { ...DEFAULT_TRIP, id: generateId() },
          route: null,
          advisorMessages: [],
          priceAnalysis: null,
          selectedStopId: null,
        });
      },
    }),
    {
      name: 'trip-planner-storage',
      partialize: (state) => ({
        currentTrip: state.currentTrip,
        advisorMessages: state.advisorMessages,
        originAirports: state.originAirports,
        homeAirport: state.homeAirport,
        destinationAirport: state.destinationAirport,
        returnAirport: state.returnAirport,
      }),
    }
  )
);

