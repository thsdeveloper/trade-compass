"use client"

import * as React from "react"
import { NumericFormat, NumericFormatProps, NumberFormatValues, SourceInfo } from "react-number-format"
import { cn } from "@/lib/utils"

interface CurrencyInputProps extends Omit<NumericFormatProps, 'value' | 'onValueChange' | 'customInput' | 'onChange' | 'allowNegative'> {
  value: number | undefined | null
  onChange: (value: number) => void
  showPrefix?: boolean
  allowNegative?: boolean
  className?: string
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, showPrefix = false, allowNegative = false, className, ...props }, ref) => {
    // Track if component is mounted to prevent state updates after unmount
    const isMountedRef = React.useRef(true)

    React.useEffect(() => {
      isMountedRef.current = true
      return () => {
        isMountedRef.current = false
      }
    }, [])

    // Memoize the callback to prevent unnecessary re-renders
    const handleValueChange = React.useCallback(
      (values: NumberFormatValues, sourceInfo: SourceInfo) => {
        // Only call onChange when:
        // 1. Component is still mounted
        // 2. Change comes from user input (not from prop changes)
        if (isMountedRef.current && sourceInfo.source === 'event') {
          const newValue = values.floatValue ?? 0
          onChange(newValue)
        }
      },
      [onChange]
    )

    // Normalize the value to handle undefined/null
    const normalizedValue = value === undefined || value === null ? '' : value

    return (
      <NumericFormat
        getInputRef={ref}
        value={normalizedValue}
        onValueChange={handleValueChange}
        thousandSeparator="."
        decimalSeparator=","
        decimalScale={2}
        fixedDecimalScale
        allowNegative={allowNegative}
        prefix={showPrefix ? "R$ " : undefined}
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className
        )}
        {...props}
      />
    )
  }
)

CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }
