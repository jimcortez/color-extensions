/*{
	"CREDIT": "by mojovideotech",
	"CATEGORIES" : [
    	"generator",
    	"warp"
  	],
  	"INPUTS" : [
		{
			"NAME" : "scale",
			"TYPE" : "float",
			"DEFAULT" : 84.0,
			"MIN" : 10.0,
			"MAX" : 100.0
		},
		{
			"NAME" : "cycle",
			"TYPE" : "float",
			"DEFAULT" : 0.4,
			"MIN" : 0.01,
			"MAX" : 0.99
		},
		{
			"NAME" : "thickness",
			"TYPE" : "float",
			"DEFAULT" : 0.1,
			"MIN" : -0.5,
			"MAX" : 1.0
		},
		{
			"NAME" : "loops",
			"TYPE" : "float",
			"DEFAULT" : 61.0,
			"MIN" : 10.0,
			"MAX" : 100.0
		},
		{
			"NAME" : "warp",
			"TYPE" : "float",
			"DEFAULT" : 2.5,
			"MIN" : -5.0,
			"MAX" : 5.0
		},
		{
			"NAME" : "baseColor",
			"TYPE" : "color",
			"DEFAULT" : [0.33, 0.1, 0.5, 1.0]
		},
		{
			"NAME" : "luminanceScale",
			"TYPE" : "float",
			"DEFAULT" : 1.0,
			"MIN" : 0.0,
			"MAX" : 2.0
		},
    	{
			"NAME" : "rate",
			"TYPE" : "float",
			"DEFAULT" : 1.25,
			"MIN" : -3.0,
			"MAX" : 3.0
		},
	    {
   			"NAME" : "invert",
     		"TYPE" : "bool",
     		"DEFAULT" : false
   		},
   		{
      			"NAME" : "lineColor",
      			"TYPE" : "color",
      			"DEFAULT" : [0.0,0.0,0.0,1.0]
      		}
  	]
}
*/

// Utility function: Convert RGB to HSL
vec3 rgbToHsl(vec3 rgb) {
    float maxC = max(rgb.r, max(rgb.g, rgb.b));
    float minC = min(rgb.r, min(rgb.g, rgb.b));
    float delta = maxC - minC;

    float h = 0.0;
    if (delta > 0.0) {
        if (maxC == rgb.r) h = mod((rgb.g - rgb.b) / delta, 6.0);
        else if (maxC == rgb.g) h = (rgb.b - rgb.r) / delta + 2.0;
        else h = (rgb.r - rgb.g) / delta + 4.0;
        h /= 6.0;
    }

    float l = (maxC + minC) * 0.5;
    float s = delta == 0.0 ? 0.0 : delta / (1.0 - abs(2.0 * l - 1.0));
    return vec3(h, s, l);
}

// Utility function: Convert HSL to RGB
vec3 hslToRgb(vec3 hsl) {
    float h = hsl.x;
    float s = hsl.y;
    float l = hsl.z;

    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = l - 0.5 * c;

    vec3 rgb;
    if (h < 1.0 / 6.0) rgb = vec3(c, x, 0.0);
    else if (h < 2.0 / 6.0) rgb = vec3(x, c, 0.0);
    else if (h < 3.0 / 6.0) rgb = vec3(0.0, c, x);
    else if (h < 4.0 / 6.0) rgb = vec3(0.0, x, c);
    else if (h < 5.0 / 6.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);

    return rgb + vec3(m);
}

void main(void) {
	// Parameters for scale and spacing
	float segmentSize = RENDERSIZE.y / scale;  // Size of each segment, normalized by scale
	float cycleRadius = RENDERSIZE.x / cycle; // Determines how cyclic the pattern is
	float lineGap = segmentSize * (1.0 - thickness); // Gap between lines, scaled by thickness

	// Calculate position and distance from center
	vec2 centeredPos = gl_FragCoord.xy - RENDERSIZE.xy * 0.5;
	float distanceFromCenter = length(centeredPos);

	// Time-based warp effect
	float timeOffset = TIME * rate;
	float warpOffset = warp * sin(centeredPos.y * 0.25 / segmentSize + timeOffset)
	                         * sin(centeredPos.x * 0.25 / segmentSize + timeOffset * 0.5)
	                         * segmentSize * 5.0;

	// Add warp effect to distance
	distanceFromCenter += warpOffset;

	// Modulate distance to create looping effect
	float patternUnit = cycleRadius / loops;  // Unit of a single pattern loop
	float modulatedDistance = mod(distanceFromCenter + patternUnit * 0.5, patternUnit);
	float patternDistance = abs(modulatedDistance - patternUnit * 0.5);

	// Apply gap to define line width
	float patternValue = clamp(patternDistance - lineGap, 0.0, 1.0);


	// Color modulation based on adjusted base color
	float normalizedDistance = distanceFromCenter / (cycleRadius - timeOffset);
	vec3 patternColor = fract((normalizedDistance - 1.0) * vec3(baseColor) * loops * 0.5);

	// Invert or modulate colors based on pattern value
	if (invert) {
		gl_FragColor = vec4(patternColor / patternValue, baseColor.a);
	} else {
		gl_FragColor = vec4(patternColor * patternValue, baseColor.a);
	}

	if((gl_FragColor.r == 0.0 && gl_FragColor.g == 0.0 && gl_FragColor.b == 0.0)
	|| (invert && gl_FragColor.r >= 0.9 && gl_FragColor.g >= 0.9 && gl_FragColor.b >= 0.9)){

	  // Convert baseColor to HSL and scale luminance
    vec3 baseHsl = rgbToHsl(lineColor.rgb);
    baseHsl.z *= luminanceScale; // Scale the luminance
    vec3 adjustedColor = hslToRgb(baseHsl);

	  gl_FragColor = vec4(adjustedColor, 1.0);
	}
}
