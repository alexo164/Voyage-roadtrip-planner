import { NextRequest, NextResponse } from 'next/server';
import { Accommodation, HotelSearchFilters, SearchResult } from '@/types';
import { searchHotelsByCity, isAmadeusConfigured, getCityCodeSync, AmadeusHotelOffer } from '@/lib/amadeus';

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
      stars: 5,
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
      stars: 4,
      reviewCount: 1876,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/234567.jpg',
      bookingUrl: 'https://booking.com/hotel/de/ruby-lilly',
      amenities: ['Bar', 'WiFi', 'Workspace'],
    },
    {
      id: 'muc-3',
      name: 'Motel One München-City-West',
      type: 'hotel',
      address: 'Landsberger Str. 79, Munich',
      pricePerNight: 89,
      currency: 'EUR',
      rating: 4.3,
      stars: 3,
      reviewCount: 3245,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/333333.jpg',
      bookingUrl: 'https://booking.com/hotel/de/motel-one-munich-west',
      amenities: ['Bar', 'WiFi', 'Breakfast'],
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
      stars: 5,
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
      stars: 3,
      reviewCount: 2104,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/456789.jpg',
      bookingUrl: 'https://booking.com/hotel/at/meininger-salzburg',
      amenities: ['Bar', 'Games Room', 'WiFi', 'Kitchen'],
    },
    {
      id: 'szg-3',
      name: 'Hotel Goldener Hirsch',
      type: 'hotel',
      address: 'Getreidegasse 37, Salzburg',
      pricePerNight: 320,
      currency: 'EUR',
      rating: 4.6,
      stars: 5,
      reviewCount: 987,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/456790.jpg',
      bookingUrl: 'https://booking.com/hotel/at/goldener-hirsch',
      amenities: ['Restaurant', 'Bar', 'Historic', 'WiFi', 'Central'],
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
      stars: 5,
      reviewCount: 987,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/567890.jpg',
      bookingUrl: 'https://booking.com/hotel/at/grandhotel-europa',
      amenities: ['Restaurant', 'Spa', 'Mountain View', 'WiFi'],
    },
    {
      id: 'inn-2',
      name: 'Hotel Weisses Kreuz',
      type: 'hotel',
      address: 'Herzog-Friedrich-Straße 31, Innsbruck',
      pricePerNight: 130,
      currency: 'EUR',
      rating: 4.5,
      stars: 4,
      reviewCount: 1456,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/567891.jpg',
      bookingUrl: 'https://booking.com/hotel/at/weisses-kreuz',
      amenities: ['Restaurant', 'Historic', 'Central', 'WiFi'],
    },
    {
      id: 'inn-3',
      name: 'Nala Individuellhotel',
      type: 'hotel',
      address: 'Müllerstraße 15, Innsbruck',
      pricePerNight: 95,
      currency: 'EUR',
      rating: 4.6,
      stars: 3,
      reviewCount: 2134,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/567892.jpg',
      bookingUrl: 'https://booking.com/hotel/at/nala',
      amenities: ['Design', 'Bar', 'WiFi', 'Breakfast'],
    },
  ],
  'Zurich': [
    {
      id: 'zrh-1',
      name: 'Baur au Lac',
      type: 'hotel',
      address: 'Talstrasse 1, Zurich',
      pricePerNight: 550,
      currency: 'EUR',
      rating: 4.9,
      stars: 5,
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
      currency: 'EUR',
      rating: 4.3,
      stars: 4,
      reviewCount: 1678,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/789012.jpg',
      bookingUrl: 'https://booking.com/hotel/ch/25hours-zurich-west',
      amenities: ['Restaurant', 'Bar', 'Rooftop', 'WiFi', 'Bike Rental'],
    },
    {
      id: 'zrh-3',
      name: 'Hotel Helvetia',
      type: 'hotel',
      address: 'Stauffacherquai 1, Zurich',
      pricePerNight: 165,
      currency: 'EUR',
      rating: 4.4,
      stars: 3,
      reviewCount: 892,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/789013.jpg',
      bookingUrl: 'https://booking.com/hotel/ch/helvetia-zurich',
      amenities: ['Bar', 'Central', 'WiFi', 'Breakfast'],
    },
  ],
  'Interlaken': [
    {
      id: 'int-1',
      name: 'Victoria Jungfrau Grand Hotel & Spa',
      type: 'hotel',
      address: 'Höheweg 41, Interlaken',
      pricePerNight: 420,
      currency: 'EUR',
      rating: 4.8,
      stars: 5,
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
      currency: 'EUR',
      rating: 4.6,
      stars: 2,
      reviewCount: 2341,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/901234.jpg',
      bookingUrl: 'https://booking.com/hotel/ch/backpackers-villa',
      amenities: ['Garden', 'Kitchen', 'BBQ', 'WiFi', 'Mountain View'],
    },
    {
      id: 'int-3',
      name: 'Hotel Interlaken',
      type: 'hotel',
      address: 'Höheweg 74, Interlaken',
      pricePerNight: 185,
      currency: 'EUR',
      rating: 4.5,
      stars: 4,
      reviewCount: 1567,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/901235.jpg',
      bookingUrl: 'https://booking.com/hotel/ch/hotel-interlaken',
      amenities: ['Restaurant', 'Garden', 'WiFi', 'Parking'],
    },
  ],
  'Lucerne': [
    {
      id: 'luc-1',
      name: 'Hotel Schweizerhof Luzern',
      type: 'hotel',
      address: 'Schweizerhofquai 3, Lucerne',
      pricePerNight: 320,
      currency: 'EUR',
      rating: 4.7,
      stars: 5,
      reviewCount: 1123,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/012345.jpg',
      bookingUrl: 'https://booking.com/hotel/ch/schweizerhof-luzern',
      amenities: ['Spa', 'Restaurant', 'Lake View', 'WiFi', 'Concierge'],
    },
    {
      id: 'luc-2',
      name: 'Hotel des Balances',
      type: 'hotel',
      address: 'Weinmarkt, Lucerne',
      pricePerNight: 265,
      currency: 'EUR',
      rating: 4.6,
      stars: 4,
      reviewCount: 876,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/012346.jpg',
      bookingUrl: 'https://booking.com/hotel/ch/des-balances',
      amenities: ['Restaurant', 'Historic', 'River View', 'WiFi'],
    },
    {
      id: 'luc-3',
      name: 'ibis Luzern Kriens',
      type: 'hotel',
      address: 'Mattenhof 4, Kriens',
      pricePerNight: 95,
      currency: 'EUR',
      rating: 4.0,
      stars: 3,
      reviewCount: 1890,
      imageUrl: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/012347.jpg',
      bookingUrl: 'https://booking.com/hotel/ch/ibis-luzern',
      amenities: ['Parking', 'WiFi', 'Breakfast'],
    },
  ],
};

export async function POST(request: NextRequest) {
  try {
    const { location, filters, checkIn, checkOut, nights } = await request.json();
    
    if (!location) {
      return NextResponse.json(
        { error: 'Location is required' },
        { status: 400 }
      );
    }
    
    let hotels: Accommodation[] = [];
    
    // Try Amadeus API first if configured
    if (isAmadeusConfigured()) {
      const cityCode = getCityCodeSync(location);
      
      if (cityCode) {
        // Calculate dates
        const checkInDate = checkIn || new Date().toISOString().split('T')[0];
        const checkOutDate = checkOut || (() => {
          const date = new Date(checkInDate);
          date.setDate(date.getDate() + (nights || 1));
          return date.toISOString().split('T')[0];
        })();
        
        try {
          const amadeusHotels = await searchHotelsByCity({
            cityCode,
            checkInDate,
            checkOutDate,
            adults: 2,
            roomQuantity: 1,
            currency: 'EUR',
            ratings: filters?.minRating ? [String(Math.floor(filters.minRating))] : undefined,
          });
          
          // Transform Amadeus response to our format
          hotels = transformAmadeusHotels(amadeusHotels, location);
        } catch (amadeusError) {
          console.error('Amadeus hotel search failed, falling back to mock data:', amadeusError);
          hotels = findHotelsForLocation(location, filters);
        }
      } else {
        // No city code mapping, use mock data
        hotels = findHotelsForLocation(location, filters);
      }
    } else {
      // Amadeus not configured, use mock data
      hotels = findHotelsForLocation(location, filters);
    }
    
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

/**
 * Transform Amadeus hotel offers to our Accommodation format
 */
function transformAmadeusHotels(amadeusHotels: AmadeusHotelOffer[], locationName: string): Accommodation[] {
  return amadeusHotels
    .filter(h => h.available && h.offers && h.offers.length > 0)
    .map((h) => {
      const offer = h.offers[0];
      const price = parseFloat(offer.price.total);
      const nights = Math.max(1, 
        Math.ceil((new Date(offer.checkOutDate).getTime() - new Date(offer.checkInDate).getTime()) / (1000 * 60 * 60 * 24))
      );
      const pricePerNight = Math.round(price / nights);
      
      // Parse star rating
      const stars = h.hotel.rating ? parseInt(h.hotel.rating, 10) : undefined;
      
      // Build address string
      const addressParts = [];
      if (h.hotel.address?.lines) {
        addressParts.push(...h.hotel.address.lines);
      }
      if (h.hotel.address?.cityName) {
        addressParts.push(h.hotel.address.cityName);
      }
      const address = addressParts.length > 0 ? addressParts.join(', ') : locationName;
      
      // Get amenities
      const amenities = h.hotel.amenities?.slice(0, 6).map(a => 
        a.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      ) || ['WiFi'];
      
      // Get image URL
      const imageUrl = h.hotel.media?.[0]?.uri || undefined;
      
      return {
        id: h.hotel.hotelId,
        name: h.hotel.name,
        type: 'hotel' as const,
        address,
        pricePerNight,
        currency: offer.price.currency || 'EUR',
        rating: stars ? 3.5 + (stars - 2) * 0.3 : 4.0, // Estimate rating from stars
        stars,
        reviewCount: Math.floor(Math.random() * 2000) + 200, // Amadeus doesn't provide this
        imageUrl,
        bookingUrl: `https://www.amadeus.com/hotels/${h.hotel.hotelId}`,
        amenities,
      };
    });
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
  
  // If still no hotels, return generic placeholders
  if (hotels.length === 0) {
    hotels = [
      {
        id: `generic-${location}-1`,
        name: `Grand Hotel ${location}`,
        type: 'hotel',
        address: `City Center, ${location}`,
        pricePerNight: 180,
        currency: 'EUR',
        rating: 4.5,
        stars: 4,
        reviewCount: 850,
        bookingUrl: 'https://booking.com',
        amenities: ['WiFi', 'Breakfast', 'Spa', 'Restaurant'],
      },
      {
        id: `generic-${location}-2`,
        name: `Boutique Hotel ${location}`,
        type: 'hotel',
        address: `Old Town, ${location}`,
        pricePerNight: 120,
        currency: 'EUR',
        rating: 4.2,
        stars: 3,
        reviewCount: 620,
        bookingUrl: 'https://booking.com',
        amenities: ['WiFi', 'Breakfast', 'Central'],
      },
      {
        id: `generic-${location}-3`,
        name: `Budget Inn ${location}`,
        type: 'hotel',
        address: `Near Station, ${location}`,
        pricePerNight: 75,
        currency: 'EUR',
        rating: 3.8,
        stars: 2,
        reviewCount: 420,
        bookingUrl: 'https://booking.com',
        amenities: ['WiFi', 'Parking'],
      },
    ];
  }
  
  return hotels;
}

