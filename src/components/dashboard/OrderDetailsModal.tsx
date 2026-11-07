import React from 'react';
import type { Order } from '../../types/order';
import { Modal } from '../common/Modal';
import { OrderStatusBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { formatNaira } from '../../services/productStorage';
import {
  Package,
  User,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Bike,
  CheckCircle2,
} from 'lucide-react';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (orderId: string, nextStatus: Order['status'], nextLabel: string) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
  onUpdateStatus,
}) => {
  if (!order) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg" showCloseButton>
      <div className="space-y-6 pt-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-bold text-slate-900 font-mono">
                {order.orderNumber}
              </span>
              <OrderStatusBadge status={order.status} label={order.statusLabel} />
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Placed on {order.dateTime}
            </p>
          </div>

          <div className="text-right sm:text-right">
            <span className="text-xs text-slate-400 block">Total Amount</span>
            <span className="text-xl font-bold text-slate-900 font-mono">
              {formatNaira(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Customer & Delivery Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <span className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
              Customer Details
            </span>
            <div className="flex items-center gap-2 text-slate-800 font-medium">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{order.customerName}</span>
            </div>
            {order.customerPhone && (
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{order.customerPhone}</span>
              </div>
            )}
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <span className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
              Delivery & Payment
            </span>
            {order.customerAddress && (
              <div className="flex items-start gap-2 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{order.customerAddress}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-600">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span>{order.paymentMethod || 'Paid online'}</span>
            </div>
          </div>
        </div>

        {/* Runner Assignment Status */}
        {order.runnerName && (
          <div className="p-3 bg-purple-50/70 border border-purple-200/60 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-purple-900">
              <div className="w-7 h-7 rounded-full bg-purple-100 text-[#5E17EB] flex items-center justify-center shrink-0">
                <Bike className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold block">{order.runnerName}</span>
                <span className="text-[11px] text-purple-700">{order.runnerPhone}</span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-[#5E17EB] bg-white px-2 py-0.5 rounded-full border border-purple-200">
              Dispatched Runner
            </span>
          </div>
        )}

        {/* Ordered Items Table */}
        <div className="space-y-2">
          <span className="font-bold text-slate-900 text-xs">Items in this Order</span>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Item</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {item.unit || 'Standard'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatNaira(item.price)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatNaira(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          {onUpdateStatus && order.status === 'new_order' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              onClick={() => onUpdateStatus(order.id, 'preparing', 'Preparing')}
            >
              Accept & Start Preparing
            </Button>
          )}

          {onUpdateStatus && order.status === 'preparing' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Package className="w-4 h-4" />}
              onClick={() => onUpdateStatus(order.id, 'ready_for_pickup', 'Ready for pickup')}
            >
              Mark Ready for Pickup
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
