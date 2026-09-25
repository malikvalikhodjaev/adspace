import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { catalogHref } from '@/lib/occasions';
import { referencePreviewPath } from '@/lib/reference-screens';

export default function Landing({
  uz,
  browse,
  startPlacement,
}: {
  uz: boolean;
  browse: () => void;
  startPlacement: () => void;
}) {
  const t = (ru: string, uzText: string) => (uz ? uzText : ru);
  return (
    <>
      <section className="landing-hero">
        <div className="landing-copy">
          <p className="kicker">
            {t('ТАШКЕНТ · ЭКРАНЫ ГОРОДА', 'TOSHKENT · SHAHAR EKRANLARI')}
          </p>
          <h1>
            {t('ВАШ МОМЕНТ.', 'SHAHAR SIZNI')}
            <br />
            <em>{t('на большом экране.', 'ko‘rsin.')}</em>
          </h1>
          <p className="landing-lead">
            {t(
              'Разместите своё фото, поздравление или рекламу на экранах города. Для особенного человека, важного события или вашего бизнеса.',
              'Shaharning bir kichik qismini o‘zingizniki qiling. Suratingiz, tabrigingiz yoki reklamangizni shahar ekranlariga oson joylashtiring.',
            )}
          </p>
          <div className="landing-actions">
            <a
              href="/#ideas"
              className="primary"
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                  e.preventDefault();
                  startPlacement();
                }
              }}
            >
              {t('Разместить на экране', 'Joylashtirish')}{' '}
              <ArrowUpRight size={19} />
            </a>
            <a
              href={catalogHref()}
              className="secondary"
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                  e.preventDefault();
                  browse();
                }
              }}
            >
              {t('Посмотреть экраны', 'Ekranlar')}{' '}
              <ArrowRight size={18} />
            </a>
          </div>
          <p className="landing-owner-hint">
            {t(
              'Для себя, близких и бизнеса. Повод выбираете вы.',
              'O‘zingiz, yaqinlaringiz va biznes uchun. Sababni o‘zingiz tanlang.',
            )}
          </p>
        </div>
        <figure className="landing-art landing-photo-mosaic">
          <div className="landing-photo-grid">
            {[
              { photo: '/reference-screens/park-in-mall.jpg', supplier: '7MEDIA', place: 'Tashkent City' },
              { photo: '/reference-screens/m-exclusive-p4.jpg', supplier: 'M-EXCLUSIVE', place: 'Samarqand Darvoza' },
              { photo: '/reference-screens/topic-gek-112.jpg', supplier: 'TOPIC', place: 'Osiyo ko‘chasi' },
              { photo: '/reference-screens/lmi-s1.jpg', supplier: 'LIGHT MEDIA INVEST', place: 'Shahriston' },
            ].map((screen, index) => (
              <div className="landing-photo" key={screen.supplier}>
                <img
                  src={referencePreviewPath(screen.photo)}
                  width="960"
                  height="540"
                  alt={`${screen.place} · ${screen.supplier}`}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  fetchPriority={index === 0 ? 'high' : undefined}
                  decoding="async"
                />
                <span>{screen.supplier}</span>
              </div>
            ))}
          </div>
          <figcaption>{t('Реальные экраны · фото из каталогов операторов', 'Haqiqiy ekranlar · operatorlar katalogidan suratlar')}</figcaption>
        </figure>
      </section>
      <section
        className="landing-steps"
        aria-label={t(
          'Как разместить на экране',
          'Ekranda qanday joylashtirish mumkin',
        )}
      >
        {[
          [
            '01',
            t('Выберите экран', 'Ekran tanlang'),
            t('Найдите место и удобное время.', 'Joy va qulay vaqtni tanlang.'),
          ],
          [
            '02',
            t('Оформите размещение', 'Rasm yoki video yuboring'),
            t(
              'Добавьте фото или видео и отправьте на согласование.',
              'Surat yoki video qo‘shib, ekran egasiga yuboring.',
            ),
          ],
          [
            '03',
            t('Следите за размещением', 'Joylashtirishni kuzating'),
            t(
              'Статус и расписание — в вашем кабинете.',
              'Holat va jadval — kabinetingizda.',
            ),
          ],
        ].map(([number, title, copy]) => (
          <div key={number}>
            <span>{number}</span>
            <div>
              <h2>{title}</h2>
              <p>{copy}</p>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
