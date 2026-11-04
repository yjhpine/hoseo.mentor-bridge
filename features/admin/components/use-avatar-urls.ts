"use client";

import { useEffect, useState } from "react";
import { AVATAR_BUCKET, AVATAR_URL_TTL, DEFAULT_AVATAR } from "@/features/mentors/lib/avatar";
import { createClient } from "@/lib/supabase/client";

/**
 * 관리자 화면(브라우저)에서 멘토 사진 경로를 서명 URL로 바꿉니다 (11장 18번).
 * 돌려주는 함수에 경로를 넣으면 주소를, 사진이 없거나 아직 못 받았으면 기본 이미지를 줍니다.
 */
export function useAvatarUrls(paths: (string | null | undefined)[]) {
  const key = [...new Set(paths.filter((p): p is string => Boolean(p)))].sort().join("|");
  const [urls, setUrls] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    createClient()
      .storage.from(AVATAR_BUCKET)
      .createSignedUrls(key.split("|"), AVATAR_URL_TTL)
      .then(({ data }) => {
        if (cancelled) return;
        const next = new Map<string, string>();
        for (const item of data ?? []) {
          if (item.path && item.signedUrl && !item.error) next.set(item.path, item.signedUrl);
        }
        setUrls(next);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return (path: string | null | undefined) => (path && urls.get(path)) || DEFAULT_AVATAR;
}
