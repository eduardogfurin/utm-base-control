"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Check, ChevronDown, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  id: string;
  name: string;
  meta?: string; // small secondary label (e.g. category badge)
}

interface CreatableSelectProps {
  value: string; // id or ""
  onChange: (id: string, option: SelectOption) => void;
  options: SelectOption[];
  placeholder?: string;
  createLabel?: string; // prefix text for "create" row, e.g. "Criar veículo"
  onCreate?: (name: string) => Promise<SelectOption>; // returns the created option
  className?: string;
  disabled?: boolean;
}

export function CreatableSelect({
  value,
  onChange,
  options,
  placeholder = "Selecionar",
  createLabel = "Criar",
  onCreate,
  className,
  disabled,
}: CreatableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);

  const filtered = query.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
    : options;

  const showCreate =
    !!onCreate &&
    query.trim().length > 0 &&
    !options.some((o) => o.name.toLowerCase() === query.toLowerCase());

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  const handleSelect = useCallback(
    (opt: SelectOption) => {
      onChange(opt.id, opt);
      setOpen(false);
    },
    [onChange]
  );

  const handleCreate = useCallback(async () => {
    if (!onCreate || !query.trim()) return;
    setCreating(true);
    try {
      const created = await onCreate(query.trim());
      onChange(created.id, created);
      setOpen(false);
    } finally {
      setCreating(false);
    }
  }, [onCreate, query, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length === 1) {
        handleSelect(filtered[0]);
      } else if (showCreate) {
        handleCreate();
      }
    }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        disabled={disabled}
        render={<button type="button" />}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-card px-3 text-sm text-gray-900 outline-none transition-colors hover:border-gray-300 focus-visible:border-orange-400 disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "text-gray-300",
          className
        )}
      >
        <span className="flex-1 truncate text-left">
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-gray-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          side="bottom"
          sideOffset={4}
          align="start"
          className="isolate z-50"
        >
          <PopoverPrimitive.Popup
            className={cn(
              "w-(--anchor-width) min-w-[200px] origin-(--transform-origin) rounded-xl bg-card shadow-lg ring-1 ring-black/8 outline-none",
              "duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
              "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
              "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1"
            )}
          >
            {/* Search input */}
            <div className="border-b border-gray-100 px-3 py-2">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar..."
                className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
              />
            </div>

            {/* Options list */}
            <div className="max-h-52 overflow-y-auto py-1">
              {filtered.length === 0 && !showCreate && (
                <p className="px-3 py-2 text-xs text-gray-400">Nenhum resultado</p>
              )}

              {filtered.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 transition-colors",
                    opt.id === value && "text-orange-600 font-medium"
                  )}
                >
                  <span className="flex-1 truncate text-left">{opt.name}</span>
                  {opt.meta && (
                    <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                      {opt.meta}
                    </span>
                  )}
                  {opt.id === value && (
                    <Check size={13} className="shrink-0 text-orange-500" />
                  )}
                </button>
              ))}

              {/* Create new option */}
              {showCreate && (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 transition-colors border-t border-gray-100 mt-0.5"
                >
                  {creating ? (
                    <Loader2 size={13} className="animate-spin shrink-0" />
                  ) : (
                    <Plus size={13} className="shrink-0" />
                  )}
                  <span className="truncate">
                    {createLabel} &ldquo;{query.trim()}&rdquo;
                  </span>
                </button>
              )}
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
