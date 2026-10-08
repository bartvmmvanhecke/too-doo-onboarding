"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast: "!font-sans !text-[15px] !font-bold !text-ink !border-line-soft !rounded-xl",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
