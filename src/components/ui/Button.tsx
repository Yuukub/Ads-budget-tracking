import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
        primary: "bg-gradient-primary text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
        destructive: "bg-destructive text-white shadow-md hover:shadow-lg hover:brightness-95 hover:scale-[1.02] active:scale-[0.98]",
        danger: "bg-destructive text-white shadow-md hover:shadow-lg hover:brightness-95 hover:scale-[1.02] active:scale-[0.98]",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary/10 text-secondary-foreground border border-secondary/20 hover:bg-secondary/20 hover:border-secondary/30 hover:scale-[1.02] active:scale-[0.98]",
        ghost: "text-gray-700 hover:bg-gray-100/80 hover:text-gray-900",
        link: "text-primary underline-offset-4 hover:underline",
        // Soft variants - มีพื้นหลังสีอ่อน ตัวอักษรสีเข้ม
        "soft-primary": "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-700",
        "soft-success": "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 hover:text-emerald-700",
        "soft-warning": "bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 hover:text-amber-700",
        "soft-danger": "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300 hover:text-red-700",
        "soft-purple": "bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 hover:border-purple-300 hover:text-purple-700",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        sm: "h-9 px-4 py-2 text-sm",
        md: "h-10 px-5 py-2.5",
        lg: "h-12 px-6 py-3 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
