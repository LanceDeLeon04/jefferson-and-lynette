// Entourage data: the default list, plus load/clean helpers shared by the invitation and the admin.
// The live list is stored in Supabase (table `entourage`, one row) or in this browser when Supabase isn't set up.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js'

// Display order of the sections. A group belongs to one of these.
export const PARTS = { parents: 'Our Parents', principal: 'Principal Sponsors', secondary: 'Secondary Sponsors' }

const g = (id, part, title, items) => ({ id, part, title, items })
export const DEFAULT_ENTOURAGE = [
  g('p-groom', 'parents', 'Parents of the Groom', ['Aniceto Bendejo', 'Lorena Castillo']),
  g('p-bride', 'parents', 'Parents of the Bride', ['Celestino Vergara', 'Selwyn Vergara (brother)']),
  // Couples are written "Name & Name" and shown as a pair.
  g('principal', 'principal', '', [
    'Atty. Marjorie De Castro & Kap. Ronaldo Mangubat',
    'Col. Harold Hernando & Atty. Arlene Hernando',
    'Mr. Edgardo Sarmiento & Mrs. Glenda Sarmiento',
    'Mr. Romeo Labay & Mrs. Josie Labay',
    'Mr. Nito Carolino & Mrs. Loreta Carolino',
    'Mr. Michael Jones Salazar & Mrs. Rhosalie Salazar',
    'Mr. Mariano Mendoza & Mrs. Gloria Mendoza',
    'Mr. Celerino Alvarez & Mrs. Maricel Alvarez',
    'Mr. Herminigildo Noche & Mrs. Aileen Noche',
    'Mr. Jose Araja Jr. & Mrs. Jenilyn Araja',
    'Mr. Candido Benedicto & Mrs. Victoria Benedicto',
    'Mr. Roberto Cabral & Mrs. Glenda Cabral',
    'Mr. Vladimir Gacayan & Mrs. Marilyn Gacayan',
    'Mr. Onnie Blanco & Mrs. Angeles Blanco',
    'Mr. Elizaldo Almagro & Norminda Almagro',
    '2LT Joseph Garcia (ret) & MSg Verna Garcia (ret)',
    'Mrs. Chrisyl Villaluz'
  ]),
  g('candle', 'secondary', 'Candle', ['Kyla Vergara', 'To be announced']),
  g('veil', 'secondary', 'Veil', ['Aina Vergara', 'Vlad Angelo Gacayan']),
  g('cord', 'secondary', 'Cord', ['Hariette Agoba', 'Russel Castillo']),
  g('ring', 'secondary', 'Ring Bearer', ['April Alamag', 'Precious Laira Manipon']),
  g('coin', 'secondary', 'Coin Bearer', ['Jade Vergara', 'Lyna Janis Bidbid']),
  g('bible', 'secondary', 'Bible Bearer', ['Lemuel Benedicto', 'Audrey Alcantara']),
  g('groomsmen', 'secondary', 'Groomsmen', ['Joshua Castillo', 'E. J. Red Cailing', 'Ace Galvin Pastor', 'Lancewin Alexandrei De Leon']),
  g('bridesmaids', 'secondary', 'Bridesmaids', ['Katty Almagro', 'Viel Balboa', 'Samantha Nicole Parado', 'Wanda Victoria Reyes']),
  g('little-groom', 'secondary', 'Little Groom', ['Aeveen Arañez', 'Jaika Almagro']),
  g('little-groomsmen', 'secondary', 'Little Groomsmen', ['Carlo Pilapil', 'Ron Andrey Blanco', 'Aniceto Jacob Bendejo', 'Rex Jr. Bidbid']),
  g('little-bridesmaids', 'secondary', 'Little Bridesmaids', ['Anicka Jeirah Bendejo', 'Cyndrille Banico', 'Fenelle Macasaet', 'Rhian Hernandez']),
  g('best-man', 'secondary', 'Best Man', ['Jerome Castillo']),
  g('maid-of-honor', 'secondary', 'Maid of Honor', ['Zyra Vergara'])
]

const uid = () => Math.random().toString(36).slice(2, 9)
const copy = x => JSON.parse(JSON.stringify(x))

// Make sure whatever was stored is a well-formed list.
export function cleanEntourage(list) {
  return (Array.isArray(list) ? list : []).filter(x => x && typeof x === 'object').map(x => ({
    id: String(x.id || uid()),
    part: PARTS[x.part] ? x.part : 'secondary',
    title: String(x.title ?? '').trim(),
    items: (Array.isArray(x.items) ? x.items : []).map(s => String(s ?? '').trim()).filter(Boolean)
  }))
}

export const cloud = !!(SUPABASE_URL && SUPABASE_KEY)

// `sb` is the signed-in admin client; the public page passes nothing and uses the anonymous one.
export async function loadEntourage(sb) {
  try {
    if (cloud) {
      if (!sb) { const { createClient } = await import('@supabase/supabase-js'); sb = createClient(SUPABASE_URL, SUPABASE_KEY) }
      const { data, error } = await sb.from('entourage').select('data').eq('id', 1).maybeSingle()
      if (error) throw error
      if (data && Array.isArray(data.data)) return cleanEntourage(data.data)   // row exists: use it, even if emptied
    } else {
      const l = JSON.parse(localStorage.getItem('jl-entourage') || 'null')
      if (Array.isArray(l)) return cleanEntourage(l)
    }
  } catch (e) {}
  return copy(DEFAULT_ENTOURAGE)
}

export async function saveEntourage(sb, list) {
  const data = cleanEntourage(list)
  if (cloud) { const { error } = await sb.from('entourage').upsert({ id: 1, data, updated_at: new Date().toISOString() }); if (error) throw error }
  else localStorage.setItem('jl-entourage', JSON.stringify(data))
  return data
}
