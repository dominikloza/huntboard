import { type Metadata } from "next";
import { Suspense } from "react";

import { ProfileForm } from "@/features/profile/components/profile-form";
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
    </main>
  );
}
