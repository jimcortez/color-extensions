import Color from "colorjs.io";

const fileInput = document.getElementById('fileInput');
const originalCanvas = document.getElementById('originalCanvas');
const quantizedCanvas = document.getElementById('quantizedCanvas');
const histogramCanvas = document.getElementById('histogramCanvas');
const originalCtx = originalCanvas.getContext('2d', {willReadFrequently: true});
const quantizedCtx = quantizedCanvas.getContext('2d', {willReadFrequently: true});
const histogramCtx = histogramCanvas.getContext('2d');

const bucketSlider = document.getElementById('bucketSlider');
const bucketValue = document.getElementById('bucketValue');

let NUM_BUCKETS = 8; // Default number of color buckets
let currentImageAnalysis = null; // Store the current image for re-quantization

function drawImageOnCanvas(file, canvas, ctx) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate the aspect ratio
      const imgAspectRatio = img.width / img.height;
      const canvasAspectRatio = canvas.width / canvas.height;

      let drawWidth, drawHeight;

      if (imgAspectRatio > canvasAspectRatio) {
        // Image is wider relative to the canvas
        drawWidth = canvas.width;
        drawHeight = canvas.width / imgAspectRatio;
      } else {
        // Image is taller relative to the canvas
        drawHeight = canvas.height;
        drawWidth = canvas.height * imgAspectRatio;
      }

      // Center the image on the canvas
      const xOffset = (canvas.width - drawWidth) / 2;
      const yOffset = (canvas.height - drawHeight) / 2;

      ctx.drawImage(img, xOffset, yOffset, drawWidth, drawHeight);

      resolve();
    };

    // Read the file as a data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  })
}

bucketSlider.addEventListener('input', () => {
  NUM_BUCKETS = parseInt(bucketSlider.value);
  bucketValue.textContent = NUM_BUCKETS;

  render();
});

fileInput.addEventListener('input', (event) => {
  const file = event.target.files[0];
  if (file) {
    drawImageOnCanvas(file, originalCanvas, originalCtx)
      .then(() => {
        let imgData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
        currentImageAnalysis = analyzeImage(originalCanvas, imgData.data);

        render();
      })
  }
});

function kMeansClustering(data, k, maxIterations = 5) {
  // Initialize centroids with the first k colors
  let centroids = data.slice(0, k);
  let clusters = Array(data.length).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    console.log('iteration', iter)

    // Step 1: Assign points to the nearest centroid
    console.log('clusters')
    clusters = data.map((point) => {
      if (point.alpha === 0) return -1; // Ignore pixels with alpha = 0
      let closestCentroidIndex = 0;
      let minDistance = Infinity;

      centroids.forEach((centroid, index) => {
        const distance = point.deltaE(centroid); // Use deltaE for perceptual color difference
        if (distance < minDistance) {
          minDistance = distance;
          closestCentroidIndex = index;
        }
      });

      return closestCentroidIndex;
    });

    // Step 2: Recalculate centroids
    console.log('centroids')
    const newCentroids = Array(k).fill(null).map(() => ({
      sum: {L: 0, a: 0, b: 0}, // Initialize sums for LAB values
      count: 0, // Initialize counts for each cluster
    }));

    clusters.forEach((clusterIndex, pointIndex) => {
      if (clusterIndex === -1) return; // Skip transparent pixels
      const point = data[pointIndex];
      const lab = point.to("lab").coords; // Convert color to LAB space

      // Accumulate LAB values for the cluster
      newCentroids[clusterIndex].sum.L += lab[0];
      newCentroids[clusterIndex].sum.a += lab[1];
      newCentroids[clusterIndex].sum.b += lab[2];
      newCentroids[clusterIndex].count++;
    });

    // Calculate new centroids based on the sums and counts
    centroids = newCentroids.map((entry) => {
      if (entry.count === 0) {
        // Handle empty clusters by reassigning to a random color
        return data[Math.floor(Math.random() * data.length)];
      }

      // Calculate the mean LAB values
      const avgL = entry.sum.L / entry.count;
      const avga = entry.sum.a / entry.count;
      const avgb = entry.sum.b / entry.count;

      return new Color("lab", [avgL, avga, avgb]); // Create a new Color object
    });

    // Step 3: Check for convergence
    const isConverged = centroids.every((centroid, index) => {
      const previousCentroid = data[clusters.indexOf(index)];
      if (!previousCentroid || previousCentroid.alpha === 0) return false; // Skip transparent pixels
      const distance = centroid.deltaE(previousCentroid);
      return distance < 0.1; // Threshold for convergence
    });

    if (isConverged) break; // Exit early if centroids are stable
  }

  return {centroids, clusters};
}


// Main quantize function using LAB and K-means
function quantizeImage(image_analysis, img, num_buckets) {
  quantizedCanvas.width = image_analysis.width;
  quantizedCanvas.height = image_analysis.height;

  const imageData = quantizedCtx.getImageData(0, 0, image_analysis.width, image_analysis.height);
  const data = imageData.data;

  console.log("Starting k-means clustering...");
  // Perform k-means clustering
  const {centroids, clusters} = kMeansClustering(image_analysis.color_arr, num_buckets);

  // console.log("Centroids:", centroids);
  // console.log("Clusters:", clusters);

  // Map each pixel to the closest centroid and update the image data
  for (let i = 0; i < data.length; i += 4) {
    const clusterIndex = clusters[i / 4];

    // Ensure clusterIndex is valid
    if (clusterIndex < 0 || clusterIndex >= centroids.length) {
      // console.error(`Invalid cluster index: ${clusterIndex} at pixel ${i / 4}`);
      continue;
    }

    const centroidColor = centroids[clusterIndex].to("srgb").coords; // Convert LAB centroid back to sRGB
    // Update RGB values based on the centroid color
    data[i] = Math.round(centroidColor[0] * 255); // Red
    data[i + 1] = Math.round(centroidColor[1] * 255); // Green
    data[i + 2] = Math.round(centroidColor[2] * 255); // Blue
    data[i + 3] = centroids[clusterIndex].alpha * 255; // Ensure alpha is fully opaque
  }

  // Write the updated image data back to the canvas
  quantizedCtx.putImageData(imageData, 0, 0);
}


function analyzeImage(canvas, imgData) {
  let color_arr = [];
  let non_transparent_color_arr = [];
  let colorCounts = {};
  let non_transparent_counts = {};
  let nonTransparentPixels = 0;
  for (let i = 0; i < imgData.length; i += 4) {
    const color = new Color('sRGB', Array.from(imgData.slice(i, i + 3)).map(v => v / 255));
    color.alpha = imgData[i + 4] === 0 ? 0 : 1;


    let colorKey = color.toString({format: "rgb"});
    if (color.alpha > 0) {
      nonTransparentPixels++;
      non_transparent_color_arr.push(color);
      non_transparent_counts[colorKey] = (non_transparent_counts[colorKey] || 0) + 1;
    }
    color_arr.push(color);
    colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;

  }

  return {
    color_arr: color_arr,
    non_transparent_arr: non_transparent_color_arr,
    color_counts: colorCounts,
    non_transparent_counts: non_transparent_counts,
    height: canvas.height,
    width: canvas.width,
    non_transparent_pixels: nonTransparentPixels,
  }
}

function updateHistogram(quantImageAnalysis) {
  // Count occurrences of each color
  const colorCounts = quantImageAnalysis.non_transparent_counts;

  // Clear and resize histogram canvas
  histogramCanvas.width = quantizedCanvas.width;
  histogramCanvas.height = quantizedCanvas.height;
  histogramCtx.clearRect(0, 0, histogramCanvas.width, histogramCanvas.height);

  const sortable = Object.fromEntries(
    Object.entries(colorCounts).sort(([, a], [, b]) => a - b)
  );

  // Draw the histogram bars
  const colors = Object.keys(sortable);
  let yPosition = 0;

  colors.forEach((color) => {
    let colorObj = new Color(color);
    if (colorObj.alpha > 0) {
      const ratio = colorCounts[color] / quantImageAnalysis.non_transparent_pixels;
      const barHeight = ratio * histogramCanvas.height;

      histogramCtx.fillStyle = new Color(color).display();
      histogramCtx.fillRect(
        0,
        yPosition,
        histogramCanvas.width,
        barHeight
      );

      yPosition += barHeight;
    }
  });
}

function generateModernArt(artData) {
  const canvas = document.getElementById("artCanvas");
  const ctx = canvas.getContext("2d");

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const width = canvas.width;
  const height = canvas.height;

  // Convert percentages into total areas
  const totalPercentage = Object.values(artData).reduce((sum, percentage) => sum + percentage, 0);
  const normalizedArtData = Object.entries(artData).map(([color, percentage]) => ({
    color: new Color(color).to("srgb").toString(),
    area: (percentage / totalPercentage) * (width * height),
  }));

  console.log(normalizedArtData)

  // Generate random shapes that match the area proportions
  normalizedArtData.forEach(({color, area}) => {
    let remainingArea = area;

    // Add random shapes until the required area is used
    while (remainingArea > 0) {
      const shapeType = Math.random() > 0.5 ? "rect" : "circle";

      if (shapeType === "rect") {
        // Generate random rectangle dimensions and position
        const rectWidth = Math.random() * (width * 0.2);
        const rectHeight = remainingArea / rectWidth;
        const x = Math.random() * (width - rectWidth);
        const y = Math.random() * (height - rectHeight);

        // Draw the rectangle
        ctx.fillStyle = color;
        ctx.fillRect(x, y, rectWidth, rectHeight);

        remainingArea -= rectWidth * rectHeight;
      } else {
        // Generate random circle radius and position
        const radius = Math.sqrt(remainingArea / Math.PI) * Math.random();
        const x = Math.random() * (width - 2 * radius) + radius;
        const y = Math.random() * (height - 2 * radius) + radius;

        // Draw the circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.closePath();

        remainingArea -= Math.PI * radius * radius;
      }
    }
  });
}


const objectMap = (obj, fn) =>
  Object.fromEntries(
    Object.entries(obj).map(
      ([k, v], i) => [k, fn(v, k, i)]
    )
  )

function render() {
  if (currentImageAnalysis) {
    console.log('quantizing');
    quantizeImage(currentImageAnalysis, quantizedCanvas, NUM_BUCKETS);

    console.log('histogramming');
    // Get image data from the quantized canvas
    const imageData = quantizedCtx.getImageData(0, 0, quantizedCanvas.width, quantizedCanvas.height);

    let quantImageAnalysis = analyzeImage(quantizedCanvas, imageData.data);
    updateHistogram(quantImageAnalysis);
    generateModernArt(objectMap(quantImageAnalysis.non_transparent_counts, v => v / quantImageAnalysis.non_transparent_pixels))
    // generateModernArt(objectMap(quantImageAnalysis.color_counts, v=>v/quantImageAnalysis.color_arr.length));
  }
}


const controlsDiv = document.getElementById("controls");
const minimizeButton = document.getElementById("minimizeButton");
const controlsContent = document.getElementById("controlsContent");

minimizeButton.addEventListener("click", () => {
  if (controlsDiv.classList.contains("minimized")) {
    // Expand controls
    controlsDiv.classList.remove("minimized");
    controlsContent.style.display = "block";
    minimizeButton.textContent = "Minimize";
  } else {
    // Minimize controls
    controlsDiv.classList.add("minimized");
    controlsContent.style.display = "none";
    minimizeButton.textContent = "Expand";
  }
});
