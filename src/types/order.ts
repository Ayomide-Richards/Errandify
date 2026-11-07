export type OrderStatus =
  | 'new_order'
  | 'preparing'
  | 'ready_for_pickup'
  | 'runner_assigned'
  | 'picked_up'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  name: string;
  unit?: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "#ER-1024"
  itemSummary: string; // e.g. "Ofada rice (50kg)"
  items: OrderItem[];
  customerName: string; // e.g. "Amanda A."
  customerPhone?: string;
  customerAddress?: string;
  dateTime: string; // e.g. "October 31 2026, 10:00 AM"
  status: OrderStatus;
  statusLabel: string; // e.g. "New order"
  totalAmount: number;
  paymentMethod?: string;
  runnerName?: string;
  runnerPhone?: string;
  notes?: string;
}

export interface ChartDataPoint {
  label: string; // e.g. "M", "T", "W"
  fullLabel: string; // e.g. "Monday, Oct 26"
  value: number; // e.g. 32
  salesAmount: number; // e.g. 1440000
  isHighlight?: boolean;
}

export interface SalesPeriodData {
  periodLabel: string;
  totalOrders: number;
  totalRevenue: number;
  dataPoints: ChartDataPoint[];
}
