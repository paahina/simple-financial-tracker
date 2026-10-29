import { ChevronDown } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { inputClass } from './Field';

const LIST_MAX = 240;
const GAP = 4;
const VIEWPORT_MARGIN = 8;
const SCROLLBAR_GUTTER = 16;

const measureWidestLabel = (labels) => {
  if (!labels.length || typeof document === 'undefined') return 0;
  const probe = document.createElement('span');
  probe.className = 'pointer-events-none fixed whitespace-nowrap px-3 text-sm';
  probe.style.left = '-9999px';
  probe.style.top = '0';
  document.body.appendChild(probe);
  let max = 0;
  labels.forEach((label) => {
    probe.textContent = label;
    max = Math.max(max, probe.offsetWidth);
  });
  document.body.removeChild(probe);
  return max + SCROLLBAR_GUTTER;
};

const Select = ({ value, onChange, options, placeholder = 'Select', disabled = false, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const selected = options.find((option) => option.value === value);
  const optionLabels = options.map((option) => option.label);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom - GAP;
      const spaceAbove = rect.top - GAP;
      const openUp = spaceBelow < LIST_MAX && spaceAbove > spaceBelow;
      const maxRight = window.innerWidth - VIEWPORT_MARGIN;
      const maxMenuWidth = maxRight - VIEWPORT_MARGIN;
      const contentWidth = measureWidestLabel(optionLabels);
      const desiredWidth = Math.max(rect.width, contentWidth);
      let width = Math.min(desiredWidth, maxMenuWidth);
      let left = rect.left;
      if (left + width > maxRight) {
        left = maxRight - width;
      }
      if (left < VIEWPORT_MARGIN) {
        left = VIEWPORT_MARGIN;
        width = Math.min(width, maxRight - VIEWPORT_MARGIN);
      }
      setBox({
        left,
        width,
        wrapLabels: width < desiredWidth,
        maxHeight: Math.max(0, Math.min(LIST_MAX, openUp ? spaceAbove : spaceBelow)),
        openUp,
        top: rect.bottom + GAP,
        bottom: window.innerHeight - rect.top + GAP,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, optionLabels.join('\0')]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
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
    <div className={`min-w-0 ${className}`.trim()} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`${inputClass} flex w-full min-w-0 items-center justify-between gap-2 text-left disabled:opacity-60`}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
      >
        <span className={`min-w-0 truncate ${selected ? '' : 'text-neutral-500'}`}>{selected?.label || placeholder}</span>
        <ChevronDown size={16} className="shrink-0" aria-hidden="true" />
      </button>
      {open && box && createPortal(
        <ul
          ref={listRef}
          className="fixed z-[60] box-border overflow-y-auto rounded-md border border-neutral-200 bg-neutral-0 py-1 shadow-sm"
          style={{
            left: box.left,
            width: box.width,
            maxHeight: box.maxHeight,
            top: box.openUp ? undefined : box.top,
            bottom: box.openUp ? box.bottom : undefined,
          }}
          role="listbox"
        >
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
                  box.wrapLabels ? 'whitespace-normal break-words' : 'whitespace-nowrap'
                } ${option.value === value ? 'bg-neutral-50 font-medium' : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </div>
  );
};

export default Select;
