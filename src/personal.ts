// Slots for things only Idris can supply. Empty/null = hidden in production, dashed OPEN box in dev.
// Fill these in; nothing here is invented.
import type { L } from './content'

export const personal = {
  katakana: null as string | null, // e.g. 'イドリス・サディク' (only if confirmed)
  about: { en: '', ja: '' } as L, // short About blurb, his own words
  cv: { en: 'cv/Idris-Sadiq-CV.pdf' as string | null }, // file in public/cv/
  japanese: 'JLPT N5 passed; NAT-TEST 4Q passed', // already evidenced
  links: {
    leetcode: 'https://leetcode.com/u/D8V8Bftca1/' as string | null, // public profile URL
    duolingo: 'https://www.duolingo.com/profile/idris123_456-789' as string | null, // public profile URL
  },
}

// Project-level gaps (shown as OPEN in dev; omitted in production).
export const openFields: Record<string, string[]> = {
  abb: ['Research topic and supervisor (name only if allowed)'],
  swarm: ['My role in the project', 'Hardware test results when they exist'],
  net: ['Paper title, venue, status (ICCORSE 2026?)'],
  gait: ['My role details beyond Hardware Team Lead', 'Photos of the build'],
  vehicles: ['Smart India Hackathon: role, problem statement, outcome'],
  quadrupeds: ['Confirm the spider has 2 joints (8 servos): read from the photo', 'Better original photo of the spider quadruped'],
  cpu8: ['Build-log photos and day-by-day lessons'],
  pipe: ['Source repo link for the Python simulation'],
  pid: ['Paper venue and status; hardware validation when done'],
}
