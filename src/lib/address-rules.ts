import { lookupCep } from './cep'

// What makes a delivery address acceptable, shared by the checkout form and the server.

export const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

export type AddressField = 'zipCode' | 'street' | 'number' | 'neighborhood' | 'city' | 'state'
export type AddressErrors = Partial<Record<AddressField, string>>

type AddressInput = Partial<Record<AddressField, string | null | undefined>>

// Has at least two letters: "Rua A" passes, "." and "123" don't
const hasWords = (v: string) => (v.match(/\p{L}/gu)?.length ?? 0) >= 2

// What's wrong with each field ({} when the address can be used)
export function addressErrors(a: AddressInput): AddressErrors {
  const errors: AddressErrors = {}
  const value = (key: AddressField) => (a[key] ?? '').trim()
  const zip = value('zipCode').replace(/\D/g, '')
  if (zip.length !== 8 || /^(\d)\1{7}$/.test(zip)) errors.zipCode = 'Informe um CEP válido, com 8 números'
  if (!hasWords(value('street'))) errors.street = 'Informe a rua'
  // A house number, or "s/n" where there's none
  if (!/\d/.test(value('number')) && !/^s\/?n$/i.test(value('number'))) errors.number = 'Número ou s/n'
  if (!hasWords(value('neighborhood'))) errors.neighborhood = 'Informe o bairro'
  if (!hasWords(value('city'))) errors.city = 'Informe a cidade'
  if (!BR_STATES.includes(value('state').toUpperCase())) errors.state = 'Sigla, como SP'
  return errors
}

const plain = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Checks the address against the CEP's real city and state (ViaCEP), so a made-up address
// or a CEP that doesn't exist isn't accepted. When ViaCEP can't be reached the address
// passes: a lookup outage shouldn't stop sales.
export async function addressCepErrors(a: AddressInput): Promise<AddressErrors> {
  const found = await lookupCep(a.zipCode ?? '')
  if (!found) return {}
  if (found === 'NOT_FOUND') return { zipCode: 'CEP não encontrado. Confira os números.' }
  if (found.state && found.state.toUpperCase() !== (a.state ?? '').trim().toUpperCase()) {
    return { state: `Este CEP é de ${found.state}` }
  }
  if (found.city && plain(found.city) !== plain(a.city ?? '')) {
    return { city: `Este CEP é de ${found.city}` }
  }
  return {}
}

export const firstAddressError = (errors: AddressErrors) => Object.values(errors)[0] ?? null
