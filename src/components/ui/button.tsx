"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[var(--accent)] text-white shadow-lg shadow-teal-950/15 hover:bg-[var(--accent-strong)]",
  secondary:
    "bg-[var(--card-solid)] text-slate-900 ring-1 ring-slate-200 hover:bg-white",
  ghost: "bg-transparent text-slate-700 hover:bg-white/70",
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
        "tap-target inline-flex items-center justify-center rounded-[18px] px-4 py-3 text-sm font-black tracking-[-0.01em] transition disabled:cursor-not-allowed disabled:opacity-50",
        "active:translate-y-px active:scale-[0.985]",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
