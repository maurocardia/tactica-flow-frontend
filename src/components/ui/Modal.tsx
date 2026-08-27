import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerColor?: string; // clase tailwind de fondo, por defecto rojo Tactica
  maxWidth?: string; // clase tailwind, por defecto max-w-[420px]
}

// Shell reutilizado por todos los modales del panel: mismo overlay/z-index/estructura que ya
// probó BotFlowModal (fixed inset-0 dentro del shadow root, sin portal a document.body).
export const Modal: React.FC<ModalProps> = ({
  title,
  onClose,
  children,
  footer,
  headerColor = 'bg-gradient-to-r from-[#9e1114] via-[#b81519] to-[#800d10]',
  maxWidth = 'max-w-[440px]',
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4"
      style={{ zIndex: 2147483647 }}
      onClick={onClose}
    >
      <div
        className={`bg-white/98 backdrop-blur-xl rounded-[24px] w-full ${maxWidth} max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-white/40`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${headerColor} text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-xs`}>
          <span className="font-bold text-[14px] tracking-tight">{title}</span>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/15 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3 overflow-y-auto text-xs">{children}</div>

        {footer && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 flex justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
