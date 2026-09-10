const $ = s => document.querySelector(s);
const slides = [...document.querySelectorAll('.slide')];
const stat = (label, value, unit = '', type = '') => `<div class="stat ${type}"><small>${label}</small><strong>${value}${unit ? `<span>${unit}</span>` : ''}</strong></div>`;
const arrow = '<span class="receipt-arrow" aria-hidden="true">→</span>';
const beats = [
  [
    {note: 'Everyone’s talking about recursive self-improvement.', time: '0:00–0:02'},
    {note: 'Reveal the first headline.', time: '0:02–0:04'},
    {note: 'Reveal the next headline.', time: '0:04–0:06'},
    {note: 'Reveal the next headline.', time: '0:06–0:08'},
    {note: 'What does it mean?', time: '0:08–0:10'},
  ],
  [
    {note: 'System improves itself.', time: '0:10–0:15'},
    {note: 'System improves at improving.', time: '0:15–0:20'},
  ],
  [
    {note: 'This is the language model.', time: '0:20–0:24'},
    {note: 'Put it in a loop. It can act, observe, and try again.', time: '0:24–0:29'},
    {note: 'The surrounding software is the harness. Instructions, memory, tools, and the loop.', time: '0:29–0:35'},
    {note: 'Now let the system review and rewrite its harness.', time: '0:35–0:40'},
  ],
  [
    {note: 'This is where we can work with the models we have.', time: '0:40–0:43'},
    {note: 'Almost, and today. There are other routes, including changing the model itself.', time: '0:43–0:47'},
    {note: 'The question is: how do we improve the harness?', time: '0:47–0:51'},
  ],
  [
    {note: 'Code and math give us useful checks. Tests. Exact answers. Proof checkers.', time: '0:51–0:57'},
    {note: 'But “describe this image” is fuzzier. What makes one description better? The feedback is harder.', time: '0:57–1:03'},
  ],
  [
    {note: 'Suppose models become superhuman at code and math.', time: '1:03–1:08'},
    {note: 'Can that help with tasks we can’t easily check?', time: '1:08–1:14'},
    {note: 'Ask them to build tools or prove theorems on the fly. Parts of a fuzzy problem may still be measurable or provable.', time: '1:14–1:22'},
  ],
  [
    {note: 'A lot of self-improvement work starts with text.', time: '1:22–1:26'},
    {note: 'What does it look like in vision? Let’s look at two experiments.', time: '1:26–1:31'},
  ],
  [
    {intro: true, video: false, note: 'One way to get feedback in vision is to hide something, predict it, then check the answer.', time: '1:31–1:38'},
    {intro: true, video: true, note: 'Here is the covered clip. We supply the mechanism family and physics. It measures the geometry.', time: '1:38–1:42'},
    {intro: true, video: true, note: 'We can use that feedback to train a network from scratch. But these models know a ton of info implicitly.', time: '1:42–1:49'},
    {intro: true, video: true, note: 'We want to express that as code.', time: '1:49–1:52'},
    {intro: true, video: true, note: 'Can we use this feedback to write tools which help them solve this task?', time: '1:52–1:58'},
    {title: 'What happens behind the cover?', stage: 'The first attempt', caption: 'The first program misplaces the hidden point.', receipt: stat('Original error', '36.3', 'px', 'original'), note: 'The original program misplaces the hidden point. Its predicted motion is wrong.', time: '1:58–2:05'},
    {title: 'It wrote a measuring tool.', stage: 'What the model wrote', caption: 'Combine visible edges across frames.', receipt: '', note: 'It wrote code to combine visible edges across frames. Then it revised the code to compare possible shapes.', time: '2:05–2:16'},
    {title: 'The new tool makes a better prediction.', stage: 'The improved tool', caption: 'The saved code works on this further example.', receipt: stat('Original error', '36.3', 'px', 'original') + arrow + stat('Improved error', '0.3', 'px'), note: 'We kept that code. This machine was held out from improvement and selection. The prediction is much closer.', time: '2:16–2:24'},
    {title: 'Move the pin. Predict the new motion.', stage: 'A new question', caption: 'Change the machine before revealing the answer.', receipt: stat('Pin change', '+20', 'px', 'reference'), note: 'Now move the pin. Predict a motion it was never shown. Then reveal the answer.', time: '2:24–2:36'},
    {title: 'Now reveal what actually happens.', stage: 'The check', caption: 'Compare the prediction with the simulator.', receipt: stat('Mean test error', '−83', '%') + '<div class="stat-note">20 further machines<br>from the same family</div>', note: 'The motion matches closely. On twenty further machines from this family, average prediction error fell about eighty-three percent.', time: '2:36–2:48'},
  ],
  [
    {title: 'How high was the camera?', stage: 'The problem', caption: 'A real photograph. A measurement to make.', receipt: '', note: 'Does this work on natural images? Here is a real room. How high was the camera?', time: '2:48–2:56'},
    {title: 'How high was the camera?', stage: 'The first attempt', caption: 'We start with an existing depth model.', receipt: stat('Original estimate', '0.57', 'm', 'original'), note: 'We supply an existing depth model. The first measuring code handles camera tilt poorly. It says fifty-seven centimetres.', time: '2:56–3:05'},
    {title: 'It wrote a measuring tool.', stage: 'What the model wrote', caption: 'Fit the floor in predicted depth.', receipt: '', note: 'It writes a better procedure. Turn depth into points in space. Fit the floor. Check whether that fit is plausible.', time: '3:05–3:15'},
    {title: 'Measure the distance to the floor.', stage: 'The improved tool', caption: 'Account for the camera’s tilt.', receipt: stat('Original estimate', '0.57', 'm', 'original') + arrow + stat('Improved estimate', '1.56', 'm'), note: 'Measure the perpendicular distance to the floor. The new answer is one point five six metres.', time: '3:15–3:22'},
    {title: 'Now check the reference height.', stage: 'The check', caption: 'Compare with the room’s recorded 3D geometry.', receipt: stat('Improved estimate', '1.56', 'm') + stat('Reference height', '1.51', 'm', 'reference'), note: 'The recorded room geometry gives us one point five one. The program did not get to see that reference.', time: '3:22–3:31'},
    {title: 'Another room. The same measuring tool.', stage: 'Reuse', caption: 'The next photograph gets the better procedure.', receipt: stat('Original', '0.34', 'm', 'original') + stat('Improved', '0.87', 'm') + stat('Reference', '0.86', 'm', 'reference'), note: 'Another room. The same procedure. Eighty-seven centimetres; reference, eighty-six. The project also measures distances, sizes, and which object is closer.', time: '3:31–3:41'},
  ],
  [
    {note: 'For your own work: how can I break my task into parts the model can check?', time: '3:41–3:48'},
    {note: 'Let it write the tools. Let the procedure change.', time: '3:48–3:53'},
    {note: 'Keep the check independent. The program cannot redefine what counts as correct.', time: '3:53–3:59'},
    {note: 'Test on new examples. Keep improvements that work beyond the failures it was shown.', time: '3:59–4:05'},
    {note: 'We have shown retained tool improvements. We have not shown recursive self-improvement yet. Can better tools help build the next better version?', time: '4:05–4:18'},
  ],
];

let slide = 0, step = 0;
const players = new Map();
const pending = new Map();
const total = beats.reduce((sum, b) => sum + b.length, 0);
const names = ['Headlines', 'Self-improvement', 'LLM → agent → harness', 'Improving the harness', 'The feedback', 'The core insight', 'Why vision?', 'Motion', 'A photograph', 'Takeaways'];
const replayNames = new Map(slides.flatMap((el, i) => el.dataset.replay ? [[i, el.dataset.replay]] : []));

function setPlayerState(i, s) {
  const player = players.get(i);
  const beat = beats[i][s];
  if (replayNames.get(i) === 'mechanic') {
    player.setIntro(Boolean(beat.intro), Boolean(beat.video));
    if (!beat.intro) player.setStep(s - 4);
  } else player.setStep(s);
}

const nav = $('.slide-dots');
names.forEach((name, i) => {
  const button = document.createElement('button');
  button.className = 'slide-dot';
  button.setAttribute('aria-label', `${i + 1}. ${name}`);
  button.title = `${i + 1}. ${name}`;
  button.addEventListener('click', () => show(i, 0));
  nav.append(button);
});

async function loadPlayer(i) {
  if (players.has(i)) return players.get(i);
  if (pending.has(i)) return pending.get(i);
  const name = replayNames.get(i);
  const promise = (async () => {
    try {
      const module = await import(`./${name}.js`);
      const factory = module[name === 'mechanic' ? 'createMechanic' : 'createNatural'];
      const player = await factory($(`#${name}-canvas`));
      players.set(i, player);
      $(`#${name}-loading`).hidden = true;
      setPlayerState(i, slide === i ? step : 0);
      return player;
    } catch (error) {
      const el = $(`#${name}-loading`);
      el.textContent = 'The saved replay could not load. Refresh to try again.';
      el.classList.add('error-message');
      console.error(`Failed to load ${name} replay`, error);
      pending.delete(i);
    }
  })();
  pending.set(i, promise);
  return promise;
}

function show(i, s, updateHash = true) {
  slide = Math.max(0, Math.min(slides.length - 1, Number.isFinite(i) ? i : 0));
  step = Math.max(0, Math.min(beats[slide].length - 1, Number.isFinite(s) ? s : 0));
  slides.forEach((el, j) => {
    const active = j === slide;
    el.hidden = !active;
    el.classList.toggle('active', active);
    el.setAttribute('aria-hidden', String(!active));
  });
  slides[slide].dataset.step = String(step);
  const beat = beats[slide][step];
  if (replayNames.has(slide)) {
    const name = replayNames.get(slide);
    slides[slide].dataset.phase = beat.intro ? 'intro' : 'attempts';
    if (!beat.intro) {
      $(`#${name}-title`).textContent = beat.title;
      $(`#${name}-stage`).textContent = beat.stage;
      $(`#${name}-caption`).textContent = beat.caption;
      $(`#${name}-receipt`).innerHTML = beat.receipt;
    }
    if (players.has(slide)) setPlayerState(slide, step);
    else void loadPlayer(slide);
  }
  [...nav.children].forEach((el, j) => {
    el.classList.toggle('active', j === slide);
    if (j === slide) el.setAttribute('aria-current', 'step');
    else el.removeAttribute('aria-current');
  });
  const ordinal = beats.slice(0, slide).reduce((sum, b) => sum + b.length, 0) + step;
  $('#progress').style.width = `${ordinal / (total - 1) * 100}%`;
  $('#position').textContent = `${slide + 1} / ${slides.length}`;
  $('#prev').disabled = ordinal === 0;
  $('#next').disabled = ordinal === total - 1;
  $('#next').innerHTML = ordinal === total - 1 ? 'End <span>✓</span>' : 'Next <span>→</span>';
  $('#notes-label').textContent = `${names[slide]} · ${step + 1} / ${beats[slide].length}`;
  $('#notes-text').textContent = beat.note;
  $('#notes-time').textContent = beat.time;
  document.title = `${slide + 1}/${slides.length} · ${names[slide]} · Can code help us see?`;
  if (updateHash) history.replaceState(null, '', `#${slide + 1}.${step}`);
  window.dispatchEvent(new Event('resize'));
}

function next() {
  if (step < beats[slide].length - 1) show(slide, step + 1);
  else if (slide < slides.length - 1) show(slide + 1, 0);
}
function previous() {
  if (step > 0) show(slide, step - 1);
  else if (slide > 0) show(slide - 1, beats[slide - 1].length - 1);
}
function fromHash() {
  const match = location.hash.match(/^#(\d+)\.(\d+)$/);
  const query = new URLSearchParams(location.search);
  show(match ? Number(match[1]) - 1 : Math.max(0, Number(query.get('slide') || 1) - 1), match ? Number(match[2]) : Number(query.get('step') || 0), false);
}
function toggleNotes() {
  $('#notes').hidden = !$('#notes').hidden;
  $('#notes-toggle').setAttribute('aria-expanded', String(!$('#notes').hidden));
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch (_) { /* Native full-screen availability depends on the browser. */ }
}
$('#next').addEventListener('click', next);
$('#prev').addEventListener('click', previous);
$('#notes-toggle').addEventListener('click', toggleNotes);
$('#notes-close').addEventListener('click', toggleNotes);
$('#deck').addEventListener('click', e => { if (!e.target.closest('a,button,input,select,textarea')) next(); });
addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input,textarea,select')) return;
  if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); next(); }
  if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); previous(); }
  if (e.key === 'Home') { e.preventDefault(); show(0, 0); }
  if (e.key === 'End') { e.preventDefault(); show(slides.length - 1, beats.at(-1).length - 1); }
  if (e.key.toLowerCase() === 'n') toggleNotes();
  if (e.key.toLowerCase() === 'f') void fullscreen();
  if (e.key === 'Escape' && !$('#notes').hidden) toggleNotes();
});
addEventListener('hashchange', fromHash);
addEventListener('pagehide', () => { for (const player of players.values()) player.destroy(); });
fromHash();
// Preload recorded assets while the audience sees the introduction.
for (const i of replayNames.keys()) void loadPlayer(i);

// Read-only state for reproducible screenshots and navigation checks.
window.talk = { get state() { return {slide, step, beats: beats.map(b => b.length)}; }, next, previous, show };
