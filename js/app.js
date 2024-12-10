import {Renderer} from 'interactive-shader-format'
import JSColor from '@eastdesire/jscolor'
import Color from "colorjs.io";
import {
  getColorArray,
  getColorArrayFromColorjs,
  get_opposite_temperature_color, get_complementary_color, get_greyscale_color
} from './color_utils'

let file_cache = {};

async function loadFile(src) {
  if (file_cache[src]) return file_cache[src];

  const response = await fetch('shaders/' + src);
  let contents = await response.text();
  file_cache[src] = contents;
  return contents
}

async function createRendering(fsFilename, label, parent_node, width, height, values) {
  const fileContents = await loadFile(fsFilename);

  let container_template = document.getElementById('render-template').cloneNode(true);
  let container = container_template.content.firstElementChild;
  container.querySelector('.render-title').innerHTML = label;
  let canvas = container.querySelector('.render-canvas');

  canvas.width = width;
  canvas.height = height;

  parent_node.append(container);

  // Using webgl2 for non-power-of-two textures
  const gl = canvas.getContext('webgl2');
  const renderer = new Renderer(gl);
  renderer.loadSource(fileContents);

  values = values || {}

  const animate = () => {
    if (!values.pauseRender) {
      requestAnimationFrame(animate);

      if (values) {
        for (const [key, value] of Object.entries(values)) {
          if (key !== 'pauseRender') {
            renderer.setValue(key, value)
          }
        }
      }

      renderer.draw(canvas);
    } else {
      // setTimeout(animate, 100);
      requestAnimationFrame(animate);
    }
  };

  requestAnimationFrame(animate);

  if (values) {
    for (const [key, value] of Object.entries(values)) {
      renderer.setValue(key, value)
    }
  }

  renderer.draw(canvas);

  console.log(label, values)

  return [renderer, values];
}


const get_li = (container) => {
  let li = document.createElement('li');
  container.appendChild(li);
  return li;
};

const warpBackgroundColorPicker = new JSColor(document.getElementById('warp_background_color_picker'), {
  preset: "dark large thick",
  format: 'rgba',
  value: 'rgb(0,88,157)'
})

const warpForegroundColorPicker = new JSColor(document.getElementById('warp_foreground_color_picker'), {
  preset: "dark large thick",
  format: 'rgba',
  value: 'rgb(255,196,80)',
})

const temperatureColorPicker = new JSColor(document.getElementById('temperature_base_color_picker'), {
  preset: "dark large thick",
  format: 'rgba',
  value: 'rgb(255, 130, 102)',
})


let warp_renders_list = document.getElementById('warp-renders-list');
let warpBackColor = new Color(warpBackgroundColorPicker.toRGBAString());
let warpForeColor = new Color(warpForegroundColorPicker.toRGBAString());
const warpRenderers = [
  await createRendering(
    'linescape_colors.fs',
    '',
    get_li(warp_renders_list),
    (window.innerWidth - 30) / 2,
    window.innerHeight * .9,
    {
      panSpeed: 0.3,
      lineScrollSpeed: 0.25,
      horizontalOffset: 1,
      backgroundColor: getColorArray(warpBackgroundColorPicker),
      baseLineColor: getColorArrayFromColorjs(get_greyscale_color(warpForeColor)),
      endLineColor: getColorArrayFromColorjs(get_greyscale_color(warpBackColor)),
      foregroundColor: getColorArray(warpForegroundColorPicker),
    }
  ),
  await createRendering(
    'linescape_colors.fs',
    '',
    get_li(warp_renders_list),
    (window.innerWidth - 30) / 2,
    window.innerHeight * .9,
    {
      panSpeed: 0.3,
      lineScrollSpeed: 0.25,
      horizontalOffset: 1,
      backgroundColor: getColorArray(warpForegroundColorPicker),
      baseLineColor: getColorArrayFromColorjs(get_greyscale_color(warpForeColor)),
      endLineColor: getColorArrayFromColorjs(get_greyscale_color(warpBackColor)),
      foregroundColor: getColorArray(warpBackgroundColorPicker),
    }
  )
]

warpBackgroundColorPicker.onChange = () => {
  let warpBackColor = new Color(warpBackgroundColorPicker.toRGBAString());
  let warpForeColor = new Color(warpForegroundColorPicker.toRGBAString());
  let baseLineColor = get_greyscale_color(warpForeColor)
  let endLineColor = get_greyscale_color(warpBackColor)

  warpRenderers[0][1].backgroundColor = getColorArrayFromColorjs(warpBackColor);
  warpRenderers[0][1].baseLineColor = getColorArrayFromColorjs(baseLineColor);
  warpRenderers[0][1].endLineColor = getColorArrayFromColorjs(endLineColor);
  warpRenderers[1][1].foregroundColor = getColorArrayFromColorjs(warpBackColor);
  warpRenderers[1][1].baseLineColor = getColorArrayFromColorjs(baseLineColor);
  warpRenderers[1][1].endLineColor = getColorArrayFromColorjs(endLineColor);
}
warpBackgroundColorPicker.onInput = warpBackgroundColorPicker.onChange

warpForegroundColorPicker.onChange = () => {
  let warpBackColor = new Color(warpBackgroundColorPicker.toRGBAString());
  let warpForeColor = new Color(warpForegroundColorPicker.toRGBAString());
  let baseLineColor = get_greyscale_color(warpForeColor)
  let endLineColor = get_greyscale_color(warpBackColor)

  warpRenderers[0][1].backgroundColor = getColorArrayFromColorjs(warpForeColor);
  warpRenderers[0][1].baseLineColor = getColorArrayFromColorjs(baseLineColor);
  warpRenderers[0][1].endLineColor = getColorArrayFromColorjs(endLineColor);
  warpRenderers[1][1].foregroundColor = getColorArrayFromColorjs(warpForeColor);
  warpRenderers[1][1].baseLineColor = getColorArrayFromColorjs(baseLineColor);
  warpRenderers[1][1].endLineColor = getColorArrayFromColorjs(endLineColor);
}
warpForegroundColorPicker.onInput = warpForegroundColorPicker.onChange


let pause_button = document.getElementById('warp_pause');
pause_button.addEventListener("click", () => {
  console.log('pause button clicked');
  warpRenderers.forEach(([renderer, config], i) => {
    config.pauseRender = !config.pauseRender
  })
})

let temperature_renders_list = document.getElementById('temperature-renders-list');
let mainColor = new Color(temperatureColorPicker.toRGBAString());

function getForeBackColors(mainC) {
  let foreColor = new Color(mainC).to('HSV');
  foreColor.s *= 1.2; //increase saturation by 20%

  let backColor = get_opposite_temperature_color(foreColor);

  let endLineColor = get_complementary_color(mainC, );

  return [foreColor, endLineColor, backColor];
}

let [foreColor, endLineColor, backColor] = getForeBackColors(mainColor);


const temperatureRenderer =
  await createRendering(
    'linescape_colors.fs',
    '',
    get_li(temperature_renders_list),
    (window.innerWidth - 30),
    window.innerHeight * .9,
    {
      panSpeed: 0.3,
      lineScrollSpeed: 0.25,
      horizontalOffset: 1,
      backgroundColor: getColorArrayFromColorjs(backColor),
      baseLineColor: getColorArrayFromColorjs(mainColor),
      endLineColor: getColorArrayFromColorjs(endLineColor).map(v=>v*.1),
      foregroundColor: getColorArrayFromColorjs(foreColor),
    }
  )

temperatureColorPicker.onChange = () => {
  let [renderer, config] = temperatureRenderer;
  mainColor = new Color(temperatureColorPicker.toRGBAString());
  let [foreColor, endLineColor, backColor] = getForeBackColors(mainColor);

  config.backgroundColor = getColorArrayFromColorjs(backColor)
  config.baseLineColor = getColorArrayFromColorjs(mainColor)
  config.endLineColor =  getColorArrayFromColorjs(endLineColor).map(v=>v*.1)
  config.foregroundColor = getColorArrayFromColorjs(foreColor)
}
temperatureColorPicker.onInput = temperatureColorPicker.onChange

let temperature_pause_button = document.getElementById('temperature_pause');
temperature_pause_button.addEventListener("click", () => {
  console.log('pause button clicked');
  let [renderer, config] = temperatureRenderer;
  config.pauseRender = !config.pauseRender
})

let intervalId = null; // To store the interval ID
let activeKey = null; // To track the currently active key

function startAdjustingOffset(direction) {
  // Clear any existing interval to avoid conflicts
  if (intervalId) clearInterval(intervalId);

  // Set the interval to adjust the horizontalOffset
  intervalId = setInterval(() => {
    if (direction === 'left') {
      warpRenderers.forEach(([renderer, config], i) => {
        config.horizontalOffset -= 0.1;
      })
      temperatureRenderer[1].horizontalOffset -= 0.1;
    } else if (direction === 'right') {
      warpRenderers.forEach(([renderer, config], i) => {
        config.horizontalOffset += 0.1;
      })
      temperatureRenderer[1].horizontalOffset += 0.1;
    }
  }, 50);
}

function stopAdjustingOffset() {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
  activeKey = null; // Reset active key
}

// Listen for keydown event
window.addEventListener('keydown', (event) => {
  if (activeKey === event.key) return; // Prevent duplicate intervals for the same key
  if (event.key === 'ArrowLeft') {
    activeKey = event.key;
    startAdjustingOffset('left');
  } else if (event.key === 'ArrowRight') {
    activeKey = event.key;
    startAdjustingOffset('right');
  }
});

// Listen for keyup event
window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    stopAdjustingOffset();
  }
});
