// Achievements live in memory only: a page refresh, or leaving Chaos with Restore order, starts the count again.
// They survive two things: being evicted by the pet robot, and Chaos crashing and the page falling back to Calm.
let current: string[] = []
let keepNext = false

export const setCurrentAchievements = (list: string[]) => { current = list }
/** Call just before Chaos goes away because of an eviction or a crash. */
export const keepAchievementsForNextVisit = () => { keepNext = true }
/** The list a new Chaos visit starts with (safe to call twice, as React does in development). */
export function takeInitialAchievements(): string[] {
  const r = keepNext ? current : []
  current = r
  return r
}
/** Once the new visit has started, the "keep" flag is used up. */
export const achievementsTaken = () => { keepNext = false }
