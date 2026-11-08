import React, { useState, useEffect } from 'react';
import type { Product, ProductType, ProductImage, ProductOption, ProductCombination } from '../../types/product';
import { CATEGORIES } from '../../data/categories';
import { UNITS_OF_SALE } from '../../data/unitsOfSale';
import { ImageUploader } from './ImageUploader';
import { OptionsManager } from './OptionsManager';
import { Button } from '../common/Button';
import { UnsavedChangesModal } from './modals/UnsavedChangesModal';
import {
  ChevronRight,
  Package,
  Layers,
  Info,
  Check,
  Eye,
  AlertCircle,
} from 'lucide-react';

interface ProductFormProps {
  initialProduct?: Product;
  isEditMode?: boolean;
  onSubmit: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  initialProduct,
  isEditMode = false,
  onSubmit,
  onCancel,
}) => {
  // Form State
  const [name, setName] = useState(initialProduct?.name || '');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [images, setImages] = useState<ProductImage[]>(initialProduct?.images || []);
  const [category, setCategory] = useState(initialProduct?.category || '');
  const [subcategory, setSubcategory] = useState(initialProduct?.subcategory || '');
  const [productType, setProductType] = useState<ProductType>(
    initialProduct?.productType || 'individual'
  );

  // Individual product fields
  const [unitOfSale, setUnitOfSale] = useState(initialProduct?.unitOfSale || 'Kilogram (kg)');
  const [price, setPrice] = useState<string>(
    initialProduct?.price !== undefined ? initialProduct.price.toString() : ''
  );
  const [stockQuantity, setStockQuantity] = useState<string>(
    initialProduct?.stockQuantity !== undefined ? initialProduct.stockQuantity.toString() : ''
  );

  // Product with options fields
  const [options, setOptions] = useState<ProductOption[]>(initialProduct?.options || []);
  const [combinations, setCombinations] = useState<ProductCombination[]>(
    initialProduct?.combinations || []
  );

  // Visibility toggle
  const [isPublished, setIsPublished] = useState<boolean>(
    initialProduct?.isPublished !== undefined ? initialProduct.isPublished : true
  );

  // UI / Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Mark dirty on changes after initial load
  useEffect(() => {
    setIsDirty(true);
  }, [
    name,
    description,
    images,
    category,
    subcategory,
    productType,
    unitOfSale,
    price,
    stockQuantity,
    options,
    combinations,
    isPublished,
  ]);

  // Reset dirty flag on mount
  useEffect(() => {
    setIsDirty(false);
  }, []);

  // Update subcategories when category changes
  const selectedCategoryObj = CATEGORIES.find((c) => c.name === category);
  const availableSubcategories = selectedCategoryObj ? selectedCategoryObj.subcategories : [];

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCat = e.target.value;
    setCategory(newCat);
    setSubcategory(''); // Reset subcategory when parent changes
    if (errors.category) {
      setErrors((prev) => ({ ...prev, category: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Product name is required';
    } else if (name.trim().length < 3) {
      newErrors.name = 'Product name must be at least 3 characters';
    }

    if (!description.trim()) {
      newErrors.description = 'Product description is required';
    }

    if (!category) {
      newErrors.category = 'Please select a product category';
    }

    if (productType === 'individual') {
      const p = parseFloat(price);
      if (!price || isNaN(p) || p <= 0) {
        newErrors.price = 'Please enter a valid price greater than ₦0';
      }

      const q = parseInt(stockQuantity, 10);
      if (stockQuantity === '' || isNaN(q) || q < 0) {
        newErrors.stockQuantity = 'Please enter a non-negative stock quantity';
      }

      if (!unitOfSale) {
        newErrors.unitOfSale = 'Please select a unit of sale';
      }
    } else {
      // With options
      if (options.length === 0) {
        newErrors.options = 'Please add at least one option type (e.g. Colour, Size)';
      } else {
        const emptyOptions = options.filter((o) => o.values.length === 0);
        if (emptyOptions.length > 0) {
          newErrors.options = `Please add values for option: "${emptyOptions[0].name}"`;
        }
      }

      if (combinations.length === 0) {
        newErrors.combinations = 'Variant combinations must be generated for this product';
      } else {
        const invalidPrices = combinations.filter((c) => c.isAvailable && (!c.price || c.price <= 0));
        if (invalidPrices.length > 0) {
          newErrors.combinations = `Please enter a valid price for combination "${invalidPrices[0].title}"`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      // Scroll to first error
      const firstErr = document.querySelector('[data-error="true"]');
      if (firstErr) {
        firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
        name: name.trim(),
        description: description.trim(),
        images,
        category,
        subcategory: subcategory || undefined,
        productType,
        isPublished,
      };

      if (productType === 'individual') {
        payload.unitOfSale = unitOfSale;
        payload.price = parseFloat(price);
        payload.stockQuantity = parseInt(stockQuantity, 10);
      } else {
        payload.options = options;
        payload.combinations = combinations;
      }

      await onSubmit(payload);
      setIsDirty(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setShowUnsavedModal(true);
    } else {
      onCancel();
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="space-y-1">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500">
            <button
              type="button"
              onClick={handleCancelClick}
              className="hover:text-slate-900 transition-colors"
            >
              Products
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-medium">
              {isEditMode ? 'Edit Product' : 'Add Product'}
            </span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isEditMode ? `Edit Product: ${initialProduct?.name || ''}` : 'Add Product'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {isEditMode
              ? 'Update your store product information, pricing, stock, and selectable options.'
              : 'List a new product in your store with pricing, inventory, and variant options.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button type="button" variant="outline" onClick={handleCancelClick}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            {isEditMode ? 'Save Changes' : 'Add Product'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section A: Product Images */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Product Images</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload high-quality images of your product. The primary image is shown in storefront search.
            </p>
          </div>

          <ImageUploader images={images} onChange={setImages} />
        </section>

        {/* Section B: Basic Information */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Basic Information</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Provide essential details so customers can find and understand your product.
            </p>
          </div>

          <div className="space-y-4">
            {/* Product Name */}
            <div data-error={!!errors.name}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {name.length}/100
                </span>
              </div>
              <input
                type="text"
                maxLength={100}
                placeholder="e.g. Premium Long Grain Rice"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                }}
                className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.name
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-slate-300 focus:border-[#5E17EB] focus:ring-[#5E17EB]/20'
                }`}
              />
              {errors.name && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Description */}
            <div data-error={!!errors.description}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Product Description <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {description.length}/1500
                </span>
              </div>
              <textarea
                rows={4}
                maxLength={1500}
                placeholder="Describe your product, its features and what makes it useful to customers..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
                }}
                className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.description
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-slate-300 focus:border-[#5E17EB] focus:ring-[#5E17EB]/20'
                }`}
              />
              {errors.description && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Category & Subcategory Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div data-error={!!errors.category}>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={handleCategoryChange}
                  className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                    errors.category
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-slate-300 focus:border-[#5E17EB] focus:ring-[#5E17EB]/20'
                  }`}
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.category}
                  </p>
                )}
              </div>

              {/* Subcategory */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Subcategory <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  disabled={!category || availableSubcategories.length === 0}
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#5E17EB] focus:ring-2 focus:ring-[#5E17EB]/20 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!category
                      ? 'Select category first'
                      : availableSubcategories.length === 0
                      ? 'No subcategories available'
                      : 'Select a subcategory'}
                  </option>
                  {availableSubcategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Section C: Product Configuration Selector */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Product Configuration</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose how customers will purchase this product.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Individual Product */}
            <div
              onClick={() => setProductType('individual')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 flex items-start gap-3.5 ${
                productType === 'individual'
                  ? 'border-[#5E17EB] bg-[#F5F2FE]/70 shadow-xs ring-2 ring-[#5E17EB]/10'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  productType === 'individual'
                    ? 'border-[#5E17EB] bg-[#5E17EB] text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {productType === 'individual' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#5E17EB]" />
                  <span className="text-sm font-bold text-slate-900">Individual Product</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                    Default
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This product is sold as a single item with one price and stock quantity.
                </p>
                <p className="text-[11px] text-slate-400 italic">
                  e.g. 1 kg Bag of Rice, 5 kg Rice, Bottle of Cooking Oil, Blender.
                </p>
              </div>
            </div>

            {/* Card 2: Product with Options */}
            <div
              onClick={() => setProductType('with_options')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 flex items-start gap-3.5 ${
                productType === 'with_options'
                  ? 'border-[#5E17EB] bg-[#F5F2FE]/70 shadow-xs ring-2 ring-[#5E17EB]/10'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  productType === 'with_options'
                    ? 'border-[#5E17EB] bg-[#5E17EB] text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {productType === 'with_options' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#5E17EB]" />
                  <span className="text-sm font-bold text-slate-900">Product with Options</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Customers can choose from available options such as colour, size, or material.
                </p>
                <p className="text-[11px] text-slate-400 italic">
                  e.g. Shoes with multiple sizes and colours, Polo shirts.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section D: Individual Product Pricing & Inventory */}
        {productType === 'individual' && (
          <section className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Pricing & Inventory</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Set the single unit of sale, selling price in Nigerian Naira, and available store stock.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Unit of Sale */}
              <div data-error={!!errors.unitOfSale}>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Unit of Sale <span className="text-red-500">*</span>
                </label>
                <select
                  value={unitOfSale}
                  onChange={(e) => {
                    setUnitOfSale(e.target.value);
                    if (errors.unitOfSale) setErrors((prev) => ({ ...prev, unitOfSale: '' }));
                  }}
                  className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                    errors.unitOfSale
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-slate-300 focus:border-[#5E17EB] focus:ring-[#5E17EB]/20'
                  }`}
                >
                  <option value="">Select unit</option>
                  {UNITS_OF_SALE.map((group) => (
                    <optgroup key={group.groupName} label={`— ${group.groupName} —`}>
                      {group.units.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {errors.unitOfSale && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.unitOfSale}
                  </p>
                )}
              </div>

              {/* Price (₦) */}
              <div data-error={!!errors.price}>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Price (₦) <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-500 font-semibold text-sm">₦</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="2500"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      if (errors.price) setErrors((prev) => ({ ...prev, price: '' }));
                    }}
                    className={`w-full pl-8 pr-3.5 py-2.5 text-sm bg-white border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 font-medium transition-all ${
                      errors.price
                        ? 'border-red-400 focus:ring-red-200'
                        : 'border-slate-300 focus:border-[#5E17EB] focus:ring-[#5E17EB]/20'
                    }`}
                  />
                </div>
                {errors.price && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.price}
                  </p>
                )}
              </div>

              {/* Available Quantity */}
              <div data-error={!!errors.stockQuantity}>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Available Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="45"
                  value={stockQuantity}
                  onChange={(e) => {
                    setStockQuantity(e.target.value);
                    if (errors.stockQuantity) setErrors((prev) => ({ ...prev, stockQuantity: '' }));
                  }}
                  className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 font-medium transition-all ${
                    errors.stockQuantity
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-slate-300 focus:border-[#5E17EB] focus:ring-[#5E17EB]/20'
                  }`}
                />
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  Quantity is measured in <strong className="font-semibold">{unitOfSale}</strong>
                </p>
                {errors.stockQuantity && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.stockQuantity}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Section E: Product with Options Form */}
        {productType === 'with_options' && (
          <section className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Product Options & Variants</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Add attributes such as size or colour. Errandify automatically calculates the combination matrix.
              </p>
            </div>

            {errors.options && (
              <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errors.options}</span>
              </div>
            )}

            {errors.combinations && (
              <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errors.combinations}</span>
              </div>
            )}

            <OptionsManager
              options={options}
              combinations={combinations}
              onOptionsChange={setOptions}
              onCombinationsChange={setCombinations}
              basePrice={parseFloat(price) || 0}
            />
          </section>
        )}

        {/* Section F: Product Visibility Setting */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#5E17EB]" />
                <h2 className="text-base font-bold text-slate-900">Product Visibility</h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Publish product to customer marketplace
              </p>
              <p className="text-xs text-slate-400 max-w-xl">
                When enabled, customers can view and purchase this product in your storefront. If disabled, the product is saved as an unpublished draft while retaining all entered stock and pricing.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsPublished(!isPublished)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/40 ${
                isPublished ? 'bg-[#5E17EB]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isPublished ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Bottom Form Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200/80">
          <Button type="button" variant="outline" onClick={handleCancelClick}>
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
            >
              {isEditMode ? 'Save Changes' : 'Add Product'}
            </Button>
          </div>
        </div>
      </form>

      {/* Discard Unsaved Changes Modal */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onClose={() => setShowUnsavedModal(false)}
        onDiscard={() => {
          setShowUnsavedModal(false);
          setIsDirty(false);
          onCancel();
        }}
      />
    </div>
  );
};
