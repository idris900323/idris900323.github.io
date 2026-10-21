# Credits and provenance

Last checked 20 October 2026. Everything below describes what is in this repository and in the published site. "Not verified" means I could not confirm it from the files and it needs a decision from Idris.

## Designs and people
- **RoboDog**: mechanical design by James Bruton (XRobots), open source. The electronics, calibration tool and software are Idris's own.
- **8-bit computer**: design by Ben Eater; built with Pervin Korino Dasan.
- **3D printing workshop**: led by Gowtham S. at HephaForge (named in Idris's own LinkedIn post).
- Other collaborators and mentors are named only where Idris names them publicly in his own posts.

## Photos, renders and screenshots (`public/media/img`)
Every file is converted by `npm run media` (WebP, metadata stripped; a check of all 56 published image files found no EXIF or XMP data, so no GPS or camera information). The originals are kept in `src/assets/raw/`, which is git-ignored and not part of the repository.

Sources: **Deck** = Idris's own portfolio deck. **LinkedIn export** = media from Idris's own LinkedIn data export. **Own folder** = images Idris saved into the `linkedin-media` folder. **Own files** = rendered from Idris's own design exports.

| Image | What it is | Source | Other people shown? |
|---|---|---|---|
| `image5` | 8-bit computer on breadboards | Deck | No |
| `eightbit-day1` | Day 1 breadboards (logic gates and 555 timers) | LinkedIn export | No |
| `image6` | Spider quadruped photo | Deck | No |
| `image7` | RoboDog photo | Deck | No |
| `li-dog-bench` | RoboDog parts on the bench | Own folder | No |
| `li-cad-dog` | RoboDog CAD render | Own folder | No |
| `li-cad-part` | A part modelled in Fusion | Own folder | No |
| `li-battery` | Custom 2S2P battery pack | Own folder | No |
| `li-calib-pins`, `li-calib-legs`, `li-calib-log` | Screenshots of the RoboDog calibration tool | Own folder | No |
| `image8`, `image9`, `image10` | Bluetooth vehicle photos (castor car, four-wheel car, tracked tank) | Deck | No |
| `image15` | ESP32 and IMU prototype board (G.A.I.T.) | Deck | No |
| `image14` | Concept render of the wristband, labelled "Concept render" | Deck | An elderly wrist and hand, no face. Not verified how it was made (see questions) |
| `image13`, `image17` | Illustrations (swarm stages, net system), labelled "Illustration" | Deck | No. Not verified how they were made (see questions) |
| `image16` | Screenshot of the original PID digital-twin tool (also the poster of the "recording" video) | Deck | No |
| `image11`, `image12` | Blender render and Python simulation of the in-pipe robot | Deck | No |
| `image18` | Workcell photo (ABB IRB 1600 cell) | Deck | Checked on 20 Oct 2026 at 1280 px: no ABB wordmark is legible, no identifiable face. A few tiny distant figures are visible through the window, a hard hat sits on a cabinet. Check the full-size original before publishing if you want to be certain about the small label on the arm |
| `expo-robots` | Robot arms at Automation Expo South 2025 | LinkedIn export | Yes: visitors in the background, low resolution, mostly turned away. Approved by Idris (21 Oct 2026) |
| `iisc-hall` | Laboratory hall, IISc EE Summer School | LinkedIn export | No (people on the left were cropped out) |
| `iisc-lab` | Electrical cabinet seen on the lab tour | LinkedIn export | No |
| `li-iisc-me` | Idris beside the EE Summer School banner (location overlay cropped off) | Own folder | Idris only |
| `li-emcee` | Idris at the lectern, First-Year Inauguration (black bars cropped) | Own folder | Idris, plus a sliver of one person at the bottom-right edge |
| `li-podcast-logo` | Frame from the public Elite Encounters video: Idris and a guest at the desk, show logo behind | Thumbnail of a public YouTube video on the Easwari Engineering College channel (third-party content, stored locally) | Yes: Idris and the guest. Idris states the video is public and the guest agreed |
| `li-talentia-a`, `li-talentia-b` | Idris at the lectern at the inaugural ceremony of Talentia, the college's two-day cultural event (second photo cropped to remove a person at the right edge) | Own folder | Idris; a person's head at the bottom edge of the first photo (organiser, approved by Idris as stage context). Event date not recorded |
| `expo-station`, `expo-spring`, `expo-cutter`, `expo-dino` | Machines on trade-expo stands (pneumatic line with PLC cabinet, CNC spring coiler, flat-bed cutter, metal dinosaur) | Own folder | Visitors and staff in the background of `expo-station` and `expo-cutter`, small; Idris approved expo visitors. Which expo each is from is not recorded, so captions name none |
| `li-soccer` | Robo Soccer arena frame (video screenshot, player close button and top strip cropped) | Own folder | Bystanders, mostly cropped or turned away |
| `li-print-model`, `li-print-result`, `li-print-bag` | The dragon keychain (Fusion model, print, on a bag) | Own folder | No |
| `sub-sch-boost`, `sub-pcb-boost`, `sub-3d-boost` | XL6009 boost converter schematic, PCB layout and 3D view | Own files (Subtlebotic internship; Idris confirmed they are not confidential) | No |
| `sub-sch-bms`, `sub-pcb-bms` | Battery management system schematic and PCB layout | Own files | No |
| `sub-pcb-longpress` | Long-press switch PCB layout | Own files | No |
| `rlpid-poster`, `stepscribe-poster` | Poster frames taken from the two project videos | The videos below | No |

Four small icon files from the deck (`image1` to `image4`) were not used anywhere and were removed from the published folder on 20 Oct 2026.

## Videos (`public/media/vid`)
| File | What it is | Audio |
|---|---|---|
| `pid-demo.mp4` | Screen recording of the original PID tool (deck recording, recompressed) | None |
| `rl-pid.mp4` | A 19.5 s explainer about the PID and RL work, made with the Hyperframes "brag" workflow from project material | **Removed.** The version made earlier had a music bed from a royalty-free music site with no licence file or terms note in this repository, so the audio was stripped (video stream copied unchanged) |
| `stepscribe.mp4` | A 21.6 s explainer about stepscribe-cad, same workflow | **Removed**, same reason |

The versions with audio are kept outside the repository, in `project-videos/originals-with-audio/` next to the repository folder. Do not restore the audio unless the licence terms of that track are saved in `docs/`. All three videos are shown muted. The earlier versions with the music are still in the git history (see the publishing checklist).

## Sound (Chaos mode)
There are no audio files in the repository or in the build. Every sound is generated in the browser by `src/chaos/sfx.ts` with the Web Audio API, from oscillators (sine, triangle, square, sawtooth) and filtered noise, through a small compressor and a synthetic reverb.
- **The chiptune loop** on the warning screen is generated live by `startMusic()`: a 4-bar pattern at 132 bpm over the chords Am, F, C and G, with a synthesised kick, snare, hi-hat, square-wave bass and a triangle arpeggio. It is original and uses no samples.
- **The fanfare** is an original synthesised chord. It is written in a heroic style but does not reproduce any film, game or wrestling theme.
- Sound is muted from the speaker button, remembered for the visit, and never plays before the visitor has interacted with the page.

## Third-party embeds and links (not hosted by this site)
- **Rick roll video** (`youtube-nocookie.com/embed/dQw4w9WgXcQ`) and the **jumpscare theme video** (`youtube-nocookie.com/embed/_1CC4DWJvcQ`, a fan upload titled "WWE John Cena Official Theme Song (HQ)" by the channel MrSaddam14, not an official WWE channel): loaded from YouTube only when those Chaos effects fire, with a close button each. They are embeds, so no copy is stored or served by this site. YouTube's oEmbed service returned the video's metadata on 21 October 2026, which suggests embedding is allowed. Test it once on the live site. A fan upload can be removed or blocked at any time, so the gag has a text and sound fallback.
- **Links only**: the First-Year Inauguration recording and the Elite Encounters episode on the Easwari Engineering College YouTube channel; the LeetCode and Duolingo profiles; LinkedIn and GitHub.
- The Content Security Policy allows only `youtube-nocookie.com` as a frame source.

## Generated art
- The mascot Scout and every Chaos decoration are original SVG and CSS drawn for this site. They are not modelled on any existing character. Scout's design: round visor head, antenna with a yellow tip, pink side pods.
- No image on the site was generated by this build. Whether the deck images `image13`, `image14` and `image17` were made with an image generator is not recorded in the files (see questions).

## Fonts (self-hosted through Fontsource, SIL Open Font License)
IBM Plex Sans and IBM Plex Mono, Space Grotesk, Noto Sans JP, M PLUS Rounded 1c (Chaos mode only, Japanese weight 500).

## Libraries
Runtime: React, zustand, lucide-react (ISC, icons), matter-js (MIT, Chaos mode only, loaded on demand), Fontsource font packages.
Build and test: Vite, Tailwind CSS, TypeScript, vitest, Playwright, oxlint, sharp.

## Reused code
The simulations are written for this site. The PID twin structure echoes Idris's own Digital Twin RL-PID project; the simulation uses illustrative values, not measured data.
