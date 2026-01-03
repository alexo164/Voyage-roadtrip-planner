// Core data types for the Road Trip Planner

export interface Location {
  name: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  placeId?: string;
}

export type StopType = 'stay' | 'stopover';

export interface Stop {
  id: string;
  order: number;
  location: Location;
  stopType: StopType;
  daysPlanned: number; // For stays: 1-14 days, for stopovers: 0
  stopoverHours?: number; // For stopovers: 1-8 hours
  accommodation?: Accommodation;
  notes: string;
  arrivalDate?: Date;
  departureDate?: Date;
}

export interface Trip {
  id: string;
  name: string;
  originAirport?: Airport;
  startDate: Date | null;
  endDate: Date | null;
  totalDays: number;
  stops: Stop[];
  status: 'planning' | 'booked' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export interface Accommodation {
  id: string;
  name: string;
  type: 'hotel' | 'apartment' | 'hostel' | 'airbnb';
  address: string;
  pricePerNight: number;
  currency: string;
  rating: number;
  reviewCount: number;
  imageUrl?: string;
  bookingUrl: string;
  amenities: string[];
}

export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  departureAirport: Airport;
  arrivalAirport: Airport;
  departureTime: Date;
  arrivalTime: Date;
  duration: number; // minutes
  price: number;
  currency: string;
  bookingUrl: string;
  stops: number;
}

export interface CarRental {
  id: string;
  company: string;
  carType: string;
  carModel: string;
  pricePerDay: number;
  currency: string;
  pickupLocation: string;
  dropoffLocation: string;
  features: string[];
  imageUrl?: string;
  bookingUrl: string;
}

export interface RouteSegment {
  fromStopId: string;
  toStopId: string;
  distance: number; // km
  duration: number; // minutes
  polyline: string; // encoded polyline for map
}

export interface TripRoute {
  tripId: string;
  totalDistance: number; // km
  totalDrivingTime: number; // minutes
  segments: RouteSegment[];
  geometry?: [number, number][]; // Full route coordinates for rendering
}

export interface PriceData {
  date: Date;
  hotelAvg: number;
  flightPrice: number;
  carRentalPerDay: number;
  total: number;
}

export interface PriceAnalysis {
  tripId: string;
  analyzedAt: Date;
  optimalStartDate: Date;
  optimalEndDate: Date;
  estimatedSavings: number;
  currency: string;
  pricesByDate: PriceData[];
  breakdown: {
    hotels: number;
    flights: number;
    carRental: number;
    total: number;
  };
  recommendations: string[];
}

export interface AdvisorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface TripAnalysis {
  isFeasible: boolean;
  feasibilityScore: number; // 0-100
  daysRecommendation: 'too_short' | 'good' | 'too_long';
  suggestedDays: number;
  warnings: string[];
  tips: string[];
  bestTimeToVisit: string;
  estimatedBudget: {
    low: number;
    mid: number;
    high: number;
    currency: string;
  };
}

// Map-related types
export interface MapViewport {
  center: [number, number];
  zoom: number;
  bearing?: number;
  pitch?: number;
}

export interface MarkerData {
  id: string;
  position: [number, number];
  type: 'stop' | 'origin' | 'destination' | 'poi';
  label?: string;
  order?: number;
}

// Search filters
export interface HotelSearchFilters {
  checkIn: Date;
  checkOut: Date;
  guests: number;
  rooms: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  amenities?: string[];
  sortBy: 'price' | 'rating' | 'distance' | 'popularity';
}

export interface FlightSearchFilters {
  departureDate: Date;
  returnDate?: Date;
  passengers: number;
  cabinClass: 'economy' | 'premium_economy' | 'business' | 'first';
  directOnly: boolean;
  maxPrice?: number;
}

// API Response types
export interface SearchResult<T> {
  results: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

