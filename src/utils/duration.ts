const MULTIPLIERS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);

  if (!match?.[1] || !match[2]) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = Number(match[1]);
  const multiplier = MULTIPLIERS[match[2]];

  if (!multiplier) {
    throw new Error(`Invalid duration unit: ${match[2]}`);
  }

  return value * multiplier;
}

export function parseDurationToDate(duration: string): Date {
  return new Date(Date.now() + parseDurationToMs(duration));
}
