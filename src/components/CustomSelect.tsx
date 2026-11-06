import React, { useState, useRef, useEffect, useMemo, useId } from 'react';
import { ChevronDown, Check, Search, X, Plus } from 'lucide-react';
import { triggerHaptic } from '../utils/formatters';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

interface CustomSelectProps {
  id?: string;
  labelledBy?: string;
  describedBy?: string;
  invalid?: boolean;
  value: string;
  onChange: (value: string) => void;
  options?: (string | SelectOption)[];
  filterFn?: (query: string) => (string | SelectOption)[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  searchable?: boolean;
  allowCreate?: boolean;
  clearable?: boolean;
  searchPlaceholder?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  id, labelledBy, describedBy, invalid,
  value,
  onChange,
  options = [],
  filterFn,
  placeholder = 'Selecione uma opção',
  className = '',
  disabled = false,
  searchable = true,
  allowCreate = true,
  clearable = true,
  searchPlaceholder = 'Buscar...'
}) => {
  const uid = useId();
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normaliza as opções para o formato SelectOption
  const normalizedOptions: SelectOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  const selectedOption = normalizedOptions.find((opt) => opt.value === value) || (value ? { value, label: value } : null);

  // Filtra as opções conforme o termo de busca (ou via filterFn dinâmico)
  const filteredOptions = useMemo(() => {
    if (filterFn) {
      const customResults = filterFn(searchTerm);
      return customResults.map((opt) => typeof opt === 'string' ? { value: opt, label: opt } : opt);
    }
    if (!searchTerm.trim()) return normalizedOptions;
    const term = searchTerm.toLowerCase();
    return normalizedOptions.filter((opt) => 
      opt.label.toLowerCase().includes(term) ||
      (opt.description && opt.description.toLowerCase().includes(term)) ||
      opt.value.toLowerCase().includes(term)
    );
  }, [normalizedOptions, searchTerm, filterFn]);

  // Verifica se há correspondência exata
  const hasExactMatch = normalizedOptions.some(
    (opt) => opt.label.toLowerCase() === searchTerm.trim().toLowerCase()
  );

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    let focusTimer: ReturnType<typeof setTimeout> | undefined;
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus no campo de busca ao abrir (estilo Select2)
      if (searchable) {
        focusTimer = setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [isOpen, searchable]);

  const choices = [...(allowCreate && searchTerm.trim() && !hasExactMatch ? [{value: searchTerm.trim(), label: searchTerm.trim()}] : []), ...filteredOptions];
  const keyboard = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) { e.preventDefault(); e.stopPropagation(); setIsOpen(false); setSearchTerm(''); triggerRef.current?.focus(); }
    else if (e.key === 'Tab') { setIsOpen(false); setSearchTerm(''); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) { setActive(0); setIsOpen(true); }
      else setActive(i => Math.max(0, Math.min(choices.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))));
    } else if (e.key === 'Enter' && isOpen) { e.preventDefault(); if (choices[active]) handleSelect(choices[active].value); }
  };
  useEffect(() => { if (isOpen) document.getElementById(`${uid}-${active}`)?.scrollIntoView({block: 'nearest'}); }, [active, isOpen, uid]);

  const handleToggle = () => {
    if (disabled) return;
    triggerHaptic('light');
    setIsOpen(!isOpen); setActive(0);
    if (!isOpen) {
      setSearchTerm('');
    }
  };

  const handleSelect = (val: string) => {
    triggerHaptic('medium');
    onChange(val); triggerRef.current?.focus();
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    onChange('');
    setSearchTerm('');
  };

  return (
    <div onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsOpen(false); }} ref={containerRef} className={`relative select-none ${className}`}>
      {/* Botão Gatilho (Trigger Select2) */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        ref={triggerRef}
        onKeyDown={keyboard}
        aria-controls={isOpen ? `${uid}-list` : undefined}
        aria-activedescendant={isOpen && !searchable && choices[active] ? `${uid}-${active}` : undefined}
        id={id}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        aria-label={!labelledBy ? placeholder : undefined}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full h-12 bg-white rounded-xl border px-3.5 flex items-center justify-between text-sm font-semibold text-slate-800 transition shadow-2xs outline-none active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen 
            ? 'border-slate-900 ring-2 ring-slate-900/10' 
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className={`flex items-center space-x-2.5 truncate min-w-0 ${clearable && value ? 'pr-14' : 'pr-2'}`}>
          {selectedOption?.icon && (
            <span className="shrink-0 text-slate-500">{selectedOption.icon}</span>
          )}
          <span className={`truncate text-xs sm:text-sm font-semibold ${selectedOption ? 'text-slate-900' : 'text-slate-400 font-normal'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <ChevronDown 
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-slate-900' : ''
            }`} 
          />
        </div>
      </button>

          {clearable && value && !disabled && (
            <button type="button" aria-label="Limpar seleção"
              onClick={handleClear}
              title="Limpar seleção"
              className="absolute right-8 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          )}
      {/* Menu Suspenso de Opções com Busca (Select2 Popover) */}
      {isOpen && (
        <div 
          onKeyDown={keyboard}
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Caixa de Busca Select2 */}
          {searchable && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/70">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  role="combobox"
                  aria-label={searchPlaceholder} aria-labelledby={labelledBy}
                  aria-controls={`${uid}-list`}
                  aria-expanded="true"
                  aria-autocomplete="list"
                  aria-activedescendant={choices[active] ? `${uid}-${active}` : undefined}
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setActive(0); }}
                  placeholder={searchPlaceholder}
                  className="w-full h-9 pl-9 pr-7 bg-white rounded-lg border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition shadow-2xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    aria-label="Limpar busca" onClick={() => { setSearchTerm(''); setActive(0); }}
                    className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Lista de Opções */}
          <div role="listbox" id={`${uid}-list`} aria-label={placeholder} className="max-h-56 overflow-y-auto no-scrollbar py-1">
            {/* Opção de Criar / Usar valor digitado (Select2 Tagging) */}
            {allowCreate && searchTerm.trim() && !hasExactMatch && (
              <div
                onMouseDown={e => e.preventDefault()} id={`${uid}-0`} aria-selected={false}
                role="option"
                onClick={() => handleSelect(searchTerm.trim())}
                className={`px-3.5 py-2.5 flex items-center space-x-2 text-xs sm:text-sm cursor-pointer ${active === 0 ? "bg-sky-100" : "bg-sky-50/60"} text-sky-900 hover:bg-sky-100/70 font-semibold border-b border-sky-100/60 transition`}
              >
                <Plus className="w-4 h-4 text-sky-700 shrink-0" />
                <span className="truncate">
                  Usar <span className="font-bold text-sky-950">"{searchTerm.trim()}"</span>
                </span>
              </div>
            )}

            {filteredOptions.length === 0 && (!allowCreate || !searchTerm.trim()) ? (
              <div className="px-4 py-4 text-center text-xs text-slate-400">
                Nenhum resultado encontrado
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    id={`${uid}-${idx + (choices.length - filteredOptions.length)}`}
                    onMouseDown={e => e.preventDefault()}
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={`px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm cursor-pointer transition active:bg-slate-100 ${
                      idx + (choices.length - filteredOptions.length) === active
                        ? 'bg-slate-50 text-slate-900 font-bold' 
                        : 'text-slate-700 hover:bg-slate-50/80 font-medium'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate pr-2">
                      {opt.icon && (
                        <span className="shrink-0">{opt.icon}</span>
                      )}
                      <div className="truncate">
                        <span className="block truncate">{opt.label}</span>
                        {opt.description && (
                          <span className="block text-[11px] font-normal text-slate-400 truncate">
                            {opt.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-[#0B1B2B] stroke-[2.5] shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
