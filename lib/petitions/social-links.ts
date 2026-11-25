export type SocialLinks = {
  twitter: string;
  facebook: string;
  instagram: string;
  linkedin: string;
};

/** Reads a profile's social_media field, a JSON string or an object. */
export function parseSocialLinks(raw: unknown): SocialLinks {
  const links: SocialLinks = {
    twitter: "",
    facebook: "",
    instagram: "",
    linkedin: "",
  };
  if (!raw) return links;

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    for (const key of Object.keys(links) as (keyof SocialLinks)[]) {
      const value = (parsed as Record<string, unknown>)?.[key];
      if (typeof value === "string") links[key] = value;
    }
  } catch (error) {
    console.error("Error parsing social media:", error);
  }
  return links;
}
