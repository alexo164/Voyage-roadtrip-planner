'use client';

import { motion } from 'framer-motion';
import { 
  Calendar, 
  TrendingDown, 
  Sun, 
  Cloud, 
  Snowflake,
  Leaf,
  Flower2,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { PriceAnalysis } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatPrice, formatDate, getMonthName } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface OptimalDatesProps {
  analysis: PriceAnalysis;
}

const seasonIcons = {
  spring: Flower2,
  summer: Sun,
  fall: Leaf,
  winter: Snowflake,
};

function getSeasonFromMonth(month: number): 'spring' | 'summer' | 'fall' | 'winter' {
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

export function OptimalDates({ analysis }: OptimalDatesProps) {
  const optimalMonth = new Date(analysis.optimalStartDate).getMonth();
  const season = getSeasonFromMonth(optimalMonth);
  const SeasonIcon = seasonIcons[season];
  
  const seasonColors = {
    spring: 'from-pink-500 to-rose-400',
    summer: 'from-amber-400 to-orange-500',
    fall: 'from-orange-500 to-red-500',
    winter: 'from-blue-400 to-cyan-500',
  };
  
  return (
    <div className="space-y-4">
      {/* Main recommendation card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card variant="glass" className="overflow-hidden">
          <div className={cn(
            'h-2 bg-gradient-to-r',
            seasonColors[season]
          )} />
          
          <div className="p-4">
            <div className="flex items-start gap-4 mb-4">
              <div className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br',
                seasonColors[season]
              )}>
                <SeasonIcon className="w-7 h-7 text-white" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">
                  Best Time to Travel
                </h3>
                <p className="text-alpine-400 font-medium">
                  {getMonthName(optimalMonth)} {new Date(analysis.optimalStartDate).getFullYear()}
                </p>
              </div>
              
              <Badge variant="success" className="mt-1">
                Save {formatPrice(analysis.estimatedSavings, analysis.currency)}
              </Badge>
            </div>
            
            {/* Price breakdown */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">Hotels</p>
                <p className="text-lg font-semibold text-white">
                  {formatPrice(analysis.breakdown.hotels, analysis.currency)}
                </p>
              </div>
              <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">Car Rental</p>
                <p className="text-lg font-semibold text-white">
                  {formatPrice(analysis.breakdown.carRental, analysis.currency)}
                </p>
              </div>
              <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">Flights</p>
                <p className="text-lg font-semibold text-white">
                  {formatPrice(analysis.breakdown.flights, analysis.currency)}
                </p>
              </div>
            </div>
            
            {/* Total */}
            <div className="flex items-center justify-between p-3 bg-alpine-500/10 border border-alpine-500/20 rounded-lg">
              <span className="text-alpine-400 font-medium">Estimated Total</span>
              <span className="text-2xl font-bold text-white">
                {formatPrice(analysis.breakdown.total, analysis.currency)}
              </span>
            </div>
          </div>
        </Card>
      </motion.div>
      
      {/* Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card variant="default" className="p-4">
          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
            <TrendingDown size={16} className="text-alpine-400" />
            Money-Saving Tips
          </h4>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle size={14} className="text-alpine-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">{rec}</span>
              </li>
            ))}
          </ul>
        </Card>
      </motion.div>
      
      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex gap-2"
      >
        <Button className="flex-1" variant="primary">
          <Calendar size={16} />
          Apply These Dates
        </Button>
        <Button variant="secondary">
          <ExternalLink size={16} />
          View Details
        </Button>
      </motion.div>
    </div>
  );
}

