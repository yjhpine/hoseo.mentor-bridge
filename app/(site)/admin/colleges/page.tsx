"use client";

import { useList, type HttpError } from "@refinedev/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSave } from "@/features/admin/components/use-save";
import type { Tables } from "@/types/database.types";

type College = Tables<"colleges">;
type Department = Tables<"departments">;

const textareaClassName =
  "flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

// 단과대학 구역과 소속 학과 관리 (4.1 /admin/colleges).
// 학과는 로그인 키에 쓰이므로 지우지 않고 숨깁니다 (5.2).
export default function AdminCollegesPage() {
  const colleges = useList<College, HttpError>({
    resource: "colleges",
    pagination: { mode: "off" },
    sorters: [{ field: "position", order: "asc" }, { field: "name", order: "asc" }],
  });
  const departments = useList<Department, HttpError>({
    resource: "departments",
    pagination: { mode: "off" },
    sorters: [{ field: "position", order: "asc" }, { field: "name", order: "asc" }],
  });
  const refetch = () => {
    colleges.query.refetch();
    departments.query.refetch();
  };
  const save = useSave(refetch);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">구역·학과</h1>
      <p className="text-sm text-muted-foreground">
        단과대학 구역은 멘토 배치와 탐색에, 학과는 멘티 가입·로그인의 소속에 쓰입니다. 숨긴 학과는 새로 가입할 수 없지만 이미 가입한 멘티는 그대로 로그인합니다.
      </p>

      <form
        className="flex flex-col gap-2 rounded-md border p-4 sm:flex-row"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const name = String(new FormData(form).get("name")).trim();
          const last = colleges.result.data.at(-1)?.position ?? 0;
          if (await save.create("colleges", { name, position: last + 10 })) form.reset();
        }}
      >
        <Input name="name" placeholder="새 단과대학 구역 이름" maxLength={50} required />
        <Button type="submit" disabled={save.pending}>구역 추가</Button>
      </form>
      {save.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{save.error}</p>}

      {colleges.query.isLoading ? (
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {colleges.result.data.map((college) => (
            <CollegeItem
              key={college.id}
              college={college}
              departments={departments.result.data.filter((d) => d.college_id === college.id)}
              save={save}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CollegeItem({
  college,
  departments,
  save,
}: {
  college: College;
  departments: Department[];
  save: ReturnType<typeof useSave>;
}) {
  const active = departments.filter((d) => d.is_active).length;

  return (
    <li className="flex flex-col gap-3 rounded-md border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{college.name}</h2>
        {!college.is_active && <Badge variant="secondary">숨김</Badge>}
        <span className="text-sm text-muted-foreground">학과 {active}개{departments.length > active && ` (숨김 ${departments.length - active})`}</span>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          disabled={save.pending}
          onClick={() => save.update("colleges", college.id, { is_active: !college.is_active })}
        >
          {college.is_active ? "구역 숨기기" : "다시 보이기"}
        </Button>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">이름·소개·순서 고치기</summary>
        <form
          className="mt-2 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            save.update("colleges", college.id, {
              name: String(data.get("name")).trim(),
              description: String(data.get("description")).trim() || null,
              position: Number(data.get("position")) || 0,
            });
          }}
        >
          <Input name="name" defaultValue={college.name} maxLength={50} required aria-label="구역 이름" />
          <textarea
            name="description"
            defaultValue={college.description ?? ""}
            placeholder="구역 소개 (홈과 구역 화면에 보입니다)"
            className={textareaClassName}
          />
          <div className="flex items-center gap-2">
            <Input name="position" type="number" defaultValue={college.position} className="w-24" aria-label="정렬 순서" />
            <span className="text-muted-foreground">작은 수가 앞에 옵니다.</span>
            <Button type="submit" size="sm" variant="outline" className="ml-auto" disabled={save.pending}>저장</Button>
          </div>
        </form>
      </details>

      <ul className="flex flex-wrap gap-2">
        {departments.map((department) => (
          <li key={department.id}>
            <details className="rounded-md border px-2 py-1 text-sm">
              <summary className={department.is_active ? "cursor-pointer" : "cursor-pointer text-muted-foreground line-through"}>
                {department.name}
              </summary>
              <form
                className="mt-2 flex flex-col gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = String(new FormData(event.currentTarget).get("name")).trim();
                  save.update("departments", department.id, { name });
                }}
              >
                <Input name="name" defaultValue={department.name} maxLength={50} required aria-label="학과 이름" />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" variant="outline" disabled={save.pending}>이름 저장</Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={save.pending}
                    onClick={() => save.update("departments", department.id, { is_active: !department.is_active })}
                  >
                    {department.is_active ? "숨기기" : "다시 보이기"}
                  </Button>
                </div>
              </form>
            </details>
          </li>
        ))}
      </ul>

      <form
        className="flex gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const name = String(new FormData(form).get("name")).trim();
          const last = departments.at(-1)?.position ?? 0;
          if (await save.create("departments", { college_id: college.id, name, position: last + 10 })) form.reset();
        }}
      >
        <Input name="name" placeholder="새 학과 이름" maxLength={50} required aria-label={`${college.name} 새 학과`} />
        <Button type="submit" size="sm" variant="outline" disabled={save.pending}>학과 추가</Button>
      </form>
    </li>
  );
}
