import { compactDateLabel } from './date-labels';

const actions: Record<string, [string, string]> = {
  create: ['Создан черновик', 'Qoralama yaratildi'],
  submit: ['Отправлено владельцу экрана', 'Ekran egasiga yuborildi'],
  technical: ['Владелец принял размещение', 'Ekran egasi qabul qildi'],
  'owner-approved': ['Добавлено в расписание', 'Jadvalga qo‘shildi'],
  'approval-reset': ['Подтверждение сброшено', 'Tasdiq bekor qilindi'],
  revision: ['Владелец попросил исправить', 'Ekran egasi tuzatishni so‘radi'],
  resubmit: ['Повторно отправлено владельцу', 'Ekran egasiga qayta yuborildi'],
  reject: ['Владелец отклонил', 'Ekran egasi rad etdi'],
  pause: ['Показ приостановлен', 'Ko‘rsatish to‘xtatildi'],
  resume: ['Показ возобновлён', 'Ko‘rsatish davom ettirildi'],
  cancel: ['Размещение отменено', 'Joylashtirish bekor qilindi'],
  dispute: ['Подана жалоба', 'Shikoyat yuborildi'],
  resolve: ['Жалоба рассмотрена', 'Shikoyat ko‘rib chiqildi'],
  expire: ['Время истекло', 'Vaqti tugadi'],
  expired: ['Период закончился', 'Muddat tugadi'],
  completed: ['Показ завершён', 'Ko‘rsatish tugadi'],
  playback: ['Плеер начал показ', 'Pleyer ko‘rsatishni boshladi'],
};

const roles: Record<string, [string, string]> = {
  advertiser: ['Заказчик', 'Buyurtmachi'],
  operator: ['Владелец экрана', 'Ekran egasi'],
  moderator: ['Модератор', 'Tekshiruvchi'],
  admin: ['Администратор', 'Administrator'],
  system: ['Система', 'Tizim'],
  player: ['Браузерный плеер', 'Brauzer pleyeri'],
};

const notes: Record<string, [string, string]> = {
  'Резерв на 30 минут': ['Время удержано на 30 минут', 'Vaqt 30 daqiqaga saqlandi'],
  'Подтверждение должно исходить от владельца экрана': [
    'Прежнее подтверждение не принадлежало владельцу экрана',
    'Oldingi tasdiq ekran egasidan bo‘lmagan',
  ],
  'Подтверждение владельца достаточно для расписания': [
    'Все владельцы подтвердили размещение',
    'Barcha ekran egalari joylashtirishni tasdiqladi',
  ],
  'Срок резерва черновика истёк': [
    'Черновик не был отправлен вовремя',
    'Qoralama vaqtida yuborilmadi',
  ],
  'Период завершён': ['Выбранное время закончилось', 'Tanlangan vaqt tugadi'],
  'Период завершён; непоказанная часть расчётной суммы возвращена': [
    'Период завершён; непоказанная часть суммы возвращена в расчётном журнале',
    'Muddat tugadi; ko‘rsatilmagan qism hisobda qaytarildi',
  ],
  'Период закончился без зарегистрированного воспроизведения': [
    'Период закончился, плеер не сообщил о показе',
    'Muddat tugadi, pleyer ko‘rsatish haqida xabar bermadi',
  ],
  'Браузерный плеер сообщил о начале показа; физический показ не подтверждён': [
    'Браузер начал показ; показ на физическом экране не подтверждён',
    'Brauzer ko‘rsatishni boshladi; haqiqiy ekrandagi namoyish tasdiqlanmagan',
  ],
};

export function auditActionLabel(action: string, uz: boolean) {
  return (actions[action] || ['Изменение', 'O‘zgarish'])[uz ? 1 : 0];
}

export function auditRoleLabel(role: string, uz: boolean) {
  return (roles[role] || ['Участник', 'Ishtirokchi'])[uz ? 1 : 0];
}

export function auditNoteLabel(note: string, uz: boolean) {
  return notes[note]?.[uz ? 1 : 0] || note;
}

export function auditTimeLabel(at: string) {
  const time = Date.parse(at);
  if (!Number.isFinite(time)) return at;
  const tashkent = new Date(time + 5 * 3600000).toISOString();
  return `${compactDateLabel(tashkent.slice(0, 10))}, ${tashkent.slice(11, 19)}`;
}
