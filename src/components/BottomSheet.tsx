import React, { useEffect, useState, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { triggerHaptic } from '../utils/formatters';

const modalStack: HTMLElement[] = [];
let originalOverflow = '';
interface BottomSheetProps {
  wide?: boolean;
  dismissDisabled?: boolean;
  isOpen: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  wide = false,
  dismissDisabled = false,
  isOpen,
  onClose,
  title,
  subtitle,
  headerRight,
  footer,
  children,
  contentClassName = 'px-6 py-2 overflow-y-auto flex-1 space-y-4'
}) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<() => void>(() => {});
  const [rendered, setRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reage apenas a mudanças reais no prop isOpen externo
  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setRendered(true);
      setIsClosing(false);
      triggerHaptic('light');

    } else if (rendered && !isClosing) {
      // Se isOpen virou false externamente (ex: submit do form fechando o modal)
      setIsClosing(true);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = setTimeout(() => {
        setRendered(false);
        setIsClosing(false);

      }, 250);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (dismissDisabled) return;
    if (isClosing) return;
    triggerHaptic('light');
    setIsClosing(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setRendered(false);
      setIsClosing(false);

      onClose();
    }, 250);
  };

  useEffect(() => {
    return () => {

      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  closeRef.current = handleClose;
  useEffect(() => {
    if (!rendered || !panelRef.current) return;
    const panel = panelRef.current;
    const previous = document.activeElement as HTMLElement | null;
    if (!modalStack.length) originalOverflow = document.body.style.overflow;
    modalStack.push(panel);
    document.body.style.overflow = 'hidden';
    const top = () => modalStack[modalStack.length - 1] === panel;
    const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>('button, input, textarea, select, a[href], [tabindex]')).filter(el => !el.matches(':disabled') && el.tabIndex >= 0 && el.getClientRects().length > 0 && !el.closest('[inert]'));
    panel.focus();
    const key = (e: KeyboardEvent) => {
      if (!top() || e.defaultPrevented) return;
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); }
      if (e.key === 'Tab') {
        const elements = focusables();
        const index = elements.indexOf(document.activeElement as HTMLElement);
        if (!elements.length) { e.preventDefault(); panel.focus(); }
        else if (e.shiftKey && index <= 0) { e.preventDefault(); elements[elements.length - 1].focus(); }
        else if (!e.shiftKey && (index < 0 || index === elements.length - 1)) { e.preventDefault(); elements[0].focus(); }
      }
    };
    const focus = (e: FocusEvent) => { 
      if (top() && !panel.contains(e.target as Node) && !(e.target as HTMLElement)?.closest?.('[data-lightbox]')) {
        panel.focus(); 
      }
    };
    document.addEventListener('keydown', key);
    document.addEventListener('focusin', focus);
    return () => {
      document.removeEventListener('keydown', key); document.removeEventListener('focusin', focus);
      const wasTop = top(); modalStack.splice(modalStack.indexOf(panel), 1);
      if (!modalStack.length) document.body.style.overflow = originalOverflow;
      if (wasTop) {
        const parent = modalStack[modalStack.length - 1];
        if (previous?.isConnected && !previous.closest('[inert]') && (!parent || parent.contains(previous))) previous.focus();
        else if (parent) parent.focus();
      }
    };
  }, [rendered]);

  if (!rendered) return null;

  return createPortal(
    <div className="sheet-portal-wrapper fixed inset-0 z-50 flex items-end justify-center pointer-events-auto print:hidden">
      {/* Backdrop com animação fluida de saída/entrada */}
      <div 
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-sm ${
          isClosing ? 'sheet-backdrop-exit' : 'sheet-backdrop-enter'
        }`}
        onClick={handleClose}
      />

      {/* Surface do Modal com slide up e slide down nativos via CSS Keyframes */}
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        className={`sheet-surface ${wide ? 'sheet-wide' : ''} relative z-10 w-full max-w-md bg-white rounded-t-[28px] shadow-2xl max-h-[92vh] flex flex-col overflow-hidden ${footer ? '' : 'pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))]'} ${
          isClosing ? 'sheet-panel-exit' : 'sheet-panel-enter'
        }`}
      >
        {/* Puxador de Arrasto (Drag Handle) */}
        <div className="pt-3 pb-1 cursor-grab flex justify-center shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-slate-300" />
        </div>

        {/* Header Padronizado */}
        <div className={`px-6 pt-1.5 pb-2.5 flex ${subtitle ? 'items-start' : 'items-center'} justify-between shrink-0`}>
          <div id={titleId} className="pr-3 min-w-0 flex-1">
            {typeof title === 'string' ? (
              <h3 className="text-lg font-bold text-[#0B1B2B] tracking-tight leading-snug">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              typeof subtitle === 'string' ? (
                <p className="text-sm text-slate-500 font-normal mt-0.5 leading-normal">
                  {subtitle}
                </p>
              ) : (
                subtitle
              )
            )}
          </div>

          <div className={`flex items-center space-x-2 shrink-0 ${subtitle ? 'mt-0.5' : ''}`}>
            {headerRight}
            <button 
              type="button"
              onClick={handleClose}
              aria-label="Fechar" disabled={dismissDisabled}
              className="w-9 h-9 rounded-full bg-[#F1F5F9] hover:bg-slate-200 text-slate-600 flex items-center justify-center transition active:scale-95 shrink-0"
            >
              <X className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className={contentClassName}>
          {children}
        </div>

        {/* Rodapé Opcional */}
        {footer && (
          <div className="shrink-0 border-t border-slate-100/90 bg-white px-5 pt-2.5 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
