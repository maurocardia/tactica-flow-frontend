import React from 'react';

type PillTone = 'ok' | 'pend' | 'deb' | 'off';

const TONE_CLASSES: Record<PillTone, string> = {
  ok: 'bg-emerald-50 text-emerald-700',
  pend: 'bg-amber-50 text-amber-700',
  deb: 'bg-red-50 text-red-700',
  off: 'bg-slate-100 text-slate-500',
};

export const StatusPill: React.FC<{ tone: PillTone; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full shrink-0 ${TONE_CLASSES[tone]}`}>{children}</span>
);

export default StatusPill;
