export const DroneFormats = {
    "GridIntro": {
        formation: "grid",
        formationParams: { rows: 10, spacing: 20, y: 50, variation: 2 },
        motion: "smooth",
        transitionColor: { type: "solid", color: "#333333" },
        arrivalColor: { type: "radialSpread", color: "#00ff00", params: { speed: 150.0 } },
        arrivalAnimation: { type: "pulse", params: { amplitude: 1.5, frequency: 1.5 } }
    },
    "CircleFast": {
        formation: "circle",
        formationParams: { radius: 150, y: 100, variation: 0 },
        motion: "fast",
        transitionColor: { type: "strobe", color: "#ffffff", params: { frequency: 15 } },
        arrivalColor: { type: "sequential", color: "#0088ff", params: { delayPerDrone: 0.01 } },
        arrivalAnimation: { type: "spin", params: { speed: 4.0 } }
    },
    "WaveDance": {
        formation: "wave",
        formationParams: { amplitude: 60, frequency: 0.04, y: 100, spacing: 15 },
        motion: "wave",
        transitionColor: { type: "solid", color: "#222222" },
        arrivalColor: { type: "instant", color: "#ff00ff" },
        arrivalAnimation: null
    },
    "LineSwing": {
        formation: "line",
        formationParams: { spacing: 10, y: 30 },
        motion: "swing",
        transitionColor: { type: "solid", color: "#111111" },
        arrivalColor: { type: "radialSpread", color: "#ffaa00", params: { speed: 100.0 } },
        arrivalAnimation: null
    },
    "GridStrobe": {
        formation: "grid",
        formationParams: { rows: 14, spacing: 10, y: 80, variation: 20 },
        motion: "strobe",
        transitionColor: { type: "strobe", color: "#ffffff", params: { frequency: 10 } },
        arrivalColor: { type: "instant", color: "#ffffff" },
        arrivalAnimation: { type: "shimmer", params: { intensity: 2.0 } }
    },
    "RedDot": {
        formation: "circle",
        formationParams: { radius: 10, y: 20 },
        motion: "smooth",
        transitionColor: { type: "solid", color: "#330000" },
        arrivalColor: { type: "radialSpread", color: "#ff0000", params: { speed: 50.0 } },
        arrivalAnimation: null
    }
};
