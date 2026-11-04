// 서버 전용 (서버 컴포넌트·서버 액션에서만 부릅니다).
import type { createClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET, AVATAR_URL_TTL, DEFAULT_AVATAR } from "@/features/mentors/lib/avatar";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * 사진 경로들을 화면에 쓸 주소로 바꿉니다. 사진은 비공개 버킷이라 로그인한 사람의 권한으로 1시간짜리 서명 URL을 만듭니다.
 * 사진이 없거나 볼 수 없으면 기본 이미지입니다.
 */
export async function avatarUrls(supabase: Client, paths: (string | null | undefined)[]) {
  const wanted = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const urls = new Map<string, string>();
  if (wanted.length > 0) {
    const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrls(wanted, AVATAR_URL_TTL);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl && !item.error) urls.set(item.path, item.signedUrl);
    }
  }
  return (path: string | null | undefined) => (path && urls.get(path)) || DEFAULT_AVATAR;
}
