// Animation follows the current audible beat; missed frames must not replay old kicks.
export function latestDueBeat(queue, now, maxAge = 0.25) {
  let n = 0;
  while (n < queue.length && queue[n].at <= now) n++;
  if (!n) return null;
  const beat = queue[n - 1];
  queue.splice(0, n);
  return now - beat.at <= maxAge ? beat : null;
}
