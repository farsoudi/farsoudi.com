(function () {
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function applyMask(img, revealed, N) {
    const stops = [];
    let i = 0;
    while (i < N) {
      const on = revealed[i];
      let j = i;
      while (j < N && revealed[j] === on) j++;
      const color = on ? '#fff' : 'transparent';
      stops.push(`${color} ${(i / N) * 100}%`, `${color} ${(j / N) * 100}%`);
      i = j;
    }
    const mask = `linear-gradient(to right, ${stops.join(', ')})`;
    img.style.maskImage = mask;
    img.style.webkitMaskImage = mask;
  }

  const HOLD_MS = 3500;

  // animates the slivers at `order[startIdx..startIdx+count)` to `value` one at a
  // time, spread evenly over durationMs; calls onDone when finished
  function stepReveals(img, N, revealed, order, startIdx, count, durationMs, value, onDone) {
    if (count <= 0) { onDone(); return; }
    let k = 0;
    const step = () => {
      revealed[order[startIdx + k]] = value;
      applyMask(img, revealed, N);
      k++;
      if (k >= count) { onDone(); return; }
      setTimeout(step, durationMs / count);
    };
    step();
  }

  // repeatedly: start with `base` fraction revealed, pop in the remaining slivers
  // over t seconds, hold, then conceal them all and repeat
  function loopImage(img, delta, base, t) {
    const N = Math.max(1, Math.round(1 / delta));

    img.style.maskRepeat = img.style.webkitMaskRepeat = 'no-repeat';
    img.style.maskSize = img.style.webkitMaskSize = '100% 100%';

    const cycle = (first) => {
      const order = shuffle([...Array(N).keys()]);
      const revealed = new Array(N).fill(false);
      const baseCount = first ? Math.min(N, Math.floor(base * N)) : 0;
      for (let k = 0; k < baseCount; k++) revealed[order[k]] = true;
      applyMask(img, revealed, N);

      stepReveals(img, N, revealed, order, baseCount, N - baseCount, t * 1000, true, () => {
        setTimeout(() => {
          stepReveals(img, N, revealed, shuffle([...Array(N).keys()]), 0, N, t * 1000, false, () => {
            cycle(false);
          });
        }, HOLD_MS);
      });
    };

    cycle(true);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.sliver-img').forEach((img, i) => {
      const container = img.closest('[data-sliver-delta]');
      if (!container) return;
      const delta = parseFloat(container.dataset.sliverDelta);
      const base = parseFloat(container.dataset.sliverBase);
      const t = parseFloat(container.dataset.sliverT);
      // stagger each layer's cycle so they don't all loop in lockstep
      setTimeout(() => loopImage(img, delta, base, t), i * 1500);
    });
  });
})();
