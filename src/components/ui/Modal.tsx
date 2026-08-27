import React from 'react';
import { X } from 'lucide-react';
import { useAppState } from '@/state/AppStateContext';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerColor?: string; // clase tailwind de fondo, por defecto degradado rojo Tactica
  maxWidth?: string; // clase tailwind, por defecto max-w-[440px]
}

// Shell reutilizado por todos los modales del panel: mismo overlay/z-index/estructura
export const Modal: React.FC<ModalProps> = ({
  title,
  onClose,
  children,
  footer,
  headerColor = 'bg-gradient-to-r from-[#9e1114] via-[#b81519] to-[#800d10]',
  maxWidth = 'max-w-[460px]',
}) => {
  const { config } = useAppState();
  const isDark = config.theme === 'dark';

  return (
    <div
      className="fixed inset-0 w-full h-full bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden"
      style={{ zIndex: 2147483647 }}
      onClick={onClose}
    >
      <div
        className={`${
          isDark
            ? 'bg-[#0f172a] text-slate-100 border border-slate-700/80'
            : 'bg-white text-slate-900 border border-slate-200'
        } rounded-[24px] w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden shadow-2xl transition-colors`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${headerColor} text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-xs border-b border-white/10`}>
          <span className="font-bold text-[14.5px] tracking-tight">{title}</span>
          <button
            onClick={onClose}
            className="text-white/85 hover:text-white hover:bg-white/20 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={`p-4 flex flex-col gap-3 overflow-y-auto text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          {children}
        </div>

        {footer && (
          <div className={`border-t ${isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-slate-50'} px-4 py-3 flex justify-end gap-2 shrink-0`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
