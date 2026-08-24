import React from 'react';

export const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] text-slate-500 text-center py-4">{children}</p>
);

export default EmptyState;
