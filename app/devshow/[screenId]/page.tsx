import DisplayGrid from '../../display/[screenId]/display-grid';

export const metadata = {
  title: 'Devshow · Efir setkasi · Maydonlar',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function Page({
  params,
}: {
  params: Promise<{ screenId: string }>;
}) {
  return <DisplayGrid screenId={(await params).screenId} />;
}
