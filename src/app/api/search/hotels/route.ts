import { NextRequest, NextResponse } from 'next/server';
import { Accommodation, HotelSearchFilters, SearchResult } from '@/types';

// Mock hotel data - in production, this would call Booking.com API
const MOCK_HOTELS: Record<string, Accommodation[]> = {
  'Munich': [
    {
      id: 'muc-1',
      name: 'Hotel Vier Jahreszeiten Kempinski',
      type: 'hotel',
      address: 'Maximilianstraße 17, Munich',
      pricePerNight: 350,
      currency: 'EUR',
      rating: 4.8,
      reviewCount: 2341,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/123456.jpg',
      bookingUrl: 'https://booking.com/hotel/de/vier-jahreszeiten-kempinski',
      amenities: ['Spa', 'Pool', 'Restaurant', 'Gym', 'Parking', 'WiFi'],
    },
    {
      id: 'muc-2',
      name: 'Ruby Lilly Hotel Munich',
      type: 'hotel',
      address: 'Dachauer Str. 37, Munich',
      pricePerNight: 145,
      currency: 'EUR',
      rating: 4.5,
      reviewCount: 1876,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/234567.jpg',
      bookingUrl: 'https://booking.com/hotel/de/ruby-lilly',
      amenities: ['Bar', 'WiFi', 'Workspace'],
    },
  ],
  'Salzburg': [
    {
      id: 'szg-1',
      name: 'Hotel Sacher Salzburg',
      type: 'hotel',
      address: 'Schwarzstraße 5-7, Salzburg',
      pricePerNight: 280,
      currency: 'EUR',
      rating: 4.7,
      reviewCount: 1523,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/345678.jpg',
      bookingUrl: 'https://booking.com/hotel/at/sacher-salzburg',
      amenities: ['Restaurant', 'Bar', 'Spa', 'WiFi', 'River View'],
    },
    {
      id: 'szg-2',
      name: 'MEININGER Hotel Salzburg City Center',
      type: 'hotel',
      address: 'Fürbergstraße 18-20, Salzburg',
      pricePerNight: 95,
      currency: 'EUR',
      rating: 4.2,
      reviewCount: 2104,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/456789.jpg',
      bookingUrl: 'https://booking.com/hotel/at/meininger-salzburg',
      amenities: ['Bar', 'Games Room', 'WiFi', 'Kitchen'],
    },
  ],
  'Innsbruck': [
    {
      id: 'inn-1',
      name: 'Grand Hotel Europa',
      type: 'hotel',
      address: 'Südtiroler Platz 2, Innsbruck',
      pricePerNight: 175,
      currency: 'EUR',
      rating: 4.4,
      reviewCount: 987,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/567890.jpg',
      bookingUrl: 'https://booking.com/hotel/at/grandhotel-europa',
      amenities: ['Restaurant', 'Spa', 'Mountain View', 'WiFi'],
    },
  ],
  'Zurich': [
    {
      id: 'zrh-1',
      name: 'Baur au Lac',
      type: 'hotel',
      address: 'Talstrasse 1, Zurich',
      pricePerNight: 550,
      currency: 'CHF',
      rating: 4.9,
      reviewCount: 1245,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/678901.jpg',
      bookingUrl: 'https://booking.com/hotel/ch/baur-au-lac',
      amenities: ['Spa', 'Restaurant', 'Lake View', 'Garden', 'WiFi'],
    },
    {
      id: 'zrh-2',
      name: '25hours Hotel Zürich West',
      type: 'hotel',
      address: 'Pfingstweidstrasse 102, Zurich',
      pricePerNight: 195,
      currency: 'CHF',
      rating: 4.3,
      reviewCount: 1678,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/789012.jpg',
      bookingUrl: 'https://booking.com/hotel/ch/25hours-zurich-west',
      amenities: ['Restaurant', 'Bar', 'Rooftop', 'WiFi', 'Bike Rental'],
    },
  ],
  'Interlaken': [
    {
      id: 'int-1',
      name: 'Victoria Jungfrau Grand Hotel & Spa',
      type: 'hotel',
      address: 'Höheweg 41, Interlaken',
      pricePerNight: 420,
      currency: 'CHF',
      rating: 4.8,
      reviewCount: 876,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/890123.jpg',
      bookingUrl: 'https://booking.com/hotel/ch/victoria-jungfrau',
      amenities: ['Spa', 'Pool', 'Restaurant', 'Mountain View', 'WiFi'],
    },
    {
      id: 'int-2',
      name: 'Backpackers Villa Sonnenhof',
      type: 'hostel',
      address: 'Alpenstrasse 16, Interlaken',
      pricePerNight: 45,
      currency: 'CHF',
      rating: 4.6,
      reviewCount: 2341,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/901234.jpg',
      bookingUrl: 'https://booking.com/hotel/ch/backpackers-villa',
      amenities: ['Garden', 'Kitchen', 'BBQ', 'WiFi', 'Mountain View'],
    },
  ],
  'Lucerne': [
    {
      id: 'luc-1',
      name: 'Hotel Schweizerhof Luzern',
      type: 'hotel',
      address: 'Schweizerhofquai 3, Lucerne',
      pricePerNight: 320,
      currency: 'CHF',
      rating: 4.7,
      reviewCount: 1123,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/012345.jpg',
      bookingUrl: 'https://booking.com/hotel/ch/schweizerhof-luzern',
      amenities: ['Spa', 'Restaurant', 'Lake View', 'WiFi', 'Concierge'],
    },
  ],
};

export async function POST(request: NextRequest) {
  try {
    const { location, filters } = await request.json();
    
    if (!location) {
      return NextResponse.json(
        { error: 'Location is required' },
        { status: 400 }
      );
    }
    
    // In production, this would call the Booking.com API
    // For now, return mock data based on city name
    const hotels = findHotelsForLocation(location, filters);
    
    const result: SearchResult<Accommodation> = {
      results: hotels,
      totalCount: hotels.length,
      page: 1,
      pageSize: 10,
      hasMore: false,
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Hotel search error:', error);
    return NextResponse.json(
      { error: 'Failed to search hotels' },
      { status: 500 }
    );
  }
}

function findHotelsForLocation(location: string, filters?: HotelSearchFilters): Accommodation[] {
  // Try to find exact city match
  let hotels = MOCK_HOTELS[location] || [];
  
  // If no exact match, try partial match
  if (hotels.length === 0) {
    const cityKey = Object.keys(MOCK_HOTELS).find(
      city => location.toLowerCase().includes(city.toLowerCase())
    );
    if (cityKey) {
      hotels = MOCK_HOTELS[cityKey];
    }
  }
  
  // Apply filters if provided
  if (filters) {
    if (filters.minPrice !== undefined) {
      hotels = hotels.filter(h => h.pricePerNight >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      hotels = hotels.filter(h => h.pricePerNight <= filters.maxPrice!);
    }
    if (filters.minRating !== undefined) {
      hotels = hotels.filter(h => h.rating >= filters.minRating!);
    }
    
    // Sort
    if (filters.sortBy === 'price') {
      hotels.sort((a, b) => a.pricePerNight - b.pricePerNight);
    } else if (filters.sortBy === 'rating') {
      hotels.sort((a, b) => b.rating - a.rating);
    }
  }
  
  // If still no hotels, return generic placeholder
  if (hotels.length === 0) {
    hotels = [
      {
        id: 'generic-1',
        name: `Hotel ${location}`,
        type: 'hotel',
        address: `City Center, ${location}`,
        pricePerNight: 120,
        currency: 'EUR',
        rating: 4.0,
        reviewCount: 500,
        bookingUrl: 'https://booking.com',
        amenities: ['WiFi', 'Breakfast', 'Parking'],
      },
    ];
  }
  
  return hotels;
}

