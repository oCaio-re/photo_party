"use client";

import React, { useEffect, useEffectEvent, useRef } from "react";

// Open dialogs, innermost last: only the top one reacts to Escape and Tab
const openDialogs: symbol[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  /** Called for Escape and backdrop taps; the owner decides whether closing is allowed. */
  onRequestClose: () => void;
  /** id of the element that names the dialog (usually its heading). */
  labelledBy?: string;
  /** Accessible name when there is no visible heading. */
  label?: string;
  /** "sheet" slides up from the bottom on phones (thumb reach) and centers on larger screens. */
  variant?: "center" | "sheet";
  /** Classes for the panel itself. */
  className?: string;
  /** Classes for the backdrop (e.g. a darker scrim for media). */
  backdropClassName?: string;
  children: React.ReactNode;
}

/**
 * Modal dialog primitive: dialog semantics, Escape, focus trap, focus restore and
 * background scroll lock. Render it conditionally; mounting opens it.
 */
export function Dialog({
  onRequestClose,
  labelledBy,
  label,
  variant = "center",
  className = "",
  backdropClassName = "bg-black/60 backdrop-blur-xs",
  children,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const requestClose = useEffectEvent(() => onRequestClose());

  useEffect(() => {
    const id = Symbol("dialog");
    openDialogs.push(id);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== id) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        requestClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      openDialogs.splice(openDialogs.indexOf(id), 1);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  const isSheet = variant === "sheet";

  return (
    <div
      className={`fixed inset-0 z-50 flex animate-fade-in ${
        isSheet ? "items-end sm:items-center sm:p-6" : "items-center p-4"
      } justify-center ${backdropClassName}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onRequestClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        tabIndex={-1}
        className={`focus:outline-none ${isSheet ? "w-full rounded-t-3xl sm:rounded-3xl" : ""} ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
