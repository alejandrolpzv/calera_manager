"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-teal-700 text-white shadow-lg shadow-teal-900/15 hover:bg-teal-800",
  secondary:
    "bg-white/80 text-slate-800 ring-1 ring-slate-200 hover:bg-white",
  ghost: "bg-transparent text-slate-700 hover:bg-white/60",
  danger: "bg-red-700 text-white hover:bg-red-800",
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        "active:translate-y-px active:scale-[0.99]",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
