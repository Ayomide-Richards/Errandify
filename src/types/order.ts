export type OrderStatus =
  | 'new_order'
  | 'preparing'
  | 'ready_for_pickup'
  | 'runner_assigned'
  | 'picked_up';

export interface OrderItem {
  id: string;
  productId?: string;
  combinationId?: string;
  name: string; // Snapshot of product name at time of order
  selectedOptionsLabel?: string; // Snapshot of selected product options/variants (e.g. "Colour: Black · Size: 39")
  unit?: string; // Snapshot of unit of sale
  price: number; // Normal unit price snapshot
  discountPrice?: number; // Discounted unit price snapshot if product discount applied
  quantity: number;
  image?: string;
}

export interface OrderActivityEvent {
  id: string;
  status: OrderStatus;
  title: string;
  description?: string;
  timestamp: string; // ISO string
  formattedTime: string; // Human-readable date/time
}

export interface Order {
  id: string;
  orderNumber: string; // Internal/Overview identifier (not shown in Orders section)
  itemSummary: string;
  items: OrderItem[];
  customerName: string;
  dateTime: string; // e.g. "Nov 10, 2026, 10:15 AM"
  createdAt: string; // ISO 8601 date string for sorting and date filtering
  status: OrderStatus;
  statusLabel: string;
  subtotal: number;
  productDiscountTotal: number;
  promotionDiscountAmount: number;
  promotionName?: string;
  deliveryFee: number;
  otherCharges: number;
  otherChargesLabel?: string;
  totalAmount: number;
  notes?: string; // Customer instructions or notes attached to the order
  runnerName?: string;
  runnerVehicle?: string;
  handedOverAt?: string; // Timestamp when runner picked up the order
  handedOverNotes?: string;
  paymentConfirmed: boolean; // Backend payment confirmation flag
  stockDeducted?: boolean; // Prevents duplicate stock deduction for the same order
  activityLog: OrderActivityEvent[];
}

export type OrderDateFilterPreset =
  | 'all'
  | 'today'
  | 'last_7_days'
  | 'last_30_days'
  | 'custom';

export type OrderSortOption =
  | 'date_desc'
  | 'date_asc'
  | 'amount_desc'
  | 'amount_asc';

export interface OrderFiltersState {
  search: string;
  status: 'all' | OrderStatus;
  datePreset: OrderDateFilterPreset;
  dateFrom: string;
  dateTo: string;
  sortBy: OrderSortOption;
}

export interface OrderSummaryMetrics {
  totalOrders: number;
  newOrders: number;
  preparing: number;
  readyForPickup: number;
  runnerAssigned: number;
  pickedUp: number;
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
