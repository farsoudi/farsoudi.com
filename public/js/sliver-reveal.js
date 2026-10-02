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

  function initImage(img, delta, base, t) {
    const N = Math.max(1, Math.round(1 / delta));
    const baseCount = Math.min(N, Math.floor(base * N));
    const order = shuffle([...Array(N).keys()]);
    const revealed = new Array(N).fill(false);
    for (let k = 0; k < baseCount; k++) revealed[order[k]] = true;

    img.style.maskRepeat = img.style.webkitMaskRepeat = 'no-repeat';
    img.style.maskSize = img.style.webkitMaskSize = '100% 100%';
    applyMask(img, revealed, N);

    // remaining slivers pop in at random positions, spread linearly over t seconds
    const remaining = N - baseCount;
    for (let k = 0; k < remaining; k++) {
      const delay = (t * 1000 * (k + 1)) / remaining;
      setTimeout(() => {
        revealed[order[baseCount + k]] = true;
        applyMask(img, revealed, N);
      }, delay);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.sliver-img').forEach((img) => {
      const container = img.closest('[data-sliver-delta]');
      if (!container) return;
      const delta = parseFloat(container.dataset.sliverDelta);
      const base = parseFloat(container.dataset.sliverBase);
      const t = parseFloat(container.dataset.sliverT);
      initImage(img, delta, base, t);
    });
  });
})();
