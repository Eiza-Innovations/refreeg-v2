"use client";

import { Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/components/ui/field-error";
import { inviteRoleOptions } from "@/lib/options/organization.options";

export interface InviteRow {
  email: string;
  role: string;
}

export function CsrInviteRows({
  invites,
  error,
  onChange,
}: {
  invites: InviteRow[];
  error?: string;
  onChange: (next: InviteRow[]) => void;
}) {
  const setRow = (index: number, key: keyof InviteRow, value: string) => {
    onChange(
      invites.map((invite, i) =>
        i === index ? { ...invite, [key]: value } : invite,
      ),
    );
  };

  return (
    <Card variant="surface" className="p-6 sm:p-8">
      <p className="text-base font-semibold text-ink">Invite your team</p>
      <div className="mt-4 space-y-3">
        {invites.map((invite, index) => (
          <div
            key={index}
            className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_2rem]"
          >
            <Input
              type="email"
              placeholder="finance@korahq.com"
              value={invite.email}
              onChange={(event) => setRow(index, "email", event.target.value)}
            />
            <Select
              value={invite.role}
              onValueChange={(role) => setRow(index, "role", role)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {inviteRoleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => onChange(invites.filter((_, i) => i !== index))}
              aria-label={`Remove invite for ${invite.email || "this row"}`}
              className="flex h-10 w-8 items-center justify-center rounded-md text-ink/40 transition-colors hover:text-rust"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...invites, { email: "", role: "approver" }])}
        className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-blue-accent hover:underline"
      >
        <Plus className="h-4 w-4" />
        Add another person
      </button>
      <FieldError message={error} />
    </Card>
  );
}
