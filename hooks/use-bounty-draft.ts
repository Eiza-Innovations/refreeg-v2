"use client";

import { useEffect, useState } from "react";
import type { BountyFormFields } from "@/types/bounty-types";

const draftKey = "refreeg-bounty-draft";

export function saveBountyDraft(form: BountyFormFields) {
  window.sessionStorage.setItem(draftKey, JSON.stringify(form));
}

export function useBountyDraft(initialStore: BountyFormFields) {
  const [form, setForm] = useState(initialStore);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.sessionStorage.getItem(draftKey);
    if (saved) {
      try {
        setForm(JSON.parse(saved) as BountyFormFields);
      } catch {
        window.sessionStorage.removeItem(draftKey);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveBountyDraft(form);
  }, [form, hydrated]);

  const setFormFields = <K extends keyof BountyFormFields>(
    key: K,
    value: BountyFormFields[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const persistDraft = () => saveBountyDraft(form);

  return { form, setFormFields, persistDraft };
}
