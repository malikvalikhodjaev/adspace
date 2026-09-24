'use client';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
export default function OperatorTools({
  save,
  uz,
}: {
  save: (data: Record<string, unknown>) => Promise<boolean>;
  uz: boolean;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  return (
    <>
      <button className="primary" onClick={() => setOpen(true)}>
        + {uz ? 'Ekran qo‘shish' : 'Добавить экран'}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="wide-dialog">
          <DialogTitle>
            {uz ? 'Yangi LED ekran' : 'Новый LED-экран'}
          </DialogTitle>
          <DialogDescription>
            {uz
              ? 'Sinov katalogi. Haqiqiy tekshiruv o‘tkazilmaydi.'
              : 'Тестовый каталог. Реальная верификация не выполняется.'}
          </DialogDescription>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const f = new FormData(e.currentTarget);
              const surface = {
                name: f.get('name'),
                address: f.get('address'),
                district: f.get('district'),
                lat: Number(f.get('lat')),
                lng: Number(f.get('lng')),
                price: Number(f.get('price')),
              };
              if (await save({ action: 'addSurface', surface })) setOpen(false);
              setBusy(false);
            }}
          >
            {[
              ['name', uz ? 'Nomi' : 'Название', 'text'],
              ['address', uz ? 'Manzil' : 'Адрес', 'text'],
              ['district', uz ? 'Tuman' : 'Район', 'text'],
              [
                'price',
                uz ? 'Kunlik narx, so‘m' : 'Цена за сутки, сум',
                'number',
              ],
              ['lat', uz ? 'Kenglik' : 'Широта', 'number'],
              ['lng', uz ? 'Uzunlik' : 'Долгота', 'number'],
            ].map(([id, label, type]) => (
              <label key={id}>
                {label}
                <input
                  name={id}
                  type={type}
                  step={id === 'lat' || id === 'lng' ? 'any' : '1'}
                  required
                  maxLength={100}
                />
              </label>
            ))}
            <button className="primary full" disabled={busy}>
              {uz ? 'Saqlash' : 'Сохранить экран'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
