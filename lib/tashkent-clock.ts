const tashkentOffsetMs = 5 * 60 * 60 * 1000;

export function tashkentClock(instantMs: number) {
  const local = new Date(instantMs + tashkentOffsetMs).toISOString();
  return {
    date: `${local.slice(8, 10)}.${local.slice(5, 7)}.${local.slice(0, 4)}`,
    time: local.slice(11, 19),
    dateTime: `${local.slice(0, 19)}+05:00`,
  };
}
