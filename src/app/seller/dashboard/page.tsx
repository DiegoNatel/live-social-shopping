'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/MainLayout'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Badge, LiveBadge } from '@/components/ui/Badge'
import { CreateAuctionModal, type AuctionFormData } from '@/components/auction/CreateAuctionModal'
import { mockProducts, mockUsers, mockStreams, mockAuctions } from '@/data/mock-data'
import { formatCurrency, formatNumber, formatViewerCount } from '@/lib/utils'
import {
  Radio,
  TrendingUp,
  Users,
  ShoppingBag,
  DollarSign,
  Eye,
  Package,
  Calendar,
  Settings,
  Plus,
  MoreVertical,
  ChevronRight,
  BarChart2,
  ArrowUp,
  ArrowDown,
  Play,
  Clock,
  Star,
  Gavel,
} from 'lucide-react'

export default function SellerDashboardPage() {
  const seller = mockUsers[0] // Ana Carolina
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'streams' | 'auctions' | 'analytics'>('overview')
  const [showAuctionModal, setShowAuctionModal] = useState(false)

  const stats = {
    revenue: 45678.90,
    revenueChange: 12.5,
    orders: 234,
    ordersChange: 8.3,
    viewers: 15600,
    viewersChange: -2.1,
    conversion: 8.7,
    conversionChange: 0.5,
  }

  const recentOrders = [
    { id: 'ORD-001', product: mockProducts[0], status: 'processing', date: '2 min atrás', total: 159.90 },
    { id: 'ORD-002', product: mockProducts[2], status: 'shipped', date: '15 min atrás', total: 189.90 },
    { id: 'ORD-003', product: mockProducts[6], status: 'delivered', date: '1 hora atrás', total: 89.90 },
  ]

  return (
    <MainLayout
      showNav={false}
      headerProps={{
        title: 'Painel do Vendedor',
        showSearch: false,
        showCart: false,
      }}
    >
      <div className="px-4 py-4 pb-24">
        {/* Seller Info */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Avatar src={seller.avatar} alt={seller.name} size="lg" isVerified />
            <div>
              <h2 className="text-white font-semibold">{seller.name}</h2>
              <p className="text-white/60 text-sm">{formatViewerCount(seller.followers)} seguidores</p>
            </div>
          </div>
          <Button
            size="sm"
            leftIcon={<Radio className="w-4 h-4" />}
            className="bg-coral-pink hover:bg-coral-pink-600"
          >
            Iniciar Live
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            title="Receita"
            value={formatCurrency(stats.revenue)}
            change={stats.revenueChange}
            icon={<DollarSign className="w-5 h-5" />}
            color="tropical-green"
          />
          <StatCard
            title="Pedidos"
            value={stats.orders.toString()}
            change={stats.ordersChange}
            icon={<ShoppingBag className="w-5 h-5" />}
            color="sky-blue"
          />
          <StatCard
            title="Visualizações"
            value={formatViewerCount(stats.viewers)}
            change={stats.viewersChange}
            icon={<Eye className="w-5 h-5" />}
            color="purple-glow"
          />
          <StatCard
            title="Conversão"
            value={`${stats.conversion}%`}
            change={stats.conversionChange}
            icon={<TrendingUp className="w-5 h-5" />}
            color="sunset-gold"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 -mx-4 px-4">
          {[
            { id: 'overview', label: 'Visão Geral', icon: <BarChart2 className="w-4 h-4" /> },
            { id: 'products', label: 'Produtos', icon: <Package className="w-4 h-4" /> },
            { id: 'streams', label: 'Lives', icon: <Radio className="w-4 h-4" /> },
            { id: 'auctions', label: 'Leilões', icon: <Gavel className="w-4 h-4" /> },
            { id: 'analytics', label: 'Análises', icon: <TrendingUp className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-tropical-green text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <>
            {/* Live Status */}
            <div className="rounded-xl bg-gradient-to-r from-coral-pink/20 to-purple-glow/20 p-4 mb-6 border border-coral-pink/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <LiveBadge />
                  <span className="text-white font-medium">Sua próxima live</span>
                </div>
                <Button variant="ghost" size="sm">Editar</Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                  <Image
                    src={mockStreams[0].thumbnail}
                    alt="Próxima live"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium line-clamp-1">{mockStreams[0].title}</h4>
                  <div className="flex items-center gap-2 text-white/60 text-sm mt-1">
                    <Clock className="w-4 h-4" />
                    <span>Hoje, 20:00</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <Package className="w-4 h-4" />
                    <span>{mockStreams[0].products.length} produtos</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">Pedidos Recentes</h3>
                <Link href="/seller/orders" className="text-tropical-green text-sm">
                  Ver todos
                </Link>
              </div>
              <div className="space-y-2">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                      <Image
                        src={order.product.images[0]}
                        alt={order.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {order.product.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <OrderStatusBadge status={order.status} />
                        <span className="text-white/40 text-xs">{order.date}</span>
                      </div>
                    </div>
                    <span className="text-tropical-green font-medium">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Products */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">Produtos Mais Vendidos</h3>
                <Link href="/seller/products" className="text-tropical-green text-sm">
                  Ver todos
                </Link>
              </div>
              <div className="space-y-2">
                {mockProducts.slice(0, 3).map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                  >
                    <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-sm font-medium">
                      {index + 1}
                    </span>
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-1 text-sunset-gold text-xs">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{product.rating}</span>
                        <span className="text-white/40">({product.reviews})</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-tropical-green font-medium text-sm">
                        {formatCurrency(product.price)}
                      </p>
                      <p className="text-white/40 text-xs">{product.stock} em estoque</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'products' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/60">{mockProducts.length} produtos</p>
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {mockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                >
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{product.name}</p>
                    <p className="text-tropical-green font-bold">{formatCurrency(product.price)}</p>
                    <p className="text-white/40 text-xs">{product.stock} em estoque</p>
                  </div>
                  <button className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'streams' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/60">Suas lives</p>
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                Agendar
              </Button>
            </div>
            <div className="space-y-3">
              {mockStreams.slice(0, 3).map((stream) => (
                <div
                  key={stream.id}
                  className="rounded-xl bg-white/5 overflow-hidden"
                >
                  <div className="relative aspect-video">
                    <Image
                      src={stream.thumbnail}
                      alt={stream.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    {stream.isLive && (
                      <LiveBadge className="absolute top-3 left-3" />
                    )}
                    <div className="absolute bottom-3 left-3 right-3">
                      <h4 className="text-white font-medium line-clamp-1">{stream.title}</h4>
                      <div className="flex items-center gap-4 text-white/60 text-sm mt-1">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {formatViewerCount(stream.viewerCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          {stream.products.length} produtos
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'auctions' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/60">{mockAuctions.length} leilões</p>
              <Button 
                size="sm" 
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setShowAuctionModal(true)}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
              >
                Criar Leilão
              </Button>
            </div>
            <div className="space-y-3">
              {mockAuctions.map((auction) => {
                const endTime = new Date(auction.endTime)
                const now = new Date()
                const timeLeft = endTime.getTime() - now.getTime()
                const isActive = auction.status === 'active'
                const isEnding = timeLeft < 5 * 60 * 1000 && isActive
                
                return (
                  <div
                    key={auction.id}
                    className={`rounded-xl bg-white/5 overflow-hidden ${isEnding ? 'ring-2 ring-red-400' : ''}`}
                  >
                    <div className="flex gap-4 p-4">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={auction.product.images[0]}
                          alt={auction.product.name}
                          fill
                          className="object-cover"
                        />
                        {isActive && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded">
                            ATIVO
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium line-clamp-1">{auction.product.name}</h4>
                        <div className="flex items-center gap-4 mt-1">
                          <div>
                            <p className="text-white/40 text-xs">Lance Inicial</p>
                            <p className="text-white/60 text-sm">{formatCurrency(auction.startingPrice)}</p>
                          </div>
                          <div>
                            <p className="text-orange-400 text-xs">Lance Atual</p>
                            <p className="text-orange-400 font-bold">{formatCurrency(auction.currentBid)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-white/60 text-xs mt-2">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {auction.bids.length} lances
                          </span>
                          <span className={`flex items-center gap-1 ${isEnding ? 'text-red-400' : ''}`}>
                            <Clock className="w-3 h-3" />
                            {isActive 
                              ? (timeLeft > 0 
                                ? `${Math.floor(timeLeft / 60000)}min restantes` 
                                : 'Encerrado')
                              : auction.status === 'upcoming' 
                                ? 'Agendado' 
                                : 'Encerrado'}
                          </span>
                        </div>
                      </div>
                      <button className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 self-start">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Quick Create Auction Card */}
            <motion.button
              onClick={() => setShowAuctionModal(true)}
              className="w-full mt-4 p-6 rounded-xl border-2 border-dashed border-orange-400/30 bg-orange-500/5 flex flex-col items-center justify-center gap-2 hover:bg-orange-500/10 transition-colors"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                <Gavel className="w-6 h-6 text-white" />
              </div>
              <span className="text-orange-400 font-medium">Criar Novo Leilão</span>
              <span className="text-white/40 text-sm text-center">
                Configure preço inicial, duração e comece a receber lances
              </span>
            </motion.button>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <BarChart2 className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">Análises detalhadas</h3>
            <p className="text-white/60 text-sm mb-4">
              Veja métricas detalhadas sobre suas vendas e engajamento
            </p>
            <Button variant="secondary">Em breve</Button>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <Link href="/seller/go-live">
        <motion.button
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-coral-pink text-white shadow-lg flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Play className="w-6 h-6" fill="currentColor" />
        </motion.button>
      </Link>

      {/* Create Auction Modal */}
      <CreateAuctionModal
        isOpen={showAuctionModal}
        onClose={() => setShowAuctionModal(false)}
        products={mockProducts}
        onCreateAuction={(data: AuctionFormData) => {
          console.log('Creating auction:', data)
          setShowAuctionModal(false)
        }}
      />
    </MainLayout>
  )
}

// Stat Card Component
interface StatCardProps {
  title: string
  value: string
  change: number
  icon: React.ReactNode
  color: string
}

function StatCard({ title, value, change, icon, color }: StatCardProps) {
  const isPositive = change >= 0

  return (
    <motion.div
      className="rounded-xl bg-white/5 p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-${color}`}>{icon}</span>
        <div className={`flex items-center gap-0.5 text-xs ${isPositive ? 'text-tropical-green' : 'text-coral-pink'}`}>
          {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
      <p className="text-white font-bold text-xl">{value}</p>
      <p className="text-white/40 text-xs">{title}</p>
    </motion.div>
  )
}

// Order Status Badge
function OrderStatusBadge({ status }: { status: string }) {
  const styles = {
    processing: 'bg-sunset-gold/20 text-sunset-gold',
    shipped: 'bg-sky-blue/20 text-sky-blue',
    delivered: 'bg-tropical-green/20 text-tropical-green',
  }

  const labels = {
    processing: 'Processando',
    shipped: 'Enviado',
    delivered: 'Entregue',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${styles[status as keyof typeof styles]}`}>
      {labels[status as keyof typeof labels]}
    </span>
  )
}

