import type { Lang } from '../content/types'
import type { PlaceKind } from './types'

export interface MapStrings {
  title: string
  subtitle: string
  home: string
  explore: string
  switchLang: string
  mapLabel: string
  viewLabel: string
  plan: string
  solid: string
  zoomIn: string
  zoomOut: string
  fit: string
  planner: string
  from: string
  to: string
  pick: string
  swap: string
  avoidSteps: string
  avoidStepsHint: string
  pickTwo: string
  samePlace: string
  noRoute: string
  stepsAnyway: string
  summary: (distance: string, minutes: string) => string
  directions: string
  showStep: string
  start: (name: string) => string
  routeNote: string
  crow: (distance: string) => string
  places: string
  kinds: Record<PlaceKind, string>
  approx: string
  approxLong: string
  fromHere: string
  toHere: string
  close: string
  official: string
  inside: string
  insideLead: string
  aboutHeading: string
  attribution: string
  openStreetMapLink: string
  notOfficial: string
  dataDate: (date: string) => string
  heights: string
  help3d: string
  label3d: string
  loading3d: string
  noWebgl: string
  announce: (from: string, to: string, distance: string, minutes: string) => string
  badgeFrom: string
  badgeTo: string
  details: string
  hide: string
}

export const STRINGS: Record<Lang, MapStrings> = {
  en: {
    title: 'Museum Map',
    subtitle: 'Grand Egyptian Museum complex',
    home: 'Home',
    explore: 'Explore The Lost Tomb',
    switchLang: 'العربية',
    mapLabel: 'Map of the Grand Egyptian Museum complex',
    viewLabel: 'Map view',
    plan: 'Plan',
    solid: '3D',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fit: 'Show the whole complex',
    planner: 'Plan a walk',
    from: 'From',
    to: 'To',
    pick: 'Choose a place',
    swap: 'Swap start and destination',
    avoidSteps: 'Avoid steps',
    avoidStepsHint: 'Uses only paths without steps, as OpenStreetMap maps them.',
    pickTwo: 'Choose a start and a destination to see the walk.',
    samePlace: 'The start and the destination are the same place.',
    noRoute: 'No walkable route is mapped between these two places.',
    stepsAnyway:
      'No route without steps is mapped. OpenStreetMap may not record a ramp or a lift here, so ask GEM staff. The shortest walk, which uses steps, is shown.',
    summary: (distance, minutes) => `${distance} · about ${minutes}`,
    directions: 'Directions',
    showStep: 'Show this step on the map',
    start: (name) => `Start at ${name}.`,
    routeNote:
      'Routes follow the paths mapped in OpenStreetMap. Open squares are not mapped, so a real walk across one may be shorter. Walking time is an estimate at an easy pace.',
    crow: (distance) => `As the crow flies it is ${distance}. The mapped path is longer because open squares are not mapped.`,
    places: 'Places',
    kinds: { building: 'Buildings', landmark: 'Landmarks', entrance: 'Entrances', service: 'Services', parking: 'Parking' },
    approx: 'Position approximate',
    approxLong: 'Matched to GEM’s own site plan by position and shape, not named in OpenStreetMap.',
    fromHere: 'Directions from here',
    toHere: 'Directions to here',
    close: 'Close',
    official: 'Official GEM page',
    inside: 'Inside the Main Building',
    insideLead: 'GEM names these parts of the building but has not published where they are.',
    aboutHeading: 'About this map',
    attribution: 'Map data © OpenStreetMap contributors',
    openStreetMapLink: 'OpenStreetMap copyright and licence (ODbL)',
    notOfficial: 'Not an official Grand Egyptian Museum product.',
    dataDate: (date) => `OpenStreetMap data as of ${date}.`,
    heights: 'In 3D, only the museum’s 46 m height comes from OpenStreetMap. The other buildings are drawn at an assumed height.',
    help3d: 'Drag to turn the model. Pinch or scroll to zoom.',
    label3d: 'A 3D model of the Grand Egyptian Museum complex. The plan view and the lists give the same information.',
    loading3d: 'Loading the 3D view…',
    noWebgl: 'The 3D view needs WebGL, which this browser does not offer. The plan view still works.',
    announce: (from, to, distance, minutes) => `Route from ${from} to ${to}: ${distance}, about ${minutes}.`,
    badgeFrom: 'A',
    badgeTo: 'B',
    details: 'Details',
    hide: 'Hide',
  },
  ar: {
    title: 'خريطة المتحف',
    subtitle: 'مجمّع المتحف المصري الكبير',
    home: 'الرئيسية',
    explore: 'استكشف المقبرة المفقودة',
    switchLang: 'English',
    mapLabel: 'خريطة مجمّع المتحف المصري الكبير',
    viewLabel: 'نمط الخريطة',
    plan: 'المخطط',
    solid: '3D',
    zoomIn: 'تكبير',
    zoomOut: 'تصغير',
    fit: 'عرض المجمّع كاملًا',
    planner: 'خطّط لمسارك',
    from: 'من',
    to: 'إلى',
    pick: 'اختر مكانًا',
    swap: 'تبديل نقطة البداية والوجهة',
    avoidSteps: 'تجنّب الدرج',
    avoidStepsHint: 'يستخدم مسارات بلا درج فقط، كما تظهر في OpenStreetMap.',
    pickTwo: 'اختر نقطة البداية والوجهة لعرض المسار.',
    samePlace: 'نقطة البداية هي نفسها الوجهة.',
    noRoute: 'لا يوجد مسار مشي مرسوم بين هذين المكانين.',
    stepsAnyway:
      'لا يوجد مسار بلا درج على الخريطة. قد لا تسجّل OpenStreetMap منحدرًا أو مصعدًا هنا، فاسأل موظفي المتحف. نعرض أقصر مسار، وهو يمرّ بدرج.',
    summary: (distance, minutes) => `${distance} · نحو ${minutes}`,
    directions: 'الاتجاهات',
    showStep: 'اعرض هذه الخطوة على الخريطة',
    start: (name) => `ابدأ من ${name}.`,
    routeNote:
      'تتبع المسارات الطرق المرسومة في OpenStreetMap. الساحات المفتوحة غير مرسومة، لذا قد يكون المشي الفعلي عبرها أقصر. زمن المشي تقدير بخطوة هادئة.',
    crow: (distance) => `المسافة المباشرة ${distance}. المسار المرسوم أطول لأن الساحات المفتوحة غير مرسومة.`,
    places: 'الأماكن',
    kinds: { building: 'المباني', landmark: 'المعالم', entrance: 'المداخل', service: 'الخدمات', parking: 'مواقف السيارات' },
    approx: 'الموضع تقريبي',
    approxLong: 'موضعه مطابق لمخطط المتحف الرسمي بحسب المكان والشكل، وليس مسمّى في OpenStreetMap.',
    fromHere: 'الاتجاهات من هنا',
    toHere: 'الاتجاهات إلى هنا',
    close: 'إغلاق',
    official: 'الصفحة الرسمية للمتحف',
    inside: 'داخل المبنى الرئيس',
    insideLead: 'يذكر المتحف أسماء هذه الأجزاء لكنه لم ينشر أماكنها.',
    aboutHeading: 'عن هذه الخريطة',
    attribution: 'بيانات الخريطة © مساهمو OpenStreetMap',
    openStreetMapLink: 'حقوق OpenStreetMap ورخصة البيانات (ODbL)',
    notOfficial: 'ليس منتجًا رسميًا للمتحف المصري الكبير.',
    dataDate: (date) => `بيانات OpenStreetMap بتاريخ ${date}.`,
    heights: 'في العرض الثلاثي الأبعاد، ارتفاع المتحف (٤٦ مترًا) وحده مأخوذ من OpenStreetMap، أما باقي المباني فترتفع بقيمة مفترضة.',
    help3d: 'اسحب لتدوير النموذج. اقرص أو مرّر للتكبير.',
    label3d: 'نموذج ثلاثي الأبعاد لمجمّع المتحف المصري الكبير. يقدّم المخطط والقوائم المعلومات نفسها.',
    loading3d: 'جارٍ تحميل العرض الثلاثي الأبعاد…',
    noWebgl: 'يحتاج العرض الثلاثي الأبعاد إلى WebGL وهو غير متاح في هذا المتصفح. ما زال المخطط يعمل.',
    announce: (from, to, distance, minutes) => `المسار من ${from} إلى ${to}: ${distance}، نحو ${minutes}.`,
    badgeFrom: 'أ',
    badgeTo: 'ب',
    details: 'التفاصيل',
    hide: 'إخفاء',
  },
}
