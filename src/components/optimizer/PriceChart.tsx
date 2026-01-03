'use client';

import { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend
} from 'recharts';
import { PriceData } from '@/types';
import { formatPrice, getMonthName } from '@/lib/utils';

interface PriceChartProps {
  data: PriceData[];
  currency?: string;
  highlightMonth?: number;
}

export function PriceChart({ data, currency = 'EUR', highlightMonth }: PriceChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      month: getMonthName(new Date(item.date).getMonth()).slice(0, 3),
      total: item.total,
      hotels: item.hotelAvg,
      flights: item.flightPrice,
      carRental: item.carRentalPerDay * 10, // Approximate for display
      isOptimal: new Date(item.date).getMonth() === highlightMonth,
    }));
  }, [data, highlightMonth]);
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="glass-strong rounded-lg p-3 border border-slate-600/50 shadow-xl">
        <p className="font-semibold text-white mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-alpine-400">Total:</span>
            <span className="text-white font-medium">
              {formatPrice(payload[0]?.value || 0, currency)}
            </span>
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="text-slate-300">
                {formatPrice(entry.value, currency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="hotelGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(148, 163, 184, 0.1)" 
            vertical={false}
          />
          
          <XAxis 
            dataKey="month" 
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          
          <YAxis 
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `€${value}`}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            wrapperStyle={{ 
              paddingTop: '10px',
              fontSize: '12px',
            }}
          />
          
          <Area
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="#14b8a6"
            strokeWidth={2}
            fill="url(#totalGradient)"
          />
          
          <Area
            type="monotone"
            dataKey="hotels"
            name="Hotels"
            stroke="#f59e0b"
            strokeWidth={1.5}
            fill="url(#hotelGradient)"
          />
          
          <Line
            type="monotone"
            dataKey="flights"
            name="Flights"
            stroke="#8b5cf6"
            strokeWidth={1.5}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

