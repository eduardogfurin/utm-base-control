"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { OnboardingWizard } from "./onboarding-wizard";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    fetch("/api/onboarding/status")
      .then((r) => r.json())
      .then((data) => {
        setNeedsOnboarding(!data.completed);
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, [status, session?.user?.id]);

  if (status === "loading" || !checked) return <>{children}</>;

  return (
    <>
      {children}
      {needsOnboarding && <OnboardingWizard onComplete={() => setNeedsOnboarding(false)} />}
    </>
  );
}
