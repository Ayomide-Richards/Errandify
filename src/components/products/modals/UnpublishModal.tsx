import React from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';
import { EyeOff } from 'lucide-react';

interface UnpublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productCount?: number;
  productName?: string;
  isLoading?: boolean;
}

export const UnpublishModal: React.FC<UnpublishModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  productCount = 1,
  productName,
  isLoading = false,
}) => {
  const isMultiple = productCount > 1;
  const title = isMultiple
    ? 'Unpublish selected products?'
    : productName
    ? `Unpublish "${productName}"?`
    : 'Unpublish product?';

  const subtitle = isMultiple
    ? 'These products will no longer be visible to customers in the marketplace. You can publish them again later.'
    : 'This product will no longer be visible to customers in the marketplace. You can publish it again later.';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} subtitle={subtitle} maxWidth="md">
      <div className="flex items-center justify-center gap-3 mt-6">
        <Button variant="outline" onClick={onClose} disabled={isLoading} className="w-32">
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={onConfirm}
          isLoading={isLoading}
          leftIcon={<EyeOff className="w-4 h-4" />}
          className="min-w-36"
        >
          {isMultiple ? 'Unpublish products' : 'Unpublish product'}
        </Button>
      </div>
    </Modal>
  );
};

