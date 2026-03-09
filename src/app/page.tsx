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
import { ChevronRight, Flame, Clock, Sparkles, TrendingUp, GraduationCap } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const liveStreams = mockStreams.filter(s => s.isLive)
  const upcomingStreams = mockStreams.filter(s => !s.isLive)
  const trendingProducts = mockProducts.slice(0, 4)
  const flashDeals = mockProducts.filter(p => p.originalPrice).slice(0, 4)
  const featuredCourses = mockCourses.slice(0, 4)

  return (
    <MainLayout>
      <div className="pb-8 bg-gray-50">
        {/* Hero Carousel */}
        <section className="px-4 pt-4">
          <HeroCarousel streams={liveStreams} />
        </section>

        {/* Categories */}
        <section className="mt-6 px-4">
          <CategoryPills />
        </section>

        {/* Live Now Section */}
        <section className="mt-8">
          <SectionHeader
            title="Ao Vivo Agora"
            icon={<Flame className="w-5 h-5 text-coral-pink" />}
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
            icon={<Sparkles className="w-5 h-5 text-primary" />}
            href="/deals"
            badge="🔥 Até 60% OFF"
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
            icon={<GraduationCap className="w-5 h-5 text-purple-glow" />}
            href="/courses"
            badge="🎓 Certificado"
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
            icon={<Clock className="w-5 h-5 text-sky-blue" />}
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
            icon={<TrendingUp className="w-5 h-5 text-tropical-green" />}
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
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary-400 to-sunset-gold p-6 md:p-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative z-10">
              <h3 className="text-white font-display font-bold text-xl md:text-2xl mb-2">
                Quer vender ao vivo?
              </h3>
              <p className="text-white/80 text-sm md:text-base mb-4">
                Cadastre-se e comece a vender para milhares de pessoas!
              </p>
              <Link
                href="/seller/register"
                className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors"
              >
                Começar agora
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
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
        <h2 className="text-gray-900 font-semibold text-lg">{title}</h2>
        {count !== undefined && (
          <span className="px-2 py-0.5 rounded-full bg-coral-pink/10 text-coral-pink text-xs font-medium">
            {count}
          </span>
        )}
        {badge && (
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            {badge}
          </span>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-primary text-sm font-medium hover:underline"
        >
          Ver tudo
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  )
}

