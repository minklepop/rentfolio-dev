"use client";

import { btnDanger } from "./ui";

/** Submit button for delete forms that asks for confirmation first. */
export default function DeleteButton({
  label = "Delete",
  confirmText = "Are you sure? This cannot be undone.",
  className,
}: {
  label?: string;
  confirmText?: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className ?? btnDanger}
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
