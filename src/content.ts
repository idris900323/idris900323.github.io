// Facts come from the portfolio deck copy, LinkedIn and Idris's own answers.
// Rules: no invented numbers; deck wording wins for status; OPEN items are hidden in production builds.
// NEEDS-NATIVE-REVIEW: every `ja` string is a draft and must be reviewed by a native Japanese speaker.
export type L = { en: string; ja: string }

export type Status =
  | 'BUILT' | 'GRANT' | 'IN DEVELOPMENT' | 'PROPOSED' | 'SIMULATED' | 'CONCEPTUAL' | 'INDUSTRY' | 'OPEN'

export const statusLabel: Record<Status, L> = {
  BUILT: { en: 'Built', ja: '製作済み' },
  GRANT: { en: 'Grant · prototype', ja: '助成・試作中' },
  'IN DEVELOPMENT': { en: 'In development', ja: '開発中' },
  PROPOSED: { en: 'Proposed', ja: '提案段階' },
  SIMULATED: { en: 'Proposed · simulated', ja: '提案・シミュレーション済み' },
  CONCEPTUAL: { en: 'Conceptual · untested', ja: '概念検討・未検証' },
  INDUSTRY: { en: 'Research placement', ja: '研究インターン' },
  OPEN: { en: 'Details to be added', ja: '詳細は追って追加' },
}

export const hero = {
  name: 'Idris Sadiq',
  kicker: { en: 'Portfolio', ja: 'ポートフォリオ' },
  line: {
    en: 'Robotics engineer who builds the whole system: hardware, control and simulation.',
    ja: 'ハードウェア、制御、シミュレーションまで一貫して手がけるロボティクスエンジニア志望です。',
  },
  sub: {
    en: 'Final-year B.E. Electrical & Electronics Engineering, SRM Easwari Engineering College, Chennai. Applying for a master’s programme in robotics in Japan.',
    ja: 'SRM Easwari 工科大学（チェンナイ）電気電子工学科 学部4年。日本のロボティクス分野の修士課程への進学を志望しています。',
  },
  thread: {
    en: 'The thread: machines that sense, decide and act, and coordinate without a central controller.',
    ja: '一貫したテーマ：感じ、判断し、動き、中央制御なしで協調する機械。',
  },
}

// Draft wording derived from the deck and projects; Idris to confirm in his own words (open-questions.md).
export const interests: L = {
  en: 'I am drawn to robots that work where people cannot easily go or stay: space, snow, farmland and pipes. My projects pair hardware I build myself (PCBs, mechanisms, firmware) with control and coordination: a self-balancing swarm that docks into a platform, an auto-tuning PID digital twin, and a net-based debris-capture concept. I want to study how simple, robust mechanisms and decentralised control let small robots keep working when a part fails. Space robotics comes first for me, with field and mechanism robotics close behind.',
  ja: '人が行きにくい場所、長くいられない場所で働くロボットに関心があります。宇宙、雪の中、農地、配管などです。これまでの取り組みでは、自分で作るハードウェア（基板、機構、ファームウェア）と制御・協調を組み合わせてきました。ドッキングする自己平衡スウォーム、自動調整PIDのデジタルツイン、ネット式デブリ捕獲のコンセプトです。単純で頑丈な機構と分散制御によって、部品が故障しても小型ロボットが動き続けられるようにする研究をしたいと考えています。まず宇宙ロボティクス、次にフィールド・機構ロボティクスに関心があります。',
}

export const highlights: { title: L; body: L }[] = [
  {
    title: { en: 'Research Intern, ABB Global CoE (Easwari)', ja: '研究インターン：ABB Global CoE（Easwari）' },
    body: { en: 'Robotics and industrial automation research, since July 2026.', ja: 'ロボティクスと産業オートメーションの研究（2026年7月〜）。' },
  },
  {
    title: { en: 'EPICS in IEEE team grant, USD 3,000', ja: 'EPICS in IEEE チーム助成（3,000米ドル）' },
    body: { en: 'G.A.I.T. Assist. I am the Hardware Team Lead.', ja: 'G.A.I.T. Assist。ハードウェアチームリーダー。' },
  },
  {
    title: { en: 'InnovateX 2025 (IEEE hackathon): runner-up', ja: 'InnovateX 2025（IEEEハッカソン）：準優勝' },
    body: { en: 'A rover built with team Code Slayers.', ja: 'チーム Code Slayers でローバーを製作。' },
  },
  {
    title: { en: 'Ten-plus personal hardware projects', ja: '個人のハードウェア製作10件以上' },
    body: { en: 'From logic gates to legged robots and wheeled vehicles.', ja: 'ロジックゲートから脚式ロボット、車両まで。' },
  },
]

export type Loop = 'sense' | 'decide' | 'act' | 'coordinate'
export const loopLabel: Record<Loop, L> = {
  sense: { en: 'Senses the world', ja: '周囲を感じ取る' },
  decide: { en: 'Decides and controls', ja: '判断・制御する' },
  act: { en: 'Moves and acts', ja: '動いて作用する' },
  coordinate: { en: 'Works with others', ja: '他と協調する' },
}

export type SimKey = 'pid' | 'cpu8' | 'pipe' | 'swarm' | 'gait' | 'arena' | 'gaitsignal' | 'net'

export type Media = {
  src: string // basename in /media/img, without -640/-1280 suffix
  w: number
  h: number
  alt: L
  caption?: L
  label?: L // e.g. "Concept render"
  widths?: number[] // available widths, default [640, 1280]
}

export type Project = {
  slug: string
  tier: 'flagship' | 'grant' | 'foundation'
  eyebrow: L
  title: L
  status: Status
  loops: Loop[]
  blurb: L
  summary: { objective?: L; method?: L; status?: L; mine?: L }
  media?: Media[]
  videos?: { src: string; poster: string; caption: L }[]
  sim?: SimKey
  credit?: L
  tags: string[]
  link?: { href: string; label: L }
}

const IMG = (src: string, w: number, h: number, alt: L, extra: Partial<Media> = {}): Media => ({ src, w, h, alt, ...extra })

export const projects: Project[] = [
  {
    slug: 'pid',
    tier: 'flagship',
    eyebrow: { en: 'Research', ja: '研究' },
    title: { en: 'Auto-tuning PID controller and servo digital twin', ja: 'PID自動調整と、サーボのデジタルツイン' },
    status: 'IN DEVELOPMENT',
    loops: ['decide', 'act'],
    blurb: {
      en: 'An interactive tool that auto-tunes PID gains for motor control, with a browser-based interface for visualising the response live (currently in development).',
      ja: 'モーター制御のPIDゲインを自動調整し、応答をブラウザ上でライブ表示する対話型ツール（開発中）。',
    },
    summary: {
      objective: { en: 'Tune a servo’s PID gains automatically, including when the load changes.', ja: '負荷が変わっても、サーボのPIDゲインを自動で調整する。' },
      method: {
        en: 'A physics-based digital twin of a geared DC servo (12 V, 180:1 gearbox, encoder), a fixed-gain PID baseline, and reinforcement-learning agents that adjust the gains.',
        ja: 'ギア付きDCサーボ（12V、減速比180:1、エンコーダ）の物理ベースのデジタルツイン、固定ゲインPIDの基準、ゲインを調整する強化学習エージェント。',
      },
      status: {
        en: 'Simulation only: nothing is validated on hardware yet. In simulation a residual PPO policy beats a tuned constant by roughly 0.5 to 0.6 median return, but a larger search for the constant alone recovers most of that gain. The paper draft says so.',
        ja: 'シミュレーションのみで、実機での検証はまだです。シミュレーションでは残差PPO方策が調整済み定数を中央値リターンで約0.5〜0.6上回りますが、定数のみをより広く探索すると大半が回復します。論文草稿にもそう記しています。',
      },
      mine: {
        en: 'I set the specification and the evaluation rules, and directed and reviewed the work.',
        ja: '仕様と評価ルールを定め、作業の方向づけと確認を行いました。',
      },
    },
    media: [IMG('image16', 1918, 904, { en: 'Screenshot of the servo PID digital-twin interface: servo with horn arm, gain sliders and response charts.', ja: 'サーボPIDデジタルツインの画面：サーボとアーム、ゲインのスライダー、応答グラフ。' }, { caption: { en: 'The original browser tool', ja: '元のブラウザツール' } })],
    videos: [
      { src: 'rl-pid', poster: 'rlpid-poster', caption: { en: 'Short demo: a payload change, then RL auto-tune (simulation)', ja: '短い紹介：負荷変更とRL自動調整（シミュレーション）' } },
      { src: 'pid-demo', poster: 'image16', caption: { en: 'Recording of the original tool', ja: '元のツールの録画' } },
    ],
    sim: 'pid',
    tags: ['PID', 'reinforcement learning', 'simulation'],
  },
  {
    slug: 'swarm',
    tier: 'flagship',
    eyebrow: { en: 'Final-year project', ja: '卒業研究' },
    title: { en: 'Decentralized self-balancing swarm', ja: '分散型の自己平衡ロボット群' },
    status: 'PROPOSED',
    loops: ['sense', 'decide', 'coordinate'],
    blurb: {
      en: 'Multiple robot units maintaining balance and coordinating with each other without a central controller. Specifically proposed for lunar and extra-terrestrial exploration.',
      ja: '複数のロボットがバランスを保ちつつ、中央制御なしで互いに協調します。月面など地球外探査向けに提案しています。',
    },
    summary: {
      objective: { en: 'Small robots are agile but weak; large ones are capable but bulky. Combine independent balancing, coordination and, later, docking.', ja: '小型ロボットは機敏だが非力、大型は高性能だが大きい。独立した自己平衡、協調、そして将来の結合を一つにまとめる。' },
      method: {
        en: 'Three two-wheeled inverted-pendulum robots on ESP32 boards with an IMU, balanced by a dual-loop PID. They share state over ESP-NOW and infrared links, with no camera. A two-robot docking proof of concept is the stretch goal.',
        ja: 'IMU付きESP32搭載の倒立振子型二輪ロボット3台を二重ループPIDで制御。ESP-NOWと赤外線でカメラなしに状態を共有。2台の結合実証が発展目標。',
      },
      status: {
        en: 'Designed and simulated. Hardware tests are still to come, and scaling to many units is future work.',
        ja: '設計とシミュレーションまで。実機試験はこれからで、多数台への拡張は今後の課題です。',
      },
    },
    media: [IMG('image13', 1527, 861, { en: 'Diagram of the three stages: independent operation, swarm coordination, combined platform.', ja: '3段階の図：独立動作、群協調、結合プラットフォーム。' }, { label: { en: 'Illustration', ja: 'イラスト' } })],
    sim: 'swarm',
    tags: ['multi-agent', 'balance control', 'ESP-NOW'],
  },
  {
    slug: 'net',
    tier: 'flagship',
    eyebrow: { en: 'Conference paper · conceptual', ja: '会議論文・概念検討' },
    title: { en: 'Adaptive swarm-actuated net system', ja: '適応型スウォーム作動ネットシステム' },
    status: 'CONCEPTUAL',
    loops: ['coordinate'],
    blurb: {
      en: 'A first-author paper proposing a multi-satellite net system for space debris capture. Conceptual and untested: no hardware or in-orbit validation yet.',
      ja: '宇宙デブリ捕獲のための多衛星ネットシステムを提案する筆頭著者論文。概念検討の段階で、ハードウェアや軌道上での検証はまだありません。',
    },
    summary: {
      method: { en: 'Satellite nodes with an active intercept mesh panel, managed by a decentralised swarm rule.', ja: '能動的な捕獲メッシュパネルを持つ衛星ノットを、分散型のスウォーム制御で管理する。' },
      status: { en: 'Conceptual and untested.', ja: '概念検討・未検証。' },
    },
    media: [IMG('image17', 2858, 1472, { en: 'Illustration: satellite swarm nodes with an active intercept mesh panel around debris.', ja: 'イラスト：デブリを囲む、衛星ノードと能動捕獲メッシュパネル。' }, { label: { en: 'Illustration', ja: 'イラスト' } })],
    sim: 'net',
    tags: ['space robotics', 'swarm'],
  },
  {
    slug: 'gait',
    tier: 'grant',
    eyebrow: { en: 'IEEE EPICS grant', ja: 'IEEE EPICS 助成' },
    title: { en: 'Wearable G.A.I.T. device', ja: 'ウェアラブル G.A.I.T. デバイス' },
    status: 'GRANT',
    loops: ['sense', 'decide'],
    blurb: {
      en: 'G.A.I.T. Assist is a gesture-based AI wristband helping Parkinson’s patients reclaim daily independence, backed by a $3,000 team grant from EPICS in IEEE.',
      ja: 'G.A.I.T. Assist は、パーキンソン病の方の日常の自立を支える、ジェスチャーベースのAIリストバンドです。EPICS in IEEE のチーム助成（3,000米ドル）を受けています。',
    },
    summary: {
      objective: { en: 'Tell an intentional gesture from a tremor, and trigger a simple action such as switching an appliance.', ja: '意図的なジェスチャーと震えを区別し、家電の切替などの操作につなげる。' },
      method: { en: 'A wrist-worn ESP32-S3 board with an IMU and on-device classification (TinyML).', ja: '手首装着のESP32-S3基板、IMU、端末上での分類（TinyML）。' },
      status: { en: 'Prototype in development. Team grant, Jon C. Taenzer Memorial Fund (2026).', ja: '試作開発中。チーム助成（Jon C. Taenzer Memorial Fund、2026年）。' },
      mine: { en: 'Hardware Team Lead.', ja: 'ハードウェアチームリーダー。' },
    },
    media: [
      IMG('image14', 1536, 1024, { en: 'Concept render of the final proposed wristband.', ja: '最終提案版リストバンドのコンセプト画像。' }, { label: { en: 'Concept render', ja: 'コンセプト画像' }, caption: { en: 'Final proposed version', ja: '最終提案版' } }),
      IMG('image15', 1555, 1600, { en: 'Prototype board: ESP32 development board with an MPU-6050 sensor on perfboard.', ja: '試作基板：ESP32開発ボードとMPU-6050をユニバーサル基板に搭載。' }, { caption: { en: 'Prototype in development (ESP32 + MPU-6050)', ja: '試作中（ESP32 + MPU-6050）' } }),
    ],
    sim: 'gaitsignal',
    tags: ['wearable', 'IMU', 'TinyML'],
  },
  {
    slug: 'abb',
    tier: 'grant',
    eyebrow: { en: 'Research placement', ja: '研究インターン' },
    title: { en: 'Research internship, ABB Global CoE (hosted at Easwari)', ja: '研究インターン：ABB Global CoE（Easwari内）' },
    status: 'INDUSTRY',
    loops: ['act', 'sense'],
    blurb: {
      en: 'Building a 3D bin-picking cell on an ABB IRB 1600 with SICK vision, validated first in ABB RobotStudio. Hands-on with the arm, I identified a real gripper-orientation limitation in the task.',
      ja: 'ABB IRB 1600とSICKビジョンによる3Dビンピッキングセルを構築中。まずABB RobotStudioで検証しています。実機を扱う中で、作業におけるグリッパー姿勢の実際の制約を特定しました。',
    },
    summary: { status: { en: 'Since July 2026. A research placement at the ABB Global Centre of Excellence hosted at my college; not employment by ABB.', ja: '2026年7月〜。大学内に設置されたABB Global CoEでの研究インターンで、ABB社での雇用ではありません。' } },
    media: [IMG('image18', 1712, 856, { en: 'Workcell with an industrial robot arm, a parts bin and a chute.', ja: '産業用ロボットアーム、部品ビン、シュートのあるワークセル。' })],
    sim: undefined,
    tags: ['industrial robot', 'bin picking'],
  },
  {
    slug: 'cpu8',
    tier: 'foundation',
    eyebrow: { en: 'Passion project', ja: '個人プロジェクト' },
    title: { en: '8-bit computer', ja: '8ビットコンピュータ' },
    status: 'IN DEVELOPMENT',
    loops: ['decide'],
    blurb: {
      en: 'Built from individual logic gates. A from-scratch computer architecture project covering binary arithmetic, memory and control logic in physical hardware.',
      ja: '個別のロジックゲートから製作。2進演算、メモリ、制御ロジックを実機で扱う、計算機アーキテクチャの自作プロジェクト。',
    },
    summary: {
      method: { en: 'Following Ben Eater’s design, with Pervin Korino Dasan. Days 1 to 9 so far: a loose wire caught on a phone camera, RAM debugging, display multiplexing, and a 2 AM substitution for JK flip-flops.', ja: 'Ben Eater氏の設計に沿ってPervin Korino Dasanと製作。9日目までに、スマホ動画で見つけた緩い配線、RAMのデバッグ、表示のマルチプレクス、深夜2時のJKフリップフロップ代替がありました。' },
    },
    media: [IMG('image5', 1353, 1600, { en: 'Breadboard 8-bit computer with labelled register and clock blocks.', ja: 'レジスタとクロックのブロックを示した、ブレッドボード上の8ビットコンピュータ。' }),
      IMG('eightbit-day1', 720, 720, { en: 'Breadboards from Day 1 of the build: logic gate and 555 timer tests wired up beside a development board.', ja: '製作1日目のブレッドボード：ロジックゲートと555タイマーの動作確認。' }, { widths: [640], caption: { en: 'Day 1: gates and 555 timer circuits', ja: '1日目：ゲートと555タイマー回路' } })],
    sim: 'cpu8',
    credit: { en: 'Design: Ben Eater', ja: '設計：Ben Eater' },
    tags: ['digital logic', 'debugging'],
  },
  {
    slug: 'quadrupeds',
    tier: 'foundation',
    eyebrow: { en: 'Personal projects', ja: '個人プロジェクト' },
    title: { en: 'Quadruped robots', ja: '四足歩行ロボット' },
    status: 'IN DEVELOPMENT',
    loops: ['act'],
    blurb: {
      en: 'Two independent legged-robot builds exploring mobility over different terrains: a spider-inspired and a dog-inspired quadruped.',
      ja: '地形ごとの移動性を探る、独立した2台の脚式ロボット：クモ型と犬型の四足ロボット。',
    },
    summary: {
      method: {
        en: 'RoboDog is a 3D-printed quadruped. Mine: a custom 2S2P 18650 pack with a 20 A BMS, a hand-soldered ESP32 board driving 6 servos and 2 OLEDs, and a browser-based servo calibration tool.',
        ja: 'RoboDog は3Dプリントの四足ロボット。自作したのは、20 A BMS付き2S2P 18650バッテリー、6サーボと2つのOLEDを駆動する手はんだのESP32基板、ブラウザ型サーボ校正ツール。',
      },
      status: {
        en: 'RoboDog is in development; the eyes and dog-like behaviour come next. Lessons so far: the “360°” servos were the wrong type, and a flicker was one loose ground pin.',
        ja: 'RoboDog は開発中で、次は目と犬らしい挙動です。これまでの学び：「360°」サーボは種類違いで、画面のちらつきは接地ピン1本の緩みでした。',
      },
    },
    media: [
      IMG('image6', 1080, 758, { en: 'Spider-inspired quadruped robot.', ja: 'クモ型の四足ロボット。' }, { caption: { en: 'Spider-inspired quadruped', ja: 'クモ型四足ロボット' }, widths: [640] }),
      IMG('image7', 1600, 1185, { en: 'Dog-inspired quadruped robot with an acrylic-covered electronics bay and orange 3D-printed legs.', ja: 'アクリルカバーの電装部とオレンジの3Dプリント脚を持つ犬型四足ロボット。' }, { caption: { en: 'Dog-inspired quadruped (RoboDog)', ja: '犬型四足ロボット（RoboDog）' } }),
      IMG('li-dog-bench', 800, 359, { en: 'RoboDog parts on the bench: orange and blue printed legs, yellow plates, servos and the ESP32 perfboard.', ja: '作業台の上のRoboDogの部品：オレンジと青の脚、黄色のプレート、サーボ、ESP32のユニバーサル基板。' }, { widths: [640], caption: { en: 'RoboDog on the bench', ja: '作業台のRoboDog' } }),
      IMG('li-cad-dog', 832, 703, { en: 'CAD render of the RoboDog legs and plates in orange and blue.', ja: 'オレンジと青のRoboDogの脚とプレートのCADレンダリング。' }, { widths: [640], caption: { en: 'RoboDog in CAD', ja: 'RoboDogのCAD' } }),
      IMG('li-cad-part', 800, 743, { en: 'A printed part modelled in Fusion: a box with large round openings.', ja: 'Fusionでモデリングした、大きな丸い開口を持つ箱状の部品。' }, { widths: [640], caption: { en: 'A custom part in Fusion', ja: 'Fusionでのオリジナル部品' } }),
      IMG('li-battery', 800, 600, { en: 'A custom 2S2P pack of four 18650 cells with a 20 A protection board, wired with red and black leads.', ja: '20A保護基板付きの、18650セル4本によるオリジナルの2S2Pバッテリーパック。' }, { widths: [640], caption: { en: 'Custom 2S2P battery pack with a 20 A BMS', ja: '20A BMS付きのオリジナル2S2Pバッテリーパック' } }),
      IMG('li-calib-pins', 480, 1039, { en: 'Screenshot of the RoboDog calibration tool on a phone: pin assignment, wiggle test and neutral trim for each servo.', ja: 'スマートフォン上のRoboDog校正ツールの画面：サーボごとのピン割り当て、ウィグルテスト、中立位置の調整。' }, { widths: [640], caption: { en: 'Calibration tool: pins and neutral', ja: '校正ツール：ピンと中立位置' } }),
      IMG('li-calib-legs', 480, 1039, { en: 'Screenshot of the calibration tool: a table of legs with state, neutral and up and down pulse widths, and jog buttons.', ja: '校正ツールの画面：各脚の状態、中立、上下のパルス幅の表とジョグボタン。' }, { widths: [640], caption: { en: 'Calibration tool: leg table', ja: '校正ツール：脚の表' } }),
      IMG('li-calib-log', 480, 1039, { en: 'Screenshot of the calibration tool debug log showing legs reaching home and moving up and down.', ja: '各脚がホームに到達し上下に動く様子を示す、校正ツールのデバッグログの画面。' }, { widths: [640], caption: { en: 'Calibration tool: live debug log', ja: '校正ツール：リアルタイムのデバッグログ' } }),
    ],
    sim: 'gait',
    credit: { en: 'RoboDog design: James Bruton (open source)', ja: 'RoboDog 設計：James Bruton（オープンソース）' },
    tags: ['legged', 'ESP32', 'servo'],
  },
  {
    slug: 'vehicles',
    tier: 'foundation',
    eyebrow: { en: 'Personal projects', ja: '個人プロジェクト' },
    title: { en: 'Bluetooth-controlled vehicle builds', ja: 'Bluetooth操作の車両製作' },
    status: 'BUILT',
    loops: ['act', 'sense'],
    blurb: {
      en: 'A running series of Bluetooth-controlled builds: a 2-wheel car with a castor, a 4-wheel car and a tracked tank. Chassis, drivetrain and control electronics built and tuned by hand.',
      ja: 'Bluetooth操作の車両を継続的に製作：キャスター付き2輪車、4輪車、クローラー型。シャーシ、駆動系、制御回路を手作業で製作・調整。',
    },
    summary: { method: { en: 'The tracked tank is the rover built for the Smart India Hackathon (September 2025): an on-board camera reads the grain size of beach sand across intertidal zones, which helps to predict and monitor weather and erosion patterns. The team did not qualify for the finals.', ja: 'クローラー型のロボットは、Smart India Hackathon（2025年9月）向けに製作したローバーです。車載カメラで潮間帯ごとの砂の粒径を読み取り、天候や侵食パターンの予測と監視に役立てます。チームは決勝には進出できませんでした。' } },
    media: [
      IMG('image8', 1056, 719, { en: 'Two-wheel car with a castor: four 18650 cells, buck converter, ESP32 and motor driver on perfboard.', ja: 'キャスター付き2輪車：18650セル4本、降圧コンバータ、ESP32、モータードライバをユニバーサル基板に実装。' }, { caption: { en: '2-wheel car with a castor', ja: 'キャスター付き2輪車' }, widths: [640] }),
      IMG('image10', 1627, 952, { en: 'Tracked tank-style robot.', ja: 'クローラー型の戦車ロボット。' }, { caption: { en: 'Tracked tank', ja: 'クローラー型の戦車' } }),
      IMG('image9', 924, 598, { en: 'Four-wheel acrylic car.', ja: 'アクリル製4輪の車。' }, { caption: { en: '4-wheel acrylic car', ja: 'アクリル製の4輪車' }, widths: [640] }),
    ],
    sim: 'arena',
    tags: ['Bluetooth', 'drivetrain', 'ESP32'],
  },
  {
    slug: 'pipe',
    tier: 'foundation',
    eyebrow: { en: 'Hackathon idea proposal', ja: 'ハッカソン提案' },
    title: { en: 'In-pipe leak inspection robot', ja: '管内リーク検査ロボット' },
    status: 'SIMULATED',
    loops: ['sense', 'decide'],
    blurb: {
      en: 'A proposed mechanism for navigating pipe interiors, modelled and simulated before any physical build.',
      ja: '配管内を移動する機構の提案。実機を作る前にモデル化とシミュレーションを行いました。',
    },
    summary: { status: { en: 'Proposed. Modelled and simulated; not built.', ja: '提案段階。モデル化とシミュレーションまでで、製作はしていません。' } },
    media: [
      IMG('image11', 1920, 1051, { en: 'Blender render of the in-pipe robot design concept.', ja: '管内ロボットの設計コンセプトのBlenderレンダリング。' }, { label: { en: 'Design concept', ja: '設計コンセプト' } }),
      IMG('image12', 1920, 1080, { en: 'Still from the Python pipeline-scan simulation.', ja: 'Pythonによる配管スキャンのシミュレーション画面。' }, { caption: { en: 'Python simulation', ja: 'Pythonシミュレーション' } }),
    ],
    sim: 'pipe',
    tags: ['simulation', 'Blender', 'Python'],
  },
  {
    slug: 'stepscribe',
    tier: 'foundation',
    eyebrow: { en: 'Tooling', ja: 'ツール' },
    title: { en: 'stepscribe-cad', ja: 'stepscribe-cad' },
    status: 'BUILT',
    loops: ['decide'],
    blurb: {
      en: 'Reads a STEP file and extracts its real geometry (holes, assemblies, kinematics) so an AI assistant can reason about a CAD model. Built to avoid re-describing the same model in every conversation. Existing tools may cover parts of this; the aim was a small offline tool that fits my own workflow.',
      ja: 'STEPファイルから実際の形状情報（穴、アセンブリ、運動学）を抽出し、AIアシスタントがCADモデルを理解できるようにするツールです。毎回同じモデルを説明し直す手間をなくすために作りました。既存のツールが一部を担える可能性もありますが、自分の作業に合う小さなオフラインツールを目指しました。',
    },
    summary: {
      method: { en: 'Runs offline, with a command line, a local web page, an MCP server and a Claude Code plugin. Published on PyPI as stepscribe-cad.', ja: 'オフラインで動作。コマンドライン、ローカルWebページ、MCPサーバ、Claude Codeプラグインを備え、PyPIに stepscribe-cad として公開。' },
      status: { en: 'Not yet checked against a CAD system for accuracy; verify important numbers there.', ja: 'CADシステムとの精度照合は未実施のため、重要な数値は別途確認してください。' },
    },
    videos: [{ src: 'stepscribe', poster: 'stepscribe-poster', caption: { en: 'Short demo: a STEP file in, a readable description out', ja: '短い紹介：STEPファイルを入力し、読みやすい説明を出力' } }],
    link: { href: 'https://github.com/idris900323/stepscribe-cad', label: { en: 'Source on GitHub', ja: 'GitHubのソース' } },
    tags: ['CAD', 'MCP', 'Python'],
  },
  {
    slug: 'subtlebotic',
    tier: 'foundation',
    eyebrow: { en: 'Internship', ja: 'インターン' },
    title: { en: 'Electronics hardware internship, Subtlebotic', ja: '電子ハードウェアインターン（Subtlebotic）' },
    status: 'INDUSTRY',
    loops: ['sense', 'act'],
    blurb: {
      en: 'Schematic and PCB design intern, September to November 2025. The textbook boost converter has four parts; the real one needed a switching IC, a feedback network, ratings and layout.',
      ja: '回路図・基板設計インターン（2025年9〜11月）。教科書の昇圧回路は部品4点ですが、実機にはスイッチングIC、帰還回路、定格選定、レイアウトが必要でした。',
    },
    summary: {
      method: { en: 'Three designs with schematics, EasyEDA layouts and reports: an XL6009 boost converter, a BQ24074 battery charger with protection, and a 555-based long-press switch.', ja: '回路図・EasyEDAレイアウト・報告書付きの3設計：XL6009昇圧回路、保護付きBQ24074充電回路、555タイマーの長押しスイッチ。' },
      status: { en: 'Design work and reports. My breadboard attempt at the boost converter did not work, which taught me why layout matters.', ja: '設計と報告書まで。昇圧回路のブレッドボード試作は動かず、レイアウトの重要性を学びました。' },
    },
    media: [
      IMG('sub-3d-boost', 2160, 937, { en: '3D view of the XL6009 boost converter board with an electrolytic capacitor, inductor, regulator IC and two resistors.', ja: 'XL6009昇圧コンバータ基板の3D表示。電解コンデンサ、インダクタ、レギュレータIC、抵抗2本。' }, { caption: { en: 'XL6009 boost converter board, 3D view', ja: 'XL6009昇圧コンバータ基板（3D表示）' } }),
      IMG('sub-sch-boost', 1418, 1003, { en: 'EasyEDA schematic of the XL6009 boost converter: input capacitors, 47 microhenry inductor, Schottky diode, feedback divider and output capacitors.', ja: 'XL6009昇圧コンバータのEasyEDA回路図：入力コンデンサ、47µHインダクタ、ショットキーダイオード、帰還分圧、出力コンデンサ。' }, { caption: { en: 'Boost converter schematic', ja: '昇圧コンバータの回路図' } }),
      IMG('sub-pcb-boost', 2782, 960, { en: 'PCB layout of the boost converter with top and bottom copper routing.', ja: '上下層の配線を示した昇圧コンバータのPCBレイアウト。' }, { caption: { en: 'Boost converter PCB layout', ja: '昇圧コンバータのPCBレイアウト' } }),
      IMG('sub-sch-bms', 2003, 1417, { en: 'EasyEDA schematic of the battery management system: BQ24074 charger, DW01A protection IC and 8205A dual MOSFET.', ja: 'バッテリー管理システムのEasyEDA回路図：BQ24074充電IC、DW01A保護IC、8205Aデュアル MOSFET。' }, { caption: { en: 'Battery management system schematic', ja: 'バッテリー管理システムの回路図' } }),
      IMG('sub-pcb-bms', 1211, 960, { en: 'PCB layout of the battery management board with the charger IC, protection IC, MOSFET and status LEDs.', ja: '充電IC、保護IC、MOSFET、ステータスLEDを配置したバッテリー管理基板のPCBレイアウト。' }, { widths: [640], caption: { en: 'Battery management PCB layout', ja: 'バッテリー管理基板のPCBレイアウト' } }),
      IMG('sub-pcb-longpress', 1337, 960, { en: 'PCB layout of the 555-based long-press switch with the tactile switch, timer IC, LED and timing components.', ja: 'タクタイルスイッチ、タイマーIC、LED、タイミング部品を配置した555ロングプレススイッチのPCBレイアウト。' }, { caption: { en: 'Long-press switch PCB layout', ja: 'ロングプレススイッチのPCBレイアウト' } }),
    ],
    tags: ['schematic', 'PCB', 'EasyEDA'],
  },
]

export const bench: { t: L; d: L; media?: Media[] }[] = [
  { t: { en: 'Robo Soccer, IIITDM Kancheepuram', ja: 'ロボサッカー（IIITDM Kancheepuram）' }, d: { en: 'Second attempt. The first ended with a motor driver bursting mid-event.', ja: '2回目の挑戦。初回は競技中にモータードライバが破裂しました。' }, media: [IMG('li-soccer', 1534, 700, { en: 'The author’s small two-wheeled robot with a castor wheel pushing a ball across a black pitch with white markings, with a person holding its control cable.', ja: '白いラインの入った黒いピッチ上でボールを押す、本人の、キャスター付き二輪の小型ロボットと、その操作ケーブルを持つ人。' }, { widths: [640, 1280] })] },
  { t: { en: 'Custom 2S2P battery pack', ja: '自作2S2Pバッテリー' }, d: { en: 'Four 18650 cells with a 20 A BMS. Cell balancing taught me respect.', ja: '18650セル4本と20 A BMS。セルバランスの大切さを学びました。' }, media: [IMG('li-battery', 800, 600, { en: 'A custom 2S2P pack of four 18650 cells with a 20 A protection board, wired with red and black leads.', ja: '20A保護基板付きの、18650セル4本によるオリジナルの2S2Pバッテリーパック。' }, { widths: [640], caption: { en: 'Custom 2S2P battery pack with a 20 A BMS', ja: '20A BMS付きのオリジナル2S2Pバッテリーパック' } })] },
  { t: { en: 'Stock and catalogue site', ja: '在庫・カタログサイト' }, d: { en: 'For my father’s business. I learnt to design for the customer, not for completeness.', ja: '父の事業のために製作。網羅性ではなく利用者のために設計することを学びました。' } },
  { t: { en: 'DPDT motor reversal', ja: 'DPDTスイッチでのモーター反転' }, d: { en: 'A small bench experiment from February 2025.', ja: '2025年2月の小さな実験。' } },
]

export const timeline: { when: string; role: L; where: string }[] = [
  { when: '2026 Jul–', role: { en: 'Research Intern', ja: '研究インターン' }, where: 'ABB Global CoE, Easwari' },
  { when: '2026 May–', role: { en: 'Hardware Team Lead', ja: 'ハードウェアチームリーダー' }, where: 'EPICS in IEEE: G.A.I.T. Assist' },
  { when: '2025 Sep–Nov', role: { en: 'Electronics Hardware Intern', ja: '電子ハードウェアインターン' }, where: 'Subtlebotic' },
  { when: '2025 Aug–', role: { en: 'Head of Content', ja: 'コンテンツ責任者' }, where: 'SEEE, SRM Easwari' },
  { when: '2025 May–', role: { en: 'Documentation Head', ja: '記録責任者' }, where: 'Campus Life, SRM Easwari' },
  { when: '2024 Sep–', role: { en: 'Creative Head', ja: 'クリエイティブ責任者' }, where: 'Electronics Hobby Club' },
]

export const progression: L[] = [
  { en: 'Logic gates', ja: 'ロジックゲート' },
  { en: 'Microcontrollers and motors', ja: 'マイコンとモーター' },
  { en: 'Legged and wheeled platforms', ja: '脚式・車輪型プラットフォーム' },
  { en: 'Modelling and simulation', ja: 'モデル化とシミュレーション' },
  { en: 'Control tuning', ja: '制御の調整' },
  { en: 'Decentralised swarms and space concepts', ja: '分散スウォームと宇宙構想' },
]

/** Certificates grouped by theme (not by date); newest first inside each group. Source: LinkedIn export, approved by Idris. */
export const learning: { theme: L; items: L[] }[] = [
  {
    theme: { en: 'Robotics and control', ja: 'ロボティクス・制御' },
    items: [
      { en: 'NPTEL Advanced Robotics (May 2026)', ja: 'NPTEL 先端ロボティクス（2026年5月）' },
      { en: 'NPTEL Computer Vision and Image Processing: Fundamentals and Applications (May 2026)', ja: 'NPTEL コンピュータビジョンと画像処理：基礎と応用（2026年5月）' },
      { en: 'NPTEL Industrial Robotics: Theories for Implementation (December 2025)', ja: 'NPTEL 産業用ロボティクス：実装のための理論（2025年12月）' },
      { en: 'NPTEL Principle of Hydraulic Machines and System Design (December 2025)', ja: 'NPTEL 油圧機械とシステム設計の原理（2025年12月）' },
      { en: 'NPTEL Experimental Robotics and Introduction to IoT, 90% (May 2025)', ja: 'NPTEL 実験ロボティクス、IoT入門 90%（2025年5月）' },
      { en: 'Robotics automation and software simulation with AI, industrial training (My Equation, September 2024)', ja: 'ロボット自動化とAIを用いたソフトウェアシミュレーション 産業研修（My Equation、2024年9月）' },
    ],
  },
  {
    theme: { en: 'Embedded and PCB', ja: '組込み・基板設計' },
    items: [
      { en: 'Altium Designer Essentials (April 2025) and PCB basic design course (March 2025)', ja: 'Altium Designer Essentials（2025年4月）、PCB基礎設計コース（2025年3月）' },
      { en: 'Cisco Computer Hardware Basics (May 2023)', ja: 'Cisco コンピュータハードウェア基礎（2023年5月）' },
    ],
  },
  {
    theme: { en: 'Japanese', ja: '日本語' },
    items: [
      { en: 'JLPT N5 passed (test taken August 2024); NAT-TEST 4Q passed (September 2025)', ja: 'JLPT N5合格（2024年8月受験）、NAT-TEST 4Q合格（2025年9月）' },
    ],
  },
  {
    theme: { en: 'Computing and business', ja: '計算機・ビジネス' },
    items: [
      { en: 'Cisco Python Essentials 1 and 2; Cybersecurity', ja: 'Cisco Python Essentials 1・2、サイバーセキュリティ' },
      { en: 'IBM India Research Lab lecture series on LLMs, generative AI, prompt engineering and RAG (PALS, February 2025)', ja: 'IBMインド研究所の連続講義：LLM、生成AI、プロンプトエンジニアリング、RAG（PALS、2025年2月）' },
      { en: 'NPTEL Entrepreneurship, 86% (November 2024)', ja: 'NPTEL 起業論 86%（2024年11月）' },
    ],
  },
]

/** Learning out in the field, one event per line. */
export const fieldEvents: L[] = [
  { en: 'IISc EE Summer School 2025 (IEEE Bangalore Section)', ja: 'IISc EEサマースクール2025（IEEE Bangalore Section）' },
  { en: 'Automation Expo South 2025, Chennai', ja: 'Automation Expo South 2025（チェンナイ）' },
  { en: 'Automotive Testing Expo India (April 2025)', ja: 'Automotive Testing Expo India（2025年4月）' },
  { en: 'IMTEX 2026', ja: 'IMTEX 2026' },
  { en: 'NCTPS-II power plant visit (SCADA)', ja: 'NCTPS-II発電所見学（SCADA）' },
  { en: 'Umagine TN 2026', ja: 'Umagine TN 2026' },
  { en: 'Earlier: STEM Centre India robotics and coding, grades 5 to 8 (LEGO NXT, EV3)', ja: '幼少期：STEM Centre Indiaのロボット・コーディング教室（5〜8年生、LEGO NXT・EV3）' },
]

export const languages: L = {
  en: 'English (full professional), Gujarati and Hindi (native or bilingual), Urdu and Tamil (limited working), Japanese (limited working; JLPT N5 and NAT-TEST 4Q are the stronger evidence), Arabic (elementary).',
  ja: '英語（ビジネス上級）、グジャラート語・ヒンディー語（母語レベル）、ウルドゥー語・タミル語（限定的な実務レベル）、日本語（限定的な実務レベル。JLPT N5とNAT-TEST 4Qがより確かな根拠）、アラビア語（初級）。',
}

export const skills: L = {
  en: 'ABB RobotStudio, Altium, Arduino, Python, C, IoT, computer vision, mobile robotics. Coursework: PLC simulation (Factory I/O with Connected Components Workbench), robotic welding, industrial automation.',
  ja: 'ABB RobotStudio、Altium、Arduino、Python、C、IoT、コンピュータビジョン、移動ロボット。授業での経験：PLCシミュレーション（Factory I/OとConnected Components Workbench）、ロボット溶接、産業オートメーション。',
}

export const beyond: L = {
  en: 'Beyond the lab: on stage, on the mic, and at the printer.',
  ja: '研究室の外では：ステージで、マイクの前で、そして3Dプリンターの前で。',
}

export type BeyondCard = { slug: string; title: L; when: L; body: L; images?: Media[]; link?: { href: string; label: L }; open: string }
export const beyondCards: BeyondCard[] = [
  {
    slug: 'emcee',
    title: { en: 'Emcee', ja: '司会' },
    when: { en: 'January and August 2025', ja: '2025年1月・8月' },
    body: {
      en: 'Welcomed the incoming first-year class on stage at the First-Year Inauguration of Easwari Engineering College, with two co-hosts, and emceed the inaugural ceremony of Talentia, the two-day cultural event of the college.',
      ja: 'Easwari Engineering Collegeの新入生歓迎式典で、2人の共同司会者とともにステージで新入生を迎え、また、大学の2日間の文化イベント「Talentia」の開会式でも司会を務めました。',
    },
    link: { href: 'https://www.youtube.com/watch?v=mXb8H1wp9NQ', label: { en: 'Watch the recording on YouTube', ja: 'YouTubeで録画を見る' } },
    images: [
      IMG('li-emcee', 624, 360, { en: 'The author on stage at the lectern during the First-Year Inauguration of Easwari Engineering College.', ja: 'Easwari Engineering Collegeの新入生歓迎式典で、演台に立つ本人。' }, { widths: [640], caption: { en: 'First-Year Inauguration, August 2025', ja: '新入生歓迎式典（2025年8月）' } }),
      IMG('li-talentia-a', 1280, 853, { en: 'The author at the lectern during the inaugural ceremony of Talentia, the two-day cultural event of Easwari Engineering College.', ja: 'Easwari Engineering Collegeの2日間の文化イベント「Talentia」の開会式で、演台に立つ本人。' }, { widths: [640, 1280], caption: { en: 'Emceeing the Talentia inaugural ceremony, January 2025', ja: 'Talentia開会式の司会（2025年1月）' } }),
      IMG('li-talentia-b', 600, 1280, { en: 'The author speaking at the lectern, which carries the Easwari Engineering College and Talentia sign.', ja: 'EaswariとTalentiaの看板が付いた演台で話す本人。' }, { widths: [640], caption: { en: 'At the Talentia lectern', ja: 'Talentiaの演台にて' } }),
    ],
    open: 'Emcee photo',
  },
  {
    slug: 'podcast',
    title: { en: 'Podcast host', ja: 'ポッドキャスト司会' },
    when: { en: 'January 2026', ja: '2026年1月' },
    body: {
      en: 'Hosted Episode 8 of the series Person Behind The Power, an Elite Encounters show at Easwari Engineering College, published on the college YouTube channel.',
      ja: 'Easwari Engineering Collegeの「Elite Encounters」による番組シリーズ「Person Behind The Power」の第8話の進行を務めました。大学のYouTubeチャンネルで公開されています。',
    },
    images: [IMG('li-podcast-logo', 1280, 720, { en: 'The Elite Encounters set: the author and a guest at the desk, with the show logo on the screen behind them.', ja: 'Elite Encountersの収録風景：机を挟んで座る本人とゲスト、背後のスクリーンに番組ロゴ。' }, { widths: [640, 1280], caption: { en: 'Elite Encounters', ja: 'Elite Encounters' } })],
    link: { href: 'https://youtu.be/Q-IukgMDHOI', label: { en: 'Watch the episode on YouTube', ja: 'YouTubeでエピソードを見る' } },
    open: 'Podcast photo or still',
  },
  {
    slug: 'printing',
    title: { en: '3D printing workshop', ja: '3Dプリンティングのワークショップ' },
    when: { en: 'April 2026, HephaForge', ja: '2026年4月、HephaForge' },
    body: {
      en: 'A hands-on workshop led by Gowtham S.: modelled a part from scratch in Autodesk Fusion and watched it print. The first print was a dragon keychain for my bag. Next, custom parts for my robot builds.',
      ja: 'Gowtham S.氏による実践ワークショップ。Autodesk Fusionで一から部品をモデリングし、印刷されるところまで体験しました。最初の作品は、バッグ用のドラゴンのキーホルダー。次は、ロボット製作用のオリジナル部品です。',
    },
    images: [
      IMG('li-print-model', 480, 269, { en: 'The dragon keychain modelled in Autodesk Fusion: a round tag with a dragon relief.', ja: 'Autodesk Fusionでモデリングしたドラゴンのキーホルダー。円形のタグにドラゴンのレリーフ。' }, { widths: [640], caption: { en: 'Modelled in Fusion', ja: 'Fusionでのモデリング' } }),
      IMG('li-print-result', 480, 640, { en: 'The printed dragon keychain in orange and blue on a tiled table.', ja: 'オレンジと青で印刷されたドラゴンのキーホルダー。' }, { widths: [640], caption: { en: 'The first print', ja: '最初の出力' } }),
      IMG('li-print-bag', 800, 1066, { en: 'The dragon keychain hanging from the zip of a bag.', ja: 'バッグのファスナーに付けたドラゴンのキーホルダー。' }, { widths: [640], caption: { en: 'On my bag', ja: 'バッグに取り付けて' } }),
    ],
    open: 'Photo of the dragon keychain',
  },
]

export const fieldMedia: Media[] = [
  IMG('li-iisc-me', 480, 228, { en: 'The author standing beside the EE Summer School banner at the Department of Electrical Engineering, IISc.', ja: 'IIScの電気工学科で、EEサマースクールの看板の横に立つ本人。' }, { widths: [640], caption: { en: 'IISc EE Summer School, July 2025', ja: 'IISc EEサマースクール（2025年7月）' } }),
  IMG('iisc-hall', 742, 768, { en: 'A large laboratory hall with tall insulator columns, seen on the lab tour at the IISc EE Summer School.', ja: 'IISc EEサマースクールの研究室見学で訪れた、背の高い碍子の柱が並ぶ大きな実験ホール。' }, { widths: [640], caption: { en: 'IISc EE Summer School, July 2025: lab tour', ja: 'IISc EEサマースクール（2025年7月）：研究室見学' } }),
  IMG('iisc-lab', 480, 640, { en: 'A tall electrical cabinet full of control boards and wiring, from the lab tour at IISc.', ja: 'IIScの研究室見学で見た、制御基板と配線がぎっしり詰まった電気キャビネット。' }, { widths: [640], caption: { en: 'IISc: inside a control cabinet', ja: 'IISc：制御キャビネットの内部' } }),
  IMG('expo-robots', 800, 360, { en: 'Industrial robot arms on a stand at Automation Expo South 2025, Chennai Trade Centre.', ja: 'Automation Expo South 2025（チェンナイ・トレードセンター）の展示ブースの産業用ロボットアーム。' }, { widths: [640], caption: { en: 'Automation Expo South, Chennai, March 2025', ja: 'Automation Expo South（チェンナイ、2025年3月）' } }),
  IMG('expo-station', 1280, 720, { en: 'A pneumatic assembly line on a trade-expo stand, with a touch-screen controller, a control panel and a PLC cabinet at the front.', ja: '展示会のブースにある空圧式の組立ラインと、手前のタッチパネル、操作盤、PLCキャビネット。' }, { widths: [640, 1280], caption: { en: 'An expo stand: a pneumatic line with its PLC cabinet', ja: '展示会のブース：空圧ラインとPLCキャビネット' } }),
  IMG('expo-spring', 480, 853, { en: 'A CNC wire-forming machine that coils springs, with its eight forming arms around a central tool.', ja: 'ばねを巻くCNCワイヤーフォーミングマシン。中央の工具を囲む8本の成形アーム。' }, { widths: [640], caption: { en: 'A CNC spring-coiling machine', ja: 'CNCばね成形機' } }),
  IMG('expo-cutter', 480, 270, { en: 'A large flat-bed cutting machine under a black bellows cover on an expo stand.', ja: '展示会のブースにある、黒い蛇腹カバー付きの大型フラットベッド切断機。' }, { widths: [640], caption: { en: 'A flat-bed cutting machine', ja: 'フラットベッド切断機' } }),
  IMG('expo-dino', 480, 270, { en: 'A metal dinosaur skeleton on a pedestal in front of a laser cutting machine, a showpiece on an expo stand.', ja: 'レーザー加工機の前の台座に置かれた、金属製の恐竜の骨格。展示ブースの目玉。' }, { widths: [640], caption: { en: 'A metal dinosaur on show at an expo stand', ja: '展示ブースに飾られた金属製の恐竜' } }),
]

// Update `asOf` whenever these numbers are re-checked in the apps (guide §24.10).
export const habits = {
  asOf: '2026-10-19',
  duolingoDays: 1226,
  leetcode: { solved: 587, activeDays: 276, maxStreak: 74 },
}

export const links = {
  linkedin: 'https://www.linkedin.com/in/idris-sadiq-934697213/',
  github: 'https://github.com/idris900323',
  email: 'idris.connected@gmail.com',
}
