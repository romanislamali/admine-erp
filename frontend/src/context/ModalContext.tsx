import React, { createContext, useContext, useState } from 'react';

export type ModalType = 'success' | 'error' | 'save' | 'delete';

interface ModalState {
  isOpen: boolean;
  type: ModalType | null;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  resolve?: (value: any) => void;
}

interface ModalContextType {
  modal: ModalState;
  showSuccess: (title: string, message: string, options?: { confirmText?: string }) => Promise<void>;
  showError: (title: string, message: string, options?: { confirmText?: string }) => Promise<void>;
  confirmSave: (title: string, message: string, options?: { confirmText?: string; cancelText?: string }) => Promise<boolean>;
  confirmDelete: (title: string, message: string, options?: { confirmText?: string; cancelText?: string }) => Promise<boolean>;
  closeModal: (result: boolean) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: null,
    title: '',
    message: '',
  });

  const showSuccess = (title: string, message: string, options?: { confirmText?: string }) => {
    return new Promise<void>((resolve) => {
      setModal({
        isOpen: true,
        type: 'success',
        title,
        message,
        confirmText: options?.confirmText || 'Got it',
        resolve: () => resolve(),
      });
    });
  };

  const showError = (title: string, message: string, options?: { confirmText?: string }) => {
    return new Promise<void>((resolve) => {
      setModal({
        isOpen: true,
        type: 'error',
        title,
        message,
        confirmText: options?.confirmText || 'Close',
        resolve: () => resolve(),
      });
    });
  };

  const confirmSave = (title: string, message: string, options?: { confirmText?: string; cancelText?: string }) => {
    return new Promise<boolean>((resolve) => {
      setModal({
        isOpen: true,
        type: 'save',
        title,
        message,
        confirmText: options?.confirmText || 'Yes, Save',
        cancelText: options?.cancelText || 'No, Cancel',
        resolve: (val) => resolve(val),
      });
    });
  };

  const confirmDelete = (title: string, message: string, options?: { confirmText?: string; cancelText?: string }) => {
    return new Promise<boolean>((resolve) => {
      setModal({
        isOpen: true,
        type: 'delete',
        title,
        message,
        confirmText: options?.confirmText || 'Yes, Delete',
        cancelText: options?.cancelText || 'No, Cancel',
        resolve: (val) => resolve(val),
      });
    });
  };

  const closeModal = (result: boolean) => {
    if (modal.resolve) {
      modal.resolve(result);
    }
    setModal((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <ModalContext.Provider value={{ modal, showSuccess, showError, confirmSave, confirmDelete, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
