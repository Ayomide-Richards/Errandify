import React, { useState } from 'react';
import type { Promotion, PromotionFormData, PromotionType, PromotionTarget } from '../../types/promotion';
import type { Product } from '../../types/product';
import { CATEGORIES } from '../../data/categories';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import {
  Percent,
  BadgeDollarSign,
  ShoppingCart,
  Truck,
  Sparkles,
  Info,
  X,
  Calendar,
  Tag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PromotionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialPromotion?: Promotion;
  products: Product[];
  isEditMode?: boolean;
}

const PROMOTION_TYPES: { value: PromotionType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'percentage_discount',
    label: 'Percentage Discount',
    description: 'Offer a % off eligible purchases (e.g. 10% off)',
    icon: <Percent className="w-4 h-4" />,
  },
  {
    value: 'fixed_discount',
    label: 'Fixed Amount Discount',
    description: 'Offer a fixed ₦ off any eligible purchase',
    icon: <BadgeDollarSign className="w-4 h-4" />,
  },
  {
    value: 'minimum_purchase',
    label: 'Minimum Purchase Discount',
    description: 'Give customers a discount when their order hits a minimum spend',
    icon: <ShoppingCart className="w-4 h-4" />,
  },
  {
    value: 'free_delivery',
    label: 'Free Delivery',
    description: 'Offer free delivery, optionally above a minimum order value',
    icon: <Truck className="w-4 h-4" />,
  },
  {
    value: 'custom',
    label: 'Custom Promotion',
    description: 'Configure any other promotion type with a custom benefit description',
    icon: <Sparkles className="w-4 h-4" />,
  },
];

function buildInitialFormData(promo?: Promotion): PromotionFormData {
  if (!promo) {
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return {
      name: '',
      description: '',
      type: 'percentage_discount',
      discountPercentage: '',
      discountAmount: '',
      minimumPurchaseAmount: '',
      freeDeliveryThreshold: '',
      customBenefit: '',
      targetType: 'all_products',
      applicableProductIds: [],
      applicableCategories: [],
      startDate: fmt(start),
      endDate: fmt(end),
      isActive: true,
      allowStackingWithProductDiscounts: false,
    };
  }
  return {
    name: promo.name,
    description: promo.description || '',
    type: promo.type,
    discountPercentage: promo.discountPercentage?.toString() || '',
    discountAmount: promo.discountAmount?.toString() || '',
    minimumPurchaseAmount: promo.minimumPurchaseAmount?.toString() || '',
    freeDeliveryThreshold: promo.freeDeliveryThreshold?.toString() || '',
    customBenefit: promo.customBenefit || '',
    targetType: promo.targetType,
    applicableProductIds: promo.applicableProductIds || [],
    applicableCategories: promo.applicableCategories || [],
    startDate: promo.startDate,
    endDate: promo.endDate,
    isActive: promo.isActive,
    allowStackingWithProductDiscounts: promo.allowStackingWithProductDiscounts,
  };
}

export const PromotionForm: React.FC<PromotionFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialPromotion,
  products,
  isEditMode = false,
}) => {
  const [form, setForm] = useState<PromotionFormData>(() =>
    buildInitialFormData(initialPromotion)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const setField = <K extends keyof PromotionFormData>(key: K, value: PromotionFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = 'Promotion name is required.';

    if (form.type === 'percentage_discount') {
      const val = parseFloat(form.discountPercentage);
      if (!form.discountPercentage || isNaN(val) || val <= 0 || val > 100) {
        newErrors.discountPercentage = 'Enter a percentage between 1 and 100.';
      }
    }
    if (form.type === 'fixed_discount') {
      const val = parseFloat(form.discountAmount);
      if (!form.discountAmount || isNaN(val) || val <= 0) {
        newErrors.discountAmount = 'Enter a valid fixed discount amount greater than ₦0.';
      }
    }
    if (form.type === 'minimum_purchase') {
      const amount = parseFloat(form.discountAmount);
      const min = parseFloat(form.minimumPurchaseAmount);
      if (!form.discountAmount || isNaN(amount) || amount <= 0) {
        newErrors.discountAmount = 'Enter a valid discount amount greater than ₦0.';
      }
      if (!form.minimumPurchaseAmount || isNaN(min) || min <= 0) {
        newErrors.minimumPurchaseAmount = 'Enter a valid minimum purchase amount greater than ₦0.';
      }
      if (!isNaN(amount) && !isNaN(min) && amount >= min) {
        newErrors.discountAmount = 'Discount must be less than the minimum purchase amount.';
      }
    }
    if (form.type === 'custom') {
      if (!form.customBenefit.trim()) {
        newErrors.customBenefit = 'Please describe the custom benefit.';
      }
    }

    if (!form.startDate) newErrors.startDate = 'Start date is required.';
    if (!form.endDate) newErrors.endDate = 'End date is required.';
    if (form.startDate && form.endDate && form.endDate <= form.startDate) {
      newErrors.endDate = 'End date must be after the start date.';
    }

    if (form.targetType === 'selected_products' && form.applicableProductIds.length === 0) {
      newErrors.targetType = 'Select at least one product.';
    }
    if (form.targetType === 'selected_categories' && form.applicableCategories.length === 0) {
      newErrors.targetType = 'Select at least one category.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'> = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        targetType: form.targetType,
        startDate: form.startDate,
        endDate: form.endDate,
        isActive: form.isActive,
        allowStackingWithProductDiscounts: form.allowStackingWithProductDiscounts,
        applicableProductIds:
          form.targetType === 'selected_products' ? form.applicableProductIds : undefined,
        applicableCategories:
          form.targetType === 'selected_categories' ? form.applicableCategories : undefined,
      };

      if (form.type === 'percentage_discount') {
        payload.discountPercentage = parseFloat(form.discountPercentage);
      }
      if (form.type === 'fixed_discount') {
        payload.discountAmount = parseFloat(form.discountAmount);
      }
      if (form.type === 'minimum_purchase') {
        payload.discountAmount = parseFloat(form.discountAmount);
        payload.minimumPurchaseAmount = parseFloat(form.minimumPurchaseAmount);
      }
      if (form.type === 'free_delivery') {
        payload.freeDeliveryThreshold = form.freeDeliveryThreshold
          ? parseFloat(form.freeDeliveryThreshold)
          : 0;
      }
      if (form.type === 'custom') {
        payload.customBenefit = form.customBenefit.trim();
      }

      onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm(buildInitialFormData(initialPromotion));
    setErrors({});
    setIsSubmitting(false);
    setProductSearch('');
    onClose();
  };

  const toggleProductId = (id: string) => {
    setField(
      'applicableProductIds',
      form.applicableProductIds.includes(id)
        ? form.applicableProductIds.filter((x) => x !== id)
        : [...form.applicableProductIds, id]
    );
    if (errors.targetType) setErrors((prev) => ({ ...prev, targetType: '' }));
  };

  const toggleCategory = (cat: string) => {
    setField(
      'applicableCategories',
      form.applicableCategories.includes(cat)
        ? form.applicableCategories.filter((x) => x !== cat)
        : [...form.applicableCategories, cat]
    );
    if (errors.targetType) setErrors((prev) => ({ ...prev, targetType: '' }));
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const inputClass = (hasError?: boolean) =>
    `w-full px-3.5 py-2.5 border rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB] transition-colors ${
      hasError ? 'border-red-400 bg-red-50/40' : 'border-slate-200 bg-white'
    }`;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="2xl" showCloseButton={false}>
      {/* Custom header */}
      <div className="flex items-start justify-between mb-6 -mt-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#F3EFFE] flex items-center justify-center">
              <Tag className="w-4 h-4 text-[#5E17EB]" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEditMode ? 'Edit Promotion' : 'Create Promotion'}
            </h2>
          </div>
          <p className="text-sm text-slate-500 ml-10">
            {isEditMode
              ? 'Update the details of this promotion.'
              : 'Set up a new promotion for your store customers.'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-h-[72vh] overflow-y-auto pr-1 -mr-1">
        {/* Promotion Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Promotion Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="e.g. Weekend 10% Off Flash Sale"
            className={inputClass(!!errors.name)}
            maxLength={80}
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Description <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="Briefly describe this promotion for your records..."
            rows={2}
            className={`${inputClass()} resize-none`}
            maxLength={300}
          />
        </div>

        {/* Promotion Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Promotion Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PROMOTION_TYPES.map((pt) => (
              <button
                key={pt.value}
                type="button"
                onClick={() => setField('type', pt.value)}
                className={`text-left px-3.5 py-3 rounded-xl border transition-all ${
                  form.type === pt.value
                    ? 'border-[#5E17EB] bg-[#F3EFFE] shadow-sm ring-1 ring-[#5E17EB]/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`${
                      form.type === pt.value ? 'text-[#5E17EB]' : 'text-slate-500'
                    }`}
                  >
                    {pt.icon}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      form.type === pt.value ? 'text-[#5E17EB]' : 'text-slate-800'
                    }`}
                  >
                    {pt.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 ml-6 leading-snug">{pt.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Conditional Fields based on type */}
        {form.type === 'percentage_discount' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Discount Percentage <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={form.discountPercentage}
                onChange={(e) => setField('discountPercentage', e.target.value)}
                placeholder="10"
                className={`${inputClass(!!errors.discountPercentage)} pr-8`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                %
              </span>
            </div>
            {errors.discountPercentage && (
              <p className="mt-1 text-xs text-red-600">{errors.discountPercentage}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              Customers receive this percentage off their qualifying order.
            </p>
          </div>
        )}

        {form.type === 'fixed_discount' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Fixed Discount Amount (₦) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">
                ₦
              </span>
              <input
                type="number"
                min="1"
                value={form.discountAmount}
                onChange={(e) => setField('discountAmount', e.target.value)}
                placeholder="2000"
                className={`${inputClass(!!errors.discountAmount)} pl-8`}
              />
            </div>
            {errors.discountAmount && (
              <p className="mt-1 text-xs text-red-600">{errors.discountAmount}</p>
            )}
          </div>
        )}

        {form.type === 'minimum_purchase' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Minimum Purchase Amount (₦) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">
                  ₦
                </span>
                <input
                  type="number"
                  min="1"
                  value={form.minimumPurchaseAmount}
                  onChange={(e) => setField('minimumPurchaseAmount', e.target.value)}
                  placeholder="20000"
                  className={`${inputClass(!!errors.minimumPurchaseAmount)} pl-8`}
                />
              </div>
              {errors.minimumPurchaseAmount && (
                <p className="mt-1 text-xs text-red-600">{errors.minimumPurchaseAmount}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Discount Amount (₦) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">
                  ₦
                </span>
                <input
                  type="number"
                  min="1"
                  value={form.discountAmount}
                  onChange={(e) => setField('discountAmount', e.target.value)}
                  placeholder="3000"
                  className={`${inputClass(!!errors.discountAmount)} pl-8`}
                />
              </div>
              {errors.discountAmount && (
                <p className="mt-1 text-xs text-red-600">{errors.discountAmount}</p>
              )}
            </div>
            <p className="text-xs text-slate-400 sm:col-span-2">
              Example: Get ₦3,000 off orders worth ₦20,000 or more.
            </p>
          </div>
        )}

        {form.type === 'free_delivery' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Minimum Order Value for Free Delivery (₦){' '}
              <span className="text-slate-400 font-normal">(leave empty for unconditional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">
                ₦
              </span>
              <input
                type="number"
                min="0"
                value={form.freeDeliveryThreshold}
                onChange={(e) => setField('freeDeliveryThreshold', e.target.value)}
                placeholder="15000 (or leave empty for all orders)"
                className={`${inputClass()} pl-8`}
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Leave empty to offer free delivery on all qualifying orders with no minimum.
            </p>
          </div>
        )}

        {form.type === 'custom' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Custom Benefit Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.customBenefit}
              onChange={(e) => setField('customBenefit', e.target.value)}
              placeholder="e.g. Buy 3 get 1 free on selected items"
              className={inputClass(!!errors.customBenefit)}
              maxLength={120}
            />
            {errors.customBenefit && (
              <p className="mt-1 text-xs text-red-600">{errors.customBenefit}</p>
            )}
          </div>
        )}

        {/* Target Scope */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Applies To
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {(
              [
                { value: 'all_products', label: 'All products' },
                { value: 'selected_categories', label: 'Selected categories' },
                { value: 'selected_products', label: 'Specific products' },
              ] as { value: PromotionTarget; label: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setField('targetType', opt.value);
                  if (errors.targetType) setErrors((prev) => ({ ...prev, targetType: '' }));
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  form.targetType === opt.value
                    ? 'border-[#5E17EB] bg-[#F3EFFE] text-[#5E17EB]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Category multi-select */}
          {form.targetType === 'selected_categories' && (
            <div className="border border-slate-200 rounded-xl p-3 max-h-44 overflow-y-auto space-y-1 bg-slate-50/40">
              {CATEGORIES.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={form.applicableCategories.includes(cat.name)}
                    onChange={() => toggleCategory(cat.name)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-[#5E17EB] focus:ring-[#5E17EB]/20 accent-[#5E17EB]"
                  />
                  <span className="text-xs font-medium text-slate-800">{cat.name}</span>
                </label>
              ))}
            </div>
          )}

          {/* Product multi-select */}
          {form.targetType === 'selected_products' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40">
              <div className="p-2 border-b border-slate-200 bg-white">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB]"
                />
              </div>
              <div className="max-h-40 overflow-y-auto p-2 space-y-0.5">
                {filteredProducts.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.applicableProductIds.includes(p.id)}
                      onChange={() => toggleProductId(p.id)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-[#5E17EB] focus:ring-[#5E17EB]/20 accent-[#5E17EB]"
                    />
                    <span className="text-xs font-medium text-slate-800 truncate">{p.name}</span>
                    <span className="text-[11px] text-slate-400 ml-auto shrink-0">{p.category}</span>
                  </label>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-3">No products found.</p>
                )}
              </div>
            </div>
          )}

          {errors.targetType && (
            <p className="mt-1.5 text-xs text-red-600">{errors.targetType}</p>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              <Calendar className="w-3 h-3 inline mr-1" />
              Start Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={form.startDate}
              onChange={(e) => setField('startDate', e.target.value)}
              className={inputClass(!!errors.startDate)}
            />
            {errors.startDate && (
              <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              <Calendar className="w-3 h-3 inline mr-1" />
              End Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={form.endDate}
              onChange={(e) => setField('endDate', e.target.value)}
              className={inputClass(!!errors.endDate)}
            />
            {errors.endDate && (
              <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>
            )}
          </div>
        </div>

        {/* Status toggle */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <p className="text-xs font-semibold text-slate-800">Promotion Status</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {form.isActive ? 'Active — promotion will run on schedule.' : 'Inactive — promotion is paused.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setField('isActive', !form.isActive)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              form.isActive ? 'bg-[#5E17EB]' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                form.isActive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Advanced section */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            Advanced settings
          </button>

          {showAdvanced && (
            <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allowStackingWithProductDiscounts}
                  onChange={(e) =>
                    setField('allowStackingWithProductDiscounts', e.target.checked)
                  }
                  className="w-3.5 h-3.5 mt-0.5 rounded border-slate-300 text-[#5E17EB] focus:ring-[#5E17EB]/20 accent-[#5E17EB]"
                />
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    Allow stacking with product-level discounts
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    When enabled, this promotion applies on top of any existing product discount prices. Leave unchecked to prevent double discounting.
                  </p>
                </div>
              </label>
              <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-400">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                <span>Stacking behaviour must be confirmed with your backend payment configuration before going live.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            leftIcon={<Tag className="w-4 h-4" />}
          >
            {isEditMode ? 'Save Changes' : 'Create Promotion'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

