'use client'

import { motion } from 'framer-motion'
import { MainLayout } from '@/components/layout/MainLayout'
import { HeroCarousel } from '@/components/stream/HeroCarousel'
import { CategoryPills } from '@/components/stream/CategoryPills'
import { StreamCard } from '@/components/stream/StreamCard'
import { ProductCard } from '@/components/product/ProductCard'
import { CourseCard } from '@/components/course/CourseCard'
import { ProductModal } from '@/components/product/ProductModal'
import { mockStreams, mockProducts, mockCourses } from '@/data/mock-data'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const liveStreams = mockStreams.filter(s => s.isLive)
  const upcomingStreams = mockStreams.filter(s => !s.isLive)
  const trendingProducts = mockProducts.slice(0, 4)
  const flashDeals = mockProducts.filter(p => p.originalPrice).slice(0, 4)
  const featuredCourses = mockCourses.slice(0, 4)

  return (
    <MainLayout>
      <div className="pb-8 max-w-6xl mx-auto">
        {/* Hero Carousel */}
        <section className="px-4 pt-4">
          <HeroCarousel streams={liveStreams} />
        </section>

        {/* Categories */}
        <section className="mt-4 px-4">
          <CategoryPills />
        </section>

        {/* Live Now Section */}
        <section className="mt-8">
          <SectionHeader
            title="Ao Vivo Agora"
            href="/discover"
            count={liveStreams.length}
          />
          <div className="mt-4 flex gap-4 overflow-x-auto no-scrollbar px-4 pb-2">
            {liveStreams.map((stream, index) => (
              <div key={stream.id} className="flex-shrink-0 w-40 md:w-48">
                <StreamCard stream={stream} index={index} />
              </div>
            ))}
          </div>
        </section>

        {/* Flash Deals */}
        <section className="mt-8">
          <SectionHeader
            title="Ofertas Relâmpago"
            href="/deals"
            badge="Até 60% OFF"
          />
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 px-4">
            {flashDeals.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </section>

        {/* Featured Courses - NEW SECTION */}
        <section className="mt-8">
          <SectionHeader
            title="Cursos em Destaque"
            href="/courses"
          />
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 px-4">
            {featuredCourses.map((course, index) => (
              <CourseCard key={course.id} course={course} index={index} />
            ))}
          </div>
        </section>

        {/* Upcoming Streams */}
        <section className="mt-8">
          <SectionHeader
            title="Em Breve"
            href="/schedule"
          />
          <div className="mt-4 px-4 space-y-2">
            {upcomingStreams.map((stream, index) => (
              <StreamCard key={stream.id} stream={stream} variant="horizontal" index={index} />
            ))}
          </div>
        </section>

        {/* Trending Products */}
        <section className="mt-8">
          <SectionHeader
            title="Em Alta"
            href="/trending"
          />
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 px-4">
            {trendingProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="mt-10 mx-4">
          <motion.div
            className="relative overflow-hidden rounded-md bg-white shadow-card p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative z-10">
              <h3 className="text-gray-900 font-semibold text-lg md:text-xl mb-1">
                Quer vender ao vivo?
              </h3>
              <p className="text-gray-500 text-sm">
                Cadastre-se e comece a vender para milhares de pessoas!
              </p>
              </div>
            <Link
              href="/seller/register"
              className="relative z-10 inline-flex items-center gap-1 bg-primary text-white font-semibold text-sm px-5 py-2.5 rounded-md hover:bg-primary-600 transition-colors self-start md:self-auto"
            >
              Começar agora
              <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </section>
      </div>

      {/* Product Modal */}
      <ProductModal />
    </MainLayout>
  )
}

// Section Header Component
interface SectionHeaderProps {
  title: string
  icon?: React.ReactNode
  href?: string
  count?: number
  badge?: string
}

function SectionHeader({ title, icon, href, count, badge }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-gray-900 font-normal text-xl">{title}</h2>
        {count !== undefined && (
          <span className="text-gray-400 text-sm">
            {count}
          </span>
        )}
        {badge && (
          <span className="text-tropical-green text-sm">
            {badge}
          </span>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-sky-blue text-sm hover:underline"
        >
          Ver tudo
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  )
}

