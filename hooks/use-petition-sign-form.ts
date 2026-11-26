"use client";

import { useState } from "react";
import { useValidator } from "@/hooks/use-validator";
import {
  petitionSignSchema,
  type PetitionSignFields,
} from "@/lib/schemas/petition-sign.schema";

/** Form state and validation shared by every petition signing form. */
export function usePetitionSignForm({
  name = "",
  email = "",
}: {
  name?: string;
  email?: string;
}) {
  const [form, setForm] = useState<PetitionSignFields>({
    name,
    email,
    message: "",
    isAnonymous: false,
  });
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: petitionSignSchema,
  });

  const setFormFields = <K extends keyof PetitionSignFields>(
    key: K,
    value: PetitionSignFields[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    clearError(key);
  };

  return { form, setFormFields, errors, validate };
}

export type PetitionSignFormApi = ReturnType<typeof usePetitionSignForm>;
