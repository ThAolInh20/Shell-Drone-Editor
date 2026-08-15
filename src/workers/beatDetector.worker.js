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
  const beats = [];
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

    // Peak detection condition:
    // 1. Current window energy is higher than local average * threshold
    // 2. We haven't detected a beat too recently
    // 3. Current window is a local maximum compared to its immediate neighbors
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
        beats.push(
          Math.round(beatTime * 100) / 100
        );
        lastBeatWindow = i;
      }
    }
  }

  self.postMessage(beats);
};
