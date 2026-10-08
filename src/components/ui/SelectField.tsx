import type { SelectHTMLAttributes } from 'react';

export type SelectFieldOption = { value: string; label: string };

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'onChange' | 'value'> & {
  label: string;
  value: string;
  options: readonly SelectFieldOption[];
  placeholder?: string;
  onValueChange: (value: string) => void;
  wrapperClassName?: string;
};

export function SelectField({
  label,
  value,
  options,
  placeholder,
  onValueChange,
  wrapperClassName,
  ...selectProps
}: SelectFieldProps) {
  return <label className={['select-field', wrapperClassName].filter(Boolean).join(' ')}>
    <span className="select-field__label">{label}</span>
    <select {...selectProps} value={value} onChange={event => onValueChange(event.target.value)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>;
}
