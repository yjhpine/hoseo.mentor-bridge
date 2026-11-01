"use client";

import { useCreate, useUpdate, type BaseRecord, type HttpError } from "@refinedev/core";
import { useState } from "react";

// DB 제약에서 오는 메시지를 관리자가 알아볼 수 있게 바꿉니다.
function message(error: HttpError): string {
  const text = error.message ?? "";
  if (/duplicate key|unique/i.test(text)) return "같은 이름이 이미 있습니다.";
  if (/foreign key/i.test(text)) return "다른 곳에서 쓰고 있어 지울 수 없습니다.";
  if (/check constraint/i.test(text)) return "입력값이 규칙에 맞지 않습니다. 길이를 확인해 주세요.";
  return text || "저장하지 못했습니다.";
}

/** refine 생성·수정을 부르고 실패 메시지를 모아 줍니다. 성공하면 onDone을 부릅니다. */
export function useSave(onDone: () => void) {
  const { mutateAsync: create, mutation: createMutation } = useCreate<BaseRecord, HttpError>();
  const { mutateAsync: update, mutation: updateMutation } = useUpdate<BaseRecord, HttpError>();
  const [error, setError] = useState<string | null>(null);

  async function run(job: () => Promise<unknown>) {
    setError(null);
    try {
      await job();
      onDone();
      return true;
    } catch (e) {
      setError(message(e as HttpError));
      return false;
    }
  }

  return {
    error,
    pending: createMutation.isPending || updateMutation.isPending,
    create: (resource: string, values: BaseRecord) => run(() => create({ resource, values })),
    update: (resource: string, id: number | string, values: BaseRecord) =>
      run(() => update({ resource, id, values })),
  };
}
