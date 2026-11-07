import React from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';
import { AlertCircle } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDiscard: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onClose,
  onDiscard,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 mb-2">Unsaved changes</h3>

        <p className="text-sm text-slate-500 mb-6">
          You have unsaved changes on this form. Leaving now will discard all changes made. Are you sure?
        </p>

        <div className="flex items-center justify-center gap-3 w-full">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Stay on page
          </Button>
          <Button variant="danger" onClick={onDiscard} className="flex-1">
            Discard changes
          </Button>
        </div>
      </div>
    </Modal>
  );
};

