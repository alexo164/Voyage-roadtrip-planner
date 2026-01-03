'use client';

import { TripMap } from '@/components/map/TripMap';
import { TripSidebar } from '@/components/planner/TripSidebar';
import { Header } from '@/components/layout/Header';
import { useAutoDetectAirports } from '@/hooks/useAutoDetectAirports';

export default function HomePage() {
  // Auto-detect airports when stops change
  useAutoDetectAirports();
  
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950">
      {/* Header */}
      <Header />
      
      {/* Main content */}
      <div className="relative h-[calc(100vh-64px)] mt-16">
        {/* Map */}
        <TripMap />
        
        {/* Sidebar */}
        <TripSidebar />
      </div>
    </main>
  );
}

