/*{
    "DESCRIPTION": "Oscillating horizontal line with dynamic thickness and configurable edges. Line thickness propagates from right to left.",
    "CATEGORIES": ["Visual"],
    "INPUTS": [
        {
            "NAME": "lineColor",
            "TYPE": "color",
            "DEFAULT": [0.2, 0.8, 0.4, 1.0]
        },
        {
            "NAME": "backgroundBaseColor",
            "TYPE": "color",
            "DEFAULT": [0.5, 0.5, 0.5, 1.0]
        },
        {
            "NAME": "backgroundLightnessStart",
            "TYPE": "float",
            "DEFAULT": 0.8,
            "MIN": 0.0,
            "MAX": 1.0
        },
        {
            "NAME": "backgroundLightnessEnd",
            "TYPE": "float",
            "DEFAULT": 0.2,
            "MIN": 0.0,
            "MAX": 1.0
        },
        {
            "NAME": "lineThickness",
            "TYPE": "float",
            "DEFAULT": 0.02,
            "MIN": 0.005,
            "MAX": 0.1
        },
        {
            "NAME": "thicknessChangeSpeed",
            "TYPE": "float",
            "DEFAULT": 0.5,
            "MIN": 0.0,
            "MAX": 5.0
        },
        {
            "NAME": "waveAmplitude",
            "TYPE": "float",
            "DEFAULT": 0.2,
            "MIN": 0.0,
            "MAX": 0.5
        },
        {
            "NAME": "lineSpeed",
            "TYPE": "float",
            "DEFAULT": 1.0,
            "MIN": 0.1,
            "MAX": 5.0
        },
        {
            "NAME": "gradientSpeed",
            "TYPE": "float",
            "DEFAULT": 0.2,
            "MIN": 0.05,
            "MAX": 1.0
        },
        {
            "NAME": "lineLeftEdge",
            "TYPE": "float",
            "DEFAULT": 0.1,
            "MIN": 0.0,
            "MAX": 1.0
        },
        {
            "NAME": "lineRightEdge",
            "TYPE": "float",
            "DEFAULT": 0.9,
            "MIN": 0.0,
            "MAX": 1.0
        }
    ]
}*/

void main() {
    vec2 uv = gl_FragCoord.xy / RENDERSIZE.xy;

    // Gradual background value gradation (horizontal)
    float timeFactor = 0.5 * (1.0 + sin(TIME * gradientSpeed));
    float valueGradation = mix(backgroundLightnessStart, backgroundLightnessEnd, uv.x + timeFactor);

    vec3 bgGradient = vec3(valueGradation);
    vec3 bgColor = backgroundBaseColor.rgb * bgGradient;

    // Line parameters
    float speed = TIME * lineSpeed;
    float baseWave = sin(uv.x * 8.0 + speed);
    float randomFactor = sin(uv.x * 12.0 + TIME * 2.0);
    float scaledWave = waveAmplitude * (baseWave + 0.5 * randomFactor);
    float linePosition = 0.5 + scaledWave;

    // Dynamic line thickness propagating from right to left
    float thicknessOffset = 0.01 * sin(TIME * thicknessChangeSpeed + uv.x * 8.0);
    float dynamicThickness = lineThickness + thicknessOffset;

    // Line edge constraints using configurable variables
    if (uv.x < lineLeftEdge || uv.x > lineRightEdge) {
        linePosition = -1.0; // Move line outside visible range
    }

    // Solid line rendering with sharp edges
    float lineDist = abs(uv.y - linePosition);
    float lineMask = step(0.5 * dynamicThickness, lineDist);
    vec3 finalColor = mix(bgColor, lineColor.rgb, 1.0 - lineMask);

    gl_FragColor = vec4(finalColor, 1.0);
}
