"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/features/auth/api/actions";
import { setMyMentorCharacter, setMyMentorPhoto } from "@/features/mentors/api/actions";
import { MentorAvatar } from "@/features/mentors/components/mentor-card";
import { PhotoEditor, type ImageSize } from "@/features/mentors/components/photo-editor";
import {
  AVATAR_BUCKET,
  AVATAR_SIZE,
  AVATAR_SOURCE_MAX_BYTES,
  AVATAR_SOURCE_TYPES,
  cropSource,
  type CropState,
} from "@/features/mentors/lib/avatar";
import { MENTOR_CHARACTERS } from "@/features/mentors/lib/characters";
import { createClient } from "@/lib/supabase/client";

// 멘토 프로필 사진 올리기 (11장 18번)
// 사진을 고르면 편집 화면에서 위치와 크기를 맞추고 미리보기를 확인한 뒤 저장합니다.
// 저장할 때 보이는 부분만 512px 정사각형으로 줄여 WEBP(지원하지 않는 브라우저는 JPG)로 올립니다.
// 원본은 올리지 않으므로 저장 용량과 전송량을 거의 쓰지 않습니다. 올리면 바로 공개됩니다.

type Editing = { file: File; url: string; image: ImageSize };

async function render(file: File, crop: CropState, view: number): Promise<{ blob: Blob; ext: "webp" | "jpg" }> {
  // createImageBitmap은 휴대폰 사진의 회전 정보(EXIF)를 반영해 편집 화면과 같은 방향으로 읽습니다.
  const bitmap = await createImageBitmap(file);
  const { sx, sy, side } = cropSource(bitmap.width, bitmap.height, view, crop);
  const size = Math.round(Math.min(AVATAR_SIZE, side));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.fillStyle = "#ffffff"; // 투명 PNG를 JPG로 바꿀 때 검게 되지 않게
  context.fillRect(0, 0, size, size);
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();
  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webp = await toBlob("image/webp");
  if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp" };
  const jpg = await toBlob("image/jpeg");
  if (!jpg) throw new Error("toBlob");
  return { blob: jpg, ext: "jpg" };
}

export function PhotoUpload({
  mentorId,
  name,
  photoUrl,
  hasPhoto,
  avatarCharacter,
}: {
  mentorId: string;
  name: string;
  photoUrl: string;
  hasPhoto: boolean;
  /** 지금 기본 캐릭터 번호 (고른 값, 없으면 id로 정한 값, 11장 38번) */
  avatarCharacter: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState<string | null>(hasPhoto ? photoUrl : null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [state, setState] = useState<FormState>({});
  const [busy, setBusy] = useState(false);
  const [character, setCharacter] = useState(avatarCharacter);
  const characterSrc = MENTOR_CHARACTERS[character - 1]?.src ?? MENTOR_CHARACTERS[0].src;

  async function pickCharacter(id: number) {
    if (id === character) return;
    setBusy(true);
    const result = await setMyMentorCharacter(id);
    setBusy(false);
    setState(result);
    if (result.success) setCharacter(id);
  }

  // 편집용 임시 주소는 다 쓰면 정리합니다.
  useEffect(() => () => {
    if (editing) URL.revokeObjectURL(editing.url);
  }, [editing]);

  async function choose(file: File) {
    if (!(AVATAR_SOURCE_TYPES as readonly string[]).includes(file.type)) {
      setState({ error: "JPG, PNG, WEBP 사진만 올릴 수 있습니다." });
      return;
    }
    if (file.size > AVATAR_SOURCE_MAX_BYTES) {
      setState({ error: "사진은 10MB까지 고를 수 있습니다." });
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const image = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      setState({});
      setEditing({ file, url: URL.createObjectURL(file), image });
    } catch {
      setState({ error: "사진을 읽지 못했습니다. 다른 사진으로 해 보세요." });
    }
  }

  async function save(crop: CropState, view: number) {
    if (!editing) return;
    setBusy(true);
    setState({});
    try {
      const { blob, ext } = await render(editing.file, crop, view);
      const path = `${mentorId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await createClient()
        .storage.from(AVATAR_BUCKET)
        .upload(path, blob, { contentType: ext === "webp" ? "image/webp" : "image/jpeg" });
      if (error) {
        setState({ error: `사진을 올리지 못했습니다: ${error.message}` });
        return;
      }
      const result = await setMyMentorPhoto(path);
      setState(result);
      if (result.success) {
        setSaved(URL.createObjectURL(blob));
        setEditing(null);
      }
    } catch {
      setState({ error: "사진을 저장하지 못했습니다. 다시 해 보세요." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("사진을 지우고 기본 캐릭터로 바꿀까요?")) return;
    setBusy(true);
    const result = await setMyMentorPhoto(null);
    setBusy(false);
    setState(result);
    if (result.success) setSaved(null);
  }

  return (
    <section className="flex flex-col gap-3 rounded-md border p-4">
      <h2 className="text-lg font-semibold">프로필 사진</h2>
      {editing ? (
        <PhotoEditor
          src={editing.url}
          image={editing.image}
          busy={busy}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <MentorAvatar src={saved ?? characterSrc} name={name} size={96} />
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              JPG·PNG·WEBP 사진을 고르면 위치와 크기를 맞춘 뒤 저장합니다. 저장하면 바로 멘토 목록과 상세 화면에 보입니다.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
                {saved ? "사진 바꾸기" : "사진 올리기"}
              </Button>
              {saved && (
                <Button type="button" variant="outline" disabled={busy} onClick={remove}>
                  사진 지우기
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2 border-t pt-3">
        <h3 className="text-sm font-semibold">기본 캐릭터</h3>
        <p className="text-sm text-muted-foreground">
          사진이 없을 때 보이는 캐릭터입니다. 누르면 바로 바뀝니다. 사진을 올리면 사진이 먼저 보입니다.
        </p>
        <div role="radiogroup" aria-label="기본 캐릭터" className="flex flex-wrap gap-2">
          {MENTOR_CHARACTERS.map((item) => {
            const selected = item.id === character;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={item.name}
                title={item.name}
                disabled={busy}
                onClick={() => void pickCharacter(item.id)}
                className={`rounded-full p-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 ${
                  selected ? "ring-2 ring-brand ring-offset-2" : "opacity-80 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- 작은 정적 그림, 최적화 불필요 */}
                <img src={item.src} alt="" width={48} height={48} className="size-12 rounded-full" />
              </button>
            );
          })}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_SOURCE_TYPES.join(",")}
        className="sr-only"
        aria-label="프로필 사진 파일"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void choose(file);
        }}
      />
      {state.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-green-700 dark:text-green-400">{state.success}</p>}
    </section>
  );
}
