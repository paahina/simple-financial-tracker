import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { inputClass } from './Field';

const Select = ({ value, onChange, options, placeholder = 'Select', disabled = false, className = '' }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        type="button"
        className={`${inputClass} flex items-center justify-between gap-2 text-left disabled:opacity-60`}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selected ? '' : 'text-neutral-500'}>{selected?.label || placeholder}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-neutral-200 bg-neutral-0 py-1 shadow-sm" role="listbox">
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 ${option.value === value ? 'bg-neutral-50 font-medium' : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Select;
