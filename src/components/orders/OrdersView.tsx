import React, { useState, useMemo } from 'react';
import type { Order, OrderStatus } from '../../types/order';
import { MOCK_ORDERS } from '../../data/mockOrders';
import { OrderStatusBadge } from '../common/Badge';
import { OrderDetailsModal } from '../dashboard/OrderDetailsModal';
import { formatNaira } from '../../services/productStorage';
import { Search, X, ShoppingCart, Filter } from 'lucide-react';

export const OrdersView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNum = o.orderNumber.toLowerCase().includes(q);
        const matchCust = o.customerName.toLowerCase().includes(q);
        const matchItem = o.itemSummary.toLowerCase().includes(q);
        if (!matchNum && !matchCust && !matchItem) return false;
      }
      if (statusFilter !== 'all' && o.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [orders, searchTerm, statusFilter]);

  const handleUpdateStatus = (
    orderId: string,
    nextStatus: OrderStatus,
    nextLabel: string
  ) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: nextStatus, statusLabel: nextLabel } : o
      )
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) =>
        prev ? { ...prev, status: nextStatus, statusLabel: nextLabel } : null
      );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track customer orders, preparation status, and runner delivery dispatch.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by order #, customer, or item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 cursor-pointer"
          >
            <option value="all">All statuses</option>
            <option value="new_order">New order</option>
            <option value="preparing">Preparing</option>
            <option value="ready_for_pickup">Ready for pickup</option>
            <option value="runner_assigned">Runner assigned</option>
            <option value="picked_up">Picked up</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead className="bg-[#5E17EB] text-white">
              <tr className="font-semibold select-none text-xs">
                <th className="py-3.5 px-4 sm:px-6 w-36">Order no.</th>
                <th className="py-3.5 px-4 sm:px-6">Item</th>
                <th className="py-3.5 px-4 sm:px-6">Customer</th>
                <th className="py-3.5 px-4 sm:px-6">Date & Time</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Amount</th>
                <th className="py-3.5 px-4 sm:px-6 text-center w-36">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-[#F8F9FE] transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-4 sm:px-6 font-medium text-slate-700 group-hover:text-[#5E17EB] transition-colors whitespace-nowrap">
                      {order.orderNumber}
                    </td>
                    <td className="py-4 px-4 sm:px-6 font-medium text-slate-800">
                      {order.itemSummary}
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-slate-700 whitespace-nowrap">
                      {order.customerName}
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-slate-600 whitespace-nowrap">
                      {order.dateTime}
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {formatNaira(order.totalAmount)}
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-center whitespace-nowrap">
                      <OrderStatusBadge
                        status={order.status}
                        label={order.statusLabel}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-sm">No orders matching criteria</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OrderDetailsModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
};
