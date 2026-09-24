import RemotePlayer from './remote-player';
export const metadata = {
  title: 'Управляемый экран · Maydonlar',
  referrer: 'no-referrer',
};
export default async function Page({
  params,
}: {
  params: Promise<{ screenId: string }>;
}) {
  return <RemotePlayer screenId={(await params).screenId} />;
}
