import React from 'react';
import { Toggle } from '@/components/ui/Toggle';
import { useAppState } from '@/state/AppStateContext';

const TAB_LABELS: Record<string, string> = {
  historial: 'Historial',
  pendientes: 'Pendientes',
  presupuestos: 'Presupuestos',
  facturacion: 'Facturación',
  compras: 'Compras',
  ctacte: 'Cuenta corriente',
};

const MODULE_LABELS: Record<string, string> = {
  contactCard: 'Ficha de contacto',
  aiModule: 'Inteligencia artificial',
  selectMessages: 'Seleccionar mensajes',
  ficha360: 'Ficha 360°',
  chatbot: 'Chatbot / autoatención',
  toolsGrid: 'Herramientas',
};

export const VisibilitySection: React.FC = () => {
  const { config, setConfig } = useAppState();

  return (
    <div className="border border-slate-200 rounded-lg p-2.5 flex flex-col gap-3">
      <div>
        <h4 className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Pestañas de Ficha 360°</h4>
        <div className="flex flex-col gap-1.5">
          {(Object.keys(config.ficha360Tabs) as (keyof typeof config.ficha360Tabs)[]).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <span>{TAB_LABELS[key]}</span>
              <Toggle
                size="sm"
                checked={config.ficha360Tabs[key]}
                onChange={(v) => setConfig((c) => ({ ...c, ficha360Tabs: { ...c.ficha360Tabs, [key]: v } }))}
              />
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Módulos visibles en el panel</h4>
        <div className="flex flex-col gap-1.5">
          {(Object.keys(config.moduleVisibility) as (keyof typeof config.moduleVisibility)[]).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <span>{MODULE_LABELS[key]}</span>
              <Toggle
                size="sm"
                checked={config.moduleVisibility[key]}
                onChange={(v) => setConfig((c) => ({ ...c, moduleVisibility: { ...c.moduleVisibility, [key]: v } }))}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VisibilitySection;
