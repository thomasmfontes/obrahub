import React from 'react';

/**
 * Skeleton Loader executivo para a aba Visão Geral (Dashboard)
 * Mantém a estrutura visual 100% idêntica aos cards reais, eliminando
 * telas em branco ou avisos rústicos durante o carregamento / F5.
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="desktop-page desktop-dashboard flex-1 px-4 pt-5 safe-pb-dock space-y-3.5 overflow-y-auto overscroll-y-contain animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between pt-1">
        <div className="h-7 w-32 bg-slate-200 rounded-lg" />
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200/80" />
          <div className="w-9 h-9 rounded-full bg-slate-200" />
        </div>
      </div>

      {/* Resumo Consolidado 3 Colunas Skeleton */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="grid grid-cols-3 divide-x divide-slate-100 text-center">
          <div className="px-1 flex flex-col items-center space-y-1.5">
            <div className="h-5 w-8 bg-slate-200 rounded" />
            <div className="h-3 w-12 bg-slate-100 rounded" />
          </div>
          <div className="px-1 flex flex-col items-center space-y-1.5">
            <div className="h-5 w-8 bg-slate-200 rounded" />
            <div className="h-3 w-14 bg-slate-100 rounded" />
          </div>
          <div className="px-1 flex flex-col items-center space-y-1.5">
            <div className="h-5 w-16 bg-slate-200 rounded" />
            <div className="h-3 w-12 bg-slate-100 rounded" />
          </div>
        </div>
      </div>

      {/* Card Atendimento Ativo Skeleton */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <div className="h-3 w-28 bg-slate-200 rounded" />
          <div className="h-4 w-16 bg-slate-100 rounded-full" />
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.03)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 bg-slate-100 rounded-lg" />
            <div className="h-4 w-12 bg-slate-100 rounded" />
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-36 bg-slate-200 rounded" />
              <div className="h-3 w-24 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="h-11 w-full bg-slate-100 rounded-xl" />
        </div>
      </div>

      {/* Card Estatísticas / Indicadores Skeleton */}
      <div className="space-y-2 pt-1">
        <div className="h-3 w-36 bg-slate-200 rounded px-0.5" />
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100" />
            <div className="h-5 w-14 bg-slate-200 rounded" />
            <div className="h-3 w-20 bg-slate-100 rounded" />
          </div>
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100" />
            <div className="h-5 w-14 bg-slate-200 rounded" />
            <div className="h-3 w-20 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};
