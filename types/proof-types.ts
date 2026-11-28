export type ProofMediaEntry = {
  type: "image" | "video" | "document";
  url: string;
  name: string;
};

export type ProofUpdate = {
  id: string;
  milestone: number | null;
  created_at: string | Date;
  description: string;
  media: unknown;
};
