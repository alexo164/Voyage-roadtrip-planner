'use client';

import { useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Route, 
  MapPin,
  AlertTriangle,
  CheckCircle,
  Info,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useTripStore } from '@/store/tripStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDistance, formatDuration, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export function TripStats() {
  const { currentTrip, route, isRouteFetching, optimizeRouteOrder } = useTripStore();
  
  const handleOptimizeRoute = async () => {
    if (!currentTrip || currentTrip.stops.length < 3) {
      toast.error('Need at least 3 stops to optimize route');
      return;
    }
    
    toast.promise(
      optimizeRouteOrder(),
      {
        loading: 'Finding optimal route...',
        success: 'Route optimized! 🚗',
        error: 'Could not optimize route',
      }
    );
  };
  
  const stats = useMemo(() => {
    if (!currentTrip) return null;
    
    const totalDays = currentTrip.totalDays;
    const stopCount = currentTrip.stops.length;
    // Default to 'stay' for backwards compatibility
    const stayCount = currentTrip.stops.filter(s => (s.stopType || 'stay') !== 'stopover').length;
    const stopoverCount = currentTrip.stops.filter(s => s.stopType === 'stopover').length;
    const totalDistance = route?.totalDistance || 0;
    const totalDrivingTime = route?.totalDrivingTime || 0;
    
    // Calculate total stopover hours
    const totalStopoverHours = currentTrip.stops
      .filter(s => s.stopType === 'stopover')
      .reduce((sum, s) => sum + (s.stopoverHours || 2), 0);
    
    // Calculate average driving per day (rough estimate)
    const avgDrivingPerDay = totalDays > 0 ? totalDrivingTime / totalDays : 0;
    
    // Trip assessment
    let assessment: 'relaxed' | 'balanced' | 'intense' | 'too_rushed' = 'balanced';
    let assessmentMessage = '';
    
    if (stopCount === 0) {
      assessment = 'balanced';
      assessmentMessage = 'Add destinations to get trip insights';
    } else if (avgDrivingPerDay > 180) {
      assessment = 'too_rushed';
      assessmentMessage = 'Consider adding more days or fewer stops';
    } else if (avgDrivingPerDay > 120) {
      assessment = 'intense';
      assessmentMessage = 'Fast-paced trip, good for experienced travelers';
    } else if (avgDrivingPerDay < 60) {
      assessment = 'relaxed';
      assessmentMessage = 'Plenty of time to explore each destination';
    } else {
      assessment = 'balanced';
      assessmentMessage = 'Well-paced trip with good balance';
    }
    
    // Countries count
    const countries = new Set(currentTrip.stops.map(s => s.location.country));
    
    return {
      totalDays,
      stopCount,
      stayCount,
      stopoverCount,
      totalStopoverHours,
      totalDistance,
      totalDrivingTime,
      avgDrivingPerDay,
      assessment,
      assessmentMessage,
      countriesCount: countries.size,
    };
  }, [currentTrip, route]);
  
  if (!stats || stats.stopCount === 0) {
    return null;
  }
  
  const assessmentStyles = {
    relaxed: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: CheckCircle },
    balanced: { color: 'text-alpine-400', bg: 'bg-alpine-500/20', icon: CheckCircle },
    intense: { color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Info },
    too_rushed: { color: 'text-red-400', bg: 'bg-red-500/20', icon: AlertTriangle },
  };
  
  const currentStyle = assessmentStyles[stats.assessment];
  const AssessmentIcon = currentStyle.icon;
  
  return (
    <Card variant="glass" className="p-4 space-y-4">
      {/* Quick stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-alpine-500/20 flex items-center justify-center">
            <MapPin size={16} className="text-alpine-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{stats.stopCount}</p>
            <p className="text-xs text-slate-400">Destinations</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sunset-500/20 flex items-center justify-center">
            <Calendar size={16} className="text-sunset-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{stats.totalDays}</p>
            <p className="text-xs text-slate-400">Total Days</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Route size={16} className="text-purple-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{formatDistance(stats.totalDistance)}</p>
            <p className="text-xs text-slate-400">Total Distance</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Clock size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{formatDuration(stats.totalDrivingTime)}</p>
            <p className="text-xs text-slate-400">Driving Time</p>
          </div>
        </div>
      </div>
      
      {/* Badges and optimize button */}
      <div className="flex items-center gap-2 flex-wrap">
        {stats.countriesCount > 1 && (
          <Badge variant="info">
            🌍 {stats.countriesCount} countries
          </Badge>
        )}
        
        {stats.stopoverCount > 0 && (
          <Badge variant="warning">
            ⏱️ {stats.stopoverCount} stopover{stats.stopoverCount > 1 ? 's' : ''} ({stats.totalStopoverHours}h)
          </Badge>
        )}
        
        {stats.stopCount >= 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOptimizeRoute}
            disabled={isRouteFetching}
            className="ml-auto"
          >
            {isRouteFetching ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            <span className="text-xs">Optimize Order</span>
          </Button>
        )}
      </div>
      
      {/* Trip assessment */}
      <div className={cn('p-3 rounded-lg flex items-start gap-3', currentStyle.bg)}>
        <AssessmentIcon size={18} className={cn('flex-shrink-0 mt-0.5', currentStyle.color)} />
        <div>
          <p className={cn('font-medium capitalize', currentStyle.color)}>
            {stats.assessment.replace('_', ' ')} Pace
          </p>
          <p className="text-sm text-slate-300 mt-0.5">
            {stats.assessmentMessage}
          </p>
          {stats.avgDrivingPerDay > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              ~{formatDuration(Math.round(stats.avgDrivingPerDay))} driving per day
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

