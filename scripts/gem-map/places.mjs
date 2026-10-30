// What is curated by hand about the GEM complex: which OpenStreetMap features are the places a
// visitor looks for, their names, and the few facts GEM states on its own site.
//
// Rules (see CLAUDE.md): nothing here invents where anything is inside the Main Building, and every
// sentence of `about` is something GEM or OpenStreetMap says. `arFrom` records where each Arabic
// name comes from: 'osm' (name:ar), 'gem' (GEM's own Arabic pages) or 'ours' (our translation).

const MAP_PAGE = 'https://gem.eg/visit/plan-your-visit/museum-maps/'
const FAQS = 'https://gem.eg/faqs/'
const FACILITIES = 'https://gem.eg/gem-experience/facilities/'

export const SOURCES = [
  {
    id: 'osm',
    name: 'OpenStreetMap contributors',
    url: 'https://www.openstreetmap.org/copyright',
    licence: 'ODbL 1.0',
    used: 'Building outlines and heights, footpaths, service roads, gardens, entrances, walls and facility points, extracted from OpenStreetMap.',
  },
  {
    id: 'gem-map',
    name: 'GEM Complex Map (gem.eg)',
    url: MAP_PAGE,
    licence: null,
    used: "Names of places and which ones exist. Used to identify Khufu's Boats Museum and the Conservation Centre among OpenStreetMap's unnamed buildings, by position and shape. No artwork or geometry is copied.",
  },
  {
    id: 'gem-site',
    name: 'Grand Egyptian Museum website (gem.eg)',
    url: 'https://gem.eg/',
    licence: null,
    used: 'Facts only: facilities, ticketing and parking, the Hanging Obelisk record, and the names of parts of the Main Building.',
  },
]

export const INSIDE_NOTE = {
  en: "GEM has not published a floor plan of the inside of the Main Building, so this map shows the building's outline only and never guesses where a gallery is. Ask GEM staff on the day.",
  ar: 'لم ينشر المتحف المصري الكبير مخططًا لداخل المبنى الرئيس، لذلك تعرض هذه الخريطة حدود المبنى فقط ولا تخمّن أماكن القاعات. اسأل موظفي المتحف يوم الزيارة.',
}

const NOT_PUBLISHED = {
  en: 'Its place in the building is not published.',
  ar: 'لم ينشر المتحف مكانها في المبنى.',
}

// Parts of the Main Building that GEM names. Names and notes only: no positions.
export const INSIDE = [
  {
    id: 'grand-hall',
    name: { en: 'Grand Hall', ar: 'البهو العظيم' },
    note: {
      en: 'GEM says both the museum and the commercial section are entered through it. A statue of Ramesses II stands there.',
      ar: 'يذكر المتحف أنه يُدخل منه إلى المتحف وإلى القسم التجاري، ويقف فيه تمثال رمسيس الثاني.',
    },
    source: MAP_PAGE,
  },
  {
    id: 'grand-stairs',
    name: { en: 'Grand Stairs', ar: 'الدرج العظيم' },
    note: { en: `A stop on GEM's standard guided tour. ${NOT_PUBLISHED.en}`, ar: `إحدى محطات الجولة الإرشادية القياسية. ${NOT_PUBLISHED.ar}` },
    source: FAQS,
  },
  {
    id: 'main-galleries',
    name: { en: 'Main Galleries', ar: 'القاعات الرئيسة' },
    note: { en: `A stop on GEM's standard guided tour. ${NOT_PUBLISHED.en}`, ar: `إحدى محطات الجولة الإرشادية القياسية. ${NOT_PUBLISHED.ar}` },
    source: FAQS,
  },
  {
    id: 'tutankhamun-galleries',
    name: { en: 'Tutankhamun Galleries', ar: 'قاعات توت عنخ آمون' },
    note: {
      en: `Where GEM shows the Golden Burial Mask (GEM no. 8). ${NOT_PUBLISHED.en}`,
      ar: `القاعات التي يعرض فيها المتحف قناع الدفن الذهبي (رقم 8 في المتحف). ${NOT_PUBLISHED.ar}`,
    },
    source: 'https://gem.eg/en/collection/artefacts/the-golden-burial-mask-of-tutankhamun',
  },
  {
    id: 'commercial-section',
    name: { en: 'Shops, cafés and restaurants', ar: 'المطاعم والمقاهي والمحلات' },
    note: {
      en: "GEM's commercial section covers about 40,000 m² and is entered through the Grand Hall.",
      ar: 'يغطي القسم التجاري بالمتحف نحو 40 ألف م²، ويُدخل إليه عبر البهو العظيم.',
    },
    source: MAP_PAGE,
  },
]

/**
 * Buildings whose inside GEM has not published. OpenStreetMap maps some footpaths and tunnels through
 * their footprints, but without an official plan those are not routes a visitor can be sent along,
 * so the build drops every walkable segment inside them. (The security and ticketing buildings are
 * not listed: visitors really do walk through them.)
 */
export const INTERIOR_NOT_MAPPED = ['r/16783121', 'w/1229265954', 'w/1228854850']

/**
 * `at`: where the marker stands — 'centroid' (of the main feature), an OpenStreetMap node ("n/123"),
 *       or [x, y] in metres.
 * `access`: the node a route starts or ends at, if not the marker (a building's door), or 'outline'
 *           when no door is mapped: the point on the building's outline nearest a path.
 * `approach`: 'step-free' for a landmark seen from its square: the route ends on the part of the
 *            network reachable without steps, not inside a stepped platform.
 * `building`: the OpenStreetMap building it is.
 */
export const PLACES = [
  {
    id: 'main-building',
    kind: 'building',
    osm: ['r/16783121'],
    building: 'r/16783121',
    at: 'centroid',
    access: 'n/11394173353',
    name: { en: 'Grand Egyptian Museum', ar: 'المتحف المصري الكبير' },
    arFrom: 'gem',
    about: {
      en: 'The main building has a museum section of 92,000 m² and a commercial section of 40,000 m². Both are entered through the Grand Hall.',
      ar: 'للمبنى الرئيس قسمان: المتحف بمساحة 92 ألف م² والقسم التجاري بمساحة 40 ألف م²، ويُدخل إلى كل منهما عبر البهو العظيم.',
    },
    page: MAP_PAGE,
    match: 'exact',
    inside: INSIDE,
  },
  {
    id: 'main-entrance',
    kind: 'entrance',
    osm: ['w/1228653668', 'n/11394173353', 'n/11394173347', 'n/11394173345'],
    at: 'n/11394173353',
    name: { en: 'Main Building entrance', ar: 'مدخل المبنى الرئيس' },
    arFrom: 'ours',
    about: {
      en: 'OpenStreetMap names this building "the main gate" and maps its doors. GEM says visitors enter the museum through the Grand Hall.',
      ar: 'تسمّي OpenStreetMap هذا المبنى «البوابة الرئيسية» وتحدد أبوابه. ويذكر المتحف أن الزوار يدخلون إليه عبر البهو العظيم.',
    },
    page: MAP_PAGE,
    match: 'exact',
  },
  {
    id: 'hanging-obelisk',
    kind: 'landmark',
    osm: ['n/11394075269'],
    at: 'n/11394075269',
    approach: 'step-free',
    name: { en: 'The Hanging Obelisk', ar: 'المسلة المعلقة' },
    arFrom: 'osm',
    about: {
      en: 'A 16 m granite obelisk of Ramesses II from Tanis, lifted on four pillars so visitors can see the cartouches carved on its base. It stands in a square of 30,000 m² and is the first object visitors meet.',
      ar: 'مسلة من الجرانيت للملك رمسيس الثاني من تانيس، ارتفاعها 16 مترًا، رُفعت على أربعة أعمدة ليرى الزوار الخراطيش المنقوشة في قاعدتها. تقف في ساحة مساحتها 30 ألف م²، وهي أول ما يلقاه الزائر.',
    },
    page: 'https://gem.eg/en/collection/artefacts/obelisk-of-king-ramesses-ii',
    match: 'exact',
  },
  {
    id: 'ticketing-entrance',
    kind: 'entrance',
    osm: ['w/1329486637', 'w/1230333880', 'n/12300327718'],
    building: 'w/1329486637',
    at: 'n/12300327718',
    name: { en: 'Ticketing & Entrance', ar: 'التذاكر والمدخل' },
    arFrom: 'ours',
    about: {
      en: "The visitor entrance and security check. GEM's FAQ says tickets are booked online in advance, for a set arrival time.",
      ar: 'مدخل الزوار ونقطة التفتيش الأمني. يذكر المتحف في أسئلته الشائعة أن التذاكر تُحجز عبر الإنترنت مسبقًا لموعد وصول محدد.',
    },
    page: FAQS,
    match: 'exact',
  },
  {
    id: 'toilets',
    kind: 'service',
    osm: ['n/12300327713'],
    at: 'n/12300327713',
    name: { en: 'Toilets', ar: 'دورة المياه' },
    arFrom: 'gem',
    about: { en: 'GEM lists accessible visitor restrooms among its facilities.', ar: 'يذكر المتحف دورات مياه ميسّرة للزوار ضمن مرافقه.' },
    page: FACILITIES,
    match: 'exact',
  },
  {
    id: 'lockers',
    kind: 'service',
    osm: ['n/13449107435'],
    at: 'n/13449107435',
    name: { en: 'Luggage lockers', ar: 'أمانات' },
    arFrom: 'gem',
    about: { en: 'Free lockers for visitors, supervised.', ar: 'أمانات مجانية للزوار، وهي تحت الإشراف.' },
    page: FACILITIES,
    match: 'exact',
  },
  {
    id: 'atm',
    kind: 'service',
    osm: ['n/13439398218'],
    at: 'n/13439398218',
    name: { en: 'ATM (National Bank of Egypt)', ar: 'ماكينة صراف آلي (البنك الأهلي المصري)' },
    arFrom: 'ours',
    about: { en: 'Cash withdrawal on site, as GEM lists in its facilities.', ar: 'سحب النقود من الموقع، كما يذكر المتحف في مرافقه.' },
    page: FACILITIES,
    match: 'exact',
  },
  {
    id: 'drinking-water',
    kind: 'service',
    osm: ['n/13449109731'],
    at: 'n/13449109731',
    name: { en: 'Drinking water', ar: 'مياه الشرب' },
    arFrom: 'ours',
    about: { en: 'Free, and you can refill a bottle.', ar: 'مجانية، ويمكنك تعبئة زجاجتك.' },
    match: 'exact',
  },
  {
    id: 'car-park-entrance',
    kind: 'parking',
    osm: ['n/13275854878'],
    at: 'n/13275854878',
    name: { en: 'Car park entrance', ar: 'مدخل موقف السيارات' },
    arFrom: 'gem',
    about: {
      en: 'An underground car park. GEM says parking is available for a fee and can be limited at busy times.',
      ar: 'موقف سيارات تحت الأرض. يذكر المتحف أن الانتظار مقابل رسوم وقد تكون الأماكن محدودة في أوقات الذروة.',
    },
    page: FAQS,
    match: 'exact',
  },
  {
    id: 'khufu-boats-museum',
    kind: 'building',
    osm: ['w/1229265954'],
    building: 'w/1229265954',
    at: 'centroid',
    access: 'n/13439398249',
    name: { en: "Khufu's Boats Museum", ar: 'متحف مراكب خوفو' },
    arFrom: 'ours',
    about: {
      en: "Placed by its position and shape on GEM's own site plan. OpenStreetMap marks the building as under construction, so check gem.eg for whether it is open.",
      ar: 'موضعه مطابق لمخطط المتحف الرسمي بحسب المكان والشكل. تصنّفه OpenStreetMap مبنىً قيد الإنشاء، فتحقق من موقع المتحف عن موعد افتتاحه.',
    },
    page: MAP_PAGE,
    match: 'approximate',
  },
  {
    id: 'conservation-centre',
    kind: 'building',
    osm: ['w/1228854850'],
    building: 'w/1228854850',
    at: 'centroid',
    access: 'outline',
    name: { en: 'Conservation Centre', ar: 'مركز ترميم وصيانة الآثار' },
    arFrom: 'gem',
    about: {
      en: "Part of GEM's research programme, with eight specialised labs. Placed by its position and shape on GEM's own site plan.",
      ar: 'جزء من البحث العلمي بالمتحف، ويضم ثمانية معامل متخصصة. موضعه مطابق لمخطط المتحف الرسمي بحسب المكان والشكل.',
    },
    page: 'https://gem.eg/research/conservation-centre/',
    match: 'approximate',
  },
]
