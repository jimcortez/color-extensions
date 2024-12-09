/*{
  "CATEGORIES" : [
    "Generator"
  ],
  "DESCRIPTION" : "Stylized landscape with dynamic spaces between horizontal curving lines.",
  "ISFVSN" : "2",
  "INPUTS" : [
    {
      "NAME" : "horizontalOffset",
      "TYPE" : "float",
      "MAX" : 20,
      "DEFAULT" : 1,
      "MIN" : -20,
      "LABEL" : "Horizontal Offset"
    },
    {
      "NAME" : "lineScrollSpeed",
      "TYPE" : "float",
      "MAX" : 5,
      "DEFAULT" : 0,
      "LABEL" : "Line Scroll Speed",
      "MIN" : 0
    },
    {
      "NAME" : "lineCount",
      "TYPE" : "float",
      "MAX" : 200,
      "DEFAULT" : 20,
      "LABEL" : "Number of lines to create depth",
      "MIN" : 1
    },
    {
      "NAME" : "baseLineColor",
      "TYPE" : "color",
      "DEFAULT" : [0.1, 0.6, 0.9, 1.0],
      "LABEL" : "Base Line Color"
    },
    {
      "NAME" : "backgroundColor",
      "TYPE" : "color",
      "DEFAULT" : [0.0, 0.0, 0.2, 1.0],
      "LABEL" : "Background Color"
    },
    {
      "NAME" : "foregroundColor",
      "TYPE" : "color",
      "DEFAULT" : [0.1, 0.4, 0.1, 1.0],
      "LABEL" : "Foreground Color"
    },
    {
      "NAME" : "lineThickness",
      "TYPE" : "float",
      "MAX" : 0.05,
      "DEFAULT" : 0.01,
      "MIN" : 0.001,
      "LABEL" : "Line Thickness"
    }
  ],
  "CREDIT" : "Enhanced by OpenAI."
}
*/

/////////////////////////////////////////////////////////////////////////////
// Stylized landscape with dynamic spaces between horizontal curving lines.
/////////////////////////////////////////////////////////////////////////////

const float PI = 3.141592654;

// Noise functions for terrain detail
vec2 generateNoise(vec2 position) {
    position = vec2(
        dot(position, vec2(127.1, 311.7)),
        dot(position, vec2(269.5, 183.3))
    );
    return -1.0 + 2.0 * fract(sin(position) * 43758.5453123);
}

float computeNoise(vec2 position) {
    const float magicRatio1 = 0.366025404; // (sqrt(3) - 1) / 2
    const float magicRatio2 = 0.211324865; // (3 - sqrt(3)) / 6

    vec2 cell = floor(position + (position.x + position.y) * magicRatio1);
    vec2 offsetA = position - cell + (cell.x + cell.y) * magicRatio2;
    vec2 o = (offsetA.x > offsetA.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec2 offsetB = offsetA - o + magicRatio2;
    vec2 offsetC = offsetA - 1.0 + 2.0 * magicRatio2;

    vec3 influence = max(0.5 - vec3(dot(offsetA, offsetA), dot(offsetB, offsetB), dot(offsetC, offsetC)), 0.0);

    vec3 weightedNoise = influence * influence * influence * influence * vec3(
        dot(offsetA, generateNoise(cell)),
        dot(offsetB, generateNoise(cell + o)),
        dot(offsetC, generateNoise(cell + 1.0))
    );

    return dot(weightedNoise, vec3(70.0));
}

const mat2 rotationMatrix = mat2(0.80, 0.60, -0.60, 0.80);

// Fractional Brownian Motion with 4 octaves
float fbm4(vec2 position) {
    float result = 0.0;
    result += 0.5000 * computeNoise(position); position = rotationMatrix * position * 2.02;
    result += 0.2500 * computeNoise(position); position = rotationMatrix * position * 2.03;
    result += 0.1250 * computeNoise(position); position = rotationMatrix * position * 2.01;
    result += 0.0625 * computeNoise(position);
    return result;
}

// Perspective projection matrix
mat4 createPerspectiveMatrix(float fieldOfView, float aspectRatio, float nearPlane, float farPlane) {
    mat4 perspective = mat4(0.0);
    float angleRadians = (fieldOfView / 180.0) * PI;
    float scale = 1.0 / tan(angleRadians * 0.5);

    perspective[0][0] = scale / aspectRatio;
    perspective[1][1] = scale;
    perspective[2][2] = (farPlane + nearPlane) / (nearPlane - farPlane);
    perspective[2][3] = -1.0;
    perspective[3][2] = (2.0 * farPlane * nearPlane) / (nearPlane - farPlane);

    return perspective;
}

// Camera view matrix for rotation and translation
mat4 createCameraViewMatrix(vec3 eyePosition, float pitch) {
    float cosPitch = cos(pitch);
    float sinPitch = sin(pitch);

    vec3 xAxis = vec3(1.0, 0.0, 0.0);
    vec3 yAxis = vec3(0.0, cosPitch, sinPitch);
    vec3 zAxis = vec3(0.0, -sinPitch, cosPitch);

    return mat4(
        vec4(xAxis.x, yAxis.x, zAxis.x, 0.0),
        vec4(xAxis.y, yAxis.y, zAxis.y, 0.0),
        vec4(xAxis.z, yAxis.z, zAxis.z, 0.0),
        vec4(-dot(xAxis, eyePosition), -dot(yAxis, eyePosition), -dot(zAxis, eyePosition), 1.0)
    );
}

void main() {
    vec2 uv = gl_FragCoord.xy / RENDERSIZE.xy;
    vec2 screenPosition = 2.0 * uv - 1.0;
    screenPosition.x *= RENDERSIZE.x / RENDERSIZE.y;

    vec3 cameraPosition = vec3(0.0 + horizontalOffset, 0.25 + 0.25 * cos(0.5 * TIME) * 1.0, 0.0);
    mat4 projectionMatrix = createPerspectiveMatrix(50.0, RENDERSIZE.x / RENDERSIZE.y, 0.1, 10.0);
    mat4 viewMatrix = createCameraViewMatrix(cameraPosition, -5.0 * PI / 180.0);
    mat4 viewProjectionMatrix = viewMatrix * projectionMatrix;

    vec3 accumulatedColor = vec3(0.0);
    vec3 currentLineColor = vec3(0.0); // Tracks the color of the last line
    float lastHeight = 0.0;
    float firstHeight = 1.0;
    float scrollOffset = 0.1 * TIME * lineScrollSpeed;

    float depth = 0.1;
    float depthIncrement = 0.05;
    bool hitLine = false;

    for (float i = 0.0; i < 200.0; ++i) {
        vec4 position = vec4(screenPosition.x, 0.5 * fbm4(0.5 * vec2(cameraPosition.x + screenPosition.x, depth + scrollOffset)), cameraPosition.z + depth, 1.0);
        float projectedHeight = (viewProjectionMatrix * position).y - screenPosition.y;

        if (projectedHeight > lastHeight) {
            float distanceToLine = abs(projectedHeight);
            vec3 lineColor = distanceToLine < lineThickness ? smoothstep(1.0, 0.0, distanceToLine / lineThickness) * baseLineColor.rgb : vec3(0.0);
            lineColor *= exp(-0.1 * float(i));
            accumulatedColor += lineColor;
            currentLineColor = lineColor; // Update the color for spaces between lines
            lastHeight = projectedHeight;
            hitLine = true;
            if (projectedHeight < firstHeight) {
                firstHeight = projectedHeight;
            }
        }

        depth += depthIncrement;

        if (i >= lineCount) break;
    }

    if (!hitLine && uv.y > lastHeight / RENDERSIZE.y) {
        // Background color for the region above the topmost line
        gl_FragColor = vec4(backgroundColor.rgb, 1.0);
    } else if (uv.y <= firstHeight) {
        // Foreground color for the region below the bottommost line
        gl_FragColor = vec4(foregroundColor.rgb, 1.0);
    } else {
        // Space between lines inherits the color of the line below
        gl_FragColor = vec4(currentLineColor, 1.0);
    }
}
