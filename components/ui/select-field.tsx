import type { ComponentProps } from "react";
import { Label } from "./label";
import { Select } from "./select";

export type Option = { value: string; label: string };

/**
 * Label + native select + field error. `placeholder` adds an empty first option.
 *
 * Keyed on `defaultValue`: after a form action, React 19 resets the form, and a mounted <select>
 * resets to its original default rather than a new one. Remounting makes an echoed value stick.
 */
export function SelectField({
  label,
  name,
  options,
  placeholder,
  errors,
  ...props
}: ComponentProps<"select"> & { label: string; name: string; options: Option[]; placeholder?: string; errors?: string[] }) {
  const id = props.id ?? name;
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        key={String(props.defaultValue ?? "")}
        id={id}
        name={name}
        className="w-full"
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? errorId : undefined}
        {...props}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      {errors?.length ? (
        <p id={errorId} className="text-sm text-destructive">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}
