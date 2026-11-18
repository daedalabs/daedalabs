'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface CategoryOption {
  id: string;
  label: string;
}

interface CategoryMenuProps {
  categories: CategoryOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function CategoryMenu({
  categories,
  value,
  onChange,
  className = '',
}: CategoryMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const selectedIndex = Math.max(
    0,
    categories.findIndex((category) => category.id === value)
  );
  const selectedLabel = categories[selectedIndex]?.label || 'All';

  const openMenu = () => {
    setActiveIndex(selectedIndex);
    setOpen(true);
  };

  const closeMenu = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    const onScroll = () => setOpen(false);

    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onScroll);
    };
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const choose = (categoryId: string) => {
    onChange(categoryId);
    closeMenu();
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) closeMenu();
      else openMenu();
    } else if (event.key === 'Escape') {
      closeMenu();
    }
  };

  const handleOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % categories.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + categories.length) % categories.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(categories.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(categories[activeIndex].id);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      closeMenu();
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Filter by category, currently ${selectedLabel}`}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-line bg-surface/60 px-2.5 text-[12px] font-medium text-ink-muted transition-colors duration-200 hover:border-line-strong hover:bg-surface hover:text-ink"
      >
        <span className="truncate max-w-[110px] sm:max-w-[130px]">{selectedLabel}</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 text-ink-dim transition-transform duration-200 shrink-0 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Filter by category"
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[12rem] origin-top-right animate-[menu-in_120ms_ease-out] rounded-lg border border-line bg-elevated p-1 shadow-xl shadow-black/25"
        >
          {categories.map((cat, index) => {
            const isSelected = cat.id === value;
            const isActive = index === activeIndex;

            return (
              <button
                key={cat.id}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                tabIndex={-1}
                onClick={() => choose(cat.id)}
                onMouseEnter={() => setActiveIndex(index)}
                onKeyDown={handleOptionKeyDown}
                className={`flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-[12px] transition-colors ${
                  isActive ? 'bg-surface text-ink' : 'text-ink-muted hover:text-ink'
                } ${isSelected ? 'font-medium text-ink' : ''}`}
              >
                <span>{cat.label}</span>
                {isSelected && (
                  <Check
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-accent shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
