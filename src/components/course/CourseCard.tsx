'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { formatCurrency, calculateDiscount, cn } from '@/lib/utils'
import type { Course } from '@/types'
import { Star, Clock, Users, BookOpen, Award, Play } from 'lucide-react'
import { useState } from 'react'

interface CourseCardProps {
  course: Course
  variant?: 'default' | 'compact' | 'horizontal'
  index?: number
}

export function CourseCard({ 
  course, 
  variant = 'default', 
  index = 0 
}: CourseCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const discount = course.originalPrice 
    ? calculateDiscount(course.originalPrice, course.price) 
    : 0

  const levelLabels = {
    beginner: 'Iniciante',
    intermediate: 'Intermediário',
    advanced: 'Avançado',
  }

  const levelColors = {
    beginner: 'bg-gray-100 text-gray-600',
    intermediate: 'bg-gray-100 text-gray-600',
    advanced: 'bg-gray-100 text-gray-600',
  }

  if (variant === 'compact') {
    return (
      <motion.div
        className="flex items-center gap-3 p-3 rounded-md bg-white shadow-card hover:shadow-card-hover cursor-pointer transition-shadow"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={course.thumbnail}
            alt={course.name}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-gray-900 text-sm font-medium line-clamp-1">{course.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-gray-900 font-semibold text-sm">
              {formatCurrency(course.price)}
            </span>
            {course.originalPrice && (
              <span className="text-gray-400 text-xs line-through">
                {formatCurrency(course.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  if (variant === 'horizontal') {
    return (
      <motion.div
        className="flex gap-4 p-4 rounded-md bg-white shadow-card hover:shadow-card-hover cursor-pointer transition-shadow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="relative w-40 aspect-video rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={course.thumbnail}
            alt={course.name}
            fill
            className="object-cover"
          />
          {discount > 0 && (
            <span className="absolute top-2 left-2 px-2 py-0.5 bg-tropical-green text-white text-xs font-semibold rounded">
              -{discount}%
            </span>
          )}
          <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {course.duration}
          </div>
        </div>
        <div className="flex-1 min-w-0 py-1">
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded', levelColors[course.level])}>
            {levelLabels[course.level]}
          </span>
          <h4 className="text-gray-900 font-semibold line-clamp-2 mt-2">{course.name}</h4>
          <p className="text-gray-500 text-sm mt-1">{course.instructor.name}</p>
          <div className="flex items-center gap-3 mt-2 text-sm">
            <div className="flex items-center gap-1 text-sky-blue">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-medium">{course.rating}</span>
              <span className="text-gray-400">({course.reviews})</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <Users className="w-4 h-4" />
              <span>{course.studentsCount.toLocaleString('pt-BR')}</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-gray-900 font-normal text-lg">
              {formatCurrency(course.price)}
            </span>
            {course.originalPrice && (
              <span className="text-gray-400 text-sm line-through">
                {formatCurrency(course.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  // Default card variant
  return (
    <motion.div
      className="relative bg-white rounded-md overflow-hidden shadow-card hover:shadow-card-hover cursor-pointer group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}

      whileTap={{ scale: 0.98 }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={course.thumbnail}
          alt={course.name}
          fill
          className="object-cover"
        />
        
        {/* Discount badge */}
        {discount > 0 && (
          <span className="absolute top-3 left-3 px-1.5 py-0.5 bg-tropical-green text-white text-xs font-semibold rounded">
            -{discount}%
          </span>
        )}

        {/* Course badge */}
        <span className="absolute top-3 right-3 px-1.5 py-0.5 bg-black/50 text-white text-xs font-medium rounded flex items-center gap-1">
          <BookOpen className="w-3 h-3" />
          Curso
        </span>

        {/* Duration overlay */}
        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs rounded-lg flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {course.duration}
        </div>

        {/* Play button overlay */}
        <motion.div 
          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          initial={false}
          animate={{ opacity: isHovered ? 1 : 0 }}
        >
          <motion.div 
            className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg"
            initial={{ scale: 0.8 }}
            animate={{ scale: isHovered ? 1 : 0.8 }}
          >
            <Play className="w-7 h-7 text-primary fill-primary ml-1" />
          </motion.div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Level badge */}
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded inline-block', levelColors[course.level])}>
          {levelLabels[course.level]}
        </span>

        <h4 className="text-gray-900 font-semibold text-sm line-clamp-2 mt-2 min-h-[40px]">
          {course.name}
        </h4>
        
        {/* Instructor */}
        <p className="text-gray-500 text-xs mt-1">
          por {course.instructor.name}
        </p>
        
        {/* Stats */}
        <div className="flex items-center gap-3 mt-3 text-xs">
          <div className="flex items-center gap-1 text-sky-blue">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span className="font-medium">{course.rating}</span>
          </div>
          <span className="text-gray-300">•</span>
          <div className="flex items-center gap-1 text-gray-500">
            <Users className="w-3.5 h-3.5" />
            <span>{course.studentsCount.toLocaleString('pt-BR')}</span>
          </div>
          <span className="text-gray-300">•</span>
          <div className="flex items-center gap-1 text-gray-500">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{course.lessonsCount} aulas</span>
          </div>
        </div>
        
        {/* Price */}
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-gray-900 font-normal text-lg">
            {formatCurrency(course.price)}
          </span>
          {course.originalPrice && (
            <span className="text-gray-400 text-sm line-through">
              {formatCurrency(course.originalPrice)}
            </span>
          )}
        </div>
        
        {/* Certificate badge */}
        {course.certificateIncluded && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-tropical-green">
            <Award className="w-4 h-4" />
            <span className="font-medium">Certificado incluso</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

