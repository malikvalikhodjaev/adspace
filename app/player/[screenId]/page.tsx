import Player from './player';
export const metadata = {
  title: 'LED-плеер · Maydonlar',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default async function Page({
  params,
}: {
  params: Promise<{ screenId: string }>;
}) {
  const { screenId } = await params;
  return <Player screenId={screenId} />;
}
