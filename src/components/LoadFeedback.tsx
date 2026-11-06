import type { LoadState } from '../utils/loadResource';

interface Props {
  items: { label: string; state: LoadState }[];
  isLoading?: boolean;
  onRetry: () => void;
}

export function LoadFeedback({ items, onRetry }: Props) {
  const problems = items.filter(item => ['error', 'cached', 'stale'].includes(item.state));
  if (problems.length === 0) return null;
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-slate-800 shrink-0">
      {problems.map(item => (
        <p key={item.label} className="mb-1">
          {item.state === 'error'
            ? `Não foi possível carregar ${item.label}.`
            : `${item.label}: mostrando dados ${item.state === 'cached' ? 'salvos anteriormente neste aparelho' : 'da última consulta'}. Não foi possível atualizar.`}
        </p>
      ))}
      <button type="button" onClick={onRetry} className="mt-2 min-h-11 rounded-lg bg-white px-3 font-semibold border border-amber-300">Tentar novamente</button>
    </div>
  );
}
