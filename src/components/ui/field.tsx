import type React from "react";

import { cn } from "@/lib/utils";

type FieldProps = React.InputHTMLAttributes<HTMLInputElement>;
type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-600",
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: FieldProps) {
  return (
    <input
      className={cn(
        "tap-target w-full rounded-[18px] border border-slate-200 bg-white/90 px-4 py-3 text-base font-semibold text-slate-950 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100 sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "tap-target w-full rounded-[18px] border border-slate-200 bg-white/90 px-4 py-3 text-base font-semibold text-slate-950 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100 sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextAreaProps) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-[18px] border border-slate-200 bg-white/90 px-4 py-3 text-base font-semibold text-slate-950 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100 sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}
