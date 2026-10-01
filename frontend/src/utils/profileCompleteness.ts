import type { AppUser } from '../store/auth.store';

interface Check {
  label: string;
  weight: number;
  done: (u: AppUser, photoCount: number) => boolean;
}

const CHECKS: Check[] = [
  { label: 'Add at least 2 photos', weight: 20, done: (_, n) => n >= 2 },
  { label: 'Write a short bio', weight: 12, done: (u) => (u.bio?.trim().length ?? 0) >= 20 },
  { label: 'Pick your passions', weight: 12, done: (u) => (u.passions?.length ?? 0) >= 3 },
  { label: 'Verify your photo', weight: 12, done: (u) => u.isVerified || u.photoVerifiedStatus === 'verified' },
  { label: 'Add where you grew up', weight: 8, done: (u) => !!u.grewUpCity },
  { label: 'Add your job profile', weight: 8, done: (u) => !!u.jobProfile },
  { label: 'Add your education', weight: 6, done: (u) => !!u.education },
  { label: 'Add your profession', weight: 6, done: (u) => !!u.profession },
  { label: 'Add your height', weight: 4, done: (u) => !!u.heightCm },
  { label: 'Add your religion', weight: 4, done: (u) => !!u.religion },
  { label: 'Add your salary range', weight: 4, done: (u) => !!u.salaryRange },
  { label: 'Add your mother tongue', weight: 4, done: (u) => !!u.motherTongue },
];

export function getProfileCompleteness(user: AppUser | null | undefined, photoCount: number) {
  if (!user) return { percent: 0, nextSteps: [] as string[] };
  const total = CHECKS.reduce((n, c) => n + c.weight, 0);
  let earned = 0;
  const nextSteps: string[] = [];
  for (const check of CHECKS) {
    if (check.done(user, photoCount)) earned += check.weight;
    else nextSteps.push(check.label);
  }
  return { percent: Math.round((earned / total) * 100), nextSteps };
}
