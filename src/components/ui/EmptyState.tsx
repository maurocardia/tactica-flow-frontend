import React from 'react';

export const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center py-6">{children}</p>
);

export default EmptyState;
