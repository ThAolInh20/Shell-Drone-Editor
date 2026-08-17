export class BeatDetector {
  /**
   * Detects beats from an audio source (File, Blob, or URL).
   * @param {File|Blob|string} source - The audio source
   * @param {number} threshold - Energy threshold multiplier (e.g., 1.3)
   * @returns {Promise<number[]>} - Array of beat timestamps in seconds
   */
  static async detectBeats(
    source,
    threshold = 1.3
  ) {
    let arrayBuffer;
    if (source instanceof Blob) {
      arrayBuffer = await source.arrayBuffer();
    } else if (typeof source === 'string') {
      const response = await fetch(source);
      arrayBuffer = await response.arrayBuffer();
    } else {
      throw new Error('Unsupported audio source type');
    }

    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;
    const audioCtx = new AudioContextClass();
    
    // Decode audio data
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    const OfflineCtxClass =
      window.OfflineAudioContext ||
      window.webkitOfflineAudioContext;
    // Set up offline audio context for lowpass filtering
    const offlineCtx = new OfflineCtxClass(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    // Create a buffer source in offline context
    const sourceNode = offlineCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;

    // Create a lowpass filter (cuts off frequencies above ~150Hz to isolate bass)
    const filterNode = offlineCtx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(
      150,
      0
    );

    // Connect source -> filter -> destination
    sourceNode.connect(filterNode);
    filterNode.connect(offlineCtx.destination);

    // Start playback offline
    sourceNode.start(0);
    const filteredBuffer = await offlineCtx.startRendering();

    // Now analyze the filtered buffer
    const channelData = filteredBuffer.getChannelData(0);
    const sampleRate = filteredBuffer.sampleRate;

    // Check if we can offload calculations to Web Worker
    if (typeof window !== 'undefined' && window.Worker) {
      return new Promise((resolve, reject) => {
        try {
          const worker = new Worker(
            new URL(
              '../workers/beatDetector.worker.js',
              import.meta.url
            ),
            {
              type: 'module'
            }
          );

          worker.onmessage = (event) => {
            resolve(event.data);
            worker.terminate();
          };

          worker.onerror = (err) => {
            reject(err);
            worker.terminate();
          };

          // Transfer channelData buffer to avoid memory copies
          worker.postMessage(
            {
              channelData,
              sampleRate,
              threshold
            },
            [
              channelData.buffer
            ]
          );
        } catch (err) {
          // Gracefully fallback to inline computation if worker creation fails
          console.warn(
            'Worker creation failed, falling back to inline beat detection:',
            err
          );
          resolve(this.detectBeatsInline(
            channelData,
            sampleRate,
            threshold
          ));
        }
      });
    }

    // Fallback to inline processing (Node.js tests, etc.)
    return this.detectBeatsInline(
      channelData,
      sampleRate,
      threshold
    );
  }

  static detectBeatsInline(
    channelData,
    sampleRate,
    threshold
  ) {
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
      return [];
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

    return beats;
  }
}
