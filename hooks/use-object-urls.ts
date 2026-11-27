"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Object URLs for local files, revoked when the files change or unmount.
 * Created inside the effect so React Strict Mode's mount, cleanup, mount cycle
 * never leaves a revoked URL in use.
 */
export function useObjectUrls(files: File[]): readonly string[] {
  const [preview, setPreview] = useState<{
    files: File[];
    urls: string[];
  } | null>(null);

  useEffect(() => {
    if (files.length === 0) {
      setPreview(null);
      return;
    }

    const urls = files.map((file) => URL.createObjectURL(file));
    setPreview({ files, urls });
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  return preview?.files === files ? preview.urls : [];
}

export function useObjectUrl(file: File | null): string | undefined {
  const files = useMemo(() => (file ? [file] : []), [file]);
  return useObjectUrls(files)[0];
}
