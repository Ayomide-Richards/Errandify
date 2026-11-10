import React, { useState, useEffect } from 'react';
import type { Order, OrderStatus } from '../../types/order';
import { Modal } from '../common/Modal';
import { OrderStatusBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { formatNaira } from '../../services/productStorage';
import { STATUS_LABELS, getOrderTotalItemCount } from '../../services/orderStorage';
import {
  Package,
  User,
  Calendar,
  Bike,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Tag,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (
    orderId: string,
    nextStatus: OrderStatus,
    options?: { handoverNotes?: string }
  ) => void;
  onStockUpdated?: () => void;
}

const LIFECYCLE_STEPS: Array<{ status: OrderStatus; label: string }> = [
  { status: 'new_order', label: 'New Order' },
  { status: 'preparing', label: 'Preparing' },
  { status: 'ready_for_pickup', label: 'Ready for Pickup' },
  { status: 'runner_assigned', label: 'Runner Assigned' },
  { status: 'picked_up', label: 'Picked Up' },
];

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
  onUpdateStatus,
}) => {
  const [actionError, setActionError] = useState<string | null>(null);
  const [showPickupConfirm, setShowPickupConfirm] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [pickupSuccessBanner, setPickupSuccessBanner] = useState(false);

  useEffect(() => {
    setActionError(null);
    setShowPickupConfirm(false);
    setHandoverNotes('');
    setPickupSuccessBanner(false);
  }, [order?.id, isOpen]);

  if (!order) return null;

  const totalUnits = getOrderTotalItemCount(order);
  const currentStepIndex = LIFECYCLE_STEPS.findIndex(
    (s) => s.status === order.status
  );

  const handleStatusTransition = (
    nextStatus: OrderStatus,
    options?: { handoverNotes?: string }
  ) => {
    if (!onUpdateStatus) return;
    setActionError(null);
    try {
      onUpdateStatus(order.id, nextStatus, options);
      if (nextStatus === 'picked_up') {
        setShowPickupConfirm(false);
        setPickupSuccessBanner(true);
      }
    } catch (err: any) {
      setActionError(
        err?.message || 'Unable to update order status. Please try again.'
      );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl" showCloseButton>
      <div className="space-y-5 pt-1 max-h-[82vh] overflow-y-auto pr-1 -mr-1">
        {/* Top Header: Customer Name, Order Status, Date & Time, Total Amount */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-full bg-[#F3EFFE] text-[#5E17EB] flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                {order.customerName}
              </h3>
              <OrderStatusBadge
                status={order.status}
                label={STATUS_LABELS[order.status]}
              />
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 pl-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Order Date & Time: {order.dateTime}</span>
              <span>·</span>
              <span>
                {totalUnits} {totalUnits === 1 ? 'item' : 'items'}
              </span>
            </p>
          </div>

          <div className="sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-slate-100 sm:border-0">
            <span className="text-xs text-slate-400 block">Total Amount</span>
            <span className="text-xl font-extrabold text-slate-900 tabular-nums">
              {formatNaira(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Order Lifecycle Progress Bar: New Order → Preparing → Ready for Pickup → Runner Assigned → Picked Up */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
          <div className="grid grid-cols-5 gap-1.5">
            {LIFECYCLE_STEPS.map((step, idx) => {
              const isCompletedStep = idx < currentStepIndex;
              const isCurrentStep = idx === currentStepIndex;
              return (
                <div
                  key={step.status}
                  className="flex flex-col items-center text-center"
                >
                  <div className="w-full flex items-center">
                    <div
                      className={`h-1 flex-1 rounded-l-full ${
                        idx === 0
                          ? 'bg-transparent'
                          : idx <= currentStepIndex
                          ? 'bg-[#5E17EB]'
                          : 'bg-slate-200'
                      }`}
                    />
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                        isCompletedStep
                          ? 'bg-[#5E17EB] text-white'
                          : isCurrentStep
                          ? 'bg-[#5E17EB] text-white ring-4 ring-[#5E17EB]/15'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isCompletedStep ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <div
                      className={`h-1 flex-1 rounded-r-full ${
                        idx === LIFECYCLE_STEPS.length - 1
                          ? 'bg-transparent'
                          : idx < currentStepIndex
                          ? 'bg-[#5E17EB]'
                          : 'bg-slate-200'
                      }`}
                    />
                  </div>
                  <span
                    className={`mt-1.5 text-[11px] leading-tight ${
                      isCurrentStep
                        ? 'font-bold text-[#5E17EB]'
                        : isCompletedStep
                        ? 'font-semibold text-slate-700'
                        : 'font-medium text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Picked Up Confirmation Banner */}
        {pickupSuccessBanner && order.status === 'picked_up' && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Order Marked as Picked Up</p>
              <p className="text-emerald-800 mt-0.5">
                Pickup recorded at <strong>{order.handedOverAt}</strong>. Status updated to{' '}
                <strong>Picked Up</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Customer Instructions / Notes */}
        {order.notes && (
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs">
            <FileText className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 block">
                Customer Instructions & Order Notes
              </span>
              <p className="text-slate-700 leading-relaxed">{order.notes}</p>
            </div>
          </div>
        )}

        {/* Runner Assignment & Pickup Details Card */}
        {(order.runnerName || order.handedOverAt) && (
          <div className="p-3.5 bg-[#F8F6FE] border border-[#DDD0FA] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] text-[#5E17EB] flex items-center justify-center shrink-0 mt-0.5">
                <Bike className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 block">
                  {order.runnerName || 'Assigned Errandify Runner'}
                </span>
                {order.runnerVehicle && (
                  <span className="text-[11px] text-slate-600 block">
                    {order.runnerVehicle}
                  </span>
                )}
                {order.handedOverAt && (
                  <span className="text-[11px] font-semibold text-blue-700 block pt-0.5">
                    Picked up on {order.handedOverAt}
                  </span>
                )}
                {order.handedOverNotes && (
                  <span className="text-[11px] text-slate-600 italic block">
                    "{order.handedOverNotes}"
                  </span>
                )}
              </div>
            </div>

            <div className="self-start sm:self-center shrink-0">
              {order.status === 'runner_assigned' && (
                <span className="text-[11px] font-semibold text-[#E11D48] bg-white px-2.5 py-1 rounded-full border border-[#FECDD3]">
                  Runner Assigned
                </span>
              )}
              {order.status === 'picked_up' && (
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  Picked Up
                </span>
              )}
            </div>
          </div>
        )}

        {/* Ordered Products Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Ordered Products ({totalUnits} {totalUnits === 1 ? 'Item' : 'Items'})
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Product & Options</th>
                  <th className="py-2.5 px-2.5 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {order.items.map((item) => {
                  const hasDiscount =
                    typeof item.discountPrice === 'number' &&
                    item.discountPrice > 0 &&
                    item.discountPrice < item.price;
                  const effectiveUnitPrice = hasDiscount
                    ? item.discountPrice!
                    : item.price;
                  const lineTotal = effectiveUnitPrice * item.quantity;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center mt-0.5">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">
                              {item.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              {item.selectedOptionsLabel && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5E17EB] bg-[#F3EFFE] px-1.5 py-0.5 rounded border border-[#DDD0FA]">
                                  <Layers className="w-2.5 h-2.5" />
                                  {item.selectedOptionsLabel}
                                </span>
                              )}
                              {item.unit && (
                                <span className="text-[11px] text-slate-500">
                                  Unit: {item.unit}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-2.5 text-center font-bold text-slate-900 whitespace-nowrap">
                        {item.quantity}
                      </td>

                      <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                        {hasDiscount ? (
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {formatNaira(effectiveUnitPrice)}
                            </span>
                            <span className="text-[11px] text-slate-400 line-through block">
                              {formatNaira(item.price)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-700 font-medium">
                            {formatNaira(item.price)}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right tabular-nums font-bold text-slate-900 whitespace-nowrap">
                        {formatNaira(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span>Subtotal (Before Discounts)</span>
            <span className="tabular-nums font-medium text-slate-800">
              {formatNaira(order.subtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span>Product Discounts</span>
            <span
              className={`tabular-nums font-medium ${
                order.productDiscountTotal > 0
                  ? 'text-emerald-700'
                  : 'text-slate-500'
              }`}
            >
              {order.productDiscountTotal > 0
                ? `-${formatNaira(order.productDiscountTotal)}`
                : formatNaira(0)}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600 gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>Promotion Discounts</span>
              {order.promotionName && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F3EFFE] text-[#5E17EB] border border-[#DDD0FA]">
                  <Tag className="w-2.5 h-2.5" />
                  {order.promotionName}
                </span>
              )}
            </div>
            <span
              className={`tabular-nums font-medium shrink-0 ${
                order.promotionDiscountAmount > 0
                  ? 'text-emerald-700'
                  : 'text-slate-500'
              }`}
            >
              {order.promotionDiscountAmount > 0
                ? `-${formatNaira(order.promotionDiscountAmount)}`
                : formatNaira(0)}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span>Delivery Fee</span>
            <span className="tabular-nums font-medium text-slate-800">
              {formatNaira(order.deliveryFee)}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span>{order.otherChargesLabel || 'Other Applicable Charges'}</span>
            <span className="tabular-nums font-medium text-slate-800">
              {formatNaira(order.otherCharges)}
            </span>
          </div>

          <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-sm font-extrabold text-slate-900">
            <span>Total Amount</span>
            <span className="tabular-nums text-base text-[#5E17EB]">
              {formatNaira(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Order Activity Timeline */}
        {order.activityLog && order.activityLog.length > 0 && (
          <div className="space-y-2.5">
            <span className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#5E17EB]" />
              Order Activity & Status Timeline
            </span>
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
              {order.activityLog.map((event, idx) => {
                const isLatest = idx === order.activityLog.length - 1;
                return (
                  <div key={event.id} className="flex items-start gap-3 text-xs">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-2.5 h-2.5 rounded-full mt-1 ${
                          isLatest
                            ? 'bg-[#5E17EB] ring-4 ring-[#5E17EB]/15'
                            : 'bg-slate-300'
                        }`}
                      />
                      {idx < order.activityLog.length - 1 && (
                        <div className="w-0.5 h-7 bg-slate-200 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5">
                        <span
                          className={`font-bold ${
                            isLatest ? 'text-slate-900' : 'text-slate-700'
                          }`}
                        >
                          {event.title}
                        </span>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {event.formattedTime}
                        </span>
                      </div>
                      {event.description && (
                        <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action / Stock Validation Error Banner */}
        {actionError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Unable to Complete Action</span>
              <p className="text-red-700">{actionError}</p>
            </div>
          </div>
        )}

        {/* Inline Runner Pickup Confirmation Dialog */}
        {showPickupConfirm && order.status === 'runner_assigned' && (
          <div className="p-4 bg-[#F5F2FE] border-2 border-[#5E17EB]/30 rounded-xl space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#5E17EB] text-white flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">
                  Confirm Order Picked Up
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  Confirm that{' '}
                  <strong className="text-[#5E17EB]">
                    {order.runnerName || 'Assigned Errandify Runner'}
                  </strong>{' '}
                  has collected{' '}
                  <strong className="text-slate-900">
                    {order.customerName}&apos;s order ({totalUnits}{' '}
                    {totalUnits === 1 ? 'item' : 'items'})
                  </strong>
                  . This will record the pickup timestamp and update the status to{' '}
                  <strong>Picked Up</strong>.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Pickup Verification Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Package seal verified with runner at pickup counter..."
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#5E17EB]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPickupConfirm(false)}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() =>
                  handleStatusTransition('picked_up', { handoverNotes })
                }
              >
                Confirm Picked Up
              </Button>
            </div>
          </div>
        )}

        {/* Modal Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {onUpdateStatus && order.status === 'new_order' && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Package className="w-4 h-4" />}
                onClick={() => handleStatusTransition('preparing')}
              >
                Mark as Preparing
              </Button>
            )}

            {onUpdateStatus && order.status === 'preparing' && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => handleStatusTransition('ready_for_pickup')}
              >
                Mark as Ready for Pickup
              </Button>
            )}

            {onUpdateStatus && order.status === 'ready_for_pickup' && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Bike className="w-4 h-4" />}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                onClick={() => handleStatusTransition('runner_assigned')}
              >
                Mark as Runner Assigned
              </Button>
            )}

            {onUpdateStatus &&
              order.status === 'runner_assigned' &&
              !showPickupConfirm && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  onClick={() => setShowPickupConfirm(true)}
                >
                  Mark as Picked Up
                </Button>
              )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
