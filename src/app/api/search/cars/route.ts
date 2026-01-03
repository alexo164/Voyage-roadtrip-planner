import { NextRequest, NextResponse } from 'next/server';
import { getCityCodeSync } from '@/lib/amadeus';

export interface CarRentalResult {
  id: string;
  company: string;
  companyLogo?: string;
  carType: string;
  carCategory: 'ECONOMY' | 'COMPACT' | 'MIDSIZE' | 'FULLSIZE' | 'SUV' | 'LUXURY' | 'VAN';
  carModel: string;
  transmission: 'AUTOMATIC' | 'MANUAL';
  fuelType: 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID';
  seats: number;
  doors: number;
  bags: number;
  pricePerDay: number;
  totalPrice: number;
  currency: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  dropoffDate: string;
  features: string[];
  imageUrl?: string;
  bookingUrl: string;
  mileage: 'UNLIMITED' | 'LIMITED';
  insuranceIncluded: boolean;
}

// Car rental companies with their typical pricing multipliers
const CAR_COMPANIES = [
  { name: 'Europcar', multiplier: 1.0 },
  { name: 'Hertz', multiplier: 1.15 },
  { name: 'Avis', multiplier: 1.1 },
  { name: 'Sixt', multiplier: 0.95 },
  { name: 'Enterprise', multiplier: 1.05 },
  { name: 'Budget', multiplier: 0.9 },
];

// Base prices per category per day (EUR)
const BASE_PRICES: Record<string, number> = {
  ECONOMY: 35,
  COMPACT: 42,
  MIDSIZE: 55,
  FULLSIZE: 70,
  SUV: 85,
  LUXURY: 150,
  VAN: 95,
};

// Car models by category
const CAR_MODELS: Record<string, { model: string; seats: number; doors: number; bags: number }[]> = {
  ECONOMY: [
    { model: 'Fiat 500', seats: 4, doors: 3, bags: 1 },
    { model: 'VW Up', seats: 4, doors: 3, bags: 1 },
    { model: 'Toyota Aygo', seats: 4, doors: 5, bags: 1 },
  ],
  COMPACT: [
    { model: 'VW Golf', seats: 5, doors: 5, bags: 2 },
    { model: 'Ford Focus', seats: 5, doors: 5, bags: 2 },
    { model: 'Audi A3', seats: 5, doors: 5, bags: 2 },
  ],
  MIDSIZE: [
    { model: 'VW Passat', seats: 5, doors: 5, bags: 3 },
    { model: 'BMW 3 Series', seats: 5, doors: 5, bags: 3 },
    { model: 'Mercedes C-Class', seats: 5, doors: 5, bags: 3 },
  ],
  FULLSIZE: [
    { model: 'BMW 5 Series', seats: 5, doors: 5, bags: 4 },
    { model: 'Mercedes E-Class', seats: 5, doors: 5, bags: 4 },
    { model: 'Audi A6', seats: 5, doors: 5, bags: 4 },
  ],
  SUV: [
    { model: 'VW Tiguan', seats: 5, doors: 5, bags: 4 },
    { model: 'BMW X3', seats: 5, doors: 5, bags: 4 },
    { model: 'Audi Q5', seats: 5, doors: 5, bags: 4 },
  ],
  LUXURY: [
    { model: 'BMW 7 Series', seats: 5, doors: 5, bags: 4 },
    { model: 'Mercedes S-Class', seats: 5, doors: 5, bags: 4 },
    { model: 'Porsche Cayenne', seats: 5, doors: 5, bags: 4 },
  ],
  VAN: [
    { model: 'VW Transporter', seats: 9, doors: 5, bags: 6 },
    { model: 'Mercedes V-Class', seats: 7, doors: 5, bags: 5 },
    { model: 'Ford Transit', seats: 9, doors: 5, bags: 8 },
  ],
};

// Location multipliers
const LOCATION_MULTIPLIERS: Record<string, number> = {
  'ZRH': 1.4, // Switzerland
  'GVA': 1.4,
  'MUC': 1.0, // Germany
  'FRA': 1.0,
  'BER': 1.0,
  'VIE': 0.95, // Austria
  'INN': 0.95,
  'SZG': 0.95,
  'MIL': 0.9, // Italy
  'ROM': 0.9,
};

export async function POST(request: NextRequest) {
  try {
    const { 
      pickupLocation, 
      dropoffLocation,
      pickupDate,
      dropoffDate,
      driverAge = 30,
      categories,
    } = await request.json();
    
    if (!pickupLocation || !pickupDate || !dropoffDate) {
      return NextResponse.json(
        { error: 'Pickup location and dates are required' },
        { status: 400 }
      );
    }
    
    // Calculate rental days
    const pickup = new Date(pickupDate);
    const dropoff = new Date(dropoffDate);
    const days = Math.max(1, Math.ceil((dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Get location code
    const pickupCode = getCityCodeSync(pickupLocation) || 'MUC';
    const dropoffCode = dropoffLocation ? (getCityCodeSync(dropoffLocation) || pickupCode) : pickupCode;
    
    // Generate car rental options
    const cars = generateCarRentals(
      pickupCode,
      dropoffCode,
      pickupDate,
      dropoffDate,
      days,
      categories
    );
    
    return NextResponse.json({
      results: cars,
      totalCount: cars.length,
      pickupLocation: pickupCode,
      dropoffLocation: dropoffCode,
      days,
    });
  } catch (error) {
    console.error('Car rental search error:', error);
    return NextResponse.json(
      { error: 'Failed to search car rentals' },
      { status: 500 }
    );
  }
}

function generateCarRentals(
  pickupCode: string,
  dropoffCode: string,
  pickupDate: string,
  dropoffDate: string,
  days: number,
  categories?: string[]
): CarRentalResult[] {
  const results: CarRentalResult[] = [];
  const locationMultiplier = LOCATION_MULTIPLIERS[pickupCode] || 1.0;
  
  // One-way fee if different locations
  const oneWayFee = pickupCode !== dropoffCode ? 50 : 0;
  
  // Filter categories if specified
  const categoriesToUse = categories && categories.length > 0 
    ? categories 
    : Object.keys(CAR_MODELS);
  
  for (const category of categoriesToUse) {
    const models = CAR_MODELS[category as keyof typeof CAR_MODELS];
    if (!models) continue;
    
    // Generate offers from different companies for each category
    const companiesForCategory = CAR_COMPANIES.slice(0, 3 + Math.floor(Math.random() * 3));
    
    for (const company of companiesForCategory) {
      const model = models[Math.floor(Math.random() * models.length)];
      const basePrice = BASE_PRICES[category] || 50;
      const pricePerDay = Math.round(basePrice * company.multiplier * locationMultiplier);
      const totalPrice = pricePerDay * days + oneWayFee;
      
      results.push({
        id: `${company.name.toLowerCase()}-${category.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`,
        company: company.name,
        carType: category.charAt(0) + category.slice(1).toLowerCase(),
        carCategory: category as CarRentalResult['carCategory'],
        carModel: model.model,
        transmission: category === 'LUXURY' || category === 'SUV' ? 'AUTOMATIC' : (Math.random() > 0.5 ? 'AUTOMATIC' : 'MANUAL'),
        fuelType: Math.random() > 0.8 ? 'ELECTRIC' : (Math.random() > 0.5 ? 'PETROL' : 'DIESEL'),
        seats: model.seats,
        doors: model.doors,
        bags: model.bags,
        pricePerDay,
        totalPrice,
        currency: 'EUR',
        pickupLocation: pickupCode,
        dropoffLocation: dropoffCode,
        pickupDate,
        dropoffDate,
        features: generateFeatures(category),
        bookingUrl: `https://www.${company.name.toLowerCase()}.com`,
        mileage: Math.random() > 0.3 ? 'UNLIMITED' : 'LIMITED',
        insuranceIncluded: Math.random() > 0.5,
      });
    }
  }
  
  // Sort by total price
  return results.sort((a, b) => a.totalPrice - b.totalPrice);
}

function generateFeatures(category: string): string[] {
  const baseFeatures = ['Air Conditioning', 'Bluetooth'];
  
  const categoryFeatures: Record<string, string[]> = {
    ECONOMY: ['USB Port'],
    COMPACT: ['USB Port', 'Cruise Control'],
    MIDSIZE: ['Navigation', 'Heated Seats', 'Parking Sensors'],
    FULLSIZE: ['Navigation', 'Leather Seats', 'Heated Seats', 'Parking Sensors'],
    SUV: ['Navigation', '4x4', 'Roof Rails', 'Tow Hook'],
    LUXURY: ['Navigation', 'Leather Seats', 'Massage Seats', 'Premium Audio', 'Sunroof'],
    VAN: ['Navigation', 'Rear Camera', 'Sliding Doors'],
  };
  
  return [...baseFeatures, ...(categoryFeatures[category] || [])].slice(0, 5);
}

