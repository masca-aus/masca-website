import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";
export const fieldClass =
  "w-full rounded-md border-2 border-blue-100 bg-white px-4 py-3 text-body text-black outline-none transition-colors placeholder:text-gray-300 focus:border-blue-600 focus:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 motion-reduce:transition-none";
const labelClass = "text-body-sm font-bold text-gray-700";
export function FieldShell({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={error ? "text-body-sm font-bold text-red-600" : labelClass}>
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-body-sm text-gray-700">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-body-sm font-bold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  id,
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
}) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <FieldShell id={id} label={props.required ? `${label} *` : label} error={error} hint={hint}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`${fieldClass} ${error ? "border-red-600 bg-red-50" : ""}`}
        {...props}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  id,
  label,
  error,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  label: string;
  error?: string;
}) {
  return (
    <FieldShell id={id} label={props.required ? `${label} *` : label} error={error}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${fieldClass} resize-y ${error ? "border-red-600 bg-red-50" : ""}`}
        {...props}
      />
    </FieldShell>
  );
}

