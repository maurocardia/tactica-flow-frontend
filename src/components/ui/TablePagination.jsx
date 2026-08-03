import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Componente Global de Paginación para Tactica
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
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl mb-4 text-sm">
      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
        <span>Mostrando página <strong className="text-zinc-900 dark:text-zinc-100">{currentPage}</strong> de <strong className="text-zinc-900 dark:text-zinc-100">{totalPages}</strong></span>
        <span className="hidden sm:inline">•</span>
        <span className="hidden sm:inline">Total: <strong>{totalRecords}</strong> registros</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Selector de límite por página */}
        <div className="flex items-center gap-2">
          <label htmlFor="pageLimitSelect" className="text-xs text-zinc-500 dark:text-zinc-400">Filas por página:</label>
          <select
            id="pageLimitSelect"
            value={pageLimit}
            onChange={(e) => onPageLimitChange && onPageLimitChange(Number(e.target.value))}
            className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
          >
            {pageLimitOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        {/* Botones de navegación (Cumpliendo Regla de Botones) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange && onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 bg-black text-white hover:bg-black/90 disabled:opacity-40 disabled:hover:bg-black rounded-full dark:bg-white dark:text-black dark:hover:bg-white/90 dark:disabled:hover:bg-white transition-all"
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onPageChange && onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 bg-black text-white hover:bg-black/90 disabled:opacity-40 disabled:hover:bg-black rounded-full dark:bg-white dark:text-black dark:hover:bg-white/90 dark:disabled:hover:bg-white transition-all"
            title="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
