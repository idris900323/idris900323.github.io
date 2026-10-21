// One switch per gag (guide §22.6). Set false to disable. `maxConcurrent` is the global intensity cap.
export const chaosConfig = {
  maxConcurrent: 3,
  gags: {
    moon: true, // G1 gravity collapse (bait: the Moon's "Do not press")
    clickStamps: true, // G3 comic sound words on click
    barrelRoll: true, // G4 Konami code or typing "roll"
    scrollRail: true, // G5 scroll progress rail: the rocket flies down the page, section stops are links
    rickRoll: true, // the page shakes while scrolling, then a famous song plays (every visitor, once per session)
    idleNap: true, // G8 Scout naps, tab title changes
    scoutClicks: true, // G9 click-count escalation
    sectionNotes: true, // a short comment when the reader has been in a project section for a moment
    selection: true, // G12 selection commentary
    consoleBanner: true, // G13 DevTools banner
    cookieBanner: true, // G14 edible-cookie banner
    finale: true, // G15 thank-you finale
    flyby: true, // ambient fly-by
    dodge: true, // buttons in the page body step away from the cursor (a couple of times each)
    cena: true, // random jumpscare: giant text and a brass sting (original, not the real theme), once per visit
    omae: true, // type "omae": a famous verdict, then NANI
    shatter: true, // click a line of text: it breaks into words that fall and reassemble
    echo: true, // headings repeat themselves (documentation only: this effect is CSS and has no code switch yet)
    simGags: true, // P-series captions fired by the simulations
  },
} as const
export type GagId = keyof typeof chaosConfig.gags
