import { type Metadata } from "next";
import { Suspense } from "react";

import { MailSettings } from "@/features/mail/components/mail-settings";
import { appsScript } from "@/features/mail/lib/apps-script";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { publicAppUrl } from "@/lib/auth/base-url";
import { requireUser } from "@/lib/auth/session";
import { getMailSettings } from "@/lib/db/queries/mail";
import { type ProfileFormValues } from "@/features/profile/schemas";
import { getProfile } from "@/lib/db/queries/profile";

export const metadata: Metadata = { title: "Profil" };

async function ProfileFormLoader() {
  const profile = await getProfile();
  const values: ProfileFormValues = {
    skills: (profile?.skills ?? []).join(", "),
    yearsExperience: profile?.yearsExperience == null ? "" : String(profile.yearsExperience),
    salaryMin: profile?.salaryMin == null ? "" : String(profile.salaryMin),
    remotePreference: profile?.remotePreference ?? "any",
    bio: profile?.bio ?? "",
  };
  return <ProfileForm defaultValues={values} />;
}

async function MailSettingsLoader() {
  const [user, connection] = await Promise.all([requireUser(), getMailSettings()]);
  return (
    <MailSettings
      isGuest={user.isGuest}
      connection={
        connection && {
          tokenHint: connection.tokenHint,
          autoRejectDays: connection.autoRejectDays,
          lastSyncAt: connection.lastSyncAt?.toISOString() ?? null,
        }
      }
      script={appsScript(
        publicAppUrl({
          BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
          VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
          VERCEL_URL: process.env.VERCEL_URL,
        }),
      )}
    />
  );
}

function ProfileSkeleton() {
  return (
    <div aria-hidden className="flex max-w-2xl flex-col gap-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="h-3 w-32 animate-pulse bg-folder" />
          <div className="h-10 animate-pulse border-b-[1.5px] border-border" />
        </div>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-7">
      <h1 className="mb-2 font-display text-[44px] leading-none font-extrabold tracking-[-0.035em]">
        Profil
      </h1>
      <p className="mb-8 max-w-[60ch] text-muted-foreground">
        Z tym porównuję każdą ofertę. Wynik dopasowania liczę z Twojego stacku, widełek, trybu pracy
        i doświadczenia, a AI tylko go komentuje.
      </p>
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileFormLoader />
      </Suspense>
      <div className="mt-14 border-t-2 border-ink pt-8">
        <Suspense fallback={<div aria-hidden className="h-40 max-w-2xl animate-pulse bg-folder" />}>
          <MailSettingsLoader />
        </Suspense>
      </div>
    </main>
  );
}
