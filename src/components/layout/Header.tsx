'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Compass, 
  Calendar, 
  Download,
  Share2,
  RotateCcw,
  Settings,
  HelpCircle,
  Sparkles,
  Map
} from 'lucide-react';
import { useTripStore } from '@/store/tripStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatDate, generateId } from '@/lib/utils';
import { MUNICH_ALPS_TRIP } from '@/lib/sampleTrips';
import toast from 'react-hot-toast';

export function Header() {
  const { currentTrip, updateTrip, resetTrip } = useTripStore();
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const handleReset = () => {
    if (confirm('Are you sure you want to reset your trip? This cannot be undone.')) {
      resetTrip();
      toast.success('Trip reset successfully');
    }
  };
  
  const handleExport = () => {
    if (!currentTrip || currentTrip.stops.length === 0) {
      toast.error('Add some destinations first!');
      return;
    }
    
    const tripData = JSON.stringify(currentTrip, null, 2);
    const blob = new Blob([tripData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTrip.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Trip exported successfully!');
  };
  
  const handleLoadSampleTrip = () => {
    const trip = {
      ...MUNICH_ALPS_TRIP,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      stops: MUNICH_ALPS_TRIP.stops.map(stop => ({
        ...stop,
        id: generateId(),
      })),
    };
    
    updateTrip(trip);
    toast.success('Loaded Alpine Adventure trip! 🏔️');
  };
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 glass-strong border-b border-slate-700/50">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-alpine-400 via-alpine-500 to-alpine-600 flex items-center justify-center shadow-lg shadow-alpine-500/30">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-semibold text-white tracking-tight">
              Voyage
            </h1>
            <p className="text-[10px] text-slate-400 -mt-0.5 tracking-wider uppercase">
              Road Trip Planner
            </p>
          </div>
        </div>
        
        {/* Center - Trip dates */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl px-4 py-2 border border-slate-700/50">
            <Calendar size={16} className="text-sunset-400" />
            <div className="relative">
              <input
                type="date"
                value={currentTrip?.startDate ? new Date(currentTrip.startDate).toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : null;
                  updateTrip({ startDate: date });
                }}
                className="bg-transparent border-none text-sm text-slate-200 focus:outline-none cursor-pointer w-28"
                placeholder="Start date"
              />
            </div>
            <span className="text-slate-600">→</span>
            <div className="relative">
              <input
                type="date"
                value={currentTrip?.endDate ? new Date(currentTrip.endDate).toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : null;
                  updateTrip({ endDate: date });
                }}
                min={currentTrip?.startDate ? new Date(currentTrip.startDate).toISOString().split('T')[0] : undefined}
                className="bg-transparent border-none text-sm text-slate-200 focus:outline-none cursor-pointer w-28"
                placeholder="End date"
              />
            </div>
          </div>
          
          {currentTrip && currentTrip.totalDays > 0 && (
            <div className="text-sm">
              <span className="text-slate-400">Duration: </span>
              <span className="text-white font-medium">{currentTrip.totalDays} days</span>
            </div>
          )}
        </div>
        
        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          {(!currentTrip || currentTrip.stops.length === 0) && (
            <Button 
              variant="primary" 
              size="sm"
              onClick={handleLoadSampleTrip}
              className="gap-1.5"
            >
              <Map size={16} />
              <span className="hidden sm:inline">Load Sample Trip</span>
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleExport}
            className="gap-1.5"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => toast('Sharing coming soon!', { icon: '🔗' })}
            className="gap-1.5"
          >
            <Share2 size={16} />
            <span className="hidden sm:inline">Share</span>
          </Button>
          
          <div className="w-px h-6 bg-slate-700" />
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw size={16} />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => toast('Settings coming soon!', { icon: '⚙️' })}
          >
            <Settings size={16} />
          </Button>
        </div>
      </div>
    </header>
  );
}

