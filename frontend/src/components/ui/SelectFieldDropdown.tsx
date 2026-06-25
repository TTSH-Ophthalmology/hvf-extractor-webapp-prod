/**
 * components/ui/SelectFieldDropdown.tsx — Accessible custom dropdown.
 *
 * VIEW: reusable dropdown that replaces <select> with keyboard/click accessibility.
 */

import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import './SelectFieldDropdown.css'

export type SelectFieldDropdownOption = {
  value: string
  label: string
}

type SelectFieldDropdownProps = {
  id: string
  label: string
  name: string
  options: SelectFieldDropdownOption[]
  value: string
  onChange: (value: string) => void
}

export const SelectFieldDropdown = ({
  id,
  label,
  name,
  options,
  value,
  onChange,
}: SelectFieldDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selectedOption = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  const handleSelect = (nextValue: string) => {
    onChange(nextValue)
    setIsOpen(false)
  }

  return (
    <div className="select-field-dropdown" ref={dropdownRef}>
      <label htmlFor={id}>{label}</label>
      <input type="hidden" name={name} value={value} />
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="select-field-trigger"
        id={id}
        type="button"
        onClick={() => setIsOpen((o) => !o)}
      >
        <span>{selectedOption.label}</span>
        <ChevronDown className="select-field-chevron" size={16} strokeWidth={2.2} />
      </button>

      {isOpen ? (
        <div className="select-field-menu" role="listbox" aria-labelledby={id}>
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                aria-selected={isSelected}
                className="select-field-option"
                key={option.value}
                role="option"
                type="button"
                onClick={() => handleSelect(option.value)}
              >
                <span>{option.label}</span>
                {isSelected ? <Check size={15} strokeWidth={2.4} /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
