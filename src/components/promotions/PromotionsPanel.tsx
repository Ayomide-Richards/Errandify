import React, { useState } from 'react';
import type { Promotion } from '../../types/promotion';
import type { Product } from '../../types/product';
import { PromotionStorage, getPromotionStatus, getPromotionBenefitLabel } from '../../services/promotionStorage';
import { PromotionStatusBadge, PromotionTypeBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { PromotionForm } from './PromotionForm';
import {
  Tag,
  Plus,
  Edit,
  Trash2,
  Power,
  PowerOff,
  ArrowLeft,
  Users,
  Calendar,
  PackageSearch,
  LayoutGrid,
  Zap,
} from 'lucide-react';

interface PromotionsPanelProps {
  products: Product[];
  onBack: () => void;
  onToast?: (type: 'success' | 'info' | 'error', title: string, message?: string) => void;
}

export const PromotionsPanel: React.FC<PromotionsPanelProps> = ({ products, onBack, onToast }) => {
  const [promotions, setPromotions] = useState<Promotion[]>(() =>
    PromotionStorage.getPromotions()
  );
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editPromotion, setEditPromotion] = useState<Promotion | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Promotion | null>(null);

  const refreshPromotions = () => setPromotions(PromotionStorage.getPromotions());

  const handleCreate = (data: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>) => {
    PromotionStorage.createPromotion(data);
    refreshPromotions();
    setCreateFormOpen(false);
    onToast?.('success', `"${data.name}" created`, 'Promotion saved and ready to run on schedule.');
  };

  const handleEdit = (data: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editPromotion) return;
    PromotionStorage.updatePromotion(editPromotion.id, data);
    refreshPromotions();
    setEditPromotion(null);
    onToast?.('success', `"${data.name}" updated`, 'Promotion changes saved.');
  };

  const handleToggleActive = (promo: Promotion) => {
    const updated = PromotionStorage.togglePromotionActive(promo.id);
    refreshPromotions();
    if (updated.isActive) {
      onToast?.('success', `"${promo.name}" activated`, 'Promotion will run on its scheduled dates.');
    } else {
      onToast?.('info', `"${promo.name}" deactivated`, 'Promotion is now paused.');
    }
  };

  const handleDelete = (promo: Promotion) => {
    PromotionStorage.deletePromotion(promo.id);
    refreshPromotions();
    setDeleteConfirm(null);
    onToast?.('success', `"${promo.name}" deleted`, 'Promotion permanently removed.');
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const getTargetLabel = (promo: Promotion): string => {
    if (promo.targetType === 'all_products') return 'All products';
    if (promo.targetType === 'selected_categories') {
      const cats = promo.applicableCategories || [];
      return cats.length === 1 ? cats[0] : `${cats.length} categories`;
    }
    const ids = promo.applicableProductIds || [];
    return ids.length === 1
      ? (products.find((p) => p.id === ids[0])?.name ?? '1 product')
      : `${ids.length} products`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500">
            <button
              onClick={onBack}
              className="hover:text-slate-900 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Products
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-medium">Promotions</span>
          </nav>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Tag className="w-6 h-6 text-[#5E17EB]" />
              Promotions
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create and manage store-wide promotions, discounts, and special offers.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={() => setCreateFormOpen(true)}
          leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
          className="shadow-sm font-semibold shrink-0"
        >
          Add Promotion
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Total',
            value: promotions.length,
            icon: <LayoutGrid className="w-4 h-4" />,
            color: 'text-slate-600 bg-slate-100',
          },
          {
            label: 'Active',
            value: promotions.filter((p) => getPromotionStatus(p) === 'active').length,
            icon: <Zap className="w-4 h-4" />,
            color: 'text-emerald-700 bg-emerald-100',
          },
          {
            label: 'Scheduled',
            value: promotions.filter((p) => getPromotionStatus(p) === 'scheduled').length,
            icon: <Calendar className="w-4 h-4" />,
            color: 'text-violet-700 bg-violet-100',
          },
          {
            label: 'Expired / Inactive',
            value: promotions.filter((p) =>
              ['expired', 'inactive'].includes(getPromotionStatus(p))
            ).length,
            icon: <PackageSearch className="w-4 h-4" />,
            color: 'text-slate-500 bg-slate-100',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs"
          >
            <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center mb-2`}>
              {s.icon}
            </div>
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Promotions List */}
      {promotions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#F3EFFE] text-[#5E17EB] flex items-center justify-center mx-auto">
            <Tag className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">No promotions yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create percentage discounts, fixed vouchers, free delivery offers, or custom promotions to attract and reward customers.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setCreateFormOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create First Promotion
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#5E17EB] text-white text-xs font-semibold select-none">
                <tr>
                  <th className="py-3.5 px-4">Promotion</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Benefit</th>
                  <th className="py-3.5 px-4">
                    <Users className="w-3 h-3 inline mr-1" />
                    Applies To
                  </th>
                  <th className="py-3.5 px-4">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Dates
                  </th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {promotions.map((promo) => {
                  const status = getPromotionStatus(promo);
                  const benefit = getPromotionBenefitLabel(promo);

                  return (
                    <tr key={promo.id} className="hover:bg-[#F8F9FE] transition-colors">
                      {/* Name + Description */}
                      <td className="py-4 px-4 min-w-[200px]">
                        <p className="font-semibold text-slate-900 text-xs">{promo.name}</p>
                        {promo.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2 max-w-[200px]">
                            {promo.description}
                          </p>
                        )}
                      </td>

                      {/* Type */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <PromotionTypeBadge type={promo.type} />
                      </td>

                      {/* Benefit */}
                      <td className="py-4 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                        {benefit}
                      </td>

                      {/* Target */}
                      <td className="py-4 px-4 text-xs text-slate-600 whitespace-nowrap">
                        {getTargetLabel(promo)}
                      </td>

                      {/* Dates */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="text-xs text-slate-700">{formatDate(promo.startDate)}</p>
                        <p className="text-[11px] text-slate-400">→ {formatDate(promo.endDate)}</p>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <PromotionStatusBadge status={status} />
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditPromotion(promo)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#5E17EB] hover:bg-[#F3EFFE] transition-colors"
                            title="Edit promotion"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(promo)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              promo.isActive
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={promo.isActive ? 'Deactivate promotion' : 'Activate promotion'}
                          >
                            {promo.isActive ? (
                              <PowerOff className="w-3.5 h-3.5" />
                            ) : (
                              <Power className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(promo)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete promotion"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Form */}
      <PromotionForm
        isOpen={createFormOpen}
        onClose={() => setCreateFormOpen(false)}
        onSubmit={handleCreate}
        products={products}
        isEditMode={false}
      />

      {/* Edit Form */}
      {editPromotion && (
        <PromotionForm
          isOpen={!!editPromotion}
          onClose={() => setEditPromotion(null)}
          onSubmit={handleEdit}
          initialPromotion={editPromotion}
          products={products}
          isEditMode={true}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <Modal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          maxWidth="sm"
        >
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Delete Promotion?</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold text-slate-800">"{deleteConfirm.name}"</span>?
                This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => handleDelete(deleteConfirm)}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

