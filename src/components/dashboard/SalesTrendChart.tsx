import React, { useState } from 'react';
import { SALES_TREND_DATA } from '../../data/mockSalesData';
import { ChevronDown } from 'lucide-react';
import { formatNaira } from '../../services/productStorage';

interface SalesTrendChartProps {
  onPeriodChange?: (periodKey: string) => void;
}

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ onPeriodChange }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('7d');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const currentData = SALES_TREND_DATA[selectedPeriod] || SALES_TREND_DATA['7d'];
  const maxVal = 50; // Reference chart max Y axis is 50

  const yTicks = [50, 40, 30, 25, 20, 15, 10, 5];

  const handlePeriodSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPeriod(val);
    if (onPeriodChange) {
      onPeriodChange(val);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
      {/* Chart Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-bold text-slate-900">
          Sales trend
        </h3>

        {/* Filter Dropdown (Matches reference image) */}
        <div className="relative inline-flex items-center">
          <select
            value={selectedPeriod}
            onChange={handlePeriodSelect}
            className="appearance-none bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-1.5 pr-8 text-xs font-medium text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer transition-colors"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="month">This month</option>
            <option value="year">Last year</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Main Chart Graphic Canvas */}
      <div className="relative flex items-stretch gap-3 sm:gap-4 h-64 sm:h-72 select-none pt-2 pb-1">
        {/* Y-Axis Scale Markings (Exact match from reference image: - 50, - 40, - 30, - 25, - 20, - 15, - 10, - 5) */}
        <div className="flex flex-col justify-between shrink-0 text-slate-400 text-xs font-normal pr-1 pb-7">
          {yTicks.map((tick) => (
            <span key={tick} className="leading-none text-right font-mono">
              - {tick}
            </span>
          ))}
        </div>

        {/* Chart Bars Grid */}
        <div className="flex-1 flex flex-col justify-between relative border-l border-b border-transparent">
          {/* Subtle Horizontal Guidelines */}
          <div className="absolute inset-x-0 inset-y-0 pb-7 flex flex-col justify-between pointer-events-none opacity-40">
            {yTicks.map((tick) => (
              <div
                key={tick}
                className="w-full border-b border-dashed border-slate-100"
              />
            ))}
          </div>

          {/* Vertical Columns Container */}
          <div className="flex-1 flex items-end justify-between gap-2 sm:gap-4 relative pb-2 z-10">
            {currentData.dataPoints.map((dp, idx) => {
              const heightPercent = Math.min(100, Math.max(0, (dp.value / maxVal) * 100));
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Interactive Tooltip */}
                  {isHovered && dp.value > 0 && (
                    <div className="absolute -top-12 z-30 bg-slate-900 text-white text-[11px] py-1.5 px-2.5 rounded-lg shadow-lg whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none flex flex-col items-center">
                      <span className="font-semibold">{dp.fullLabel}</span>
                      <span className="text-slate-300 text-[10px]">
                        {dp.value} orders • {formatNaira(dp.salesAmount)}
                      </span>
                      <div className="w-2 h-2 bg-slate-900 rotate-45 absolute -bottom-1" />
                    </div>
                  )}

                  {/* The Bar */}
                  {heightPercent > 0 ? (
                    <div
                      className={`w-full max-w-[48px] sm:max-w-[64px] rounded-t-lg transition-all duration-300 cursor-pointer ${
                        dp.isHighlight
                          ? 'bg-[#5E17EB] hover:bg-[#4E12C6] shadow-sm shadow-[#5E17EB]/25'
                          : 'bg-[#C7B9F6] hover:bg-[#B7A4F0]'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  ) : (
                    // Zero value spacer
                    <div className="w-full max-w-[48px] sm:max-w-[64px] h-0.5 bg-slate-100 rounded-full" />
                  )}
                </div>
              );
            })}
          </div>

          {/* X-Axis Labels (M, T, W, T, F, S, S) */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 pt-2 border-t border-slate-100">
            {currentData.dataPoints.map((dp, idx) => (
              <div
                key={idx}
                className="flex-1 text-center font-bold text-xs sm:text-sm text-slate-800"
              >
                {dp.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

