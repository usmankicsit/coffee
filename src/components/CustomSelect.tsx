'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type SelectOption = {
  value: string;
  label: string;
};

type MenuPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
};

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled = false,
  className = '',
  id,
  name,
  required = false,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  'aria-label'?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(260, openUp ? spaceAbove : spaceBelow));
    setPos({
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 160),
      maxHeight,
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onReposition = () => updatePosition();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open]);

  const menu =
    open && mounted && pos
      ? createPortal(
          <ul
            className={`custom-select-menu portal${pos.openUp ? ' open-up' : ''}`}
            role="listbox"
            id={listId}
            ref={menuRef}
            style={{
              position: 'fixed',
              top: pos.openUp ? undefined : pos.top,
              bottom: pos.openUp ? window.innerHeight - pos.top : undefined,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              zIndex: 2000,
            }}
          >
            {options.map((option) => (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={`custom-select-option${option.value === value ? ' selected' : ''}`}
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
        )
      : null;

  return (
    <div
      className={`custom-select${open ? ' open' : ''}${disabled ? ' disabled' : ''} ${className}`.trim()}
      ref={rootRef}
    >
      {name && (
        <input type="hidden" name={name} value={value} required={required} />
      )}
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className="custom-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        <span className={selected ? '' : 'custom-select-placeholder'}>
          {selected?.label || placeholder}
        </span>
        <svg
          className="custom-select-caret"
          viewBox="0 0 20 20"
          width="16"
          height="16"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z"
          />
        </svg>
      </button>
      {menu}
    </div>
  );
}
