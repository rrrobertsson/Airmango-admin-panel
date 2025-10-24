import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

// Enhanced Button Styles
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold border-none select-none",
    "rounded-xl text-sm transition-all duration-200 ease-in-out outline-none focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-60 shadow-md hover:shadow-lg [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 [&_svg]:shrink-0 relative overflow-hidden"
  ].join(' '),
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800",
        destructive: "bg-gradient-to-tr from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700",
        outline: "border-2 border-blue-500 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-600 shadow-sm",
        secondary: "bg-gradient-to-br from-sky-100 to-slate-200 text-blue-800 hover:from-blue-100 hover:to-blue-200",
        ghost: "bg-transparent text-blue-700 hover:bg-blue-50",
        link: "p-0 underline text-blue-600 hover:text-blue-800",
      },
      size: {
        default: "h-11 px-6 py-2.5 text-base",
        sm: "h-9 px-4 text-sm",
        lg: "h-13 px-8 text-lg",
        icon: "w-11 h-11 p-0 flex items-center justify-center rounded-full",
        'icon-sm': "w-9 h-9 p-0 flex items-center justify-center rounded-full",
        'icon-lg': "w-13 h-13 p-0 flex items-center justify-center rounded-full",
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

// Optional material-like ripple effect for click feedback
function Ripple({ color }: { color?: string }) {
  const [rippleArray, setRippleArray] = React.useState<JSX.Element[]>([]);
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (rippleArray.length > 0) {
      timer = setTimeout(() => setRippleArray([]), 350);
    }
    return () => clearTimeout(timer!);
  }, [rippleArray]);
  const addRipple = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const button = event.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
    circle.classList.add("ripple");
    button.appendChild(circle);
    setTimeout(() => {
      circle.remove();
    }, 350);
  };
  return null;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  children,
  loading = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean,
    loading?: boolean,
  }) {
  const Comp = asChild ? Slot : 'button'
  // Add simple ripple click effect support (optional, pure CSS if needed)
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className, "button-enhanced")}
      disabled={props.disabled || loading}
      onClick={e => {
        if (props.onClick) props.onClick(e)
        // Optionally, simple CSS-driven ripple could be triggered here as well (styles below)
        const btn = e.currentTarget
        if (!btn.classList.contains('no-ripple')) {
          const circle = document.createElement('span')
          circle.className = 'ripple'
          const rect = btn.getBoundingClientRect()
          const size = Math.max(rect.width, rect.height)
          circle.style.width = circle.style.height = size + 'px'
          circle.style.left = e.clientX - rect.left - size / 2 + 'px'
          circle.style.top = e.clientY - rect.top - size / 2 + 'px'
          btn.appendChild(circle)
          setTimeout(() => { circle.remove() }, 400)
        }
      }}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="loader w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span className={loading ? 'opacity-70' : ''}>{children}</span>
        </span>
      ) : (
        children
      )}
    </Comp>
  )
}

// Button-enhanced styles
// NOTE: To be appended in this file for single-source control, but in a real app should go into global/app CSS!
if (typeof window !== "undefined") {
  const styleId = "button-enhanced-extra-style-v1"
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.innerHTML = `
      .button-enhanced { position: relative; overflow: hidden; }
      .button-enhanced .ripple {
        position: absolute;
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.4s linear;
        background: rgba(255,255,255,0.45);
        z-index: 1;
        pointer-events: none;
      }
      @keyframes ripple {
        to {
          transform: scale(2);
          opacity: 0;
        }
      }
      .button-enhanced .loader {
        border-top-color: transparent;
      }
    `
    document.head.appendChild(style)
  }
}

export { Button, buttonVariants }
