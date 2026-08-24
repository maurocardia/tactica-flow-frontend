import React, { createContext, useContext, useState, useCallback } from 'react';
import { ModalId } from '@/config/modals';

interface ModalContextValue {
  activeModal: ModalId | null;
  payload: unknown;
  openModal: (id: ModalId, payload?: unknown) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModal, setActiveModal] = useState<ModalId | null>(null);
  const [payload, setPayload] = useState<unknown>(null);

  const openModal = useCallback((id: ModalId, p?: unknown) => {
    setPayload(p ?? null);
    setActiveModal(id);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setPayload(null);
  }, []);

  return (
    <ModalContext.Provider value={{ activeModal, payload, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
};

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal debe usarse dentro de <ModalProvider>');
  return ctx;
}
