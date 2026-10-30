import type { Lang } from '../content/types'

export interface HomeStrings {
  docTitle: string
  brand: string
  headline: string
  lede: string
  map: { title: string; text: string; go: string }
  tomb: { title: string; text: string; go: string }
  reconstruction: string
  notOfficial: string
  osm: string
  osmLink: string
  switchLang: string
  mapPicture: string
}

export const HOME_STRINGS: Record<Lang, HomeStrings> = {
  en: {
    docTitle: 'The Lost Tomb — Museum map and 3D story',
    brand: 'The Lost Tomb',
    headline: 'Find your way, then meet the king.',
    lede: 'A companion for visiting the Grand Egyptian Museum, made for the GEM Hackathon 2026.',
    map: { title: 'Explore Museum Map', text: 'Pick two places and see the walk between them, on a plan or in 3D.', go: 'Open the map' },
    tomb: { title: 'Explore The Lost Tomb', text: 'Scroll through Tutankhamun’s story and turn his treasures in 3D.', go: 'Enter the story' },
    reconstruction: 'Artistic reconstruction',
    notOfficial: 'Not an official Grand Egyptian Museum product.',
    osm: 'Map data © OpenStreetMap contributors',
    osmLink: 'https://www.openstreetmap.org/copyright',
    switchLang: 'العربية',
    mapPicture: 'A walk across the complex, drawn on the real outlines of its buildings',
  },
  ar: {
    docTitle: 'المقبرة المفقودة — خريطة المتحف وقصة ثلاثية الأبعاد',
    brand: 'المقبرة المفقودة',
    headline: 'اعرف طريقك، ثم تعرّف على الملك.',
    lede: 'رفيق لزيارة المتحف المصري الكبير، صُنع لهاكاثون المتحف ٢٠٢٦.',
    map: { title: 'استكشف خريطة المتحف', text: 'اختر مكانين لترى المسار بينهما، على مخطط أو بثلاثة أبعاد.', go: 'افتح الخريطة' },
    tomb: { title: 'استكشف المقبرة المفقودة', text: 'تصفّح قصة توت عنخ آمون وقلّب كنوزه بثلاثة أبعاد.', go: 'ادخل القصة' },
    reconstruction: 'إعادة تصور فنية',
    notOfficial: 'ليس منتجًا رسميًا للمتحف المصري الكبير.',
    osm: 'بيانات الخريطة © مساهمو OpenStreetMap',
    osmLink: 'https://www.openstreetmap.org/copyright',
    switchLang: 'English',
    mapPicture: 'مسار عبر المجمّع مرسوم على الحدود الحقيقية لمبانيه',
  },
}
