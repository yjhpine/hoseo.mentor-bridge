// 멘토 프로필 사진 (docs/architecture.md 11장 18번).
// 서버·브라우저 코드 양쪽에서 쓰므로 DB 접근 코드와 따로 둡니다.

/** 사진이 없을 때 쓰는 기본 이미지 */
export const DEFAULT_AVATAR = "/avatar-default.svg";

export const AVATAR_BUCKET = "avatars";
/** 저장할 사진 한 변의 길이(px). 브라우저가 가운데 정사각형을 잘라 이 크기로 줄입니다. */
export const AVATAR_SIZE = 512;
/** 고를 수 있는 원본 파일 */
export const AVATAR_SOURCE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const AVATAR_SOURCE_MAX_BYTES = 10 * 1024 * 1024;
/** 서명 URL 유효 시간(초) */
export const AVATAR_URL_TTL = 60 * 60;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
// DB avatar_owner()와 같은 모양: "{멘토 id}/{무작위 id}.webp|jpg"
const AVATAR_PATH = new RegExp(`^(${UUID})/[0-9a-f-]{36}\\.(webp|jpg)$`);

/** 경로의 주인(멘토 id). 모양이 맞지 않으면 null */
export function avatarOwner(path: string): string | null {
  return AVATAR_PATH.exec(path)?.[1] ?? null;
}

/** 원본 이미지에서 가운데 정사각형을 잘라낼 영역 */
export function centerSquare(width: number, height: number) {
  const side = Math.min(width, height);
  return { sx: Math.floor((width - side) / 2), sy: Math.floor((height - side) / 2), side };
}
