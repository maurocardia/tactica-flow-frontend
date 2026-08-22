import React from 'react';
import { Modal } from '@/components/ui/Modal';

// Se usa solo para IDs de ModalHost cuyo modal real todavía no está construido en esta fase.
export const PlaceholderModal: React.FC<{ title: string; onClose: () => void }> = ({ title, onClose }) => (
  <Modal title={title} onClose={onClose}>
    <p className="text-slate-500 text-center py-6">Este módulo se está construyendo. Próximamente acá.</p>
  </Modal>
);

export default PlaceholderModal;
