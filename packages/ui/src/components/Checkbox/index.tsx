import React from 'react'
import { cn } from '../../lib/utils'

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    const checkboxId = props.id || props.name

    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            className={cn(
              "h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary",
              error && "border-red-500",
              className
            )}
            ref={ref}
            id={checkboxId}
            {...props}
          />
        </div>
        {label && (
          <div className="ml-3 text-sm">
            <label htmlFor={checkboxId} className="font-medium text-gray-700">
              {label}
            </label>
            {helperText && (
              <p className="text-gray-500">{helperText}</p>
            )}
            {error && (
              <p className="text-red-600">{error}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)
Checkbox.displayName = 'Checkbox'
