"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import { type ActionResult } from "../actions";
import { APPLICATION_STATUSES, STATUS_LABELS, WORK_MODES } from "../constants";
import {
  applicationInputSchema,
  type ApplicationFormValues,
  type ApplicationInput,
} from "../schemas";
import { type Application } from "../types";

const WORK_MODE_LABELS = {
  remote: "Zdalnie",
  hybrid: "Hybrydowo",
  office: "Stacjonarnie",
} as const;

export const EMPTY_APPLICATION_FORM: ApplicationFormValues = {
  company: "",
  role: "",
  status: "saved",
  workMode: "remote",
  city: "",
  seniority: "",
  salaryMin: "",
  salaryMax: "",
  stack: "",
};

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
};

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
}: ApplicationFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormValues, unknown, ApplicationInput>({
    resolver: zodResolver(applicationInputSchema),
    defaultValues,
  });

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
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Firma" error={errors.company?.message}>
          {(field) => <Input {...field} autoComplete="organization" {...register("company")} />}
        </FormField>
        <FormField label="Stanowisko" error={errors.role?.message}>
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
        <FormField label="Poziom" hint="Np. Junior, Mid, Senior" error={errors.seniority?.message}>
          {(field) => <Input {...field} {...register("seniority")} />}
        </FormField>

        <FormField label="Tryb pracy" error={errors.workMode?.message}>
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
        <FormField label="Miasto" error={errors.city?.message}>
          {(field) => <Input {...field} autoComplete="address-level2" {...register("city")} />}
        </FormField>

        <FormField label="Widełki od (zł / mies.)" error={errors.salaryMin?.message}>
          {(field) => (
            <Input
              {...field}
              inputMode="numeric"
              className="font-mono"
              {...register("salaryMin")}
            />
          )}
        </FormField>
        <FormField label="Widełki do (zł / mies.)" error={errors.salaryMax?.message}>
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
          className="sm:col-span-2"
        >
          {(field) => <Input {...field} {...register("stack")} />}
        </FormField>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
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
