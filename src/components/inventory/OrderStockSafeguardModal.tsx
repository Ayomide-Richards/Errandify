import React, { useState } from 'react';
import type { Product } from '../../types/product';
import type { OrderStockValidationIssue } from '../../types/inventory';
import { InventoryStorage } from '../../services/inventoryStorage';
import { formatNaira, getProductPriceDisplay } from '../../services/productStorage';
import { AvailabilityBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import {
  ShieldCheck,
  ShoppingCart,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Zap,
  Info,
} from 'lucide-react';

interface CartLineItem {
  key: string;
  productId: string;
  productName: string;
  combinationId?: string;
  combinationTitle?: string;
  unitPrice: number;
  quantity: number;
  unitLabel: string;
}

interface OrderStockSafeguardModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onOrderConfirmed: (orderNumber: string) => void;
}

export const OrderStockSafeguardModal: React.FC<OrderStockSafeguardModalProps> = ({
  isOpen,
  onClose,
  products,
  onOrderConfirmed,
}) => {
  const publishedProducts = products.filter((p) => p.isPublished);
  const [selectedProductId, setSelectedProductId] = useState<string>(
    publishedProducts[0]?.id || ''
  );
  const [selectedCombinationId, setSelectedCombinationId] = useState<string>('');
  const [quantityToAdd, setQuantityToAdd] = useState<string>('1');
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [validationIssues, setValidationIssues] = useState<OrderStockValidationIssue[]>([]);
  const [addError, setAddError] = useState<string>('');
  const [checkoutSuccessMsg, setCheckoutSuccessMsg] = useState<string>('');

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const isWithOptions = selectedProduct?.productType === 'with_options';

  const activeCombination = isWithOptions
    ? selectedProduct?.combinations?.find(
        (c) =>
          c.id ===
          (selectedCombinationId || selectedProduct?.combinations?.[0]?.id)
      )
    : undefined;

  const currentAvailableStock = isWithOptions
    ? activeCombination?.stockQuantity ?? 0
    : selectedProduct?.stockQuantity ?? 0;

  const isCurrentSelectionOut =
    !selectedProduct ||
    (isWithOptions && (!activeCombination || !activeCombination.isAvailable)) ||
    currentAvailableStock <= 0;

  // How many of this item are already in the cart?
  const currentKey = selectedProduct
    ? `${selectedProduct.id}::${isWithOptions ? activeCombination?.id || '' : 'base'}`
    : '';
  const inCartQty = cart.find((item) => item.key === currentKey)?.quantity || 0;
  const remainingAddable = Math.max(0, currentAvailableStock - inCartQty);

  const handleAddToCart = () => {
    setAddError('');
    setCheckoutSuccessMsg('');
    setValidationIssues([]);

    if (!selectedProduct) return;

    if (isCurrentSelectionOut) {
      setAddError(
        'Out-of-stock products or combinations cannot be added to an order.'
      );
      return;
    }

    const qty = parseInt(quantityToAdd, 10);
    if (isNaN(qty) || qty <= 0) {
      setAddError('Please enter a valid quantity greater than 0.');
      return;
    }

    if (qty + inCartQty > currentAvailableStock) {
      setAddError(
        `Cannot order ${qty + inCartQty} units. Only ${currentAvailableStock} available in stock${
          inCartQty > 0 ? ` (${inCartQty} already in cart)` : ''
        }.`
      );
      return;
    }

    const unitPrice = isWithOptions && activeCombination
      ? activeCombination.discountPrice &&
        activeCombination.discountPrice > 0 &&
        activeCombination.discountPrice < activeCombination.price
        ? activeCombination.discountPrice
        : activeCombination.price
      : getProductPriceDisplay(selectedProduct).min;

    const unitLabel = isWithOptions
      ? 'units'
      : selectedProduct.unitOfSale?.split(' ')[0] || 'units';

    setCart((prev) => {
      const existingIdx = prev.findIndex((x) => x.key === currentKey);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + qty,
        };
        return updated;
      }
      return [
        ...prev,
        {
          key: currentKey,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          combinationId: isWithOptions ? activeCombination?.id : undefined,
          combinationTitle: isWithOptions ? activeCombination?.title : undefined,
          unitPrice,
          quantity: qty,
          unitLabel,
        },
      ];
    });
    setQuantityToAdd('1');
  };

  // Allows testing mid-cart stock changes before checkout submission
  const handleForceCartQuantityForTest = (key: string, newQty: number) => {
    setValidationIssues([]);
    setCheckoutSuccessMsg('');
    if (newQty <= 0) {
      setCart((prev) => prev.filter((x) => x.key !== key));
      return;
    }
    setCart((prev) =>
      prev.map((x) => (x.key === key ? { ...x, quantity: newQty } : x))
    );
  };

  const handleCheckoutSubmit = () => {
    setAddError('');
    setCheckoutSuccessMsg('');

    if (cart.length === 0) {
      setAddError('Add at least one item to test checkout validation.');
      return;
    }

    const orderNumber = `#ER-${Math.floor(1030 + Math.random() * 900)}`;
    const result = InventoryStorage.deductStockForOrder({
      orderNumber,
      items: cart.map((c) => ({
        productId: c.productId,
        combinationId: c.combinationId,
        quantity: c.quantity,
      })),
    });

    if (!result.success) {
      setValidationIssues(result.validation.issues);
      return;
    }

    setValidationIssues([]);
    setCart([]);
    setCheckoutSuccessMsg(
      `Order ${orderNumber} verified and confirmed! Stock quantities have been deducted once and logged to Stock History.`
    );
    onOrderConfirmed(orderNumber);
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl" showCloseButton={false}>
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-slate-100 -mt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Order & Checkout Stock Safeguards
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify stock availability checks at cart addition and checkout submission.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-5 pt-4 max-h-[75vh] overflow-y-auto pr-1 -mr-1">
        {/* Safeguard Policy Note */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
          <Info className="w-4 h-4 text-[#5E17EB] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-800">Active Inventory Safeguards:</span>{' '}
            Out-of-stock products and combinations cannot be ordered, requested quantities cannot exceed available stock, and all items are revalidated against live inventory at checkout before stock is deducted.
          </div>
        </div>

        {/* Item Selector */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4 shadow-2xs">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            1. Select Product or Combination to Order
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {/* Product Dropdown */}
            <div className={isWithOptions ? 'sm:col-span-5' : 'sm:col-span-8'}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Store Product
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedProductId(newId);
                  const prod = products.find((p) => p.id === newId);
                  setSelectedCombinationId(prod?.combinations?.[0]?.id || '');
                  setAddError('');
                }}
                className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#5E17EB]"
              >
                {products.map((p) => {
                  const stock =
                    p.productType === 'with_options'
                      ? p.combinations?.reduce(
                          (s, c) => s + (c.isAvailable ? c.stockQuantity : 0),
                          0
                        ) || 0
                      : p.stockQuantity || 0;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} — {stock <= 0 ? 'OUT OF STOCK (0)' : `${stock} available`}
                      {!p.isPublished ? ' [Unpublished]' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Combination Dropdown */}
            {isWithOptions && selectedProduct?.combinations && (
              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Option Combination
                </label>
                <select
                  value={activeCombination?.id || ''}
                  onChange={(e) => {
                    setSelectedCombinationId(e.target.value);
                    setAddError('');
                  }}
                  className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#5E17EB]"
                >
                  {selectedProduct.combinations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.stockQuantity <= 0 ? 'Out of Stock: 0' : `${c.stockQuantity} in stock`})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantity */}
            <div className={isWithOptions ? 'sm:col-span-3' : 'sm:col-span-4'}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity (Max: {remainingAddable})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, remainingAddable)}
                  disabled={isCurrentSelectionOut}
                  value={quantityToAdd}
                  onChange={(e) => {
                    setQuantityToAdd(e.target.value);
                    setAddError('');
                  }}
                  className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#5E17EB] disabled:bg-slate-100 disabled:text-slate-400"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={isCurrentSelectionOut}
                  onClick={handleAddToCart}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  className="shrink-0 py-2"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Selected Item Availability Bar */}
          {selectedProduct && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Live Stock Status:</span>
                <AvailabilityBadge
                  status={
                    currentAvailableStock <= 0
                      ? 'out_of_stock'
                      : currentAvailableStock <= 10
                      ? 'low_stock'
                      : 'in_stock'
                  }
                />
                <span className="text-slate-700 font-semibold">
                  {currentAvailableStock} available
                </span>
              </div>

              {isCurrentSelectionOut && (
                <span className="text-red-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Purchase blocked — Out of Stock
                </span>
              )}
            </div>
          )}

          {addError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{addError}</span>
            </div>
          )}
        </div>

        {/* Cart & Checkout Revalidation Section */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5 text-[#5E17EB]" />
              2. Order Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})
            </h4>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  // Simulate a scenario where requested cart qty exceeds available stock at checkout time
                  const first = cart[0];
                  const prod = products.find((p) => p.id === first.productId);
                  const avail = first.combinationId
                    ? prod?.combinations?.find((c) => c.id === first.combinationId)
                        ?.stockQuantity || 0
                    : prod?.stockQuantity || 0;
                  handleForceCartQuantityForTest(first.key, avail + 5);
                }}
                className="text-[11px] font-semibold text-[#5E17EB] hover:underline flex items-center gap-1"
                title="Test checkout revalidation when requested quantity exceeds current available stock"
              >
                <Zap className="w-3 h-3" />
                Simulate Stock Discrepancy at Checkout
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No items in test order cart yet. Select an in-stock product above and click Add.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Product / Option</th>
                    <th className="py-2.5 px-3 text-center">Order Qty</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                    <th className="py-2.5 px-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.map((item) => (
                    <tr key={item.key}>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900 block">
                          {item.productName}
                        </span>
                        {item.combinationTitle && (
                          <span className="text-[11px] text-[#5E17EB] font-medium">
                            Combination: {item.combinationTitle}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold text-slate-900">
                          {item.quantity} {item.unitLabel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {formatNaira(item.unitPrice * item.quantity)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleForceCartQuantityForTest(item.key, 0)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Checkout Revalidation Issues Alert */}
          {validationIssues.length > 0 && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-red-800">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>
                  Order Blocked — Stock Revalidation Failed ({validationIssues.length}{' '}
                  {validationIssues.length === 1 ? 'issue' : 'issues'})
                </span>
              </div>
              <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                {validationIssues.map((iss, idx) => (
                  <li key={idx}>{iss.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Checkout Success Feedback */}
          {checkoutSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-medium">{checkoutSuccessMsg}</span>
            </div>
          )}

          {cart.length > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <span className="text-xs text-slate-500">Order Total: </span>
                <span className="text-base font-extrabold text-slate-900 font-mono">
                  {formatNaira(cartTotal)}
                </span>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<ShieldCheck className="w-4 h-4" />}
                onClick={handleCheckoutSubmit}
              >
                Revalidate Stock & Confirm Order
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end pt-4 mt-4 border-t border-slate-100">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
};

