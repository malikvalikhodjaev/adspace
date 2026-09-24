import { tashkentClock } from '@/lib/tashkent-clock';
import './tashkent-clock.css';

export default function TashkentClock({
  instantMs,
  uz,
  className = '',
}: {
  instantMs: number;
  uz: boolean;
  className?: string;
}) {
  const clock = instantMs > 0 && Number.isFinite(instantMs)
    ? tashkentClock(instantMs)
    : null;

  return (
    <div className={`tashkent-clock ${className}`} role="timer" aria-live="off">
      <span className="tashkent-clock-label">
        {uz ? 'TOSHKENT VAQTI' : 'ВРЕМЯ ТАШКЕНТА'}
      </span>
      <time dateTime={clock?.dateTime} className="tashkent-clock-time">
        {clock?.time || '--:--:--'}
      </time>
      <span className="tashkent-clock-date">
        {clock?.date || '--.--.----'} · UTC+5
      </span>
    </div>
  );
}
