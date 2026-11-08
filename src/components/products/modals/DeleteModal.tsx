import React from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productCount?: number;
  productName?: string;
  hasOrderHistory?: boolean;
  isLoading?: boolean;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  productCount = 1,
  productName,
  hasOrderHistory = false,
  isLoading = false,
}) => {
  const isMultiple = productCount > 1;

  const title = isMultiple
    ? `Delete ${productCount} selected products?`
    : productName
    ? `Delete "${productName}"?`
    : 'Delete product?';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <Trash2 className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>

        {hasOrderHistory ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left mb-6 w-full flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <strong className="font-semibold block mb-0.5">Business Rule Notice</strong>
              One or more products may have historical order records. According to platform rules, permanent deletion may be restricted in order to preserve order records.
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 mb-6 max-w-sm">
            Are you sure you want to delete this item? This action will permanently remove the product from your store and cannot be undone.
          </p>
        )}

        <div className="flex items-center justify-center gap-3 w-full">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            isLoading={isLoading}
            leftIcon={<Trash2 className="w-4 h-4" />}
            className="flex-1"
          >
            {isMultiple ? 'Delete products' : 'Delete product'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

