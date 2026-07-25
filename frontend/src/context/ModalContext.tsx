import React, { createContext, useContext, useState, useRef } from 'react';

export type ModalType = 'success' | 'error' | 'save' | 'delete';

interface ModalState {
  isOpen: boolean;
  type: ModalType | null;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  duration?: number;
  autoDismiss?: boolean;
  resolve?: (value: any) => void;
}

interface ModalContextType {
  modal: ModalState;
  showSuccess: (title: string, message: string, options?: { confirmText?: string; duration?: number }) => Promise<void>;
  showError: (title: string, message: string, options?: { confirmText?: string; duration?: number }) => Promise<void>;
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

  const timerRef = useRef<any>(null);

  const clearExistingTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const closeModal = (result: boolean) => {
    clearExistingTimer();
    setModal((prev) => {
      if (prev.resolve) {
        prev.resolve(result);
      }
      return { ...prev, isOpen: false };
    });
  };

  const showSuccess = (title: string, message: string, options?: { confirmText?: string; duration?: number }) => {
    clearExistingTimer();
    const duration = options?.duration ?? 2000;

    return new Promise<void>((resolve) => {
      setModal({
        isOpen: true,
        type: 'success',
        title,
        message,
        confirmText: options?.confirmText || 'Got it',
        duration,
        autoDismiss: true,
        resolve: () => resolve(),
      });

      timerRef.current = setTimeout(() => {
        closeModal(true);
      }, duration);
    });
  };

  const showError = (title: string, message: string, options?: { confirmText?: string; duration?: number }) => {
    clearExistingTimer();
    const duration = options?.duration ?? 2000;

    return new Promise<void>((resolve) => {
      setModal({
        isOpen: true,
        type: 'error',
        title,
        message,
        confirmText: options?.confirmText || 'Close',
        duration,
        autoDismiss: true,
        resolve: () => resolve(),
      });

      timerRef.current = setTimeout(() => {
        closeModal(false);
      }, duration);
    });
  };

  const confirmSave = (title: string, message: string, options?: { confirmText?: string; cancelText?: string }) => {
    clearExistingTimer();
    return new Promise<boolean>((resolve) => {
      setModal({
        isOpen: true,
        type: 'save',
        title,
        message,
        confirmText: options?.confirmText || 'Yes, Save',
        cancelText: options?.cancelText || 'No, Cancel',
        autoDismiss: false,
        resolve: (val) => resolve(val),
      });
    });
  };

  const confirmDelete = (title: string, message: string, options?: { confirmText?: string; cancelText?: string }) => {
    clearExistingTimer();
    return new Promise<boolean>((resolve) => {
      setModal({
        isOpen: true,
        type: 'delete',
        title,
        message,
        confirmText: options?.confirmText || 'Yes, Delete',
        cancelText: options?.cancelText || 'No, Cancel',
        autoDismiss: false,
        resolve: (val) => resolve(val),
      });
    });
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
