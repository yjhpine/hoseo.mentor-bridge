import { createClient } from "@/lib/supabase/server";

export type CollegeOption = {
  id: number;
  name: string;
  departments: { id: number; name: string }[];
};

export type JobFieldOption = { id: number; name: string };

/** 가입·로그인 화면의 소속 목록: 쓰고 있는 단과대학과 그 아래 쓰고 있는 학과. */
export async function getCollegeOptions(): Promise<CollegeOption[]> {
  const supabase = await createClient();
  const [colleges, departments] = await Promise.all([
    supabase
      .from("colleges")
      .select("id, name")
      .eq("is_active", true)
      .order("position")
      .order("name"),
    supabase
      .from("departments")
      .select("id, name, college_id")
      .eq("is_active", true)
      .order("position")
      .order("name"),
  ]);

  return (colleges.data ?? [])
    .map((college) => ({
      id: college.id,
      name: college.name,
      departments: (departments.data ?? [])
        .filter((department) => department.college_id === college.id)
        .map(({ id, name }) => ({ id, name })),
    }))
    .filter((college) => college.departments.length > 0);
}

export async function getJobFieldOptions(): Promise<JobFieldOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_fields")
    .select("id, name")
    .order("position")
    .order("name");
  return data ?? [];
}
