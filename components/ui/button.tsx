import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-bold no-underline transition-colors disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-brand text-white hover:bg-brand-hover hover:text-white",
        dark: "bg-ink text-white hover:bg-[#0b1426] hover:text-white",
        outline: "border border-line bg-white text-ink hover:bg-app hover:text-ink",
        inverse: "bg-white text-ink hover:bg-brand-soft hover:text-ink",
        ghost: "bg-transparent text-ink-2 hover:bg-app hover:text-ink",
        link: "bg-transparent px-1.5 text-brand underline-offset-4 hover:text-brand-hover hover:underline",
      },
      size: {
        default: "min-h-12 rounded-xl px-6 text-base",
        lg: "min-h-[50px] rounded-xl px-6 text-base",
        md: "min-h-[46px] rounded-[10px] px-5 text-[15px]",
        sm: "min-h-11 rounded-[10px] px-4 text-sm",
        icon: "size-11 rounded-[10px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
      type={asChild ? undefined : (props.type ?? "button")}
    />
  );
}

export { Button, buttonVariants };
