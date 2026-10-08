import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "min-h-12 w-full min-w-0 rounded-[10px] border border-line bg-white px-3.5 py-3 text-base text-ink outline-none transition-[border-color,box-shadow]",
        "focus-visible:border-brand focus-visible:shadow-[0_0_0_1px_var(--brand)] focus-visible:outline-none",
        "aria-invalid:border-danger aria-invalid:shadow-[0_0_0_1px_var(--danger)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
