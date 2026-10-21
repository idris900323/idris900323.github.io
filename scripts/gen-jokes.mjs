// One-off generator for the caption slots (src/content/jokes/{en,ja}.json).
// After generation, Idris edits the JSON directly: set `selected` (0-2) or write `custom`.
// DO NOT re-run once he has chosen captions (it would overwrite his choices).
import { writeFileSync, existsSync } from 'node:fs'

// [id, context, [en x3], [ja x3]]  (JA = draft, NEEDS-NATIVE-REVIEW; humour is gentle, no sarcasm at people)
// Slots whose feature is not built or is not connected to anything: kept in docs/jokes-archive.json, never regenerated.
const ARCHIVED = new Set(["g6", "g5", "g7", "g9", "g10", "g11", "p1", "p4", "p7", "p8b", "p8c", "p10", "p11", "rs1", "lc1", "hint"])

const S0 = [
  ['g1', 'Press the Moon: page collapses into a heap (G1).', ['Control: Gravity was not in the budget.', 'Turns out the wires were the only thing holding this up.', 'Fixing: please hold.'], ['管制：重力は予算に入っていませんでした。', '配線だけがこのページを支えていたようです。', '修復中です。しばらくお待ちください。']],
  ['g2', 'Title prank: letters of the name get knocked off and snap back (G2).', ['Letters are 3% less stable than my last PID.', 'Please re-sort. I am only a mild mess.', 'Autocorrect for names: unavailable in space.'], ['文字の安定性は前回のPIDより3%低めです。', '並べ直してください。少しだけ散らかっています。', '名前の自動修正は宇宙では使えません。']],
  ['g3', 'Click stamps (sound words are the caption; JA uses onomatopoeia).', ['BONK', 'ZAP', 'PING'], ['ドーン', 'ガチャ', 'ピコーン']],
  ['g4', 'Barrel roll (Konami code or typing roll).', ['Do a barrel roll. (Yes, I know.)', 'Orientation check: nominal.', 'Please remain seated.'], ['バレルロール。（お約束です。）', '姿勢チェック：問題なし。', '座ったままでお待ちください。']],
  ['g5', 'Scroll rocket running out of fuel at the page bottom.', ['Running on fumes and optimism.', 'Fuel: 3% / Hope: 100%.', 'Coasting into the footer.'], ['燃料切れと楽観だけで飛んでいます。', '燃料3%、希望100%。', 'フッターへ惰性で着陸します。']],
  ['g6', 'Scrolling too fast makes Scout dizzy.', ['Please scroll like you mean it, but gently.', 'Stop! He is not a gyroscope.', 'Dizzy. Servos disagree.'], ['しっかり、でもやさしくスクロールしてください。', 'やめて！ジャイロじゃないんです。', '目が回りました。サーボも反対しています。']],
  ['g7', 'Mouse shake: page shakes.', ['Seismic event. (It was you.)', 'Orbi: Is this normal?! Control: No.', 'Rattling is a feature.'], ['地震です。（あなたです。）', 'オービ：これは普通？！管制：いいえ。', 'ガタガタは仕様です。']],
  ['g8', 'Scout naps after 10 s idle; tab title changes when you leave.', ['I was just resting my servos.', 'Scout misses you', 'Come back, the robots are fine (mostly)'], ['サーボを休ませていただけです。', 'スカウトが待っています', '戻ってきて、ロボットは（ほぼ）無事です']],
  ['g9', 'Clicking Scout many times (annoyed, angry, resignation letter).', ['Notice: I am quitting. Effective whenever you stop.', 'Update: reconsidered. Pay is exposure.', 'Please stop. I have a gait to practise.'], ['お知らせ：辞めます。クリックをやめたら有効です。', '追記：撤回しました。報酬は経験値です。', 'やめてください。歩行の練習があります。']],
  ['g10', 'Fake loading toasts.', ['Calibrating overconfidence… OK.', 'Reticulating splines… and servos.', 'Warning: servo 3 has opinions.'], ['自信過剰を較正中…OK。', 'スプラインとサーボを調整中…', '警告：サーボ3に意見があります。']],
  ['g11', 'Right-click menu: Reboot / Panic / Ask a professor / Blame Bluetooth.', ['Blame Bluetooth: always valid.', 'Reboot: have you tried it?', 'Panic: scheduled for later.'], ['Bluetoothのせいにする：常に有効です。', '再起動：試しましたか？', 'パニック：後ほど実施予定です。']],
  ['g12', 'Selecting text shows a small Scout.', ['Highlighting facts. Respect.', 'Underlining? Bold choice.', 'Copying is a form of flattery.'], ['事実に線を引いていますね。素晴らしいです。', 'ハイライトですか。大胆ですね。', 'コピーは最大の賛辞です。']],
  ['g13', 'Console message banner for people who open DevTools.', ['Hello, fellow tinkerer. Opening the console is how I got here too.', 'Hire me (politely).', 'Bugs are features with poor marketing.'], ['こんにちは、同じ工作好きの方。私もコンソールを開いてここに来ました。', 'よろしければ、ご連絡ください。', 'バグは宣伝が下手な機能です。']],
  ['g14', 'Fake cookie banner (edible cookies).', ['We use cookies: the edible kind.', 'This site stores no data. The robot eats the cookies.', 'Accept? Scout already did.'], ['クッキーを使います。食べられるほうです。', 'このサイトは情報を保存しません。クッキーはロボットが食べます。', '同意しますか？スカウトはもう食べました。']],
  ['g15', 'Thank-you finale at the contact section.', ['Message received on Earth. And probably Japan.', 'Signal sent. Please reply before the battery dies.', 'Thank you for scrolling all the way down.'], ['地球で受信しました。たぶん日本でも。', '信号を送りました。電池が切れる前にご返信ください。', '最後までスクロールしていただき、ありがとうございます。']],
  ['p1', 'Skills cards clicked fast.', ['Gears jammed. Have you tried turning it off and on?', 'Hello World, v47.', 'Ten-plus projects, counted twice.'], ['歯車が噛みました。電源の入れ直しは試しましたか？', 'Hello World、第47版。', '10件以上のプロジェクト、数え直し中です。']],
  ['p2a', '8-bit computer: counter overflows 255 to 0.', ['Integer overflow: I am now 0 years old.', 'Rolled over. Starting again, wiser.', 'Eight bits is a lot, until it is not.'], ['整数オーバーフロー：0歳になりました。', '一周しました。賢くなって再出発です。', '8ビットは広い…あふれるまでは。']],
  ['p2b', '8-bit computer: illegal opcode.', ['That is not an instruction. Same as my sleep schedule.', 'Unknown opcode. Politely refusing.', 'Instruction not found. Searching the breadboard.'], ['それは命令ではありません。私の睡眠スケジュールと同じです。', '未知のオペコードです。丁重にお断りします。', '命令が見つかりません。ブレッドボードを捜索中。']],
  ['p2c', '8-bit computer: HLT.', ['Halted. Proud of me.', 'Built from gates, vibes, and many wires.', 'Done. Nobody touch anything.'], ['停止しました。誇らしいです。', 'ゲートと気合と大量の配線でできています。', '完了です。誰も触らないでください。']],
  ['p3', 'Quadruped chaos gait.', ['Spider-inspired, four-legs-because-budget.', 'Dog mode: engaged. Chasing tail: in progress.', 'Moonwalking is just walking with confidence.'], ['クモ型、足が4本なのは予算のためです。', '犬モード起動。しっぽ追跡中。', 'ムーンウォークは自信のある歩行です。']],
  ['p4', 'Bluetooth pairing keeps failing.', ['Pairing… failed. Pairing… failed. Pairing… success? (Don’t ask.)', 'Have you tried unplugging the car?', 'It is always the Bluetooth.'], ['ペアリング失敗…失敗…成功？（聞かないでください。）', '車の電源を抜いてみましたか？', 'いつもBluetoothのせいです。']],
  ['p5', 'Pipe sim: leak found.', ['Leak located. Duck evidence: preserved.', 'Scanning segment 4: still dry. Still suspicious.', 'Detected. The duck saw nothing.'], ['リーク特定。アヒルの証拠は保全済みです。', '区間4をスキャン中：まだ乾いています。まだ怪しいです。', '検出しました。アヒルは何も見ていません。']],
  ['p6a', 'Swarm: boss added.', ['Decentralised: nobody is in charge and somehow it works.', 'Boss crowned. Swarm: relieved, then dependent.', 'A hat does not make a controller.'], ['分散型：誰も指揮しないのに、なぜか動きます。', 'ボス就任。群れ：安心、そして依存。', '帽子をかぶってもコントローラにはなりません。']],
  ['p6b', 'Swarm: boss removed.', ['Boss removed. Swarm: ok, we will manage.', 'Centralised version: lying down. Decentralised: carrying on.', 'Consensus reached. Lunch cancelled.'], ['ボスがいなくなりました。群れ：なんとかします。', '集中型は倒れ、分散型は続行中。', '合意に達しました。昼食は中止です。']],
  ['p7', 'G.A.I.T. section (decoration only; no jokes about tremor or patients).', ['ESP32: small, mighty, very tired.', 'The wristband waves hello.', 'Pulse sparkle: detection received.'], ['ESP32：小さくて強くて、とても眠そうです。', 'リストバンドが手を振っています。', '脈の輝き：検出しました。']],
  ['p8a', 'PID: oscillatory preset.', ['Oscillatory: it is not a bug, it is enthusiasm.', 'The arm is very excited about the setpoint.', 'Overshoot: a tiny victory lap.'], ['振動プリセット：バグではなく、熱意です。', 'アームは目標値にとても興奮しています。', 'オーバーシュート：小さな凱旋です。']],
  ['p8b', 'PID: integral windup.', ['Integral windup: I have been holding this grudge for 40 seconds.', 'Windup: the error remembers everything.', 'Ki is keeping notes.'], ['積分ワインドアップ：この恨みを40秒間抱えています。', 'ワインドアップ：誤差は全部覚えています。', 'Kiがメモを取っています。']],
  ['p8c', 'PID: derivative noise.', ['Derivative noise: three coffees deep.', 'Kd heard a rumour and acted on it.', 'Jitter is just caffeine in motion.'], ['微分ノイズ：コーヒー3杯目です。', 'Kdは噂を聞いて行動しました。', 'ジッタは動くカフェインです。']],
  ['p8d', 'PID: auto-tune running.', ['Asking the motor how it feels.', 'Auto-tune (demo): negotiating with physics.', 'Searching gains politely.'], ['モーターの調子を聞いています。', '自動調整（デモ）：物理と交渉中です。', 'ゲインを丁寧に探索中です。']],
  ['p8e', 'PID: tuned.', ['Ahh. Tuned.', 'Settled. Nobody panic.', 'Critically damped, emotionally stable.'], ['ふう。調整完了です。', '落ち着きました。慌てないでください。', '臨界減衰、気持ちも安定です。']],
  ['p9a', 'Net system: debris tries to escape.', ['Capture rate: socks 1, philosophy 0.', 'The debris has big plans and no thrusters.', 'Net closed. Debris: reconsidering.'], ['捕獲率：靴下1、哲学0。', 'デブリは大志を抱きましたが、推進器はありません。', 'ネットが閉じました。デブリは再考中です。']],
  ['p9b', 'Net system: a node fails.', ['Node 3 is feeling unwell. The swarm adapts.', 'One satellite fainted. Others: carry on.', 'Decentralised: the show goes on.'], ['ノード3の調子が悪いようです。群れは適応します。', '衛星が1機気絶しました。他は続行します。', '分散型：ショーは続きます。']],
  ['p10', 'ABB arm joke (no ABB logos).', ['Gripper orientation: it is complicated.', 'Wrist at limit. Wrist at drama.', 'I can not. Do not ask me to.'], ['グリッパーの姿勢：複雑です。', '手首が限界です。手首が大げさです。', 'できません。頼まないでください。']],
  ['p11', 'Contact: mailbox robot.', ['Signal sent. Waiting on Earth.', 'Message in a bottle, but with Wi-Fi.', 'Delivered. Mailbox robot: exhausted.'], ['信号を送りました。地球からの返信待ちです。', 'ボトルメールですが、Wi-Fi付きです。', '配達完了。郵便ロボットは疲れました。']],
  ['rs1', 'Robo Soccer motor driver (Idris’s own story; he writes or approves this caption).', ['Motor driver status: fireworks.', 'The first attempt ended with a very bright finish.', 'Lesson: respect the current rating.'], ['モータードライバの状態：花火です。', '初回はとても明るい幕切れでした。', '教訓：定格電流には敬意を。']],
  ['lc1', 'LeetCode badge knocked off the shelf by an arm (Idris writes the caption).', ['I spent a year on this route. Then I met a motor.', '587 problems solved. The badge fell anyway.', 'Pivot: from stack overflow to servo overshoot.'], ['この道に1年を費やしました。そしてモーターに出会いました。', '587問解きました。バッジは落ちました。', '方向転換：スタックオーバーフローからサーボのオーバーシュートへ。']],
  ['hint', 'One-time hint after 20 s idle in Chaos.', ['psst: try the Moon.', 'Something on this page says “Do not press”.', 'The Moon looks suspicious.'], ['ひそひそ：月を押してみてください。', 'このページに「押さないで」と書かれたものがあります。', '月が怪しげです。']],
  ['warn', 'Transformation alert when CHAOS is pressed.', ['WARNING: professionalism leaking', 'ALERT: tidy mode unplugged', 'Notice: seriousness is leaving the building'], ['警告：プロ意識が漏れています', '警報：整理整頓モードが外れました', 'お知らせ：真面目さが外出中です']],
]

const S = S0.filter((s) => !ARCHIVED.has(s[0]))

for (const lang of ['en', 'ja']) {
  const file = `src/content/jokes/${lang}.json`
  if (existsSync(file) && !process.argv.includes('--force')) { console.log('exists, skipping', file); continue }
  const idx = lang === 'en' ? 2 : 3
  const out = S.map((s) => ({ id: s[0], context: s[1], options: s[idx], selected: null, custom: '', status: 'DRAFT' }))
  writeFileSync(file, JSON.stringify(out, null, 2) + '\n')
}
console.log(S.length, 'slots')
