export const DroneMotionProfile = {
    smooth: {
        maxSpeed: 18.0,
        maxForce: 12.0,
        slowingRadius: 30.0,
        oscillation: null,
        blink: null
    },
    fast: {
        maxSpeed: 40.0,
        maxForce: 25.0,
        slowingRadius: 15.0,
        oscillation: null,
        blink: null
    },
    wave: {
        maxSpeed: 18.0,
        maxForce: 12.0,
        slowingRadius: 30.0,
        oscillation: { type: 'vertical', amplitude: 2.0, frequency: 3.0 },
        blink: null
    },
    swing: {
        maxSpeed: 18.0,
        maxForce: 12.0,
        slowingRadius: 30.0,
        oscillation: { type: 'horizontal', amplitude: 2.5, frequency: 2.0 },
        blink: null
    },
    strobe: {
        maxSpeed: 18.0,
        maxForce: 12.0,
        slowingRadius: 30.0,
        oscillation: null,
        blink: { rate: 15.0, minOpacity: 0.1 }
    }
};
