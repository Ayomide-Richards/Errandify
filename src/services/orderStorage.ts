import { MOCK_ORDERS } from '../data/mockOrders';
import type {
  Order,
  OrderActivityEvent,
  OrderItem,
  OrderStatus,
  OrderSummaryMetrics,
} from '../types/order';
import { ProductStorage } from './productStorage';
import { InventoryStorage } from './inventoryStorage';
import { PromotionStorage, getPromotionStatus } from './promotionStorage';

const ORDERS_STORAGE_KEY = 'errandify_merchant_orders_v3';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new_order: 'New Order',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for Pickup',
  runner_assigned: 'Runner Assigned',
  picked_up: 'Picked Up',
};

/**
 * Enforces the strict sequential order lifecycle:
 * New Order → Preparing → Ready for Pickup → Runner Assigned → Picked Up
 */
const VALID_NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  new_order: ['preparing'],
  preparing: ['ready_for_pickup'],
  ready_for_pickup: ['runner_assigned'],
  runner_assigned: ['picked_up'],
  picked_up: [],
};

const ASSIGNED_RUNNERS = [
  {
    name: 'Tunde Bakare (Runner #R-41)',
    vehicle: 'Dispatch Box Bike · LAG-492-QA',
  },
  {
    name: 'Emeka Nwosu (Runner #R-18)',
    vehicle: 'Dispatch Box Bike · KJA-214-BA',
  },
  {
    name: 'Sadiq Ibrahim (Runner #R-12)',
    vehicle: 'Delivery Van · LND-883-XJ',
  },
];

export function formatOrderTimestamp(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function getOrderTotalItemCount(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function calculateOrderMetrics(orders: Order[]): OrderSummaryMetrics {
  const confirmedOrders = orders.filter((o) => o.paymentConfirmed !== false);
  return {
    totalOrders: confirmedOrders.length,
    newOrders: confirmedOrders.filter((o) => o.status === 'new_order').length,
    preparing: confirmedOrders.filter((o) => o.status === 'preparing').length,
    readyForPickup: confirmedOrders.filter((o) => o.status === 'ready_for_pickup').length,
    runnerAssigned: confirmedOrders.filter((o) => o.status === 'runner_assigned').length,
    pickedUp: confirmedOrders.filter((o) => o.status === 'picked_up').length,
  };
}

export function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): boolean {
  return VALID_NEXT_STATUSES[currentStatus]?.includes(targetStatus) ?? false;
}

function normalizeOrderRecord(order: Order): Order {
  const validStatus: OrderStatus =
    order.status in STATUS_LABELS ? order.status : 'new_order';
  return {
    ...order,
    status: validStatus,
    statusLabel: STATUS_LABELS[validStatus],
  };
}

export const OrderStorage = {
  /**
   * Returns all merchant orders where backend payment confirmation succeeded.
   * Orders with unconfirmed or failed payments (`paymentConfirmed === false`) are never surfaced.
   */
  getOrders(): Order[] {
    try {
      const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(MOCK_ORDERS));
        return MOCK_ORDERS.filter((o) => o.paymentConfirmed !== false).map(
          normalizeOrderRecord
        );
      }
      const parsed: Order[] = JSON.parse(stored);
      return parsed
        .filter((o) => o.paymentConfirmed !== false)
        .map(normalizeOrderRecord);
    } catch (e) {
      console.error('Failed to load orders from storage', e);
      return MOCK_ORDERS.filter((o) => o.paymentConfirmed !== false).map(
        normalizeOrderRecord
      );
    }
  },

  getOrderById(orderId: string): Order | undefined {
    return this.getOrders().find((o) => o.id === orderId);
  },

  saveOrders(orders: Order[]): void {
    try {
      const normalized = orders.map(normalizeOrderRecord);
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent('errandify:orders-updated'));
    } catch (e) {
      console.error('Failed to save orders to storage', e);
    }
  },

  /**
   * Transitions an order to the next valid status in the lifecycle:
   * New Order → Preparing → Ready for Pickup → Runner Assigned → Picked Up
   */
  updateOrderStatus(params: {
    orderId: string;
    nextStatus: OrderStatus;
    handoverNotes?: string;
  }): { updatedOrder: Order; stockUpdated: boolean } {
    const orders = this.getOrders();
    const index = orders.findIndex((o) => o.id === params.orderId);
    if (index === -1) {
      throw new Error('Order not found.');
    }

    const order = orders[index];
    if (!canTransitionOrderStatus(order.status, params.nextStatus)) {
      throw new Error(
        `Invalid status transition from "${STATUS_LABELS[order.status]}" to "${STATUS_LABELS[params.nextStatus]}". Stages cannot be skipped.`
      );
    }

    const nowIso = new Date().toISOString();
    const formattedNow = formatOrderTimestamp(nowIso);
    let stockUpdated = false;
    let stockDeducted = order.stockDeducted ?? false;

    // When marking a New Order as Preparing, validate & deduct stock if not yet deducted
    if (order.status === 'new_order' && params.nextStatus === 'preparing' && !stockDeducted) {
      const allProducts = ProductStorage.getProducts();
      const checkItems = order.items
        .map((item) => {
          if (item.productId) {
            return {
              productId: item.productId,
              combinationId: item.combinationId,
              quantity: item.quantity,
            };
          }
          const matchedProduct = allProducts.find(
            (p) => p.name.toLowerCase() === item.name.toLowerCase()
          );
          if (matchedProduct) {
            return {
              productId: matchedProduct.id,
              quantity: item.quantity,
            };
          }
          return null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      if (checkItems.length > 0) {
        const result = InventoryStorage.deductStockForOrder({
          orderNumber: order.orderNumber || order.id,
          items: checkItems,
        });
        if (!result.success) {
          const message = result.validation.issues.map((i) => i.message).join(' ');
          throw new Error(message || 'Insufficient stock to prepare this order.');
        }
        stockDeducted = true;
        stockUpdated = true;
      }
    }

    const nextLabel = STATUS_LABELS[params.nextStatus];
    let activityTitle = nextLabel;
    let activityDescription = '';

    const updates: Partial<Order> = {
      status: params.nextStatus,
      statusLabel: nextLabel,
      stockDeducted,
    };

    if (params.nextStatus === 'preparing') {
      activityTitle = 'Preparing';
      activityDescription = 'Merchant started assembling and preparing the order items.';
    } else if (params.nextStatus === 'ready_for_pickup') {
      activityTitle = 'Ready for Pickup';
      activityDescription =
        'Preparation is complete. Order is awaiting runner assignment.';
    } else if (params.nextStatus === 'runner_assigned') {
      activityTitle = 'Runner Assigned';
      const assignedRunner = order.runnerName
        ? { name: order.runnerName, vehicle: order.runnerVehicle }
        : ASSIGNED_RUNNERS[index % ASSIGNED_RUNNERS.length];
      updates.runnerName = assignedRunner.name;
      updates.runnerVehicle = assignedRunner.vehicle;
      activityDescription = `Runner ${assignedRunner.name} has been assigned to collect this order.`;
    } else if (params.nextStatus === 'picked_up') {
      activityTitle = 'Picked Up';
      updates.handedOverAt = formattedNow;
      if (params.handoverNotes?.trim()) {
        updates.handedOverNotes = params.handoverNotes.trim();
      }
      const runnerLabel = order.runnerName || 'Assigned Runner';
      activityDescription = `Runner ${runnerLabel} collected the order from the merchant.${
        params.handoverNotes?.trim() ? ` Note: ${params.handoverNotes.trim()}` : ''
      }`;
    }

    const newActivityEvent: OrderActivityEvent = {
      id: `act-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      status: params.nextStatus,
      title: activityTitle,
      description: activityDescription,
      timestamp: nowIso,
      formattedTime: formattedNow,
    };

    const updatedOrder: Order = {
      ...order,
      ...updates,
      activityLog: [...(order.activityLog || []), newActivityEvent],
    };

    const updatedList = [...orders];
    updatedList[index] = updatedOrder;
    this.saveOrders(updatedList);

    return { updatedOrder, stockUpdated };
  },

  /**
   * Backend payment confirmation webhook/service handler:
   * - Automatically creates a new order in the merchant dashboard ONLY when backend confirms successful payment.
   * - Rejects unconfirmed or unsuccessful payments (`paymentConfirmed !== true`).
   * - Preserves historical product & pricing snapshots so future catalog edits never alter placed orders.
   */
  createOrderFromConfirmedCheckout(payload: {
    customerName: string;
    paymentConfirmed: boolean;
    notes?: string;
    deliveryFee?: number;
    otherCharges?: number;
    items: Array<{
      productId: string;
      combinationId?: string;
      quantity: number;
    }>;
  }): { created: boolean; order?: Order; error?: string } {
    if (!payload.paymentConfirmed) {
      return {
        created: false,
        error:
          'Backend payment confirmation was not received or payment failed. Order was not created.',
      };
    }

    const products = ProductStorage.getProducts();
    const stockCheckItems = payload.items.map((i) => ({
      productId: i.productId,
      combinationId: i.combinationId,
      quantity: i.quantity,
    }));

    const stockValidation = InventoryStorage.validateOrderStock(stockCheckItems, products);
    if (!stockValidation.isValid) {
      return {
        created: false,
        error: stockValidation.issues.map((i) => i.message).join(' '),
      };
    }

    const snapshotItems: OrderItem[] = [];
    let subtotal = 0;
    let productDiscountTotal = 0;

    for (const reqItem of payload.items) {
      const product = products.find((p) => p.id === reqItem.productId);
      if (!product) continue;

      if (product.productType === 'with_options' && reqItem.combinationId) {
        const comb = product.combinations?.find((c) => c.id === reqItem.combinationId);
        if (!comb) continue;

        const normalPrice = comb.price;
        const discountedPrice =
          comb.discountPrice && comb.discountPrice > 0 && comb.discountPrice < normalPrice
            ? comb.discountPrice
            : undefined;

        const optionPairs = Object.entries(comb.selectedOptions || {})
          .map(([k, v]) => `${k}: ${v}`)
          .join(' · ');

        subtotal += normalPrice * reqItem.quantity;
        if (discountedPrice) {
          productDiscountTotal += (normalPrice - discountedPrice) * reqItem.quantity;
        }

        snapshotItems.push({
          id: `item-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
          productId: product.id,
          combinationId: comb.id,
          name: product.name,
          selectedOptionsLabel: optionPairs || comb.title,
          unit: 'Unit',
          price: normalPrice,
          discountPrice: discountedPrice,
          quantity: reqItem.quantity,
          image: product.images?.[0]?.url,
        });
      } else {
        const normalPrice = product.price || 0;
        const discountedPrice =
          product.discountPrice &&
          product.discountPrice > 0 &&
          product.discountPrice < normalPrice
            ? product.discountPrice
            : undefined;

        subtotal += normalPrice * reqItem.quantity;
        if (discountedPrice) {
          productDiscountTotal += (normalPrice - discountedPrice) * reqItem.quantity;
        }

        snapshotItems.push({
          id: `item-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
          productId: product.id,
          name: product.name,
          unit: product.unitOfSale || 'Unit',
          price: normalPrice,
          discountPrice: discountedPrice,
          quantity: reqItem.quantity,
          image: product.images?.[0]?.url,
        });
      }
    }

    if (snapshotItems.length === 0) {
      return {
        created: false,
        error: 'No valid products found for order creation.',
      };
    }

    // Evaluate active store promotions
    const netAfterProductDiscounts = subtotal - productDiscountTotal;
    const activePromos = PromotionStorage.getPromotions().filter(
      (p) => getPromotionStatus(p) === 'active'
    );

    let promotionDiscountAmount = 0;
    let promotionName: string | undefined;

    for (const promo of activePromos) {
      if (!promo.allowStackingWithProductDiscounts && productDiscountTotal > 0) {
        continue;
      }
      if (
        promo.type === 'minimum_purchase' &&
        promo.minimumPurchaseAmount &&
        netAfterProductDiscounts >= promo.minimumPurchaseAmount &&
        promo.discountAmount
      ) {
        if (promo.discountAmount > promotionDiscountAmount) {
          promotionDiscountAmount = promo.discountAmount;
          promotionName = promo.name;
        }
      } else if (promo.type === 'percentage_discount' && promo.discountPercentage) {
        const candidate = Math.round(
          (netAfterProductDiscounts * promo.discountPercentage) / 100
        );
        if (candidate > promotionDiscountAmount) {
          promotionDiscountAmount = candidate;
          promotionName = promo.name;
        }
      } else if (promo.type === 'fixed_discount' && promo.discountAmount) {
        if (promo.discountAmount > promotionDiscountAmount) {
          promotionDiscountAmount = promo.discountAmount;
          promotionName = promo.name;
        }
      }
    }

    const deliveryFee = payload.deliveryFee ?? 1800;
    const otherCharges = payload.otherCharges ?? 500;
    const totalAmount = Math.max(
      0,
      subtotal - productDiscountTotal - promotionDiscountAmount + deliveryFee + otherCharges
    );

    const nowIso = new Date().toISOString();
    const formattedNow = formatOrderTimestamp(nowIso);
    const orderNum = `#ER-${Math.floor(1025 + Math.random() * 900)}`;

    // Deduct stock upon confirmed payment order creation
    const deductResult = InventoryStorage.deductStockForOrder({
      orderNumber: orderNum,
      items: stockCheckItems,
    });

    const itemSummary = snapshotItems
      .map((i) =>
        i.selectedOptionsLabel ? `${i.name} (${i.selectedOptionsLabel})` : i.name
      )
      .join(', ');

    const newOrder: Order = {
      id: `ord-${Date.now().toString(36)}`,
      orderNumber: orderNum,
      itemSummary,
      items: snapshotItems,
      customerName: payload.customerName.trim(),
      dateTime: formattedNow,
      createdAt: nowIso,
      status: 'new_order',
      statusLabel: 'New Order',
      subtotal,
      productDiscountTotal,
      promotionDiscountAmount,
      promotionName,
      deliveryFee,
      otherCharges,
      otherChargesLabel: 'Packaging & Service Charge',
      totalAmount,
      notes: payload.notes?.trim() || undefined,
      paymentConfirmed: true,
      stockDeducted: deductResult.success,
      activityLog: [
        {
          id: `act-${Date.now().toString(36)}`,
          status: 'new_order',
          title: 'New Order',
          description:
            'Customer payment confirmed by backend. Order placed in New Order queue awaiting preparation.',
          timestamp: nowIso,
          formattedTime: formattedNow,
        },
      ],
    };

    const existing = this.getOrders();
    this.saveOrders([newOrder, ...existing]);

    return { created: true, order: newOrder };
  },
};
