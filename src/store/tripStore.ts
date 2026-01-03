import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Trip, Stop, Location, AdvisorMessage, TripRoute, PriceAnalysis } from '@/types';
import { generateId, calculateDistanceKm, estimateDrivingMinutes } from '@/lib/utils';
import { fetchFullRoute, optimizeRouteOrder as optimizeOrder } from '@/lib/routing';

interface TripState {
  // Current trip
  currentTrip: Trip | null;
  
  // Route information
  route: TripRoute | null;
  
  // AI Advisor
  advisorMessages: AdvisorMessage[];
  isAdvisorLoading: boolean;
  
  // Price Analysis
  priceAnalysis: PriceAnalysis | null;
  isPriceLoading: boolean;
  
  // UI State
  selectedStopId: string | null;
  isSidebarOpen: boolean;
  activeTab: 'stops' | 'hotels' | 'flights' | 'advisor' | 'optimize';
  
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

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      currentTrip: { ...DEFAULT_TRIP },
      route: null,
      advisorMessages: [],
      isAdvisorLoading: false,
      priceAnalysis: null,
      isPriceLoading: false,
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
      }),
    }
  )
);

