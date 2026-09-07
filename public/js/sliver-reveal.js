(function () {
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function cauchyRandom(median, scale) {
    let u = 0;
    while (u === 0 || u === 1) u = Math.random();
    return median + scale * Math.tan(Math.PI * (u - 0.5));
  }

  // widths sampled from a Cauchy distribution (median = delta) instead of a fixed delta,
  // then normalized so the sliver boundaries span 0..1
  function buildBoundaries(N, delta) {
    const scale = delta * 1000;
    const widths = new Array(N);
    for (let k = 0; k < N; k++) {
      let w;
      do {
        w = cauchyRandom(delta, scale);
      } while (w <= 0);
      widths[k] = w;
    }
    const total = widths.reduce((a, b) => a + b, 0);
    const boundaries = new Array(N + 1);
    boundaries[0] = 0;
    let acc = 0;
    for (let k = 0; k < N; k++) {
      acc += widths[k] / total;
      boundaries[k + 1] = acc;
    }
    boundaries[N] = 1;
    return boundaries;
  }

  function applyMask(img, revealed, boundaries) {
    const N = revealed.length;
    const stops = [];
    let i = 0;
    while (i < N) {
      const on = revealed[i];
      let j = i;
      while (j < N && revealed[j] === on) j++;
      const color = on ? '#fff' : 'transparent';
      stops.push(`${color} ${boundaries[i] * 100}%`, `${color} ${boundaries[j] * 100}%`);
      i = j;
    }
    const mask = `linear-gradient(to right, ${stops.join(', ')})`;
    img.style.maskImage = mask;
    img.style.webkitMaskImage = mask;
  }

  const HOLD_MS = 3500;

  // toggles `count` slivers (in `order`, starting at `startIdx`) to `revealing`,
  // one at a time, spread evenly over durationMs; calls onDone when finished
  function animateSlivers(img, boundaries, revealed, order, startIdx, count, durationMs, revealing, onDone) {
    if (count <= 0) { onDone(); return; }
    let k = 0;
    const step = () => {
      revealed[order[startIdx + k]] = revealing;
      applyMask(img, revealed, boundaries);
      k++;
      if (k >= count) { onDone(); return; }
      setTimeout(step, durationMs / count);
    };
    step();
  }

  function cycleImage(img, pool, delta, base, t) {
    const N = Math.max(1, Math.round(1 / delta));
    let queue = [];

    function nextSrc() {
      if (queue.length === 0) queue = shuffle([...pool]);
      return queue.pop();
    }

    img.style.maskRepeat = img.style.webkitMaskRepeat = 'no-repeat';
    img.style.maskSize = img.style.webkitMaskSize = '100% 100%';

    function loop(isFirst) {
      const boundaries = buildBoundaries(N, delta);
      const revealOrder = shuffle([...Array(N).keys()]);
      const revealed = new Array(N).fill(false);
      const baseCount = isFirst ? Math.min(N, Math.floor(base * N)) : 0;
      for (let k = 0; k < baseCount; k++) revealed[revealOrder[k]] = true;
      applyMask(img, revealed, boundaries);

      animateSlivers(img, boundaries, revealed, revealOrder, baseCount, N - baseCount, t * 1000, true, () => {
        setTimeout(() => {
          const concealOrder = shuffle([...Array(N).keys()]);
          animateSlivers(img, boundaries, revealed, concealOrder, 0, N, t * 1000, false, () => {
            // image is now fully masked out, so swapping the src is invisible
            img.src = '/img/' + nextSrc();
            loop(false);
          });
        }, HOLD_MS);
      });
    }

    loop(true);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-sliver-images]').forEach((container) => {
      let pool;
      try {
        pool = JSON.parse(container.dataset.sliverImages);
      } catch (e) {
        pool = null;
      }
      if (!pool || !pool.length) return;

      const delta = parseFloat(container.dataset.sliverDelta);
      const base = parseFloat(container.dataset.sliverBase);
      const t = parseFloat(container.dataset.sliverT);

      container.querySelectorAll('.sliver-img').forEach((img, i) => {
        // stagger each layer's cycle so they don't all swap in lockstep
        setTimeout(() => cycleImage(img, pool, delta, base, t), i * 1500);
      });
    });
  });
})();
