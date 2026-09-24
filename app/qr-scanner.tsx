'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { QrCode } from 'lucide-react';
export default function QRScanner({
  onFound,
  uz,
}: {
  onFound: (id: string) => void;
  uz: boolean;
}) {
  const [open, setOpen] = useState(false),
    [error, setError] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!open) return;
    let stop = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout>;
    async function run() {
      try {
        const Detector = (
          window as unknown as {
            BarcodeDetector?: new (options: unknown) => {
              detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
            };
          }
        ).BarcodeDetector;
        if (!Detector)
          throw Error(
            uz
              ? 'Telefon kamerasidan foydalaning yoki ekran ID kiriting.'
              : 'В этом браузере используйте камеру телефона или введите ID экрана.',
          );
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (stop) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const scanner = new Detector({ formats: ['qr_code'] });
        async function tick() {
          if (stop || !video.current) return;
          try {
            for (const item of await scanner.detect(video.current)) {
              try {
                const url = new URL(item.rawValue);
                const id = url.searchParams.get('surface');
                if (url.origin === location.origin && id) {
                  onFound(id);
                  setOpen(false);
                  return;
                }
              } catch {}
            }
          } catch {}
          timer = setTimeout(() => void tick(), 400);
        }
        void tick();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Camera error');
      }
    }
    void run();
    return () => {
      stop = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open]);
  return (
    <>
      <button
        className="plain"
        onClick={() => {
          setError('');
          setOpen(true);
        }}
        aria-label={uz ? 'QR skanerlash' : 'Сканировать QR'}
      >
        <QrCode size={20} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="wide-dialog">
          <DialogTitle>{uz ? 'QR skanerlash' : 'Сканирование QR'}</DialogTitle>
          <DialogDescription>
            {uz
              ? 'Kamerani ekran QR-kodiga qarating.'
              : 'Наведите камеру на QR-код поверхности.'}
          </DialogDescription>
          {error ? (
            <p role="alert">{error}</p>
          ) : (
            <video ref={video} muted playsInline style={{ width: '100%' }} />
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              onFound(String(f.get('id')));
              setOpen(false);
            }}
          >
            <label>
              {uz ? 'Ekran ID' : 'ID экрана'}
              <input name="id" required />
            </label>
            <button className="primary">
              {uz ? 'Ochish' : 'Открыть карточку'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
