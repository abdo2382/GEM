import type { ChapterId, Lang, TreasureId } from './types'

/*
 * Narrative content. Keep passages short in the main flow; depth goes in `more`.
 *
 * Sources consulted for the facts below:
 *  - Griffith Institute, University of Oxford — "Tutankhamun: Anatomy of an Excavation"
 *    (Carter's journals, object cards and Harry Burton's photographs).
 *  - H. Carter & A. C. Mace, "The Tomb of Tut.ankh.Amen", vol. I (1923).
 *  - N. Reeves, "The Complete Tutankhamun" (1990; rev. ed. 2022).
 *  - Z. Hawass et al., "Ancestry and Pathology in King Tutankhamun's Family",
 *    JAMA 303(7), 2010.
 * Gallery displays at the Grand Egyptian Museum must be confirmed with GEM before
 * any location is shown to visitors (see `gemLocation` in artifacts.ts).
 */

export interface ChapterText {
  kicker: string
  title: string
  paragraphs: string[]
  more: string[]
}

export interface HotspotText {
  title: string
  text: string
}

export interface ArtifactText {
  name: string
  origin: string
  short: string
  long: string
  hotspots: Record<string, HotspotText>
  /** Catalogue facts, shown in Inspect mode when known from an official record. */
  facts?: { label: string; value: string }[]
  /** Extra caveat shown under the description in Inspect mode. */
  note?: string
}

export const STORY: Record<Lang, Record<ChapterId, ChapterText>> = {
  en: {
    prologue: {
      kicker: 'Before 1922',
      title: 'The Awakening',
      paragraphs: [
        'For more than three thousand years, a young king lay beneath the Valley of the Kings, forgotten by history.',
        'Later rulers left his name off their lists of kings, and his tomb lay buried under the rubble of later building work.',
      ],
      more: [
        'Tutankhamun ruled in the 14th century BCE, during Egypt’s 18th Dynasty. Later rulers left the kings of the Amarna period, including him, out of official king lists, which helped his tomb escape notice.',
        'Robbers did enter the tomb in antiquity, probably twice, but it was resealed and remained largely intact.',
      ],
    },
    discovery: {
      kicker: 'Chapter I · 1922',
      title: 'The Discovery',
      paragraphs: [
        'On 4 November 1922, Howard Carter’s team uncovered a step cut into the rock. Sixteen steps led down to a sealed doorway.',
        'On 26 November, by candlelight, Carter made a small breach and peered inside, with his patron Lord Carnarvon beside him.',
        'As Carter later told it, Carnarvon asked, “Can you see anything?” He answered, “Yes, wonderful things.”',
      ],
      more: [
        'The tomb, later numbered KV62, has four chambers: the Antechamber, the Annexe, the Burial Chamber and the Treasury.',
        'Carter’s own journal records the moment more simply; the famous exchange comes from his published account of the excavation.',
        'Recording and clearing the tomb took about ten years. The photographer Harry Burton documented every stage.',
      ],
    },
    boyking: {
      kicker: 'Chapter II · The Antechamber',
      title: 'The Treasures',
      paragraphs: [
        'The tomb held more than 5,000 objects, packed into four small rooms: gilded beds and shrines, chariots, jewellery, weapons, clothing and food.',
        'They belonged to a king who died young. Born Tutankhaten, “living image of the Aten”, he came to the throne at about nine and took the name Tutankhamun, “living image of Amun”.',
        'He restored the old gods and their temples, and died at around nineteen, after a reign of about ten years.',
      ],
      more: [
        'The Golden Throne shows the king with his queen, Ankhesenamun, a daughter of Akhenaten and Nefertiti, under the rays of the Aten.',
        'His Restoration Stela at Karnak describes temples fallen into ruin and the king’s work to renew them.',
        'DNA studies published in 2010 suggest his father was the man buried in tomb KV55, widely identified as Akhenaten. The cause of the king’s early death is still debated.',
      ],
    },
    eternity: {
      kicker: 'Chapter III · The Burial Chamber',
      title: 'Inside the Tomb',
      paragraphs: [
        'In February 1923 Carter’s team opened the sealed doorway to the Burial Chamber, the only painted room in the tomb. Four gilded shrines, one inside another, almost filled it.',
        'Within them lay a stone sarcophagus and three nested coffins. The innermost, of solid gold, held the king’s mummy, its head and shoulders covered by the gold mask.',
        'In the afterlife, the heart was weighed against the feather of Ma’at, the principle of truth and order. A heart in balance meant the dead could live forever.',
      ],
      more: [
        'Egyptians believed each person had a ka, the life force, and a ba, the personality, and both needed a preserved body to return to.',
        'Embalming took about seventy days. The organs were preserved separately and the heart was left in the body. The king’s organs were kept in the canopic chest, in the Treasury beside the Burial Chamber.',
        'The innermost coffin weighs about 110 kilograms. The gold mask is made from more than ten kilograms of gold, inlaid with lapis lazuli, quartz, obsidian, carnelian and coloured glass.',
      ],
    },
    legacy: {
      kicker: 'Epilogue · Today',
      title: 'The Living Legacy',
      paragraphs: [
        'The discovery made Tutankhamun the most famous pharaoh in the world almost overnight.',
        'Today the Grand Egyptian Museum, beside the pyramids of Giza, brings his treasures together in dedicated galleries.',
        'Now the journey is yours. Gather the treasures that called to you, then go and meet them in person.',
      ],
      more: [
        'The excavation records (Carter’s notes, the object cards and Burton’s photographs) are preserved at the Griffith Institute, University of Oxford.',
        'Displays change over time. Check the Grand Egyptian Museum’s official channels for what is on view during your visit.',
      ],
    },
  },
  ar: {
    prologue: {
      kicker: 'قبل ١٩٢٢',
      title: 'اليقظة',
      paragraphs: [
        'لأكثر من ثلاثة آلاف عام، رقد ملك شاب تحت ثرى وادي الملوك، وقد طواه النسيان.',
        'أسقط الملوك اللاحقون اسمه من قوائمهم، ودُفنت مقبرته تحت ركام أعمال البناء التي جاءت بعده.',
      ],
      more: [
        'حكم توت عنخ آمون في القرن الرابع عشر قبل الميلاد، في عهد الأسرة الثامنة عشرة. وقد استبعد الملوك اللاحقون ملوكَ عصر العمارنة، ومنهم هو، من قوائم الملوك الرسمية، فساعد ذلك على بقاء مقبرته بعيدة عن الأنظار.',
        'دخل اللصوص المقبرة في العصور القديمة، على الأرجح مرتين، لكنها أُعيد إغلاقها وظلت محفوظة إلى حد كبير.',
      ],
    },
    discovery: {
      kicker: 'الفصل الأول · ١٩٢٢',
      title: 'الاكتشاف',
      paragraphs: [
        'في ٤ نوفمبر ١٩٢٢، عثر فريق هوارد كارتر على درجة منحوتة في الصخر، قادت مع خمس عشرة درجة أخرى إلى باب مختوم.',
        'وفي ٢٦ نوفمبر، على ضوء شمعة، فتح كارتر ثغرة صغيرة ونظر إلى الداخل، وإلى جواره راعيه اللورد كارنارفون.',
        'وكما روى كارتر لاحقًا، سأله كارنارفون: «هل ترى شيئًا؟» فأجاب: «نعم، أشياء رائعة».',
      ],
      more: [
        'تضم المقبرة، التي حملت لاحقًا الرقم KV62، أربع حجرات: الحجرة الأمامية، والملحق، وحجرة الدفن، والخزانة.',
        'يسجّل دفتر يوميات كارتر تلك اللحظة بعبارات أبسط؛ أما الحوار الشهير فمصدره روايته المنشورة عن الحفائر.',
        'استغرق توثيق المقبرة وإفراغها نحو عشر سنوات، ووثّق المصوّر هاري بيرتون كل مرحلة منها.',
      ],
    },
    boyking: {
      kicker: 'الفصل الثاني · الحجرة الأمامية',
      title: 'الكنوز',
      paragraphs: [
        'ضمّت المقبرة أكثر من ٥٠٠٠ قطعة تكدّست في أربع حجرات صغيرة: أسرّة ومقاصير مذهّبة، وعجلات حربية، وحُليّ، وأسلحة، وملابس، وطعام.',
        'وكانت كلها لملك مات شابًا. وُلد باسم توت عنخ آتون، «الصورة الحية لآتون»، واعتلى العرش في نحو التاسعة من عمره، واتخذ اسم توت عنخ آمون، «الصورة الحية لآمون».',
        'أعاد الآلهة القديمة ومعابدها، وتُوفي في نحو التاسعة عشرة بعد حكم دام قرابة عشر سنوات.',
      ],
      more: [
        'يصوّر العرش الذهبي الملك مع ملكته عنخ إسن آمون، ابنة إخناتون ونفرتيتي، تحت أشعة آتون.',
        'تصف «لوحة الإصلاح» التي أقامها في الكرنك معابدَ تهدّمت وجهودَ الملك في تجديدها.',
        'تشير دراسات الحمض النووي المنشورة عام ٢٠١٠ إلى أن والده هو صاحب المومياء المدفونة في المقبرة KV55، التي يُرجَّح على نطاق واسع أنها لإخناتون. ولا يزال سبب وفاته المبكرة موضع جدل.',
      ],
    },
    eternity: {
      kicker: 'الفصل الثالث · حجرة الدفن',
      title: 'داخل المقبرة',
      paragraphs: [
        'في فبراير ١٩٢٣ فتح فريق كارتر الباب المختوم المؤدي إلى حجرة الدفن، وهي الحجرة الوحيدة المزيّنة بالرسوم في المقبرة. وكانت أربع مقاصير مذهّبة، متداخلة واحدة داخل الأخرى، تكاد تملؤها.',
        'وفي داخلها تابوت حجري وثلاثة توابيت متداخلة، أعمقها من الذهب الخالص، وفيه مومياء الملك وقد غطّى القناع الذهبي رأسها وكتفيها.',
        'وفي العالم الآخر، كان القلب يوزن أمام ريشة ماعت، رمز الحق والنظام. فإذا تعادلت الكفّتان، عاش المتوفى إلى الأبد.',
      ],
      more: [
        'آمن المصريون بأن لكل إنسان «كا»، أي قوة الحياة، و«با»، أي الشخصية، وأن كليهما يحتاج إلى جسد محفوظ يعود إليه.',
        'استغرق التحنيط نحو سبعين يومًا. حُفظت الأعضاء الداخلية منفصلة وبقي القلب في الجسد، ووُضعت أعضاء الملك في الصندوق الكانوبي داخل الخزانة المجاورة لحجرة الدفن.',
        'يزن التابوت الداخلي نحو ١١٠ كيلوجرامات. وصُنع القناع الذهبي من أكثر من عشرة كيلوجرامات من الذهب، وطُعّم باللازورد والكوارتز والسَّبَج والعقيق الأحمر والزجاج الملوّن.',
      ],
    },
    legacy: {
      kicker: 'خاتمة · اليوم',
      title: 'الإرث الحي',
      paragraphs: [
        'جعل الاكتشاف توت عنخ آمون أشهر فراعنة العالم بين ليلة وضحاها.',
        'واليوم يجمع المتحف المصري الكبير، بجوار أهرامات الجيزة، كنوزه في قاعات مخصّصة.',
        'والآن الرحلة رحلتك. اجمع الكنوز التي استوقفتك، ثم اذهب للقائها بنفسك.',
      ],
      more: [
        'تُحفظ سجلات الحفائر، أي ملاحظات كارتر وبطاقات القطع وصور بيرتون، في معهد غريفيث بجامعة أكسفورد.',
        'تتغير المعروضات من وقت لآخر. راجع القنوات الرسمية للمتحف المصري الكبير لمعرفة المعروض أثناء زيارتك.',
      ],
    },
  },
}

export const ARTIFACT_TEXT: Record<Lang, Record<TreasureId, ArtifactText>> = {
  en: {
    // Description, facts and inscription quoted or summarised from the Grand Egyptian
    // Museum's collection record for the mask (GEM no. 8).
    mask: {
      name: 'Gold Mask of Tutankhamun',
      origin: 'Tutankhamun Galleries · GEM no. 8',
      short: 'Solid gold, placed over the head and shoulders of the king’s mummy.',
      long: 'One of the most famous objects in the world. The king is made to look like Osiris, ruler of the underworld, and the sun god Re, whose body was made of gold and hair of lapis lazuli. At the same time it is a perfect version of Tutankhamun’s own face, recognisable from his coffins, statues and temple reliefs.',
      facts: [
        { label: 'Period', value: 'New Kingdom' },
        { label: 'Materials', value: 'Gold, glass, lapis lazuli, obsidian, carnelian, faience, quartzite' },
        { label: 'Provenance', value: 'Luxor, Upper Egypt' },
        { label: 'Width', value: '39.3 cm' },
      ],
      note: 'The inscription on this model’s back is a decorative arrangement of signs, not a copy of the original text.',
      hotspots: {
        uraeus: { title: 'Vulture and cobra', text: 'Nekhbet the vulture and Wadjet the cobra rise from the brow — the protective goddesses of Upper and Lower Egypt.' },
        eyes: { title: 'Eyes and brows', text: 'Inlaid eyes of quartz and obsidian, outlined and browed in blue. The inscription names the right eye the night boat of Re and the left eye the day boat.' },
        ears: { title: 'Pierced ears', text: 'The earlobes are pierced for earrings.' },
        nemes: { title: 'The nemes headcloth', text: 'Gold bands alternate with blue glass, echoing the sun god’s hair of lapis lazuli. At the back the stripes fan out into a bound queue.' },
        beard: { title: 'The divine beard', text: 'A long, plaited beard — a mark of divinity — inlaid in gold and blue, curving gently forward.' },
        collar: { title: 'Broad collar', text: 'Rows of inlays end in falcon-head terminals at the shoulders.' },
        inscription: { title: 'Protective inscription', text: '“Your forehead is Anubis, your right eye is the night boat (of Re), your left eye is the day boat, your eyebrows are in the company of nine gods.” — from the inscription on the back, as translated by the GEM.' },
      },
    },
    anubis: {
      name: 'Anubis Shrine',
      origin: 'Treasury · Tomb KV62',
      short: 'The jackal god lay at the doorway of the Treasury, as if keeping watch over the king’s burial.',
      long: 'Anubis, god of embalming and protector of the dead, rests on a gilded shrine mounted on a sledge with carrying poles. The figure is carved wood coated in black resin, with gilded details. When it was found, it was draped in linen.',
      hotspots: {
        ears: { title: 'Gilded ears', text: 'The insides of the tall ears are covered in gold leaf, catching the light of the lamps.' },
        eyes: { title: 'Inlaid eyes', text: 'The eyes are inlaid with calcite and obsidian, set in gold.' },
        collar: { title: 'Collar', text: 'A gilded collar circles the jackal’s neck.' },
        black: { title: 'Black resin', text: 'Black was the colour of the fertile Nile silt — a symbol of rebirth, not of mourning.' },
        shrine: { title: 'The shrine-chest', text: 'The gilded chest is decorated with alternating djed pillars and tyet knots — symbols of stability and protection. Its compartments held amulets and ritual objects.' },
        poles: { title: 'Carrying poles', text: 'Poles allowed the shrine to be carried, perhaps in the funeral procession.' },
      },
    },
    throne: {
      name: 'Golden Throne',
      origin: 'Antechamber · Tomb KV62',
      short: 'Gold over wood, inlaid with glass, faience and stone — with an intimate scene from royal life.',
      long: 'The backrest shows Queen Ankhesenamun gently touching the king’s shoulder beneath the rays of the Aten. On the throne his name appears in both forms — Tutankhaten and Tutankhamun — a record of the religious change of his reign.',
      hotspots: {
        aten: { title: 'The Aten', text: 'The sun disc’s rays end in tiny hands offering life — a hallmark of Amarna-period art.' },
        scene: { title: 'The royal couple', text: 'Ankhesenamun touches her husband’s shoulder, perhaps anointing him with perfume. Both wear elaborate crowns and collars.' },
        lions: { title: 'Lion heads', text: 'Lions guard the front of the seat — symbols of royal power.' },
        cobras: { title: 'Winged cobras', text: 'The arms are formed by winged cobras wearing the Double Crown, protecting the king’s names.' },
        legs: { title: 'Lion legs', text: 'The legs end in lion’s paws resting on small drums.' },
      },
    },
    canopic: {
      name: 'Canopic Shrine',
      origin: 'Treasury · Tomb KV62',
      short: 'Four goddesses spread their arms to protect the king’s preserved organs.',
      long: 'Inside this gilded shrine stood a calcite chest with four compartments. Each held a miniature gold coffin containing one of the king’s embalmed organs. Isis, Nephthys, Neith and Serket stand guard on every side.',
      hotspots: {
        goddesses: { title: 'Four guardian goddesses', text: 'Isis, Nephthys, Neith and Serket stand on each side with arms outstretched in protection. Their heads turn gently to one side — a rare, lifelike pose in Egyptian sculpture.' },
        uraei: { title: 'Cobra frieze', text: 'Rows of rearing cobras, each crowned with a sun disc, top the shrine and its canopy.' },
        chest: { title: 'The calcite chest', text: 'Hidden inside: a chest of calcite whose stoppers are carved in the likeness of the king.' },
        sledge: { title: 'The sledge', text: 'The shrine stands on a sledge, as if ready to be drawn to the tomb.' },
      },
    },
  },
  ar: {
    mask: {
      name: 'القناع الذهبي لتوت عنخ آمون',
      origin: 'قاعات توت عنخ آمون · رقم ٨ في المتحف',
      short: 'من الذهب الخالص، وُضع فوق رأس مومياء الملك وكتفيها.',
      long: 'من أشهر القطع في العالم. صُوّر الملك في هيئة أوزيريس، حاكم العالم الآخر، وفي هيئة إله الشمس رع، الذي كان جسده من ذهب وشعره من لازورد. وهو في الوقت نفسه صورة مثالية لوجه توت عنخ آمون نفسه، يمكن تمييزها من توابيته وتماثيله ونقوش معابده.',
      facts: [
        { label: 'العصر', value: 'الدولة الحديثة' },
        { label: 'المواد', value: 'ذهب، زجاج، لازورد، سَبَج، عقيق أحمر، قيشاني، كوارتزيت' },
        { label: 'مكان العثور', value: 'الأقصر، مصر العليا' },
        { label: 'العرض', value: '٣٩٫٣ سم' },
      ],
      note: 'النقوش على ظهر هذا النموذج ترتيب زخرفي للعلامات، وليست نسخة من النص الأصلي.',
      hotspots: {
        uraeus: { title: 'العُقاب والكوبرا', text: 'تعلو الجبهةَ نخبت في هيئة العُقاب وواجيت في هيئة الكوبرا — الإلهتان الحاميتان لمصر العليا ومصر السفلى.' },
        eyes: { title: 'العينان والحاجبان', text: 'عينان مطعّمتان بالكوارتز والسَّبَج، محدّدتان وحاجباهما باللون الأزرق. ويسمّي النقش العينَ اليمنى مركبَ الليل لرع، واليسرى مركبَ النهار.' },
        ears: { title: 'الأذنان المثقوبتان', text: 'شحمتا الأذنين مثقوبتان للأقراط.' },
        nemes: { title: 'غطاء الرأس «النمس»', text: 'تتناوب أشرطة الذهب مع الزجاج الأزرق، استحضارًا لشعر إله الشمس من اللازورد. ومن الخلف تتفرّع الخطوط نحو ضفيرة مربوطة.' },
        beard: { title: 'اللحية الإلهية', text: 'لحية طويلة مضفورة — علامة على الألوهية — مطعّمة بالذهب والأزرق، تنحني قليلًا إلى الأمام.' },
        collar: { title: 'القلادة العريضة', text: 'صفوف من الترصيعات تنتهي برأسَي صقر عند الكتفين.' },
        inscription: { title: 'النقش الحامي', text: '«جبهتك أنوبيس، وعينك اليمنى مركب الليل (لرع)، وعينك اليسرى مركب النهار، وحاجباك في صحبة التاسوع.» — من النقش على ظهر القناع، وفق ترجمة المتحف المصري الكبير.' },
      },
    },
    anubis: {
      name: 'مقصورة أنوبيس',
      origin: 'الخزانة · المقبرة KV62',
      short: 'رقد إله التحنيط عند مدخل الخزانة، كأنه يحرس دفن الملك.',
      long: 'يرقد أنوبيس، إله التحنيط وحامي الموتى، فوق مقصورة مذهّبة مثبّتة على زلّاقة ذات أعمدة للحمل. التمثال من الخشب المكسوّ بالراتنج الأسود، مع تفاصيل مذهّبة. وحين عُثر عليه كان ملفوفًا بقماش من الكتان.',
      hotspots: {
        ears: { title: 'الأذنان المذهّبتان', text: 'باطن الأذنين الطويلتين مكسوّ برقائق الذهب التي تلتقط ضوء المصابيح.' },
        eyes: { title: 'العينان المطعّمتان', text: 'طُعّمت العينان بالكالسيت والسَّبَج وأُطّرتا بالذهب.' },
        collar: { title: 'الطوق', text: 'طوق مذهّب يحيط بعنق ابن آوى.' },
        black: { title: 'الراتنج الأسود', text: 'كان الأسود لون طمي النيل الخصب — رمزًا للبعث، لا للحداد.' },
        shrine: { title: 'صندوق المقصورة', text: 'يزيّن الصندوقَ المذهّب تناوبٌ بين عمود «جد» وعقدة «تيت» — رمزي الثبات والحماية. وضمّت حجيراته تمائم وأدوات طقسية.' },
        poles: { title: 'أعمدة الحمل', text: 'أتاحت الأعمدة حمل المقصورة، ربما في موكب الجنازة.' },
      },
    },
    throne: {
      name: 'العرش الذهبي',
      origin: 'الحجرة الأمامية · المقبرة KV62',
      short: 'ذهب فوق الخشب، مطعّم بالزجاج والقيشاني والأحجار — ومشهد حميم من الحياة الملكية.',
      long: 'يصوّر ظهر العرش الملكة عنخ إسن آمون وهي تلمس كتف الملك برفق تحت أشعة آتون. ويظهر اسمه على العرش بصيغتيه — توت عنخ آتون وتوت عنخ آمون — شاهدًا على التحوّل الديني في عهده.',
      hotspots: {
        aten: { title: 'آتون', text: 'تنتهي أشعة قرص الشمس بأيادٍ صغيرة تمنح الحياة — وهي سمة مميزة لفن عصر العمارنة.' },
        scene: { title: 'الزوجان الملكيان', text: 'تلمس عنخ إسن آمون كتف زوجها، وربما تدهنه بالعطر، ويرتدي كلاهما تيجانًا وأطواقًا متقنة.' },
        lions: { title: 'رأسا الأسد', text: 'يحرس أسدان مقدمة المقعد — رمزًا للقوة الملكية.' },
        cobras: { title: 'الكوبرا المجنّحة', text: 'يتشكّل مسندا الذراعين من حيّتين مجنّحتين يعلوهما التاج المزدوج، تحميان اسمي الملك.' },
        legs: { title: 'أرجل الأسد', text: 'تنتهي الأرجل بمخالب أسد ترتكز على أسطوانات صغيرة.' },
      },
    },
    canopic: {
      name: 'مقصورة الأواني الكانوبية',
      origin: 'الخزانة · المقبرة KV62',
      short: 'أربع إلهات يبسطن أذرعهن لحماية أحشاء الملك المحنّطة.',
      long: 'داخل هذه المقصورة المذهّبة كان صندوق من الكالسيت ذو أربع حجيرات، في كل منها تابوت ذهبي صغير يضم أحد أعضاء الملك المحنّطة. وتقف إيزيس ونفتيس ونيت وسرقت حارساتٍ على كل جانب.',
      hotspots: {
        goddesses: { title: 'الإلهات الحارسات الأربع', text: 'تقف إيزيس ونفتيس ونيت وسرقت على جوانب المقصورة باسطاتٍ أذرعهن للحماية، وقد التفتت رؤوسهن قليلًا إلى جانب — في وضعٍ نابض بالحياة نادر في النحت المصري.' },
        uraei: { title: 'إفريز الكوبرا', text: 'صفوف من الكوبرا المنتصبة، يتوّج كلًّا منها قرص الشمس، تعلو المقصورة ومظلّتها.' },
        chest: { title: 'صندوق الكالسيت', text: 'في الداخل: صندوق من الكالسيت نُحتت سدّاداته على هيئة رأس الملك.' },
        sledge: { title: 'الزلّاقة', text: 'تقف المقصورة على زلّاقة، كأنها جاهزة لتُجرّ إلى المقبرة.' },
      },
    },
  },
}
