/*
{
    "ISFVSN": "2.0",
    "NAME": "KMeansColorVisualization",
    "DESCRIPTION": "Reduces the number of colors in an image using k-means clustering and visualizes the results, with animated circles in the bottom-right quadrant.",
    "INPUTS": [
        { "NAME": "inputImage", "TYPE": "image" },
        { "NAME": "numColors", "TYPE": "float", "DEFAULT": 8, "MIN": 2, "MAX": 50, "LABEL": "Number of Colors" }
    ],
    "PASSES": [
        { "TARGET": "quantized" },
        { "TARGET": "quantized_norm" },
        {  }
    ]
}
*/

#define PI 3.14159265359
#define TWO_PI 6.28318530718

const int INT_MAX = 2147483647;
const float FLT_MAX = 3.402823e+38;

vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(c.x, c.g));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

float hsvDistance(vec3 hsv1, vec3 hsv2) {
    float dh = min(abs(hsv1.x - hsv2.x), 1.0 - abs(hsv1.x - hsv2.x));
    float ds = abs(hsv1.y - hsv2.y);
    float dv = abs(hsv1.z - hsv2.z);
    return sqrt(dh * dh + ds * ds + dv * dv);
}

// Helper: Convert RGB to XYZ
vec3 rgb2xyz(vec3 rgb) {
    rgb = pow(rgb, vec3(2.2)); // sRGB to linear
    float x = dot(rgb, vec3(0.4124564, 0.3575761, 0.1804375));
    float y = dot(rgb, vec3(0.2126729, 0.7151522, 0.0721750));
    float z = dot(rgb, vec3(0.0193339, 0.1191920, 0.9503041));
    return vec3(x, y, z);
}

// Helper: Convert XYZ to LAB
vec3 xyz2lab(vec3 xyz) {
    xyz /= vec3(0.95047, 1.0, 1.08883); // Normalize by D65 white point
    vec3 f = mix(pow(xyz, vec3(1.0 / 3.0)), 7.787 * xyz + vec3(16.0 / 116.0), step(xyz, vec3(0.008856)));
    float L = 116.0 * f.y - 16.0;
    float a = 500.0 * (f.x - f.y);
    float b = 200.0 * (f.y - f.z);
    return vec3(L, a, b);
}

// Convert RGB to LAB
vec3 rgb2lab(vec3 rgb) {
    return xyz2lab(rgb2xyz(rgb));
}

// Helper: Convert LAB to XYZ
vec3 lab2xyz(vec3 lab) {
    float fy = (lab.x + 16.0) / 116.0;
    float fx = lab.y / 500.0 + fy;
    float fz = fy - lab.z / 200.0;

    vec3 f = vec3(fx, fy, fz);
    vec3 xyz = mix(
        f * f * f,
        (f - vec3(16.0 / 116.0)) / 7.787,
        step(f, vec3(0.206893))
    );

    xyz *= vec3(0.95047, 1.0, 1.08883); // Rescale to D65 white point
    return xyz;
}

// Helper: Convert XYZ to RGB
vec3 xyz2rgb(vec3 xyz) {
    vec3 linearRGB = vec3(
    dot(xyz, vec3(3.2404542, -1.5371385, -0.4985314)),
    dot(xyz, vec3(-0.9692660, 1.8760108, 0.0415560)),
    dot(xyz, vec3(0.0556434, -0.2040259, 1.0572252))
    );

    linearRGB = max(linearRGB, vec3(0.0)); // Clamp negative values to zero
    return pow(linearRGB, vec3(1.0 / 2.2)); // Linear to sRGB
}

// Convert LAB to RGB
vec3 lab2rgb(vec3 lab) {
    return xyz2rgb(lab2xyz(lab));
}

// Compute CIEDE2000 distance in LAB color space
float ciede2000(vec3 lab1, vec3 lab2) {
    float L1 = lab1.x, a1 = lab1.y, b1 = lab1.z;
    float L2 = lab2.x, a2 = lab2.y, b2 = lab2.z;

    float dL = L2 - L1;
    float C1 = sqrt(a1 * a1 + b1 * b1);
    float C2 = sqrt(a2 * a2 + b2 * b2);
    float dC = C2 - C1;

    float dH2 = (a2 - a1) * (a2 - a1) + (b2 - b1) * (b2 - b1) - dC * dC;
    dH2 = max(dH2, 0.0); // Ensure non-negative
    float dH = sqrt(dH2);

    float avgL = (L1 + L2) / 2.0;
    float avgC = (C1 + C2) / 2.0;

    float G = 0.5 * (1.0 - sqrt(pow(avgC, 7.0) / (pow(avgC, 7.0) + pow(25.0, 7.0))));
    float a1Prime = a1 * (1.0 + G);
    float a2Prime = a2 * (1.0 + G);

    float C1Prime = sqrt(a1Prime * a1Prime + b1 * b1);
    float C2Prime = sqrt(a2Prime * a2Prime + b2 * b2);
    float avgCPrime = (C1Prime + C2Prime) / 2.0;

    float h1Prime = atan(b1, a1Prime);
    float h2Prime = atan(b2, a2Prime);

    float dHPrime = h2Prime - h1Prime;
    dHPrime = mix(dHPrime, dHPrime + TWO_PI, step(dHPrime, -PI));
    dHPrime = mix(dHPrime, dHPrime - TWO_PI, step(PI, dHPrime));

    float avgHPrime = mix(h1Prime + h2Prime, h1Prime + h2Prime + TWO_PI, step(h1Prime + h2Prime, 0.0));

    float T = 1.0 - 0.17 * cos(avgHPrime - radians(30.0))
    + 0.24 * cos(2.0 * avgHPrime)
    + 0.32 * cos(3.0 * avgHPrime + radians(6.0))
    - 0.20 * cos(4.0 * avgHPrime - radians(63.0));

    float SL = 1.0 + (0.015 * pow(avgL - 50.0, 2.0)) / sqrt(20.0 + pow(avgL - 50.0, 2.0));
    float SC = 1.0 + 0.045 * avgCPrime;
    float SH = 1.0 + 0.015 * avgCPrime * T;

    float RT = -2.0 * sqrt(pow(avgCPrime, 7.0) / (pow(avgCPrime, 7.0) + pow(25.0, 7.0))) * sin(radians(60.0) * exp(-pow((avgHPrime - radians(275.0)) / radians(25.0), 2.0)));

    return sqrt(pow(dL / SL, 2.0) + pow(dC / SC, 2.0) + pow(dH / SH, 2.0) + RT * (dC / SC) * (dH / SH));
}

vec4 main_pass0_quantize() {
    vec2 uv = isf_FragNormCoord.xy;
    vec4 currentColor = IMG_NORM_PIXEL(inputImage, uv);
    vec3 currentLAB = rgb2lab(currentColor.rgb);

    float minDistance = FLT_MAX;
    vec4 bestCluster = vec4(0.0);

    int iNumColors = int(numColors);
    for (int i = 0; i < 50; i++) {
        if (i >= iNumColors) break;
        vec2 clusterUV = vec2(float(i) / float(iNumColors - 1), 0.5);
        vec4 clusterColor = IMG_NORM_PIXEL(inputImage, clusterUV);
        vec3 clusterLAB = rgb2lab(clusterColor.rgb);
        float distance = ciede2000(currentLAB, clusterLAB);

        if (distance < minDistance) {
            minDistance = distance;
            bestCluster = clusterColor;
        }
    }

    // Increment the alpha channel to count occurrences of this cluster
    bestCluster.a += 0.0000001; // Each pixel increments the count for its bin

    //TODO: I don't think this is right, this value will never change. I think it may just be that this can't be done in a shader.

    return bestCluster;
}

// vec4 get_histogram_color() {
//     float fNumColors = floor(numColors);
//     int iNumColors = int(fNumColors);
//     float lineHeight = 1.0 / fNumColors;
//     float accumulatedHeight = 0.0;
//     vec2 imgsize = IMG_SIZE(buffer1);
//
//     for (int i = 0; i < 50; i++) {
//         if (i > iNumColors) break;
//         vec2 clusterUV = vec2(float(i) / (fNumColors - 1.0), 0.5);
//         vec4 clusterColor = IMG_NORM_PIXEL(buffer1, clusterUV);
//         float ratio = clusterColor.a;
//
//         if (isf_FragNormCoord.y <= accumulatedHeight + ratio * lineHeight) {
//             return vec4(clusterColor.rgb, 1.0);
//         }
//         accumulatedHeight += ratio * lineHeight;
//     }
//
//     return vec4(0.0);
// }

// Normalize cluster counts by the total pixel count
vec4 main_pass1_normalize() {
    vec2 uv = isf_FragNormCoord.xy;
    vec4 currentColor = IMG_NORM_PIXEL(quantized, uv);
    vec2 imgSize = IMG_SIZE(quantized);
    float totalPixels = imgSize.x * imgSize.y;
    currentColor.a = (currentColor.a * 10000000.0) / totalPixels; // Normalize alpha to represent the ratio
    return currentColor;
}

// Render the histogram in the bottom-left quadrant
vec4 get_histogram_color() {
    float fNumColors = floor(numColors);
    int iNumColors = int(fNumColors);
    float lineHeight = 1.0 / fNumColors;
    float accumulatedHeight = 0.0;
     vec2 imgSize = IMG_SIZE(quantized);
      float totalPixels = imgSize.x * imgSize.y;

    for (int i = 0; i < 50; i++) {
        if (i > iNumColors) break;
        vec2 clusterUV = vec2(float(i) / (fNumColors - 1.0), 0.5);
        vec4 clusterColor = IMG_NORM_PIXEL(quantized_norm, clusterUV);
        float ratio = clusterColor.a;

        // Render a horizontal line representing this color's ratio
        if (isf_FragNormCoord.y <= accumulatedHeight + ratio * lineHeight) {
            return vec4(clusterColor.rgb, 1.0);
        }
        accumulatedHeight += ratio * lineHeight;
    }

    return vec4(0.0); // Background color if no cluster matches
}

vec4 get_animation_color() {
    vec2 uv = isf_FragNormCoord.xy;

    // Bottom-right animation
    vec2 localUV = vec2((uv.x - 0.5) * 2.0, uv.y * 2.0);

    // Background as the most dominant color
    vec4 dominantColor = IMG_NORM_PIXEL(quantized_norm, vec2(0.0, 0.5));
    vec4 background = vec4(dominantColor.rgb, 1.0);

    // Animated circles for other colors
    int iNumColors = int(numColors);
    vec4 circleColor = vec4(0.0);
    for (int i = 1; i < 50; i++) {
        if (i >= iNumColors) break;

        vec2 clusterUV = vec2(float(i) / float(iNumColors - 1), 0.5);
        vec4 clusterColor = IMG_NORM_PIXEL(quantized_norm, clusterUV);
        float ratio = clusterColor.a;

        // Calculate circle position with smooth animation
        float time = TIME + float(i) * 10.0;
        vec2 circleCenter = 0.5 + 0.4 * vec2(sin(time * 0.3), cos(time * 0.2));
        float circleRadius = ratio * 0.15;

        // Draw circle
        float dist = length(localUV - circleCenter);
        if (dist < circleRadius) {
            circleColor = vec4(clusterColor.rgb, 1.0);
        }
    }

    return mix(background, circleColor, step(0.0, circleColor.a));
}


vec4 main_pass1() {
    vec2 uv = isf_FragNormCoord.xy;

    if (uv.x < 0.5 && uv.y > 0.5) {
        vec2 imageUV = vec2(uv.x * 2.0, (uv.y - 0.5) * 2.0);
        return IMG_NORM_PIXEL(quantized_norm, imageUV);
//       vec4 p =  IMG_NORM_PIXEL(quantized_norm, imageUV);
//       p.a = 1.0;
//       return p;
    } else if (uv.x >= 0.5 && uv.y > 0.5) {
        vec2 newUV = vec2((uv.x - 0.5) * 2.0, uv.y * 2.0 - 1.0);
        vec4 p = IMG_NORM_PIXEL(quantized, newUV);
        p.a = 1.0; //remove the hidden data in alpha channel
        return p;
    } else if (uv.x < 0.5 && uv.y <= 0.5) {
        return get_histogram_color();
    } else {
        return get_animation_color();
    }
}



void main() {
    if (PASSINDEX == 0) {
        gl_FragColor = main_pass0_quantize();
    } else if (PASSINDEX == 1) {
       gl_FragColor = main_pass1_normalize();
   } else {
        gl_FragColor = main_pass1();
    }
}
