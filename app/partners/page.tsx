import type { Metadata } from 'next';
import PartnerLanding from './partner-landing';

export const metadata: Metadata = {
  title: 'Hamkorlarga — Maydonlar',
  description:
    'Ekraningiz jadvalidagi bo‘sh vaqtlarni Maydonlar platformasida buyurtmalarga oching va qisqa muddatli joylashtirishlardan ham qo‘shimcha daromad oling.',
};

export default function PartnersPage() {
  return <PartnerLanding />;
}
