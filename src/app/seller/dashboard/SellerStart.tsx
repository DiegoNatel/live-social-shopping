'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera, Check, Loader2, Radio } from 'lucide-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { loadSession } from '@/components/auth/SessionSync'
import { Button } from '@/components/ui/Button'
import { inputClass } from '@/components/seller/FormField'
import { uploadImage } from '@/components/seller/ImageUpload'
import { cn } from '@/lib/utils'
import { parseBrlAmount, INVALID_PRICE_MESSAGE } from '@/lib/money'
import { PACKAGE_PRESETS, type PackagePresetId } from '@/lib/package-presets'
import type { Category } from '@/types'
import { setupComplete, type SetupState } from './SetupChecklist'
import { SetupGate } from './SetupGate'

interface SellerStartProps {
  categories: Category[]
  sellerName: string
  // Their first time: the account becomes a seller's as soon as they start
  isSeller: boolean
  shipFromZip: string | null
  // Online payments are on and there's no Asaas wallet yet
  needsWallet: boolean
}

// A seller's first minute: one screen for the first product, then straight to a live.
// The package size is asked here (one tap), because freight is quoted from it from the first sale.
// Everything else (variations, how they get paid) waits for the dashboard.
export function SellerStart({ categories, sellerName, isSeller, shipFromZip, needsWallet }: SellerStartProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const activated = useRef(isSeller)
  const [image, setImage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('1')
  const [category, setCategory] = useState(categories[0]?.slug ?? '')
  const [zip, setZip] = useState(shipFromZip ?? '')
  // Package for freight quotes: a ready-made size, or 'custom' with the seller's own numbers
  const [packageSize, setPackageSize] = useState<PackagePresetId | 'custom' | null>(null)
  const [custom, setCustom] = useState({ weightG: '', heightCm: '', widthCm: '', lengthCm: '' })
  const setMeasure = (key: keyof typeof custom) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCustom(c => ({ ...c, [key]: e.target.value.replace(/\D/g, '') }))
  const [saving, setSaving] = useState(false)
  const [startingLive, setStartingLive] = useState(false)
  const [error, setError] = useState('')
  const [productId, setProductId] = useState<string | null>(null)
  const [zipSaved, setZipSaved] = useState(!!shipFromZip)
  const [gateOpen, setGateOpen] = useState(false)
  // Buyers can only buy once the shop is set up (see SetupChecklist)
  const setup: SetupState = { wallet: needsWallet ? false : null, zip: zipSaved }
  const canSell = setupComplete(setup)

  const activate = async () => {
    if (activated.current) return true
    const res = await fetch('/api/me/seller', { method: 'POST' })
    activated.current = res.ok
    if (res.ok) await loadSession()
    return res.ok
  }

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      if (!(await activate())) throw new Error('Não foi possível continuar. Tente novamente.')
      setImage(await uploadImage(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar a foto')
    }
    setUploading(false)
  }

  const publish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!image) return setError('Adicione uma foto do produto.')
    const amount = parseBrlAmount(price)
    if (amount === null || amount <= 0) return setError(INVALID_PRICE_MESSAGE)
    const cep = zip.replace(/\D/g, '')
    if (cep && cep.length !== 8) return setError('Confira o CEP ou deixe em branco por enquanto.')
    if (!packageSize) return setError('Escolha o tamanho do pacote, para o frete sair certo.')
    if (packageSize === 'custom' && Object.values(custom).some(v => !v)) {
      return setError('Informe o peso e as três medidas do pacote.')
    }
    const pkg = packageSize === 'custom' ? custom : PACKAGE_PRESETS.find(p => p.id === packageSize)!.package
    setSaving(true)
    setError('')
    const res = await fetch('/api/seller/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price: amount, stock, category, images: [image], package: pkg }),
    })
    const data = (await res.json().catch(() => null)) as { id?: string; message?: string } | null
    if (!res.ok || !data?.id) {
      setSaving(false)
      return setError(data?.message ?? 'Não foi possível publicar. Tente novamente.')
    }
    if (cep) {
      const saved = await fetch('/api/seller/shipping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromZip: cep }),
      })
      if (saved.ok) setZipSaved(true)
    }
    setSaving(false)
    setProductId(data.id)
  }

  // Going live is fine before the shop is set up, but the seller is told buyers can't buy yet
  const goLive = () => (canSell ? goLiveNow() : setGateOpen(true))

  const goLiveNow = async () => {
    setGateOpen(false)
    setStartingLive(true)
    setError('')
    const created = await fetch('/api/seller/streams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Ao vivo com ${sellerName}`,
        category,
        scheduledAt: new Date(Date.now() + 60_000).toISOString(),
        thumbnail: image,
        productIds: [productId],
      }),
    })
    const stream = (await created.json().catch(() => null)) as { id?: string } | null
    const started = stream?.id
      ? await fetch(`/api/seller/streams/${stream.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'live' }),
        })
      : null
    if (!stream?.id || !started?.ok) {
      setStartingLive(false)
      return setError('Não foi possível iniciar a live. Tente pelo painel.')
    }
    router.push(`/live/${stream.id}`)
  }

  if (productId) {
    return (
      <MainLayout headerProps={{ title: 'Vender ao vivo' }}>
        <div className="max-w-md mx-auto px-4 py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-green-50 text-tropical-green-700 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6" />
          </div>
          <h1 className="text-gray-900 font-semibold text-xl mb-1">Produto publicado!</h1>
          <p className="text-gray-500 text-sm mb-6">Agora é só abrir a câmera e mostrar para os compradores.</p>
          {!canSell && (
            <div className="text-left rounded-md bg-white shadow-card border-l-4 border-sunset-gold p-4 mb-6">
              <p className="text-gray-900 font-medium">Antes da primeira venda</p>
              <p className="text-gray-500 text-sm mt-1">
                Seu produto já aparece na loja, mas os compradores só conseguem comprar depois que você cadastrar{' '}
                {[setup.wallet === false && 'onde receber suas vendas', !setup.zip && 'o CEP de onde envia'].filter(Boolean).join(' e ')}.
              </p>
              <Link
                href={`/seller/settings?focus=${setup.wallet === false ? 'wallet' : 'zip'}`}
                className="inline-flex items-center gap-0.5 mt-2 text-sm font-semibold text-primary hover:underline"
              >
                Resolver agora
              </Link>
            </div>
          )}
          <Button fullWidth size="lg" isLoading={startingLive} onClick={goLive}>
            <Radio className="w-5 h-5 mr-2" />
            Entrar ao vivo agora
          </Button>
          {error && <p className="text-coral-pink text-sm mt-3">{error}</p>}
          {gateOpen && (
            <SetupGate
              setup={setup}
              title="Seus compradores ainda não podem comprar"
              text="Você pode entrar ao vivo, mas ninguém vai conseguir comprar seus produtos até você completar:"
              onClose={() => setGateOpen(false)}
              onContinue={goLiveNow}
              continueLabel="Entrar ao vivo mesmo assim"
            />
          )}
          <div className="flex flex-col gap-3 mt-5 text-sm">
            <Link href="/seller/streams/new" className="text-sky-blue font-medium hover:underline">
              Agendar para depois
            </Link>
            <Link href="/seller/products/new" className="text-sky-blue font-medium hover:underline">
              Adicionar outro produto
            </Link>
            <Link href="/seller/dashboard" className="text-gray-500 hover:underline">
              Ir para o painel
            </Link>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout headerProps={{ title: 'Vender ao vivo' }}>
      <form onSubmit={publish} className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-gray-900 font-semibold text-xl mb-1">Seu primeiro produto</h1>
        <p className="text-gray-500 text-sm mb-5">Leva menos de um minuto. Você pode editar tudo depois.</p>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative block w-full aspect-[4/3] rounded-md border-2 border-dashed border-gray-300 bg-white overflow-hidden mb-4"
        >
          {image ? (
            <Image src={image} alt="Foto do produto" fill className="object-cover" />
          ) : (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500 text-sm">
              {uploading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Camera className="w-7 h-7" />}
              {uploading ? 'Enviando…' : 'Adicionar foto'}
            </span>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => pickPhoto(e.target.files?.[0])} />

        <div className="space-y-3">
          <label className="block text-sm text-gray-700">
            O que você vende?
            <input required maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Vestido floral" className={cn(inputClass, 'mt-1')} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-gray-700">
              Preço (R$)
              <input required inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="79,90" className={cn(inputClass, 'mt-1')} />
            </label>
            <label className="block text-sm text-gray-700">
              Quantidade
              <input required inputMode="numeric" value={stock} onChange={e => setStock(e.target.value.replace(/\D/g, ''))} className={cn(inputClass, 'mt-1')} />
            </label>
          </div>
          <div>
            <p className="text-sm text-gray-700 mb-1">Categoria</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setCategory(c.slug)}
                  className={cn('px-3 h-9 rounded-full border text-sm', c.slug === category ? 'border-primary bg-primary-50 text-gray-900' : 'border-gray-300 text-gray-600')}
                >
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          </div>
          <div role="radiogroup" aria-labelledby="package-size-label">
            <p id="package-size-label" className="text-sm text-gray-700">Tamanho do pacote</p>
            <p className="text-xs text-gray-400 mb-1.5">Já embalado. O frete do comprador é calculado por ele.</p>
            <div className="grid grid-cols-2 gap-2">
              {[...PACKAGE_PRESETS, { id: 'custom' as const, label: 'Outro tamanho', hint: 'informar peso e medidas' }].map(p => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={packageSize === p.id}
                  onClick={() => setPackageSize(p.id)}
                  className={cn(
                    'rounded-md border px-3 py-2 text-left',
                    packageSize === p.id ? 'border-primary bg-primary-50' : 'border-gray-300 bg-white'
                  )}
                >
                  <span className="block text-sm text-gray-900">{p.label}</span>
                  <span className="block text-xs text-gray-500">{p.hint}</span>
                </button>
              ))}
            </div>
            {packageSize === 'custom' && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {(
                  [
                    ['weightG', 'Peso (g)'],
                    ['heightCm', 'Altura (cm)'],
                    ['widthCm', 'Largura (cm)'],
                    ['lengthCm', 'Compr. (cm)'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block text-xs text-gray-600">
                    {label}
                    <input inputMode="numeric" value={custom[key]} onChange={setMeasure(key)} className={cn(inputClass, 'mt-1 px-2')} />
                  </label>
                ))}
              </div>
            )}
          </div>
          <label className="block text-sm text-gray-700">
            CEP de onde você envia <span className="text-gray-400">(opcional)</span>
            <input inputMode="numeric" value={zip} onChange={e => setZip(e.target.value)} placeholder="00000-000" className={cn(inputClass, 'mt-1')} />
          </label>
        </div>

        {error && <p className="text-coral-pink text-sm mt-3">{error}</p>}
        <Button type="submit" fullWidth size="lg" isLoading={saving} disabled={uploading} className="mt-5">
          Publicar produto
        </Button>
        <p className="text-center mt-4">
          <Link href="/seller/dashboard?skip=1" className="text-gray-500 text-sm hover:underline">
            Fazer isso depois
          </Link>
        </p>
      </form>
    </MainLayout>
  )
}
