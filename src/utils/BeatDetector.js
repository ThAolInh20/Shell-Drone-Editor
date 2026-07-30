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

    return beats;
  }
}
