import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  maxListHeight?: string;
  className?: string;
}

export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = '-- Select --',
  searchPlaceholder = 'Search...',
  disabled = false,
  required = false,
  maxListHeight = 'max-h-52',
  className = ''
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInvalid, setShowInvalid] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setSearchQuery('');
      searchInputRef.current?.focus();
    }
  }, [open]);

  // A real, invisible <input required> below participates in native browser form
  // validation (which a div/button-based control never would on its own). Once the
  // user picks a value, that failure is resolved — no need to wait for another submit.
  useEffect(() => {
    if (value) setShowInvalid(false);
  }, [value]);

  const selected = options.find((o) => o.value === value);
  const filteredOptions = searchQuery.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : options;

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredOptions.length > 0) {
      onChange(filteredOptions[0].value);
      setOpen(false);
    }
  };

  const toggleOpen = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleOpen();
          }
        }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-xl text-sm bg-slate-50 hover:bg-white transition-all focus:outline-none ${disabled ? 'opacity-65 cursor-not-allowed hover:bg-slate-50' : 'cursor-pointer'
          } ${open ? 'bg-white border-primary' : showInvalid ? 'border-rose-400' : 'border-slate-200'}`}
      >
        <span className={`truncate ${selected ? 'text-slate-900' : 'text-slate-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selected && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 text-slate-400 hover:text-rose-500 transition-colors rounded"
              aria-label="Clear selection"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Invisible proxy input: makes `required` participate in the surrounding <form>'s
          native validation (blocked submit + browser's own error bubble) since the
          visible control above is a div, not a real form element. */}
      <input
        type="text"
        required={required}
        value={value}
        onChange={() => {}}
        tabIndex={-1}
        aria-hidden="true"
        onInvalid={() => setShowInvalid(true)}
        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
      />

      {open && !disabled && (
        <div className="absolute z-20 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="relative border-b border-slate-100">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-3 py-2 text-sm focus:outline-none text-slate-900"
            />
          </div>
          <div className={`overflow-y-auto ${maxListHeight}`}>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400 italic">
                {options.length === 0 ? 'No options available' : 'No matches found'}
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${opt.value === value ? 'bg-primary text-white font-semibold' : 'text-slate-700 hover:bg-primary/10 hover:text-primary'
                    }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
