export default function ServiceInfo({ uz = false }: { uz?: boolean }) {
  return (
    <details className="service-info">
      <summary>{uz ? 'Servis haqida' : 'О сервисе'}</summary>
      <p>
        {uz
          ? 'Katalogda maydon misollari bor; haqiqiy mavjudlik operator bilan alohida kelishiladi. Ko‘rsatilgan qamrov tasdiqlangan ko‘rishlar soni emas.'
          : 'Каталог содержит примеры площадок; фактическая доступность согласуется с оператором отдельно. Указанный охват не является подтверждённым числом просмотров.'}
      </p>
      <p>
        {uz
          ? 'Hozir namoyish brauzer pleyerida ishlaydi. Jismoniy LED-kontroller ulanmagan; pleyer tasdig‘i tashqi ekrandagi namoyishni isbotlamaydi. Pul yechilmaydi, elektron imzo rasmiylashtirilmaydi.'
          : 'Сейчас воспроизведение работает в браузерном плеере. Физический LED-контроллер не подключён; подтверждение плеера не доказывает наружный показ. Деньги не списываются, электронная подпись не оформляется.'}
      </p>
    </details>
  );
}
