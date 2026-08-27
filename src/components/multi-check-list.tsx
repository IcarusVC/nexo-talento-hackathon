"use client";

import { cn } from "@/lib/utils";

interface MultiCheckListProps {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

export function MultiCheckList({ options, selected, onChange }: MultiCheckListProps) {
  function toggle(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((value) => value !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isSelected}
            onClick={() => toggle(option)}
            className={cn(
              "rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition-colors",
              isSelected
                ? "border-brand-coral bg-brand-coral text-white"
                : "border-border bg-white text-brand-navy/80 hover:border-brand-navy/40"
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
