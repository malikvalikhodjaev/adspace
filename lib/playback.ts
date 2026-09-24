import { database } from './store';
import { tashkent, type Campaign } from './model';
import { nextPlayDue } from './pricing';

export function playedToday(screen: string, campaign: string, now = new Date()) {
  const localDay = tashkent(now).slice(0, 10);
  const start = new Date(Date.parse(`${localDay}T00:00:00Z`) - 5 * 3600000);
  const end = new Date(start.getTime() + 86400000);
  const row = database()
    .prepare('SELECT COUNT(*) AS count FROM playback WHERE screen=? AND campaign=? AND at>=? AND at<?')
    .get(screen, campaign, start.toISOString(), end.toISOString()) as { count: number };
  return row.count;
}

export function remainingPlays(screen: string, campaign: Campaign) {
  return campaign.playsPerDay === undefined
    ? null
    : Math.max(0, campaign.playsPerDay - playedToday(screen, campaign.id));
}

export function playbackDue(screen: string, campaign: Campaign) {
  if (campaign.playsPerDay === undefined) return true;
  const completed = playedToday(screen, campaign.id);
  return completed < campaign.playsPerDay && nextPlayDue(campaign, completed);
}
