"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { REMOTE_PREFERENCES } from "@/features/board/constants";
import { applicationKeys } from "@/features/board/query-keys";

import { saveProfile } from "../actions";
import {
  type ProfileFormValues,
  type ProfileInput,
  profileInputSchema,
  REMOTE_PREFERENCE_LABELS,
} from "../schemas";

const cards = (n: number) =>
  n === 1
    ? "kartę"
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
      ? "karty"
      : "kart";

export function ProfileForm({ defaultValues }: { defaultValues: ProfileFormValues }) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues, unknown, ProfileInput>({
    resolver: zodResolver(profileInputSchema),
    defaultValues,
  });

  const submit = handleSubmit(async (values) => {
    setSaved(undefined);
    const result = await saveProfile(values);
    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (field in defaultValues && messages?.[0]) {
          setError(field as keyof ProfileFormValues, { message: messages[0] });
        }
      }
      setError("root", { message: result.error });
      return;
    }
    // The board shows the new scores on the next visit.
    await queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    reset({ ...values, skills: values.skills.join(", ") });
    const { rescored } = result.data;
    setSaved(
      rescored === 0
        ? "Zapisano. Wyniki dopasowania się nie zmieniły."
        : `Zapisano. Przeliczyłem dopasowanie: ${rescored} ${cards(rescored)}.`,
    );
  });

  return (
    <form onSubmit={submit} noValidate className="flex max-w-2xl flex-col gap-6">
      <FormField
        label="Twoje technologie"
        hint="Oddzielone przecinkami. Porównuję je ze stackiem z ogłoszeń."
        error={errors.skills?.message}
      >
        {(field) => <Input {...field} {...register("skills")} />}
      </FormField>

      <div className="grid gap-5 sm:grid-cols-3">
        <FormField label="Lata doświadczenia" error={errors.yearsExperience?.message}>
          {(field) => (
            <Input
              {...field}
              inputMode="numeric"
              className="font-mono"
              {...register("yearsExperience")}
            />
          )}
        </FormField>
        <FormField
          label="Minimum (zł / mies.)"
          hint="Netto na B2B lub brutto na UoP"
          error={errors.salaryMin?.message}
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
        <FormField label="Tryb pracy" error={errors.remotePreference?.message}>
          {(field) => (
            <Select {...field} {...register("remotePreference")}>
              {REMOTE_PREFERENCES.map((pref) => (
                <option key={pref} value={pref}>
                  {REMOTE_PREFERENCE_LABELS[pref]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>

      <FormField
        label="O mnie (opcjonalnie)"
        hint="AI bierze to pod uwagę w komentarzu do dopasowania."
        error={errors.bio?.message}
      >
        {(field) => <Textarea {...field} rows={3} maxLength={500} {...register("bio")} />}
      </FormField>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Zapisuję..." : "Zapisz profil"}
        </Button>
        <p role="status" className="text-sm text-muted-foreground">
          {saved && !isDirty ? (
            <>
              {saved}{" "}
              <Link
                href="/board"
                className="font-semibold text-primary-ink underline underline-offset-2"
              >
                Wróć do kartoteki
              </Link>
            </>
          ) : null}
        </p>
        <p role="alert" className="text-sm text-pen">
          {errors.root?.message}
        </p>
      </div>
    </form>
  );
}
