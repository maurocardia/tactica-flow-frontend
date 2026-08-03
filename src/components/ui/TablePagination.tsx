import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface TablePaginationProps {
  currentPage?: number;
  totalPages?: number;
  totalRecords?: number;
  pageLimit?: number;
  onPageChange?: (page: number) => void;
  onPageLimitChange?: (limit: number) => void;
  pageLimitOptions?: number[];
}

/**
 * Componente Global de Paginación para Tactica (TypeScript + Glassmorphism)
 * Siguiendo la Regla de Paginación en Tactica:
 * - Ubicación: Arriba del contenedor de resultados (debajo de filtros)
 * - Botones Estándar: Negros en modo claro, Blancos en modo oscuro
 */
export default function TablePagination({
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  pageLimit = 10,
  onPageChange,
  onPageLimitChange,
  pageLimitOptions = [10, 20, 30, 50]
}: TablePaginationProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 glass-card rounded-2xl mb-4 text-sm border border-white/10 backdrop-blur-md">
      <div className="flex items-center gap-2 text-slate-300">
        <span>Mostrando página <strong className="text-white font-semibold">{currentPage}</strong> de <strong className="text-white font-semibold">{totalPages}</strong></span>
        <span className="hidden sm:inline text-slate-600">•</span>
        <span className="hidden sm:inline">Total: <strong className="text-cyan-400">{totalRecords}</strong> registros</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Selector de límite por página */}
        <div className="flex items-center gap-2">
          <label htmlFor="pageLimitSelect" className="text-xs text-slate-400">Filas por página:</label>
          <select
            id="pageLimitSelect"
            value={pageLimit}
            onChange={(e) => onPageLimitChange && onPageLimitChange(Number(e.target.value))}
            className="glass-input text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            {pageLimitOptions.map((option) => (
              <option key={option} value={option} className="bg-slate-900 text-white">{option}</option>
            ))}
          </select>
        </div>

        {/* Botones de navegación (Cumpliendo Regla de Botones) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange && onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-2 bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:hover:bg-white rounded-full transition-all shadow-lg shadow-white/5 active:scale-95"
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onPageChange && onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-2 bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:hover:bg-white rounded-full transition-all shadow-lg shadow-white/5 active:scale-95"
            title="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
