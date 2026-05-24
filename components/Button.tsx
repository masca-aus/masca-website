import React from 'react';
import Link from 'next/link';

type ButtonVariant = 'primary' | 'secondary' | 'yellowCTA' | 'outline' | 'ghost';

// We extend standard HTML attributes for both regular buttons AND links
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  href?: string;
  children: React.ReactNode;
}

export default function Button({ 
  variant = 'primary', 
  href,
  children, 
  className = '', 
  ...props 
}: ButtonProps) {
  
  const baseClasses = "font-primary font-semibold text-sm rounded-lg py-[12px] px-[22px] transition-all inline-flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 select-none";

  const variantClasses: Record<ButtonVariant, string> = {
    primary: "bg-blue-600 hover:bg-blue-900 text-white",
    secondary: "bg-red-600 hover:bg-red-800 text-white",
    yellowCTA: "bg-yellow-500 hover:bg-yellow-800 text-blue-900 shadow-md shadow-yellow-500/10",
    outline: "bg-white border border-blue-600 text-blue-600 hover:bg-gray-100",
    ghost: "bg-transparent text-blue-600 hover:bg-gray-100/50"
  };

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;

  // SMART SWITCH: If an href is passed, render a Next.js Link styled as a button
  if (href) {
    return (
      <Link href={href} className={combinedClasses}>
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
