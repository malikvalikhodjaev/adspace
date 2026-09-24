export const occasions = [
  {
    id: 'photo',
    title: ['Моё фото', 'Mening suratim'],
    description: [
      'Ваш портрет, любимый кадр или творческая работа — на экране города.',
      'Portretingiz, sevimli suratingiz yoki ijodiy ishingiz — shahar ekranida.',
    ],
    hint: [
      'Загрузите своё фото или готовую композицию. Убедитесь, что у вас есть согласие людей на снимке.',
      'Suratingiz yoki tayyor kompozitsiyani yuklang. Suratdagi odamlarning roziligi borligiga ishonch hosil qiling.',
    ],
    name: ['Моё фото на экране', 'Mening suratim ekranda'],
  },
  {
    id: 'greeting',
    title: ['Поздравление', 'Tabrik'],
    description: [
      'День рождения, годовщина или выпускной. Сделайте поздравление заметным.',
      'Tug‘ilgan kun, yubiley yoki bitiruv. Tabrikni katta ekranda ko‘rsating.',
    ],
    hint: [
      'Загрузите готовую открытку с фото и поздравлением или видеопослание.',
      'Suratli tayyor tabriknoma yoki videotabrik yuklang.',
    ],
    name: ['Поздравление на экране', 'Ekrandagi tabrik'],
  },
  {
    id: 'love',
    title: ['Признание', 'Sevgi izhori'],
    description: [
      'Тёплые слова любимому человеку или особенное предложение.',
      'Yaqin insoningizga iliq so‘zlar yoki unutilmas taklif.',
    ],
    hint: [
      'Подготовьте изображение или видео с вашим посланием. Личные данные лучше не публиковать.',
      'Xabaringiz bilan rasm yoki video tayyorlang. Shaxsiy ma’lumotlarni oshkor qilmagan ma’qul.',
    ],
    name: ['Послание на экране', 'Ekrandagi xabar'],
  },
  {
    id: 'event',
    title: ['Событие', 'Tadbir'],
    description: [
      'Концерт, открытие или встреча. Пригласите город присоединиться.',
      'Konsert, ochilish yoki uchrashuv. Shahar ahlini taklif qiling.',
    ],
    hint: [
      'Загрузите афишу или видеоанонс. Проверьте дату, время и место события.',
      'Afisha yoki videoe’lon yuklang. Tadbir sanasi, vaqti va manzilini tekshiring.',
    ],
    name: ['Анонс события', 'Tadbir e’loni'],
  },
  {
    id: 'business',
    title: ['Для бизнеса', 'Biznes uchun'],
    description: [
      'Товар, услуга или акция. Расскажите о себе рядом с вашей аудиторией.',
      'Mahsulot, xizmat yoki aksiya. Auditoriyangizga o‘zingiz haqingizda ayting.',
    ],
    hint: [
      'Добавьте готовое рекламное изображение или видео. Материал пройдёт согласование.',
      'Tayyor reklama rasmi yoki videosini qo‘shing. Material tasdiqlashdan o‘tadi.',
    ],
    name: ['Рекламное размещение', 'Reklama joylashtirish'],
  },
] as const;

export type OccasionId = (typeof occasions)[number]['id'];

export function occasionById(value: unknown) {
  return occasions.find((item) => item.id === value);
}

export function occasionFromSearch(search: string) {
  return occasionById(new URLSearchParams(search).get('occasion'))?.id || '';
}

export function catalogHref(occasion?: string, resume = false) {
  const params = new URLSearchParams({ view: 'catalog' });
  const known = occasionById(occasion);
  if (known) params.set('occasion', known.id);
  if (resume) params.set('resume', '1');
  return '/?' + params.toString();
}

export function placementNameForOccasion(
  current: string,
  occasion: unknown,
  uz = false,
) {
  if (
    current.trim() &&
    !occasions.some((item) => item.name.some((name) => name === current))
  )
    return current;
  return occasionById(occasion)?.name[uz ? 1 : 0] || '';
}
