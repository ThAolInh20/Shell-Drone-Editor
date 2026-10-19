export const AUDIO_CONFIG = {
  baseURL: 'audio/',
  volumes: {
    master: 1.0,
    lift: 0.8,
    burst: 0.9,
    burstSmall: 0.65,
    crackle: 0.3,
    crackleSmall: 0.45
  },
  physics: {
    speedOfSound: 343
  },
  stages: {
    launch: {
      standard: {
        volume: 0.8,
        playbackRateMin: 0.85,
        playbackRateMax: 0.95,
        fileNames: [
          'lift1.mp3',
          'lift2.mp3',
          'lift3.mp3'
        ]
      },
      heavy: {
        volume: 0.9,
        playbackRateMin: 0.75,
        playbackRateMax: 0.85,
        fileNames: [
          'lift-ll-1.mp3',
          'lift-ll-2.mp3'
        ]
      },
      soft: {
        volume: 0.5,
        playbackRateMin: 0.95,
        playbackRateMax: 1.05,
        fileNames: [
          'lift3.mp3'
        ]
      },
      silent: {
        volume: 0,
        fileNames: []
      }
    },
    burst: {
      standard: {
        volume: 0.9,
        playbackRateMin: 0.8,
        playbackRateMax: 0.9,
        fileNames: [
          'burst1.mp3',
          'burst2.mp3',
          'burst4.mp3',
          'burst5.mp3'
        ],
        useAltitudePitch: true
      },
      heavy: {
        volume: 1.0,
        playbackRateMin: 0.7,
        playbackRateMax: 0.8,
        fileNames: [
          'burst4.mp3',
          'burst5.mp3'
        ]
      },
      soft: {
        volume: 0.55,
        playbackRateMin: 0.85,
        playbackRateMax: 1.05,
        fileNames: [
          'burst-sm-1.mp3',
          'burst-sm-2.mp3'
        ]
      },
      crisp: {
        volume: 0.85,
        playbackRateMin: 0.95,
        playbackRateMax: 1.1,
        fileNames: [
          'burst1.mp3',
          'burst2.mp3'
        ]
      },
      silent: {
        volume: 0,
        fileNames: []
      }
    },
    crackle: {
      standard: {
        volume: 0.3,
        playbackRateMin: 1.0,
        playbackRateMax: 1.0,
        fileNames: [
          'crackle1.mp3'
        ]
      },
      dense: {
        volume: 0.4,
        playbackRateMin: 0.9,
        playbackRateMax: 1.1,
        fileNames: [
          'crackle-sm-1.mp3',
          'crackle-sm-2.mp3'
        ]
      },
      soft: {
        volume: 0.25,
        playbackRateMin: 1.0,
        playbackRateMax: 1.15,
        fileNames: [
          'crackle-sm-1.mp3'
        ]
      },
      silent: {
        volume: 0,
        fileNames: []
      }
    }
  }
};
