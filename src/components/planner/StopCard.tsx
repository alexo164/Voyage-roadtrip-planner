'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Trash2, 
  GripVertical, 
  ChevronDown, 
  ChevronUp,
  Calendar,
  Minus,
  Plus,
  Hotel,
  Info,
  Clock,
  Bed,
  Navigation,
  Mountain,
  Route,
  Landmark,
  Globe
} from 'lucide-react';
import { Stop, StopType, DestinationType } from '@/types';
import { useTripStore } from '@/store/tripStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getCountryFlag, cn } from '@/lib/utils';

// Helper to get destination type display info
function getDestinationTypeInfo(destType?: DestinationType) {
  switch (destType) {
    case 'mountain_pass':
      return { icon: Mountain, label: 'Pass', colorClass: 'text-emerald-400 bg-emerald-500/20' };
    case 'scenic_route':
      return { icon: Route, label: 'Route', colorClass: 'text-amber-400 bg-amber-500/20' };
    case 'landmark':
      return { icon: Landmark, label: 'Landmark', colorClass: 'text-purple-400 bg-purple-500/20' };
    case 'region':
      return { icon: Globe, label: 'Region', colorClass: 'text-cyan-400 bg-cyan-500/20' };
    case 'city':
    default:
      return null; // Cities don't need a special badge
  }
}

interface StopCardProps {
  stop: Stop;
  index: number;
  onDragStart?: (index: number) => void;
  onDragOver?: (index: number) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}

export function StopCard({ 
  stop, 
  index, 
  onDragStart, 
  onDragOver, 
  onDragEnd,
  isDragging,
  isDragOver,
}: StopCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { selectedStopId, selectStop, updateStop, removeStop } = useTripStore();
  
  const isSelected = selectedStopId === stop.id;
  // Default to 'stay' for backwards compatibility with old data
  const isStopover = stop.stopType === 'stopover';
  
  const handleDaysChange = (delta: number) => {
    const newDays = Math.max(1, Math.min(14, stop.daysPlanned + delta));
    updateStop(stop.id, { daysPlanned: newDays });
  };
  
  const handleHoursChange = (delta: number) => {
    const currentHours = stop.stopoverHours || 2;
    const newHours = Math.max(1, Math.min(8, currentHours + delta));
    updateStop(stop.id, { stopoverHours: newHours });
  };
  
  const toggleStopType = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isStopover) {
      // Convert to stay
      updateStop(stop.id, { stopType: 'stay', daysPlanned: 1, stopoverHours: undefined });
    } else {
      // Convert to stopover
      updateStop(stop.id, { stopType: 'stopover', daysPlanned: 0, stopoverHours: 2 });
    }
  };
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart?.(index);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver?.(index);
      }}
      onDragEnd={(e) => {
        e.stopPropagation();
        onDragEnd?.();
      }}
      className={cn(
        'rounded-xl border transition-all duration-200 overflow-hidden',
        isSelected
          ? 'bg-alpine-500/10 border-alpine-500/50 shadow-glow'
          : isStopover
            ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
            : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50',
        isDragging && 'opacity-50 scale-95',
        isDragOver && 'ring-2 ring-alpine-400 ring-offset-2 ring-offset-slate-900'
      )}
      onClick={() => selectStop(stop.id)}
    >
      {/* Main content */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Drag handle + Order number */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div 
              className="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing p-0.5"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <GripVertical size={14} />
            </div>
            <div 
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center font-semibold text-xs',
                isSelected
                  ? 'bg-alpine-500 text-white'
                  : isStopover
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-700 text-slate-300'
              )}
            >
              {index + 1}
            </div>
          </div>
          
          {/* Location info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-medium text-white truncate">
                {stop.location.name}
              </h3>
              {/* Destination type badge */}
              {(() => {
                const typeInfo = getDestinationTypeInfo(stop.location.destinationType);
                if (typeInfo) {
                  const TypeIcon = typeInfo.icon;
                  return (
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide',
                      typeInfo.colorClass
                    )}>
                      <TypeIcon size={10} />
                      {typeInfo.label}
                    </span>
                  );
                }
                return null;
              })()}
              <Badge variant="default" size="sm">
                {getCountryFlag(stop.location.countryCode)}
              </Badge>
              {isStopover && (
                <Badge variant="warning" size="sm" className="text-[10px]">
                  Stopover
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-400 truncate">
              {stop.location.destinationType === 'city' || !stop.location.destinationType
                ? `${stop.location.city}, ${stop.location.country}`
                : stop.location.city !== stop.location.name
                  ? `Near ${stop.location.city}, ${stop.location.country}`
                  : stop.location.country
              }
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeStop(stop.id);
              }}
              className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        {/* Stop Type Toggle + Duration */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
          {/* Stop Type Toggle */}
          <button
            onClick={toggleStopType}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all',
              isStopover
                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
            )}
          >
            {isStopover ? (
              <>
                <Navigation size={12} />
                <span>Passing through</span>
              </>
            ) : (
              <>
                <Bed size={12} />
                <span>Overnight stay</span>
              </>
            )}
          </button>
          
          {/* Duration controls */}
          <div className="flex items-center gap-2">
            {isStopover ? (
              // Hours selector for stopovers
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHoursChange(-1);
                  }}
                  disabled={(stop.stopoverHours || 2) <= 1}
                  className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="w-10 text-center font-medium text-amber-400 text-sm">
                  {stop.stopoverHours || 2}h
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHoursChange(1);
                  }}
                  disabled={(stop.stopoverHours || 2) >= 8}
                  className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <Plus size={14} />
                </button>
              </>
            ) : (
              // Days selector for stays
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDaysChange(-1);
                  }}
                  disabled={stop.daysPlanned <= 1}
                  className="w-7 h-7 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="w-12 text-center font-medium text-white text-sm">
                  {stop.daysPlanned} day{stop.daysPlanned !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDaysChange(1);
                  }}
                  disabled={stop.daysPlanned >= 14}
                  className="w-7 h-7 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <Plus size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Expanded content */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-3 pb-3 border-t border-slate-700/50"
        >
          <div className="pt-3 space-y-3">
            {/* Coordinates */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin size={12} />
              <span>
                {stop.location.lat.toFixed(4)}°N, {stop.location.lng.toFixed(4)}°E
              </span>
            </div>
            
            {/* Accommodation status - only show for stays */}
            {!isStopover && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Hotel size={14} />
                  <span>Accommodation</span>
                </div>
                {stop.accommodation ? (
                  <Badge variant="success" size="sm">Booked</Badge>
                ) : (
                  <Badge variant="warning" size="sm">Not booked</Badge>
                )}
              </div>
            )}
            
            {/* Stopover info */}
            {isStopover && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Clock size={14} className="text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-200/80">
                  Quick stop for {stop.stopoverHours || 2} hours — no overnight stay needed
                </p>
              </div>
            )}
            
            {/* Notes */}
            <div>
              <textarea
                placeholder="Add notes about this stop..."
                value={stop.notes}
                onChange={(e) => updateStop(stop.id, { notes: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="w-full h-20 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-alpine-500/50 focus:border-alpine-500"
              />
            </div>
            
            {/* Quick actions */}
            <div className="flex gap-2">
              {!isStopover && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Would open hotel search
                  }}
                >
                  <Hotel size={14} />
                  Find Hotels
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className={isStopover ? 'flex-1' : ''}
                onClick={(e) => {
                  e.stopPropagation();
                  // Would show more info
                }}
              >
                <Info size={14} />
                {isStopover && <span>Things to see</span>}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

