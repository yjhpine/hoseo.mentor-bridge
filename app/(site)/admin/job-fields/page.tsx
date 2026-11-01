"use client";

import { useList, type HttpError } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSave } from "@/features/admin/components/use-save";
import type { Tables } from "@/types/database.types";

type JobField = Tables<"job_fields">;

// 직무 분야 관리. 멘토 가입과 멘토 찾기 필터의 선택 목록입니다.
// 멘토가 쓰고 있는 직무 분야는 지울 수 없어(외래 키) 이름만 바꿉니다.
export default function AdminJobFieldsPage() {
  const list = useList<JobField, HttpError>({
    resource: "job_fields",
    pagination: { mode: "off" },
    sorters: [{ field: "position", order: "asc" }, { field: "name", order: "asc" }],
  });
  const save = useSave(() => list.query.refetch());
  const fields = list.result.data;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">직무 분야</h1>
      <p className="text-sm text-muted-foreground">
        멘토가 가입할 때 고르고, 멘토 찾기에서 거르는 목록입니다. 순서는 작은 수가 앞에 옵니다.
      </p>

      <form
        className="flex flex-col gap-2 rounded-md border p-4 sm:flex-row"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const name = String(new FormData(form).get("name")).trim();
          const last = fields.at(-1)?.position ?? 0;
          if (await save.create("job_fields", { name, position: last + 10 })) form.reset();
        }}
      >
        <Input name="name" placeholder="새 직무 분야" maxLength={50} required />
        <Button type="submit" disabled={save.pending}>추가</Button>
      </form>
      {save.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{save.error}</p>}

      <ul className="divide-y rounded-md border">
        {fields.map((field) => (
          <li key={field.id} className="p-3">
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                save.update("job_fields", field.id, {
                  name: String(data.get("name")).trim(),
                  position: Number(data.get("position")) || 0,
                });
              }}
            >
              <Input name="position" type="number" defaultValue={field.position} className="w-20" aria-label="순서" />
              <Input name="name" defaultValue={field.name} maxLength={50} required aria-label="직무 분야 이름" />
              <Button type="submit" size="sm" variant="outline" disabled={save.pending}>저장</Button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
