import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

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
  maxListHeight = 'max-h-52',
  className = ''
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border border-slate-200 rounded-xl focus:outline-none text-sm bg-slate-50 hover:bg-white transition-all text-left disabled:opacity-65 disabled:cursor-not-allowed disabled:hover:bg-slate-50 ${open ? 'bg-white border-primary' : ''}`}
      >
        <span className={`truncate ${selected ? 'text-slate-900' : 'text-slate-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

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
