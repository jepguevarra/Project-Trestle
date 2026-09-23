import type { ComponentProps } from "react";
import { Input } from "./input";
import { Label } from "./label";

/** Label + input + field error, wired together for screen readers. */
export function FormField({
  label,
  name,
  errors,
  ...props
}: ComponentProps<"input"> & { label: string; name: string; errors?: string[] }) {
  const id = props.id ?? name;
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? errorId : undefined}
        {...props}
      />
      {errors?.length ? (
        <p id={errorId} className="text-sm text-destructive">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}
