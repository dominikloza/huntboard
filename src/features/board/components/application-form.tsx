"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type ReactNode, useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { type ActionResult } from "../actions";
import { APPLICATION_STATUSES, STATUS_LABELS, WORK_MODES } from "../constants";
import {
  applicationInputSchema,
  EMPTY_APPLICATION_FORM,
  type ApplicationFormValues,
  type ApplicationInput,
} from "../schemas";
import { type Application } from "../types";

export { EMPTY_APPLICATION_FORM };

const WORK_MODE_LABELS = {
  remote: "Zdalnie",
  hybrid: "Hybrydowo",
  office: "Stacjonarnie",
} as const;

export function toFormValues(application: Application): ApplicationFormValues {
  return {
    company: application.company,
    role: application.role,
    status: application.status,
    workMode: application.workMode,
    city: application.city ?? "",
    seniority: application.seniority ?? "",
    salaryMin: application.salaryMin == null ? "" : String(application.salaryMin),
    salaryMax: application.salaryMax == null ? "" : String(application.salaryMax),
    stack: application.stack.join(", "),
    offerUrl: application.offerUrl ?? "",
  };
}

type ApplicationFormProps = {
  defaultValues: ApplicationFormValues;
  submitLabel: string;
  pendingLabel: string;
  onSubmit: (values: ApplicationInput) => Promise<ActionResult<Application>>;
  onSuccess: (application: Application) => void;
  onCancel: () => void;
  /** Clear the form after a successful submit (the "new" form is kept alive between visits). */
  resetOnSuccess?: boolean;
  /**
   * AI intake (ADR 009): values arriving from the stream. The form follows them; while `active`
   * the fields are read-only and fields the model has not answered yet are placeholders.
   */
  stream?: FormStream;
  /** Rendered between the fields and the buttons (e.g. AI warnings). */
  beforeActions?: ReactNode;
};

export type FormStream = {
  values: ApplicationFormValues;
  answered: ReadonlySet<string>;
  active: boolean;
  /** Fields to highlight when filled; all answered fields when not given (a new card). */
  filled?: ReadonlySet<string>;
};

/** Placeholder while waiting for the field, a one-off highlight when its value arrives. */
function streamFieldClass(stream: FormStream | undefined, name: keyof ApplicationFormValues) {
  if (!stream) return undefined;
  if (!stream.answered.has(name)) {
    return stream.active
      ? "[&_:is(input,select)]:animate-pulse [&_:is(input,select)]:bg-folder [&_:is(input,select)]:text-transparent"
      : undefined;
  }
  if (stream.filled && !stream.filled.has(name)) return undefined;
  return "[&_:is(input,select)]:animate-fill";
}

/**
 * Validates on the client with the same Zod schema the Server Action uses on the server.
 * Server-side field errors (e.g. a tampered request) are mapped back onto the fields.
 *
 * Next.js keeps recently visited routes alive (React Activity), so closing the modal with
 * Escape keeps an unsent draft. "Anuluj" discards it; a successful "new" submit clears it.
 */
export function ApplicationForm({
  defaultValues,
  submitLabel,
  pendingLabel,
  onSubmit,
  onSuccess,
  onCancel,
  resetOnSuccess = false,
  stream,
  beforeActions,
}: ApplicationFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormValues, unknown, ApplicationInput>({
    resolver: zodResolver(applicationInputSchema),
    defaultValues,
  });

  const streamValues = stream?.values;
  useEffect(() => {
    if (!streamValues) return;
    for (const [name, value] of Object.entries(streamValues)) {
      const field = name as keyof ApplicationFormValues;
      if (getValues(field) !== value) setValue(field, value);
    }
  }, [streamValues, getValues, setValue]);

  const locked = stream?.active === true;
  const fieldClass = (name: keyof ApplicationFormValues) => streamFieldClass(stream, name);

  const submit = handleSubmit(async (values) => {
    const result = await onSubmit(values);
    if (result.ok) {
      if (resetOnSuccess) reset();
      return onSuccess(result.data);
    }

    for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
      if (field in defaultValues && messages?.[0]) {
        setError(field as keyof ApplicationFormValues, { message: messages[0] });
      }
    }
    setError("root", { message: result.error });
  });

  return (
    <form onSubmit={submit} noValidate aria-busy={locked} className="flex flex-col gap-6">
      {/* inert: no typing or focus while the AI fills the fields; values arrive via setValue */}
      <div className="grid gap-5 sm:grid-cols-2" inert={locked}>
        <FormField label="Firma" error={errors.company?.message} className={fieldClass("company")}>
          {(field) => <Input {...field} autoComplete="organization" {...register("company")} />}
        </FormField>
        <FormField label="Stanowisko" error={errors.role?.message} className={fieldClass("role")}>
          {(field) => <Input {...field} autoComplete="organization-title" {...register("role")} />}
        </FormField>

        <FormField label="Etap" error={errors.status?.message}>
          {(field) => (
            <Select {...field} {...register("status")}>
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField
          label="Poziom"
          hint="Np. Junior, Mid, Senior"
          error={errors.seniority?.message}
          className={fieldClass("seniority")}
        >
          {(field) => <Input {...field} {...register("seniority")} />}
        </FormField>

        <FormField
          label="Tryb pracy"
          error={errors.workMode?.message}
          className={fieldClass("workMode")}
        >
          {(field) => (
            <Select {...field} {...register("workMode")}>
              {WORK_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {WORK_MODE_LABELS[mode]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label="Miasto" error={errors.city?.message} className={fieldClass("city")}>
          {(field) => <Input {...field} autoComplete="address-level2" {...register("city")} />}
        </FormField>

        <FormField
          label="Widełki od (zł / mies.)"
          error={errors.salaryMin?.message}
          className={fieldClass("salaryMin")}
        >
          {(field) => (
            <Input
              {...field}
              inputMode="numeric"
              className="font-mono"
              {...register("salaryMin")}
            />
          )}
        </FormField>
        <FormField
          label="Widełki do (zł / mies.)"
          error={errors.salaryMax?.message}
          className={fieldClass("salaryMax")}
        >
          {(field) => (
            <Input
              {...field}
              inputMode="numeric"
              className="font-mono"
              {...register("salaryMax")}
            />
          )}
        </FormField>

        <FormField
          label="Stack"
          hint="Technologie oddzielone przecinkami"
          error={errors.stack?.message}
          className={cn("sm:col-span-2", fieldClass("stack"))}
        >
          {(field) => <Input {...field} {...register("stack")} />}
        </FormField>

        <FormField
          label="Link do ogłoszenia"
          error={errors.offerUrl?.message}
          className={cn("sm:col-span-2", fieldClass("offerUrl"))}
        >
          {(field) => (
            <Input
              {...field}
              type="url"
              inputMode="url"
              className="font-mono text-sm"
              {...register("offerUrl")}
            />
          )}
        </FormField>
      </div>

      {beforeActions}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting || locked}>
          {isSubmitting ? pendingLabel : submitLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            reset();
            onCancel();
          }}
          disabled={isSubmitting}
        >
          Anuluj
        </Button>
        <p role="alert" className="text-sm text-pen">
          {errors.root?.message}
        </p>
      </div>
    </form>
  );
}
