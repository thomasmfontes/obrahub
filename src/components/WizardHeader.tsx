import { ArrowLeft, CloudCheck, CloudUpload, AlertCircle } from 'lucide-react';
import { triggerHaptic } from '../utils/formatters';
import type { SaveStatus } from '../utils/saveQueue';

interface WizardHeaderProps {
  currentStep: 1 | 2 | 3;
  onBack: () => void;
  onSaveAndExit?: () => void;
  isSaving?: boolean;
  saveStatus?: SaveStatus;
  onRetrySave?: () => void;
  loadError?: boolean;
}

export function WizardHeader({ currentStep, onBack, onSaveAndExit, isSaving = false, saveStatus = 'idle', onRetrySave, loadError = false }: WizardHeaderProps) {
  const labels = ['Dados Básicos da Viagem', 'Atividades & Evidências', 'Resumo Financeiro'];
  const message = saveStatus === 'error'
    ? 'Não foi possível salvar. Suas alterações continuam nesta tela.'
    : saveStatus === 'saving' ? 'Salvando…'
    : saveStatus === 'pending' ? 'Alterações pendentes de salvamento'
    : saveStatus === 'saved' ? 'Alterações salvas no servidor'
    : 'Nenhuma alteração pendente';
  const Icon = saveStatus === 'error' ? AlertCircle : saveStatus === 'saving' || saveStatus === 'pending' ? CloudUpload : CloudCheck;
  return (
    <div className="sticky top-0 bg-[#F8FAFC]/95 backdrop-blur-xl z-30 px-4 pt-4 pb-2.5 border-b border-slate-200/60 shadow-xs shrink-0">
      <div className="flex items-center gap-3 mb-2.5">
        <button type="button" onClick={() => { triggerHaptic('light'); onBack(); }} disabled={isSaving} aria-label="Voltar" className="w-10 h-10 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-slate-700 shadow-2xs hover:bg-slate-50 transition active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1 px-1">
          <span className="text-[11px] font-semibold text-slate-400 block tracking-tight">Passo {currentStep} de 3</span>
          <h2 className="text-sm font-bold text-slate-900 truncate leading-snug">{labels[currentStep - 1]}</h2>
        </div>
        {onSaveAndExit && (
          <button 
            type="button" 
            onClick={() => {
              triggerHaptic('light');
              onSaveAndExit();
            }} 
            disabled={isSaving} 
            className="h-9 px-3.5 shrink-0 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 transition active:scale-95 shadow-2xs disabled:opacity-50 flex items-center justify-center whitespace-nowrap cursor-pointer"
          >
            Salvar e sair
          </button>
        )}
      </div>
      <div role="status" aria-live="polite" aria-atomic="true" className={`mb-3 rounded-xl p-2.5 text-xs ${saveStatus === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-700'}`}>
        <p className="flex items-start gap-2"><Icon aria-hidden="true" className={`w-4 h-4 shrink-0 ${saveStatus === 'saving' ? 'animate-pulse' : ''}`} /><span>{message}</span></p>
        {saveStatus === 'error' && <button type="button" onClick={onRetrySave} disabled={isSaving} className="mt-2 min-h-11 px-3 rounded-lg border border-rose-200 bg-white font-semibold disabled:opacity-50">Tentar novamente</button>}
      </div>
      {loadError && <p role="alert" className="text-xs text-rose-800 mb-3">Não foi possível carregar o diário. O conteúdo atual foi mantido. Tente abrir o dia novamente.</p>}
      <div className="grid grid-cols-3 gap-1.5" aria-label={`Etapa ${currentStep} de 3`}>
        {[1, 2, 3].map(step => <div key={step} className={`h-1 rounded-full ${step <= currentStep ? 'bg-[#0B1B2B]' : 'bg-slate-200'}`} />)}
      </div>
    </div>
  );
}
