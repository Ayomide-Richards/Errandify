import React from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';
import { Archive } from 'lucide-react';

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName?: string;
  isLoading?: boolean;
}

export const ArchiveModal: React.FC<ArchiveModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  productName,
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-purple-100 text-[#5E17EB] flex items-center justify-center mb-4">
          <Archive className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {productName ? `Archive "${productName}"?` : 'Archive product?'}
        </h3>

        <p className="text-sm text-slate-500 mb-6 max-w-sm">
          Archiving removes this product from your active storefront and inventory lists while safely retaining its historical sales data and analytics.
        </p>

        <div className="flex items-center justify-center gap-3 w-full">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            isLoading={isLoading}
            leftIcon={<Archive className="w-4 h-4" />}
            className="flex-1"
          >
            Archive product
          </Button>
        </div>
      </div>
    </Modal>
  );
};

