'use client';
import { useEffect, useRef } from 'react';
import type { Surface } from '@/lib/catalog';
import 'leaflet/dist/leaflet.css';
export default function CityMap({
  surfaces,
  onSelect,
}: {
  surfaces: Surface[];
  onSelect: (s: Surface) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let dispose = () => {};
    let cancelled = false;
    void import('leaflet').then((L) => {
      if (cancelled || !el.current) return;
      const map = L.map(el.current).setView([41.31, 69.26], 11);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      for (const s of surfaces) {
        const icon = L.divIcon({
          className: 'map-marker',
          html: Math.round(s.price / 1000) + 'k',
          iconSize: [56, 32],
        });
        L.marker([s.lat, s.lng], { icon, title: s.name, keyboard: true })
          .addTo(map)
          .on('click', () => onSelect(s));
      }
      dispose = () => map.remove();
    });
    return () => {
      cancelled = true;
      dispose();
    };
  }, [surfaces.map((s) => s.id + s.price).join(',')]);
  return (
    <div
      ref={el}
      className="city-map"
      role="region"
      aria-label="Карта LED-экранов Ташкента"
    />
  );
}
