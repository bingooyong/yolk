import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-transform transition-opacity disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg",
        secondary: "bg-surface-2 text-fg border border-border",
        ghost: "bg-transparent text-fg-muted",
      },
      size: {
        default: "h-11 min-h-11 px-5 text-sm rounded-xl",
        lg: "h-12 min-h-12 px-6 text-base rounded-2xl",
        icon: "size-12 min-h-12 rounded-full p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: Props) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
