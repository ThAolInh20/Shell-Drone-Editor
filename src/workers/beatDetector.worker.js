self.onmessage = (event) => {
  const {
    channelData,
    sampleRate,
    threshold
  } = event.data;

  // Divide the audio into windows of 50ms
  const windowSizeMs = 50;
  const samplesPerWindow = Math.round(
    (windowSizeMs / 1000) * sampleRate
  );
  const totalWindows = Math.floor(
    channelData.length / samplesPerWindow
  );

  // Calculate energy (RMS) for each window
  const energies = new Float32Array(totalWindows);
  for (let i = 0; i < totalWindows; i++) {
    let sum = 0;
    const startSample = i * samplesPerWindow;
    for (let j = 0; j < samplesPerWindow; j++) {
      const val = channelData[startSample + j];
      sum += val * val;
    }
    energies[i] = Math.sqrt(sum / samplesPerWindow);
  }

  // Slide a window to calculate local average energy (radius 10 windows = 1.0 second window)
  const neighborRadius = 10;
  const rawPeaks = [];
  const minSpacingSec = 0.3; // Maximum ~200 BPM to avoid double-triggers
  const minSpacingWindows = Math.round(
    minSpacingSec / (windowSizeMs / 1000)
  );

  let lastBeatWindow = -minSpacingWindows;

  for (let i = 0; i < totalWindows; i++) {
    let localSum = 0;
    let count = 0;
    const startNeighbor = Math.max(
      0,
      i - neighborRadius
    );
    const endNeighbor = Math.min(
      totalWindows - 1,
      i + neighborRadius
    );

    for (let n = startNeighbor; n <= endNeighbor; n++) {
      localSum += energies[n];
      count++;
    }
    const localAvg = localSum / count;

    if (
      energies[i] > localAvg * threshold &&
      (i - lastBeatWindow) >= minSpacingWindows
    ) {
      // Verify if it's a local maximum in a small radius (2 windows left & right)
      let isLocalMax = true;
      for (let offset = -2; offset <= 2; offset++) {
        const checkIndex = i + offset;
        if (
          checkIndex >= 0 &&
          checkIndex < totalWindows
        ) {
          if (energies[checkIndex] > energies[i]) {
            isLocalMax = false;
            break;
          }
        }
      }

      if (isLocalMax) {
        const beatTime = (i * samplesPerWindow) / sampleRate;
        rawPeaks.push(
          Math.round(beatTime * 100) / 100
        );
        lastBeatWindow = i;
      }
    }
  }

  if (rawPeaks.length === 0) {
    self.postMessage([]);
    return;
  }

  // Autocorrelation to estimate beat period in windows
  // minLag is 6 windows (200 BPM), maxLag is 20 windows (60 BPM)
  const minLag = 6;
  const maxLag = 20;
  let bestLag = 10; // default 120 BPM (10 windows = 0.5s)
  let maxCorrelation = -1;
  const correlations = [];

  for (let lag = minLag; lag <= maxLag; lag++) {
    let correlation = 0;
    let count = 0;
    for (let j = 0; j < totalWindows - lag; j++) {
      correlation += energies[j] * energies[j + lag];
      count++;
    }
    const val = count > 0 ? correlation / count : 0;
    correlations[lag] = val;
    if (val > maxCorrelation) {
      maxCorrelation = val;
      bestLag = lag;
    }
  }

  // Quadratic interpolation for sub-window resolution
  let fractionalLag = bestLag;
  if (bestLag > minLag && bestLag < maxLag) {
    const yLeft = correlations[bestLag - 1] || 0;
    const yMid = correlations[bestLag] || 0;
    const yRight = correlations[bestLag + 1] || 0;
    const denom = 2 * (2 * yMid - yLeft - yRight);
    if (Math.abs(denom) > 0.0001) {
      const d = (yRight - yLeft) / denom;
      fractionalLag = bestLag + Math.max(-0.5, Math.min(0.5, d));
    }
  }

  const beatIntervalSec = fractionalLag * (windowSizeMs / 1000);

  // Circular mean phase estimation
  let sumCos = 0;
  let sumSin = 0;
  for (let i = 0; i < rawPeaks.length; i++) {
    const t = rawPeaks[i];
    const angle = ((t % beatIntervalSec) / beatIntervalSec) * Math.PI * 2;
    sumCos += Math.cos(angle);
    sumSin += Math.sin(angle);
  }
  const meanAngle = Math.atan2(sumSin, sumCos);
  let phi = (meanAngle / (Math.PI * 2)) * beatIntervalSec;
  if (phi < 0) {
    phi += beatIntervalSec;
  }

  // Generate beat grid from first to last peak
  const beats = [];
  const duration = channelData.length / sampleRate;
  const firstPeak = rawPeaks[0];
  const lastPeak = rawPeaks[rawPeaks.length - 1];

  let n = Math.floor((firstPeak - phi) / beatIntervalSec);
  let currentBeat = phi + n * beatIntervalSec;

  while (currentBeat <= lastPeak + (beatIntervalSec * 0.5)) {
    if (currentBeat >= 0 && currentBeat <= duration) {
      beats.push(Math.round(currentBeat * 100) / 100);
    }
    n++;
    currentBeat = phi + n * beatIntervalSec;
  }

  self.postMessage(beats);
};
