import { MainLayout } from '@/components/layout/MainLayout'
import { CourseCard } from '@/components/course/CourseCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { getCourses } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function CoursesPage() {
  const courses = await getCourses({ limit: 100 })
  return (
    <MainLayout headerProps={{ title: 'Cursos' }}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {courses.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {courses.map((course, index) => (
              <CourseCard key={course.id} course={course} index={index} />
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhum curso disponível" href="/" linkLabel="Voltar ao início" />
        )}
      </div>
    </MainLayout>
  )
}
