import { Suspense } from "react";
import { Lesson } from "@/components/Lesson";

export default function LessonPage() {
  return (
    <Suspense fallback={<div className="lang-ja h-dvh bg-bg" />}>
      <Lesson />
    </Suspense>
  );
}
