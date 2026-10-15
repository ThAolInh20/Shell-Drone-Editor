export class WaveformGenerator {
  static peakCache = new Map();

  /**
   * Extracts normalized waveform peaks from an audio source.
   * @param {File|Blob|string} source - Audio file, blob, or URL string
   * @param {Object} options - Configuration options
   * @param {number} [options.samplesPerSecond=50] - Number of peak samples per second
   * @returns {Promise<Float32Array>} - Array of peak values normalized to [0, 1]
   */
  static async getPeaks(source, options = {}) {
    const {
      samplesPerSecond = 50,
      cacheKey = null
    } = options;

    const resolvedCacheKey = cacheKey || (
      typeof source === 'string'
        ? source
        : (source && source.name ? source.name : null)
    );

    if (resolvedCacheKey && this.peakCache.has(resolvedCacheKey)) {
      return this.peakCache.get(resolvedCacheKey);
    }

    let arrayBuffer;
    if (
      (typeof Blob !== 'undefined' && source instanceof Blob) ||
      (source && typeof source.arrayBuffer === 'function')
    ) {
      arrayBuffer = await source.arrayBuffer();
    } else if (typeof source === 'string') {
      const response = await fetch(source);
      arrayBuffer = await response.arrayBuffer();
    } else {
      throw new Error('Unsupported audio source for WaveformGenerator');
    }

    const AudioContextClass = (
      typeof window !== 'undefined' &&
      (window.AudioContext || window.webkitAudioContext)
    ) || (
      typeof globalThis !== 'undefined' &&
      globalThis.AudioContext
    ) || null;

    if (!AudioContextClass) {
      return new Float32Array(0);
    }

    const audioCtx = new AudioContextClass();
    let audioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } finally {
      if (audioCtx.close) {
        audioCtx.close().catch(() => {});
      }
    }

    const channelData = audioBuffer.getChannelData(0);
    const duration = audioBuffer.duration;
    const totalPeaks = Math.max(
      1,
      Math.floor(duration * samplesPerSecond)
    );
    const step = Math.floor(channelData.length / totalPeaks);
    const peaks = new Float32Array(totalPeaks);

    for (let i = 0; i < totalPeaks; i++) {
      const start = i * step;
      const end = Math.min(start + step, channelData.length);
      let max = 0;
      for (let j = start; j < end; j++) {
        const val = Math.abs(channelData[j]);
        if (val > max) {
          max = val;
        }
      }
      peaks[i] = max;
    }

    // Normalize peaks if maximum is greater than zero
    let globalMax = 0;
    for (let i = 0; i < peaks.length; i++) {
      if (peaks[i] > globalMax) {
        globalMax = peaks[i];
      }
    }
    if (globalMax > 0) {
      for (let i = 0; i < peaks.length; i++) {
        peaks[i] = Math.min(1.0, peaks[i] / globalMax);
      }
    }

    if (resolvedCacheKey) {
      this.peakCache.set(resolvedCacheKey, peaks);
    }

    return peaks;
  }

  /**
   * Renders waveform peaks onto a canvas element.
   * @param {HTMLCanvasElement} canvas - The target canvas
   * @param {Float32Array|number[]} peaks - Extracted peak amplitudes
   * @param {Object} options - Rendering options
   */
  static renderWaveform(canvas, peaks, options = {}) {
    if (!canvas || !peaks || peaks.length === 0) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const width = options.width || canvas.clientWidth || 300;
    const height = options.height || canvas.clientHeight || 40;
    const dpr = typeof window !== 'undefined'
      ? (window.devicePixelRatio || 1)
      : 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const barWidth = options.barWidth || 2;
    const barGap = options.barGap || 1;
    const slotWidth = barWidth + barGap;
    const totalBars = Math.floor(width / slotWidth);

    if (totalBars <= 0) {
      ctx.restore();
      return;
    }

    const centerY = height / 2;
    const maxBarHeight = height * 0.85;
    const color = options.color || 'rgba(255, 255, 255, 0.7)';

    ctx.fillStyle = color;

    for (let i = 0; i < totalBars; i++) {
      const peakIndex = Math.floor((i / totalBars) * peaks.length);
      const amplitude = peaks[peakIndex] || 0;
      const barHeight = Math.max(1, amplitude * maxBarHeight);
      const x = i * slotWidth;
      const y = centerY - (barHeight / 2);

      ctx.fillRect(
        x,
        y,
        barWidth,
        barHeight
      );
    }

    ctx.restore();
  }

  /**
   * Clears the waveform peak cache.
   */
  static clearCache() {
    this.peakCache.clear();
  }
}
