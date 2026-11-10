import React, { useState, useEffect } from 'react';
import type { Product } from '../../types/product';
import type { Order, OrderStatus } from '../../types/order';
import { OrderStorage, STATUS_LABELS } from '../../services/orderStorage';
import { OrderStatusBadge } from '../common/Badge';
import { useToast } from '../common/Toast';
import { SalesTrendChart } from './SalesTrendChart';
import { OrderDetailsModal } from './OrderDetailsModal';
import { ArrowRight } from 'lucide-react';

interface OverviewViewProps {
  products: Product[];
  onNavigateToProducts: () => void;
  onNavigateToOrders: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigateToProducts,
  onNavigateToOrders,
}) => {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>(() => OrderStorage.getOrders());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const syncOrders = () => {
      setOrders(OrderStorage.getOrders());
    };
    window.addEventListener('errandify:orders-updated', syncOrders);
    window.addEventListener('storage', syncOrders);
    return () => {
      window.removeEventListener('errandify:orders-updated', syncOrders);
      window.removeEventListener('storage', syncOrders);
    };
  }, []);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null;

  // Take the top 5 recent orders shown in the reference design
  const recentOrders = orders.slice(0, 5);

  const handleUpdateOrderStatus = (
    orderId: string,
    nextStatus: OrderStatus,
    options?: { handoverNotes?: string }
  ) => {
    const { updatedOrder } = OrderStorage.updateOrderStatus({
      orderId,
      nextStatus,
      handoverNotes: options?.handoverNotes,
    });
    setOrders(OrderStorage.getOrders());
    toast.success(
      `Order status updated to ${STATUS_LABELS[nextStatus]}`,
      `${updatedOrder.customerName}'s order is now ${STATUS_LABELS[nextStatus]}.`
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Header (Matching Merchant Dashboard Active.png) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Good morning, XYZ limited 👋
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Here's what's happening with your store today.
          </p>
        </div>

        {/* Store Open Status Badge */}
        <div className="self-start sm:self-auto">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#E8FDF0] text-[#16A34A] border border-[#BBF7D0]/60 shadow-2xs inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
            Open
          </span>
        </div>
      </div>

      {/* Summary Cards Grid (Exact match from Merchant Dashboard Active.png: 12, 5, 55, 5) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Today's sales */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs transition-all hover:shadow-sm">
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Today's sales
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            12
          </p>
        </div>

        {/* Card 2: Pending orders */}
        <div
          onClick={onNavigateToOrders}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs transition-all hover:shadow-sm cursor-pointer hover:border-[#5E17EB]/40 group"
          title="Click to view pending orders"
        >
          <p className="text-xs sm:text-sm font-medium text-slate-500 group-hover:text-[#5E17EB] transition-colors">
            Pending orders
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            5
          </p>
        </div>

        {/* Card 3: Published products (Notice label from reference: Published products, value 55) */}
        <div
          onClick={onNavigateToProducts}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs transition-all hover:shadow-sm cursor-pointer hover:border-[#5E17EB]/40 group"
          title="Click to manage store products"
        >
          <p className="text-xs sm:text-sm font-medium text-slate-500 group-hover:text-[#5E17EB] transition-colors">
            Published products
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            55
          </p>
        </div>

        {/* Card 4: Low stock products */}
        <div
          onClick={onNavigateToProducts}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs transition-all hover:shadow-sm cursor-pointer hover:border-[#5E17EB]/40 group"
          title="Click to check low stock inventory"
        >
          <p className="text-xs sm:text-sm font-medium text-slate-500 group-hover:text-[#5E17EB] transition-colors">
            Low stock products
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            5
          </p>
        </div>
      </div>

      {/* Sales Trend Chart (Matching reference image) */}
      <SalesTrendChart />

      {/* Recent Orders Section (Matching reference image) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Recent orders
          </h3>

          <button
            onClick={onNavigateToOrders}
            className="text-xs sm:text-sm font-semibold text-[#5E17EB] hover:text-[#4E12C6] hover:underline flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Orders Table Container */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              {/* Royal Purple Header Row */}
              <thead className="bg-[#5E17EB] text-white">
                <tr className="font-semibold select-none text-xs">
                  <th className="py-3.5 px-4 sm:px-6 w-36">Order no.</th>
                  <th className="py-3.5 px-4 sm:px-6">Item</th>
                  <th className="py-3.5 px-4 sm:px-6">Customer</th>
                  <th className="py-3.5 px-4 sm:px-6">Date & Time</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center w-40">Status</th>
                </tr>
              </thead>

              {/* Table Rows (Matching reference image) */}
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className="hover:bg-[#F8F9FE] transition-colors cursor-pointer group"
                  >
                    {/* Order No */}
                    <td className="py-4 px-4 sm:px-6 font-medium text-slate-700 group-hover:text-[#5E17EB] transition-colors whitespace-nowrap">
                      {order.orderNumber}
                    </td>

                    {/* Item */}
                    <td className="py-4 px-4 sm:px-6 text-slate-800 font-medium">
                      <span className="block whitespace-pre-line leading-tight">
                        {order.itemSummary}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="py-4 px-4 sm:px-6 text-slate-700 whitespace-nowrap">
                      {order.customerName}
                    </td>

                    {/* Date & Time */}
                    <td className="py-4 px-4 sm:px-6 text-slate-600 whitespace-nowrap">
                      {order.dateTime}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 sm:px-6 text-center whitespace-nowrap">
                      <OrderStatusBadge
                        status={order.status}
                        label={order.statusLabel}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Details Modal when clicking an order */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrderId(null)}
        onUpdateStatus={handleUpdateOrderStatus}
      />
    </div>
  );
};
