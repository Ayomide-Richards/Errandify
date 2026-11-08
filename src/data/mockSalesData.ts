import type { SalesPeriodData } from '../types/order';

export const SALES_TREND_DATA: Record<string, SalesPeriodData> = {
  '7d': {
    periodLabel: 'Last 7 days',
    totalOrders: 122,
    totalRevenue: 3450000,
    dataPoints: [
      {
        label: 'M',
        fullLabel: 'Monday, Oct 26',
        value: 32,
        salesAmount: 890000,
        isHighlight: true, // Monday is the highlighted dark purple bar in the design
      },
      {
        label: 'T',
        fullLabel: 'Tuesday, Oct 27',
        value: 15,
        salesAmount: 420000,
        isHighlight: false,
      },
      {
        label: 'W',
        fullLabel: 'Wednesday, Oct 28',
        value: 22,
        salesAmount: 610000,
        isHighlight: false,
      },
      {
        label: 'T',
        fullLabel: 'Thursday, Oct 29',
        value: 17,
        salesAmount: 480000,
        isHighlight: false,
      },
      {
        label: 'F',
        fullLabel: 'Friday, Oct 30',
        value: 28,
        salesAmount: 790000,
        isHighlight: false,
      },
      {
        label: 'S',
        fullLabel: 'Saturday, Oct 31',
        value: 8,
        salesAmount: 260000,
        isHighlight: false,
      },
      {
        label: 'S',
        fullLabel: 'Sunday, Nov 01',
        value: 0,
        salesAmount: 0,
        isHighlight: false,
      },
    ],
  },
  '30d': {
    periodLabel: 'Last 30 days',
    totalOrders: 490,
    totalRevenue: 13800000,
    dataPoints: [
      {
        label: 'W1',
        fullLabel: 'Week 1 (Oct 1 - Oct 7)',
        value: 38,
        salesAmount: 2850000,
        isHighlight: false,
      },
      {
        label: 'W2',
        fullLabel: 'Week 2 (Oct 8 - Oct 14)',
        value: 44,
        salesAmount: 3400000,
        isHighlight: true,
      },
      {
        label: 'W3',
        fullLabel: 'Week 3 (Oct 15 - Oct 21)',
        value: 29,
        salesAmount: 2150000,
        isHighlight: false,
      },
      {
        label: 'W4',
        fullLabel: 'Week 4 (Oct 22 - Oct 31)',
        value: 36,
        salesAmount: 2950000,
        isHighlight: false,
      },
    ],
  },
  'month': {
    periodLabel: 'This month',
    totalOrders: 310,
    totalRevenue: 8950000,
    dataPoints: [
      { label: 'W1', fullLabel: 'Nov 1 - Nov 7', value: 24, salesAmount: 1800000, isHighlight: true },
      { label: 'W2', fullLabel: 'Nov 8 - Nov 14', value: 31, salesAmount: 2400000, isHighlight: false },
      { label: 'W3', fullLabel: 'Nov 15 - Nov 21', value: 18, salesAmount: 1450000, isHighlight: false },
      { label: 'W4', fullLabel: 'Nov 22 - Nov 30', value: 27, salesAmount: 2100000, isHighlight: false },
    ],
  },
  'year': {
    periodLabel: 'Last year',
    totalOrders: 3450,
    totalRevenue: 98000000,
    dataPoints: [
      { label: 'Q1', fullLabel: 'First Quarter', value: 42, salesAmount: 24000000, isHighlight: false },
      { label: 'Q2', fullLabel: 'Second Quarter', value: 48, salesAmount: 29000000, isHighlight: true },
      { label: 'Q3', fullLabel: 'Third Quarter', value: 35, salesAmount: 21000000, isHighlight: false },
      { label: 'Q4', fullLabel: 'Fourth Quarter', value: 40, salesAmount: 24000000, isHighlight: false },
    ],
  },
};

