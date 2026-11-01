"use client";

import { useList, useUpdate, type HttpError } from "@refinedev/core";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/native-select";
import type { Enums, Tables } from "@/types/database.types";

// 뷰의 열은 모두 nullable로 생성되지만 id는 늘 있습니다.
type Mentor = Omit<Tables<"mentor_directory">, "id"> & { id: string };
type Status = Enums<"mentor_status">;

const TABS: { status: Status; label: string }[] = [
  { status: "pending", label: "개설 대기" },
  { status: "published", label: "공개" },
  { status: "hidden", label: "비공개" },
];

// 멘토 개설 (docs/architecture.md 3.2, 6.2): 구역에 배치해 공개, 비공개, 다시 공개, 보류.
export default function AdminMentorsPage() {
  const [tab, setTab] = useState<Status>("pending");
  const mentors = useList<Mentor, HttpError>({
    resource: "mentor_directory",
    pagination: { mode: "off" },
    sorters: [{ field: "name", order: "asc" }],
  });
  const colleges = useList<Tables<"colleges">, HttpError>({
    resource: "colleges",
    pagination: { mode: "off" },
    sorters: [{ field: "position", order: "asc" }],
  });
  const jobFields = useList<Tables<"job_fields">, HttpError>({
    resource: "job_fields",
    pagination: { mode: "off" },
    sorters: [{ field: "position", order: "asc" }],
  });

  const all = mentors.result.data;
  const shown = all.filter((mentor) => mentor.status === tab);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">멘토 개설</h1>
      <p className="text-sm text-muted-foreground">
        가입한 멘토를 단과대학 구역에 배치하고 개설하면 멘티에게 공개됩니다. 공개하려면 구역이 꼭 있어야 합니다.
      </p>
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <Button
            key={item.status}
            size="sm"
            variant={tab === item.status ? "default" : "outline"}
            onClick={() => setTab(item.status)}
          >
            {item.label} {all.filter((mentor) => mentor.status === item.status).length}
          </Button>
        ))}
      </div>

      {mentors.query.isLoading ? (
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      ) : shown.length === 0 ? (
        <p className="rounded-lg border p-8 text-center text-muted-foreground">해당하는 멘토가 없습니다.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {shown.map((mentor) => (
            <MentorRow
              key={mentor.id}
              mentor={mentor}
              colleges={colleges.result.data.filter((college) => college.is_active)}
              jobFields={jobFields.result.data}
              onChanged={() => mentors.query.refetch()}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function MentorRow({
  mentor,
  colleges,
  jobFields,
  onChanged,
}: {
  mentor: Mentor;
  colleges: Tables<"colleges">[];
  jobFields: Tables<"job_fields">[];
  onChanged: () => void;
}) {
  const [collegeId, setCollegeId] = useState(mentor.college_id ? String(mentor.college_id) : "");
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync, mutation } = useUpdate<Tables<"mentor_profiles">, HttpError>();
  const isPending = mutation.isPending;

  async function save(values: Partial<Tables<"mentor_profiles">>) {
    setError(null);
    try {
      await mutateAsync({ resource: "mentor_profiles", id: mentor.id, values });
      onChanged();
    } catch (e) {
      setError((e as HttpError).message ?? "저장하지 못했습니다.");
    }
  }

  function publish() {
    if (!collegeId) {
      setError("공개하려면 단과대학 구역을 골라야 합니다.");
      return;
    }
    save({ status: "published", college_id: Number(collegeId) });
  }

  const name = (mentor.name ?? "") + (mentor.name_tag ?? "");
  const collegeChanged = String(mentor.college_id ?? "") !== collegeId;

  return (
    <li className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/mentors/${mentor.id}`} className="font-medium underline-offset-4 hover:underline">
          {name}
        </Link>
        <span className="text-sm text-muted-foreground">
          {mentor.company} · {mentor.job_field_name}
        </span>
        {mentor.college_name && <Badge variant="outline">{mentor.college_name}</Badge>}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          value={collegeId}
          onChange={(e) => setCollegeId(e.target.value)}
          className="sm:w-56"
          aria-label={`${name} 단과대학 구역`}
        >
          <option value="">구역 선택</option>
          {colleges.map((college) => (
            <option key={college.id} value={college.id}>
              {college.name}
            </option>
          ))}
        </Select>
        <div className="flex flex-wrap gap-2">
          {mentor.status === "pending" && (
            <>
              <Button size="sm" onClick={publish} disabled={isPending}>개설</Button>
              <Button size="sm" variant="outline" onClick={() => save({ status: "hidden" })} disabled={isPending}>
                보류
              </Button>
            </>
          )}
          {mentor.status === "published" && (
            <>
              <Button
                size="sm"
                onClick={() => save({ college_id: Number(collegeId) })}
                disabled={isPending || !collegeId || !collegeChanged}
              >
                구역 변경
              </Button>
              <Button size="sm" variant="outline" onClick={() => save({ status: "hidden" })} disabled={isPending}>
                비공개
              </Button>
            </>
          )}
          {mentor.status === "hidden" && (
            <Button size="sm" onClick={publish} disabled={isPending}>다시 공개</Button>
          )}
        </div>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">기업명·직무 분야 고치기</summary>
        <MentorInfoForm mentor={mentor} jobFields={jobFields} disabled={isPending} onSave={save} />
      </details>

      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </li>
  );
}

function MentorInfoForm({
  mentor,
  jobFields,
  disabled,
  onSave,
}: {
  mentor: Mentor;
  jobFields: Tables<"job_fields">[];
  disabled: boolean;
  onSave: (values: Partial<Tables<"mentor_profiles">>) => void;
}) {
  return (
    <form
      className="mt-2 flex flex-col gap-2 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSave({
          company: String(data.get("company")).trim(),
          job_field_id: Number(data.get("jobFieldId")),
        });
      }}
    >
      <Input name="company" defaultValue={mentor.company ?? ""} maxLength={100} required aria-label="기업명" />
      <Select name="jobFieldId" defaultValue={String(mentor.job_field_id ?? "")} aria-label="직무 분야" className="sm:w-56">
        {jobFields.map((field) => (
          <option key={field.id} value={field.id}>
            {field.name}
          </option>
        ))}
      </Select>
      <Button type="submit" size="sm" variant="outline" disabled={disabled}>저장</Button>
    </form>
  );
}
