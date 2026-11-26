"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Object URLs for local files, revoked when the files change or unmount.
 * Created inside the effect so React Strict Mode's mount, cleanup, mount cycle
 * never leaves a revoked URL in use.
 */
export function useObjectUrls(files: File[]) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const next = files.map((file) => URL.createObjectURL(file));
    setUrls(next);
    return () => next.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  return urls;
}

export function useObjectUrl(file: File | null) {
  const files = useMemo(() => (file ? [file] : []), [file]);
  return useObjectUrls(files)[0] as string | undefined;
}
