import React from 'react';
import Link from 'next/link';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'outline' | 'outlineLight' | 'ghost';

// We extend standard HTML attributes for both regular buttons AND links
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  href?: string;
  target?: string;
  rel?: string;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  href,
  target,
  rel,
  children,
  className = '',
  ...props
}: ButtonProps) {
  
  const baseClasses = "font-primary text-sm rounded-lg transition-all inline-flex items-center justify-center gap-2 cursor-pointer select-none active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2";

  const variantClasses: Record<ButtonVariant, string> = {
    primary: "bg-blue-600 hover:bg-blue-900 text-white py-3 px-5 font-bold focus-visible:outline-blue-600 ",
    secondary: "bg-red-600 hover:bg-red-800 text-white shadow-md py-3 px-5 font-bold focus-visible:outline-red-600 ",
    accent: "bg-yellow-500 hover:bg-yellow-800 text-blue-900 shadow-accent py-3 px-5 font-bold focus-visible:outline-yellow-800 ",
    outline: "bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white py-3 px-5 font-bold focus-visible:outline-blue-600 ",
    // For dark/brand-coloured sections: light border and text, soft wash on hover.
    outlineLight: "bg-transparent border border-gray-300 text-white hover:bg-white/10 hover:border-white py-3 px-5 font-bold focus-visible:outline-white ",
    // Hover dims rather than recolours: ghost buttons take per-use text colours
    // (e.g. the navbar's active-link red), which a hover colour would stomp on.
    ghost: "bg-transparent text-blue-600 hover:opacity-75 rounded-none px-0 font-inherit font-bold tracking-wider focus-visible:outline-blue-600"
  };

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;

  // SMART SWITCH: If an href is passed, render a Next.js Link styled as a button
  if (href) {
    return (
      <Link href={href} target={target} rel={rel} className={combinedClasses}>
        {children}
      </Link>
    );
  }

  // Fallback: If no href is passed, render a normal functional click/form button
  return (
    <button className={combinedClasses} {...props}>
      {children}
    </button>
  );
}
