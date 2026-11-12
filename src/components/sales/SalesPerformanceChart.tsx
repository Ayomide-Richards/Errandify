import React, { useState } from 'react';
import type { DateRangeWindow, SalesChartBucket } from '../../types/sales';
import { formatNaira } from '../../services/productStorage';
import { BarChart3, Calendar } from 'lucide-react';

interface SalesPerformanceChartProps {
  buckets: SalesChartBucket[];
  periodWindow: DateRangeWindow;
  hasAnyStoreSales: boolean;
}

export const SalesPerformanceChart: React.FC<SalesPerformanceChartProps> = ({
  buckets,
  periodWindow,
  hasAnyStoreSales,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [metricMode, setMetricMode] = useState<'netSales' | 'grossSales'>(
    'netSales'
  );

  const totalMetricValue = buckets.reduce(
    (sum, b) => sum + (metricMode === 'netSales' ? b.netSales : b.grossSales),
    0
  );
  const totalOrdersInBuckets = buckets.reduce(
    (sum, b) => sum + b.orderCount,
    0
  );

  const rawMax = Math.max(
    0,
    ...buckets.map((b) =>
      metricMode === 'netSales' ? b.netSales : b.grossSales
    )
  );

  // Compute nice rounded Y-axis ceiling
  const maxVal =
    rawMax <= 0
      ? 100000
      : rawMax <= 50000
      ? Math.ceil(rawMax / 10000) * 10000
      : rawMax <= 250000
      ? Math.ceil(rawMax / 50000) * 50000
      : Math.ceil(rawMax / 100000) * 100000;

  const yTicks = [
    maxVal,
    Math.round(maxVal * 0.75),
    Math.round(maxVal * 0.5),
    Math.round(maxVal * 0.25),
    0,
  ];

  // Format compact Naira for Y-axis labels
  const formatCompactNaira = (amount: number): string => {
    if (amount === 0) return '₦0';
    if (amount >= 1000000) {
      const m = amount / 1000000;
      return `₦${Number.isInteger(m) ? m : m.toFixed(1)}M`;
    }
    if (amount >= 1000) {
      const k = amount / 1000;
      return `₦${Number.isInteger(k) ? k : k.toFixed(0)}k`;
    }
    return formatNaira(amount);
  };

  // SVG coordinate calculations for smooth area + line chart
  const svgWidth = 760;
  const svgHeight = 230;
  const padX = 24;
  const padTop = 18;
  const padBottom = 18;
  const usableWidth = svgWidth - padX * 2;
  const usableHeight = svgHeight - padTop - padBottom;

  const points = buckets.map((b, idx) => {
    const val = metricMode === 'netSales' ? b.netSales : b.grossSales;
    const x =
      buckets.length <= 1
        ? padX + usableWidth / 2
        : padX + (idx / (buckets.length - 1)) * usableWidth;
    const y =
      padTop + usableHeight - Math.min(1, Math.max(0, val / maxVal)) * usableHeight;
    return { x, y, val, bucket: b, idx };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath =
    points.length > 0
      ? `M ${points[0].x},${padTop + usableHeight} ` +
        points.map((p) => `L ${p.x},${p.y}`).join(' ') +
        ` L ${points[points.length - 1].x},${padTop + usableHeight} Z`
      : '';

  // Determine which X-axis labels to show so long ranges (30 days) never crowd or overlap
  const shouldShowXLabel = (idx: number, total: number): boolean => {
    if (total <= 12) return true;
    if (total <= 18) return idx % 2 === 0 || idx === total - 1;
    return idx % 4 === 0 || idx === total - 1;
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Sales Performance
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {periodWindow.label}: <strong>{periodWindow.formattedRange}</strong>
            </span>
            <span>·</span>
            <span>{periodWindow.timezoneLabel}</span>
          </p>
        </div>

        {/* Metric Toggle (Net Sales vs Gross Sales) */}
        <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetricMode('netSales')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              metricMode === 'netSales'
                ? 'bg-white text-[#5E17EB] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Net Earnings
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('grossSales')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              metricMode === 'grossSales'
                ? 'bg-white text-[#5E17EB] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Gross Sales
          </button>
        </div>
      </div>

      {/* Empty State when no sales exist for the selected period */}
      {totalOrdersInBuckets === 0 || totalMetricValue === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-xl py-12 px-4 text-center space-y-2.5 bg-slate-50/50">
          <div className="w-12 h-12 rounded-full bg-[#F3EFFE] text-[#5E17EB] flex items-center justify-center mx-auto">
            <BarChart3 className="w-6 h-6 stroke-[1.75]" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">
            {!hasAnyStoreSales
              ? 'No store sales recorded yet'
              : `No sales recorded for ${periodWindow.label} (${periodWindow.formattedRange})`}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {!hasAnyStoreSales
              ? 'Your sales performance chart will populate automatically as soon as confirmed customer transactions are recorded.'
              : 'There were no successful sales transactions during this reporting period. Try selecting Last 7 Days, This Month, or a custom date range.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Chart Canvas */}
          <div className="flex items-stretch gap-2 sm:gap-3">
            {/* Y-Axis Labels */}
            <div className="flex flex-col justify-between text-[11px] font-medium text-slate-400 tabular-nums py-3 pr-1 shrink-0 text-right min-w-[46px]">
              {yTicks.map((tick, i) => (
                <span key={i} className="leading-none">
                  {formatCompactNaira(tick)}
                </span>
              ))}
            </div>

            {/* Interactive SVG Area + Line Chart */}
            <div className="flex-1 relative min-w-0">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-56 sm:h-64 overflow-visible select-none"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    id="errandifySalesAreaGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#5E17EB" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#5E17EB" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Lines */}
                {yTicks.map((_, idx) => {
                  const yPos =
                    padTop + (idx / (yTicks.length - 1)) * usableHeight;
                  return (
                    <line
                      key={idx}
                      x1={padX}
                      y1={yPos}
                      x2={svgWidth - padX}
                      y2={yPos}
                      stroke="#E2E8F0"
                      strokeDasharray={idx === yTicks.length - 1 ? undefined : '4 4'}
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Area Fill */}
                {areaPath && (
                  <path d={areaPath} fill="url(#errandifySalesAreaGrad)" />
                )}

                {/* Line Path */}
                {polylinePoints && (
                  <polyline
                    fill="none"
                    stroke="#5E17EB"
                    strokeWidth="2.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylinePoints}
                  />
                )}

                {/* Vertical Hover Guide & Data Points */}
                {points.map((pt) => {
                  const isHovered = hoveredIndex === pt.idx;
                  return (
                    <g key={pt.bucket.key}>
                      {isHovered && (
                        <line
                          x1={pt.x}
                          y1={padTop}
                          x2={pt.x}
                          y2={padTop + usableHeight}
                          stroke="#5E17EB"
                          strokeWidth="1.25"
                          strokeDasharray="3 3"
                          opacity="0.6"
                        />
                      )}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 6 : pt.val > 0 ? 4 : 2.5}
                        fill={pt.val > 0 ? '#5E17EB' : '#CBD5E1'}
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        className="transition-all duration-150 cursor-pointer"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Invisible Hover Columns Overlay for Smooth Touch & Mouse Tooltip Interaction */}
              <div className="absolute inset-0 flex items-stretch">
                {points.map((pt) => {
                  const isHovered = hoveredIndex === pt.idx;
                  const leftPercent = (pt.x / svgWidth) * 100;

                  return (
                    <div
                      key={pt.bucket.key}
                      className="flex-1 h-full relative cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(pt.idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onClick={() =>
                        setHoveredIndex(hoveredIndex === pt.idx ? null : pt.idx)
                      }
                    >
                      {isHovered && (
                        <div
                          className="absolute top-1 z-30 bg-slate-900 text-white text-[11px] py-2 px-3 rounded-xl shadow-lg whitespace-nowrap pointer-events-none space-y-1 border border-slate-700"
                          style={{
                            left:
                              leftPercent > 75
                                ? 'auto'
                                : leftPercent < 25
                                ? '0%'
                                : '50%',
                            right: leftPercent > 75 ? '0%' : 'auto',
                            transform:
                              leftPercent >= 25 && leftPercent <= 75
                                ? 'translateX(-50%)'
                                : undefined,
                          }}
                        >
                          <p className="font-bold text-white border-b border-slate-700/80 pb-1">
                            {pt.bucket.fullLabel}
                          </p>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-300">Gross Sales:</span>
                            <span className="font-semibold tabular-nums">
                              {formatNaira(pt.bucket.grossSales)}
                            </span>
                          </div>
                          {pt.bucket.discounts > 0 && (
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-300">Discounts:</span>
                              <span className="font-semibold text-emerald-400 tabular-nums">
                                -{formatNaira(pt.bucket.discounts)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-300">Net Earnings:</span>
                            <span className="font-bold text-[#C4B5FD] tabular-nums">
                              {formatNaira(pt.bucket.netSales)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-0.5 text-[10px] text-slate-400">
                            <span>Qualifying Orders:</span>
                            <span className="font-semibold text-white">
                              {pt.bucket.orderCount}{' '}
                              {pt.bucket.orderCount === 1 ? 'order' : 'orders'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* X-Axis Labels Row */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 px-2">
                {buckets.map((b, idx) => (
                  <div
                    key={b.key}
                    className="flex-1 text-center text-[10px] sm:text-xs font-semibold text-slate-600 truncate"
                    title={b.fullLabel}
                  >
                    {shouldShowXLabel(idx, buckets.length) ? b.label : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

