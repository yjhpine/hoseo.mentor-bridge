import type { Metadata } from "next";
import { Suspense } from "react";
import { listMyEnrollments } from "@/features/courses/api/courses";
import { CourseList } from "@/features/courses/components/course-list";
import { listPendingSurveys } from "@/features/surveys/api/surveys";
import { SurveyForm } from "@/features/surveys/components/survey-form";
import { formatTime } from "@/lib/chat/answer-length";
import { displayName, requireRole } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "마이페이지" };

// 마이페이지 (4.1 /mypage, 멘티): 수강 중인 강의, 학기 말 만족도 조사 (6.5 4번)
export default function Page() {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-muted-foreground">불러오는 중…</p>}>
      <MyPage />
    </Suspense>
  );
}

async function MyPage() {
  const me = await requireRole("mentee");
  const [courses, surveys] = await Promise.all([listMyEnrollments(me.id), listPendingSurveys()]);
  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-2xl font-semibold">{displayName(me)}님의 마이페이지</h1>
      {surveys.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">만족도 조사</h2>
          <p className="text-sm text-muted-foreground">
            지난 학기에 질문한 멘토를 평가해 주세요. 응답은 관리자만 보며, 멘토에게 이름이 알려지지 않습니다.
          </p>
          <ul className="flex flex-col gap-3">
            {surveys.map((survey) => (
              <li key={`${survey.semester_id}-${survey.mentor_id}`} className="flex flex-col gap-2 rounded-md border p-4">
                <p className="font-medium">
                  {survey.mentor_name} <span className="text-sm font-normal text-muted-foreground">{survey.company}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {survey.semester_name} 학기 · {formatTime(survey.survey_closes_at)}까지
                </p>
                <SurveyForm semesterId={survey.semester_id} mentorId={survey.mentor_id} mentorName={survey.mentor_name} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">수강 중인 강의</h2>
        <CourseList courses={courses} empty="아직 수강 신청한 강의가 없습니다. 홈의 '모집 중인 강의'나 멘토 상세에서 신청하세요." />
      </section>
    </div>
  );
}
