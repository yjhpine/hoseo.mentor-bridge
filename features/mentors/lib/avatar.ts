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

// ---------------------------------------------------------------------------
// 사진 위치 편집 (끌어서 옮기기, 확대·축소). 편집 틀은 한 변이 view인 정사각형이고,
// 사진은 틀을 늘 빈틈없이 덮습니다. 저장할 때 틀에 보이는 부분을 원본 좌표로 바꿔 잘라 냅니다.
// ---------------------------------------------------------------------------

export const AVATAR_MAX_ZOOM = 3;

export type CropState = {
  /** 틀 기준 사진 왼쪽 위 위치(px). 0 이하 */
  x: number;
  y: number;
  /** 1 = 짧은 변이 틀에 꼭 맞음 */
  zoom: number;
};

/** 화면에 그릴 배율(원본 1px → 틀 몇 px) */
export function cropScale(width: number, height: number, view: number, zoom: number) {
  return (view / Math.min(width, height)) * zoom;
}

/** 사진이 틀 밖으로 빠져 빈틈이 생기지 않게 위치를 맞춥니다. */
export function clampCrop(width: number, height: number, view: number, state: CropState): CropState {
  const zoom = Math.min(AVATAR_MAX_ZOOM, Math.max(1, state.zoom));
  const scale = cropScale(width, height, view, zoom);
  const clamp = (value: number, size: number) => Math.min(0, Math.max(view - size * scale, value));
  return { zoom, x: clamp(state.x, width), y: clamp(state.y, height) };
}

/** 처음 상태: 가운데, 확대 없음 */
export function initialCrop(width: number, height: number, view: number): CropState {
  const scale = cropScale(width, height, view, 1);
  return { zoom: 1, x: (view - width * scale) / 2, y: (view - height * scale) / 2 };
}

/** 틀 가운데를 기준으로 확대·축소 */
export function zoomCrop(width: number, height: number, view: number, state: CropState, zoom: number): CropState {
  const before = cropScale(width, height, view, state.zoom);
  const after = cropScale(width, height, view, Math.min(AVATAR_MAX_ZOOM, Math.max(1, zoom)));
  const cx = (view / 2 - state.x) / before;
  const cy = (view / 2 - state.y) / before;
  return clampCrop(width, height, view, { zoom, x: view / 2 - cx * after, y: view / 2 - cy * after });
}

/** 틀에 보이는 부분을 원본 좌표로 (저장할 때 잘라 낼 영역) */
export function cropSource(width: number, height: number, view: number, state: CropState) {
  const scale = cropScale(width, height, view, state.zoom);
  const side = Math.min(view / scale, width, height);
  const sx = Math.min(Math.max(0, -state.x / scale), width - side);
  const sy = Math.min(Math.max(0, -state.y / scale), height - side);
  return { sx, sy, side };
}
