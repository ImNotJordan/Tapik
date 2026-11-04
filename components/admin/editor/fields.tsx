"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Validation } from "@/lib/validate";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useEditor } from "./editor-context";

/**
 * A text field bound to the card. Valid input is written immediately (live
 * preview + autosave); invalid input stays local, shows its fix-it message on
 * blur, and blocks publishing until fixed.
 */
export function BoundField({
  fieldKey,
  label,
  value,
  onCommit,
  validate,
  hint,
  optional,
  multiline,
  rows,
  max,
  placeholder,
  inputMode,
  type,
  autoComplete,
  formatOnBlur = true,
  className,
}: {
  fieldKey: string;
  label: ReactNode;
  value: string;
  onCommit: (v: string) => void;
  validate?: (v: string) => Validation;
  hint?: ReactNode;
  optional?: boolean;
  multiline?: boolean;
  rows?: number;
  max?: number;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  type?: string;
  autoComplete?: string;
  formatOnBlur?: boolean;
  className?: string;
}) {
  const { setInvalid } = useEditor();
  const [text, setText] = useState(value);
  const [showError, setShowError] = useState(false);
  const focused = useRef(false);

  // Follow outside changes (undo, another tab) unless the person is typing here.
  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);

  const check = (v: string): Validation => {
    if (max && v.length > max) return { ok: false, message: `Keep it to ${max} characters; it’s ${v.length} now.` };
    return validate ? validate(v) : { ok: true, value: v };
  };
  const result = check(text);
  const error = !result.ok && showError ? result.message : null;

  useEffect(() => {
    setInvalid(fieldKey, result.ok ? null : result.message);
    return () => setInvalid(fieldKey, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldKey, result.ok, result.ok ? "" : result.message]);

  const onChange = (v: string) => {
    setText(v);
    const r = check(v);
    if (r.ok) {
      onCommit(validate && !formatOnBlur ? r.value : v);
      setShowError(false);
    }
  };

  const onBlur = () => {
    focused.current = false;
    const r = check(text);
    if (r.ok) {
      if (formatOnBlur && r.value !== text) {
        setText(r.value);
        onCommit(r.value);
      }
    } else {
      setShowError(true);
    }
  };

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      counter={max ? { value: text.length, max } : undefined}
      className={className}
    >
      {(p) =>
        multiline ? (
          <Textarea
            id={p.id}
            aria-describedby={p.describedBy}
            invalid={!!error}
            rows={rows}
            value={text}
            placeholder={placeholder}
            onFocus={() => (focused.current = true)}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
          />
        ) : (
          <Input
            id={p.id}
            aria-describedby={p.describedBy}
            invalid={!!error}
            value={text}
            type={type}
            inputMode={inputMode}
            autoComplete={autoComplete}
            placeholder={placeholder}
            onFocus={() => (focused.current = true)}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
          />
        )
      }
    </Field>
  );
}

export function PanelHeader({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-1">
      <h2 className="text-lg font-semibold tracking-[-0.01em]">{title}</h2>
      {description && <p className="text-sm text-studio-ink-3">{description}</p>}
    </div>
  );
}

export function Divider() {
  return <hr className="my-7 border-studio-line" />;
}
