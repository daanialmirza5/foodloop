"use client";

import { createContext, useActionState, useContext, useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { initialState, type ActionState } from "@/lib/action-state";
import { cn } from "@/lib/format";
import { toast } from "./toaster";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

const ErrCtx = createContext<Record<string, string> | undefined>(undefined);
const PendingCtx = createContext<boolean>(false);

/** Toast the result as soon as it arrives — the form itself may be unmounted by the refreshed page. */
function withToast(action: Action, errors: boolean): Action {
  return async (prev, fd) => {
    const s = await action(prev, fd);
    if (s.ok && s.message) toast(s.message);
    else if (errors && !s.ok && s.error) toast(s.error, true);
    return s;
  };
}

/**
 * Form bound to a server action. Shows success/error banners and per-field errors
 * returned by server-side validation (the server is always the source of truth).
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  onDone,
  showMessage = true,
  encType,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  onDone?: (s: ActionState) => void;
  showMessage?: boolean;
  encType?: "multipart/form-data";
}) {
  const [state, formAction, pending] = useActionState(withToast(action, false), initialState);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.stamp) return;
    if (state.ok && resetOnSuccess) ref.current?.reset();
    onDone?.(state);
    if (!state.ok && state.fieldErrors) {
      const first = Object.keys(state.fieldErrors)[0];
      ref.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stamp]);
  return (
    <ErrCtx.Provider value={state.fieldErrors}>
      <PendingCtx.Provider value={pending}>
        <form
          ref={ref}
          className={className}
          encType={encType}
          onSubmit={(e) => {
            // Submit through a transition instead of <form action>, so React does not
            // reset the user's input when the server returns validation errors.
            e.preventDefault();
            const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
            startTransition(() => formAction(fd));
          }}
        >
          {children}
          {showMessage && <FormMessage state={state} />}
        </form>
      </PendingCtx.Provider>
    </ErrCtx.Provider>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state.stamp) return null;
  if (state.ok && state.message)
    return (
      <div role="status" className="mt-3 rounded-xl border border-forest-200 bg-forest-50 px-3.5 py-2.5 text-sm text-forest-900">
        {state.message}
        {typeof state.data?.link === "string" && (
          <p className="mt-1">
            <Link className="link break-all" href={state.data.link}>
              {state.data.link}
            </Link>
          </p>
        )}
        {typeof state.data?.listingId === "string" && (
          <p className="mt-1">
            <Link className="link" href={`/dashboard/listings/${state.data.listingId}`}>
              Track this donation →
            </Link>
          </p>
        )}
      </div>
    );
  if (!state.ok && state.error)
    return (
      <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
        {state.error}
        {typeof state.data?.listingId === "string" && (
          <p className="mt-1">
            <Link className="link" href={`/dashboard/listings/${state.data.listingId}`}>
              View screening details →
            </Link>
          </p>
        )}
      </div>
    );
  return null;
}

export function SubmitButton({ children, className, name, value, pendingText, variant = "primary", formNoValidate }: { children: ReactNode; className?: string; name?: string; value?: string; pendingText?: string; variant?: "primary" | "secondary" | "accent" | "danger" | "ghost"; formNoValidate?: boolean }) {
  const status = useFormStatus();
  const pending = useContext(PendingCtx) || status.pending;
  return (
    <button type="submit" name={name} value={value} formNoValidate={formNoValidate} disabled={pending} aria-busy={pending} className={cn(`btn-${variant}`, className)}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? (pendingText ?? "Working…") : children}
    </button>
  );
}

function useFieldError(name: string) {
  return useContext(ErrCtx)?.[name];
}

type FieldProps = { label: string; name: string; hint?: ReactNode; required?: boolean; className?: string };

function FieldShell({ label, name, hint, required, className, children, id }: FieldProps & { children: ReactNode; id: string }) {
  const err = useFieldError(name);
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {err ? (
        <p id={`${id}-err`} className="mt-1 text-xs font-medium text-red-700">
          {err}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ label, name, hint, required, className, ...rest }: FieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const err = useFieldError(name);
  return (
    <FieldShell {...{ label, name, hint, required, className, id }}>
      <input id={id} name={name} required={required} aria-invalid={!!err} aria-describedby={err ? `${id}-err` : hint ? `${id}-hint` : undefined} className={cn("input", err && "border-red-400")} {...rest} />
    </FieldShell>
  );
}

export function Textarea({ label, name, hint, required, className, ...rest }: FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const err = useFieldError(name);
  return (
    <FieldShell {...{ label, name, hint, required, className, id }}>
      <textarea id={id} name={name} required={required} rows={3} aria-invalid={!!err} className={cn("input", err && "border-red-400")} {...rest} />
    </FieldShell>
  );
}

export function Select({ label, name, hint, required, className, options, placeholder, ...rest }: FieldProps & React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }) {
  const id = useId();
  const err = useFieldError(name);
  return (
    <FieldShell {...{ label, name, hint, required, className, id }}>
      <select id={id} name={name} required={required} aria-invalid={!!err} className={cn("input", err && "border-red-400")} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function Checkbox({ label, name, hint, defaultChecked, required }: { label: ReactNode; name: string; hint?: ReactNode; defaultChecked?: boolean; required?: boolean }) {
  const id = useId();
  const err = useFieldError(name);
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 bg-white p-3 text-sm hover:border-forest-300">
        <input id={id} type="checkbox" name={name} defaultChecked={defaultChecked} required={required} className="mt-0.5 size-4 shrink-0 accent-forest-700" />
        <span>
          <span className="font-medium text-ink">{label}</span>
          {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
        </span>
      </label>
      {err && <p className="mt-1 text-xs font-medium text-red-700">{err}</p>}
    </div>
  );
}

/**
 * A button that opens an accessible confirmation dialog, optionally asking for a reason,
 * then submits hidden fields to a server action.
 */
export function ConfirmAction({
  action,
  fields,
  label,
  title,
  description,
  confirmLabel = "Confirm",
  reasonName,
  reasonLabel = "Reason",
  reasonRequired = true,
  variant = "secondary",
  size = "sm",
  extra,
}: {
  action: Action;
  fields: Record<string, string>;
  label: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  reasonName?: string;
  reasonLabel?: string;
  reasonRequired?: boolean;
  variant?: "primary" | "secondary" | "accent" | "danger" | "ghost";
  size?: "sm" | "md";
  extra?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [result, setResult] = useState<ActionState | null>(null);
  return (
    <>
      <button type="button" className={cn(`btn-${variant}`, size === "sm" && "btn-sm")} onClick={() => (setResult(null), dialog.current?.showModal())}>
        {label}
      </button>
      {result?.stamp && !result.ok && <span className="sr-only" role="alert">{result.error}</span>}
      <dialog ref={dialog} className="m-auto w-[min(92vw,30rem)] rounded-2xl p-0 shadow-[var(--shadow-lift)] backdrop:bg-forest-900/40" aria-labelledby={`${title}-t`}>
        <ActionForm
          action={action}
          className="p-6"
          onDone={(s) => {
            setResult(s);
            if (s.ok) dialog.current?.close();
          }}
        >
          <h2 id={`${title}-t`} className="text-lg font-semibold text-forest-900">
            {title}
          </h2>
          {description && <div className="mt-1 text-sm text-muted">{description}</div>}
          {Object.entries(fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <div className="mt-4 space-y-3">
            {extra}
            {reasonName && <Textarea label={reasonLabel} name={reasonName} required={reasonRequired} minLength={reasonRequired ? 3 : undefined} />}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => dialog.current?.close()}>
              Cancel
            </button>
            <SubmitButton variant={variant === "danger" ? "danger" : "primary"}>{confirmLabel}</SubmitButton>
          </div>
        </ActionForm>
      </dialog>
    </>
  );
}

export function ResultToast({ message, error }: { message: string; error?: boolean }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    setShow(true);
    const t = setTimeout(() => setShow(false), 6000);
    return () => clearTimeout(t);
  }, [message]);
  if (!show) return null;
  return (
    <div role={error ? "alert" : "status"} className={cn("fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-sm shadow-[var(--shadow-lift)] sm:left-auto sm:right-6", error ? "bg-red-700 text-white" : "bg-forest-800 text-white")}>
      {message}
    </div>
  );
}

/** Small inline form: a single button posting hidden fields (no confirmation). */
export function InlineAction({ action, fields, children, variant = "secondary", className }: { action: Action; fields: Record<string, string>; children: ReactNode; variant?: "primary" | "secondary" | "accent" | "danger" | "ghost"; className?: string }) {
  const [, formAction] = useActionState(withToast(action, true), initialState);
  return (
    <form action={formAction} className={cn("inline", className)}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton variant={variant} className="btn-sm">
        {children}
      </SubmitButton>
    </form>
  );
}
