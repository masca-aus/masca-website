import React from 'react';
import Link from 'next/link';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost';

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
  
  const baseClasses = "font-primary text-sm rounded-lg transition-all inline-flex items-center justify-center gap-2 cursor-pointer select-none";

  const variantClasses: Record<ButtonVariant, string> = {
    primary: "bg-blue-600 hover:bg-blue-900 text-white py-3 px-5 font-bold ",
    secondary: "bg-red-600 hover:bg-red-800 text-white shadow-md py-3 px-5 font-bold ",
    accent: "bg-yellow-500 hover:bg-yellow-800 text-blue-900 shadow-accent py-3 px-5 font-bold ",
    outline: "bg-transparent border border-blue-600 text-blue-600 py-3 px-5 font-bold ",
    ghost: "bg-transparent text-blue-600 rounded-none px-0 font-inherit font-bold tracking-wider"
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
