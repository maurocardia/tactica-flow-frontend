// src/components/sidebar/BotRulesCard.tsx
import React from 'react';

// Simple placeholder component for Bot Rules
// Adjust the UI and props as needed for your application.
export const BotRulesCard: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm space-y-2">
      <h3 className="text-sm font-bold text-slate-800 mb-1">Reglas del Bot</h3>
      <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
        <li>Responder en menos de 2 segundos.</li>
        <li>No divulgar información confidencial.</li>
        <li>Escalar a un agente humano cuando sea necesario.</li>
      </ul>
    </div>
  );
};

export default BotRulesCard;
