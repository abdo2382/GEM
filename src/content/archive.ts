import type { ChapterId, TreasureId } from './types'

/*
 * Archival photograph manifest. Every image shown in the experience is listed here
 * with what it shows, who made it, where the original is held, where it was obtained
 * and under what terms. Tests in tests/archive.test.ts check every entry.
 *
 * All current entries are Harry Burton's own excavation prints, from the five albums
 * "Tutankhamun tomb photographs: a photographic record ... 490 original photographic
 * prints", digitised by Heidelberg University Library and published on Wikimedia
 * Commons as {{PD-old}}: Burton died in 1940, so the photographs are in the public
 * domain in countries whose term is the author's life plus 70 years or less.
 * Subjects were identified from the prints themselves and from Commons' subject
 * categories; people in the photographs are not named, because the source records
 * do not name them.
 */

export interface ArchivePhotoEntry {
  id: string
  /** Optimised copy served by the site (WebP, at most 1200px wide). */
  file: string
  width: number
  height: number
  caption: { en: string; ar: string }
  /** The historical event or subject, for the manifest. */
  event: string
  creator: string
  creatorShort: { en: string; ar: string }
  date: string
  institution: string
  institutionShort: { en: string; ar: string }
  /** The holding institution's digitised volume. */
  institutionUrl: string
  /** The page the file was obtained from, with its licence statement. */
  sourceUrl: string
  license: 'Public domain'
  licenseNote: string
  attribution: string
  /** Story stage whose papyrus shows it, if any. */
  stage: ChapterId | null
  artifact: TreasureId | null
}

const BURTON = {
  creator: 'Harry Burton (1879–1940)',
  creatorShort: { en: 'Harry Burton', ar: 'هاري بيرتون' },
  institution: 'Heidelberg University Library (Universitätsbibliothek Heidelberg)',
  institutionShort: { en: 'Heidelberg University Library', ar: 'مكتبة جامعة هايدلبرغ' },
  license: 'Public domain' as const,
  licenseNote: 'PD-old: photographer died in 1940. Marked public domain on Wikimedia Commons.',
}

const commons = (name: string) => `https://commons.wikimedia.org/wiki/File:${name}`
const heidelberg = (vol: string) => `https://digi.ub.uni-heidelberg.de/diglit/${vol}`

export const ARCHIVE: ArchivePhotoEntry[] = [
  {
    ...BURTON,
    id: 'burton-1-007',
    file: '/archive/burton-1-007.webp',
    width: 1200,
    height: 949,
    caption: {
      en: 'The Valley of the Kings beneath the peak of el-Qurn, where the tomb lay hidden.',
      ar: 'وادي الملوك تحت قمة القرن، حيث ظلت المقبرة مخفية.',
    },
    event: 'The Valley of the Kings at the time of the excavation',
    date: 'c. 1922',
    institutionUrl: heidelberg('burton1922bd1'),
    sourceUrl: commons('Burton_Tutankhamun_tomb_photographs_1_007.jpg'),
    attribution: 'Harry Burton, Tutankhamun tomb photographs, vol. 1, print 7. Heidelberg University Library, via Wikimedia Commons. Public domain.',
    stage: 'prologue',
    artifact: null,
  },
  {
    ...BURTON,
    id: 'burton-2-003',
    file: '/archive/burton-2-003.webp',
    width: 470,
    height: 654,
    caption: {
      en: 'The rock-cut steps that lead down to the entrance of the tomb.',
      ar: 'الدرجات المنحوتة في الصخر المؤدية إلى مدخل المقبرة.',
    },
    event: 'The stairway of KV62, uncovered in November 1922',
    date: 'c. 1922',
    institutionUrl: heidelberg('burton1922bd2'),
    sourceUrl: commons('Tutankhamun_tomb_photographs_2_003.jpg'),
    attribution: 'Harry Burton, Tutankhamun tomb photographs, vol. 2, print 3. Heidelberg University Library, via Wikimedia Commons. Public domain.',
    stage: 'discovery',
    artifact: null,
  },
  {
    ...BURTON,
    id: 'burton-2-009',
    file: '/archive/burton-2-009.webp',
    width: 1005,
    height: 737,
    caption: {
      en: 'The Antechamber as the team recorded it: a gilded cow-headed couch, with white food boxes stacked beneath.',
      ar: 'الحجرة الأمامية كما سجّلها الفريق: سرير مذهّب برأس بقرة، تكدّست تحته صناديق الطعام البيضاء.',
    },
    event: 'The Antechamber of KV62 photographed in place before clearance',
    date: 'c. 1922',
    institutionUrl: heidelberg('burton1922bd2'),
    sourceUrl: commons('Tutankhamun_tomb_photographs_2_009.jpg'),
    attribution: 'Harry Burton, Tutankhamun tomb photographs, vol. 2, print 9. Heidelberg University Library, via Wikimedia Commons. Public domain.',
    stage: 'boyking',
    artifact: null,
  },
  {
    ...BURTON,
    id: 'burton-4-292',
    file: '/archive/burton-4-292.webp',
    width: 965,
    height: 715,
    caption: {
      en: 'The two guardian statues flank the doorway to the Burial Chamber. Through the opening stands the gilded outermost shrine.',
      ar: 'التمثالان الحارسان على جانبي مدخل حجرة الدفن، ومن خلال الفتحة تظهر المقصورة الخارجية المذهّبة.',
    },
    event: 'The doorway to the Burial Chamber after its opening in 1923',
    date: 'c. 1923',
    institutionUrl: heidelberg('burton1923bd4'),
    sourceUrl: commons('Tutankhamun_tomb_photographs_4_292.jpg'),
    attribution: 'Harry Burton, Tutankhamun tomb photographs, vol. 4, print 292. Heidelberg University Library, via Wikimedia Commons. Public domain.',
    stage: 'eternity',
    artifact: null,
  },
  {
    ...BURTON,
    id: 'burton-1-017',
    file: '/archive/burton-1-017.webp',
    width: 1018,
    height: 781,
    caption: {
      en: 'Workmen move packed objects out of the Valley on a light railway, bound for the Nile and the museum in Cairo.',
      ar: 'عمال ينقلون القطع المغلّفة خارج الوادي على سكة حديد خفيفة، في طريقها إلى النيل ثم إلى المتحف في القاهرة.',
    },
    event: 'Objects from the tomb leave the Valley of the Kings for Cairo',
    date: 'c. 1923',
    institutionUrl: heidelberg('burton1922bd1'),
    sourceUrl: commons('Burton_Tutankhamun_tomb_photographs_1_017.jpg'),
    attribution: 'Harry Burton, Tutankhamun tomb photographs, vol. 1, print 17. Heidelberg University Library, via Wikimedia Commons. Public domain.',
    stage: 'legacy',
    artifact: null,
  },
  {
    ...BURTON,
    id: 'burton-3-155',
    file: '/archive/burton-3-155.webp',
    width: 579,
    height: 863,
    caption: {
      en: 'The Golden Throne, photographed after it was taken out of the tomb.',
      ar: 'العرش الذهبي مصوَّرًا بعد إخراجه من المقبرة.',
    },
    event: 'The Golden Throne (Carter no. 91) recorded after removal',
    date: 'c. 1923',
    institutionUrl: heidelberg('burton1923bd3'),
    sourceUrl: commons('Tutankhamun_tomb_photographs_3_155.jpg'),
    attribution: 'Harry Burton, Tutankhamun tomb photographs, vol. 3, print 155. Heidelberg University Library, via Wikimedia Commons. Public domain.',
    stage: null,
    artifact: 'throne',
  },
  {
    ...BURTON,
    id: 'burton-3-163',
    file: '/archive/burton-3-163.webp',
    width: 692,
    height: 960,
    caption: {
      en: 'The throne’s backrest: the queen, Ankhesenamun, anoints the king beneath the rays of the Aten.',
      ar: 'مسند العرش: الملكة عنخ إسن آمون تمسح الملك بالعطر تحت أشعة آتون.',
    },
    event: 'Detail of the Golden Throne backrest',
    date: 'c. 1923',
    institutionUrl: heidelberg('burton1923bd3'),
    sourceUrl: commons('Tutankhamun_tomb_photographs_3_163.jpg'),
    attribution: 'Harry Burton, Tutankhamun tomb photographs, vol. 3, print 163. Heidelberg University Library, via Wikimedia Commons. Public domain.',
    stage: null,
    artifact: 'throne',
  },
]

/** The photograph near the foot of each chapter's papyrus. */
export const STAGE_PHOTO: Record<ChapterId, string> = {
  prologue: 'burton-1-007',
  discovery: 'burton-2-003',
  boyking: 'burton-2-009',
  eternity: 'burton-4-292',
  legacy: 'burton-1-017',
}

/**
 * Archival photographs shown in Inspect. The Treasury (Anubis shrine, canopic shrine)
 * was cleared in later seasons not covered by these albums, and Burton's photographs
 * of the mask are not in them either; no verified public-domain copy was found, so
 * those objects show none.
 */
export const ARTIFACT_PHOTOS: Partial<Record<TreasureId, string[]>> = {
  throne: ['burton-3-155', 'burton-3-163'],
}

export function photoById(id: string): ArchivePhotoEntry | undefined {
  return ARCHIVE.find((p) => p.id === id)
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'

/** "c. 1923" in English; "نحو ١٩٢٣" in Arabic. */
export function photoDate(p: ArchivePhotoEntry, lang: 'en' | 'ar'): string {
  if (lang === 'en') return p.date
  return p.date.replace('c. ', 'نحو ').replace(/\d/g, (d) => AR_DIGITS[Number(d)])
}

/** The one-line credit used under a photograph and in the credits. */
export function photoCredit(p: ArchivePhotoEntry, lang: 'en' | 'ar', label: string, licence: string): string {
  return `${label}: ${p.creatorShort[lang]}, ${photoDate(p, lang)}. ${p.institutionShort[lang]}. ${licence}.`
}
