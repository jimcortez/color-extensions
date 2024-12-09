import {Renderer} from 'interactive-shader-format'
import JSColor from '@eastdesire/jscolor'

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
          if (key != 'pauseRender') {
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

function scaleColor256toFloat(colorArr) {
  return [colorArr[0] / 256.0, colorArr[1] / 256.0, colorArr[2] / 256.0, colorArr[3]];
}

function getJSColorArray(picker) {
  return [picker.channel('R'), picker.channel('G'), picker.channel('B'), picker.channel('A')]
}

function getColorArray(picker) {
  return scaleColor256toFloat(getJSColorArray(picker))
}

const get_li = (container) => {
  let li = document.createElement('li');
  container.appendChild(li);
  return li;
};

const warpBackgroundColorPicker = new JSColor(document.getElementById('warp_background_color_picker'), {
  preset: "dark large thick",
  format: 'rgba',
  value: 'rgb(0,88,157)',
  alphaElement: '<input type="hidden">'
})

const warpMiddleGroundColorPicker = new JSColor(document.getElementById('warp_middleground_color_picker'), {
  preset: "dark large thick",
  format: 'rgba',
  value: 'rgb(103,103,103)',
  alphaElement: '<input type="hidden">'
})

const warpForegroundColorPicker = new JSColor(document.getElementById('warp_foreground_color_picker'), {
  preset: "dark large thick",
  format: 'rgba',
  value: 'rgb(255,196,80)',
  alphaElement: '<input type="hidden">'
})

const temperatureColorPicker = new JSColor(document.getElementById('temperature_base_color_picker'), {
  preset: "dark large thick",
  format: 'rgba',
  value: 'rgb(170,88,0)',
  alphaElement: '<input type="hidden">'
})


let warp_renders_list = document.getElementById('warp-renders-list');
const warpRenderers = [
  await createRendering(
    'linescape_colors.fs',
    '',
    get_li(warp_renders_list),
    (window.innerWidth - 30) / 2,
    window.innerHeight * .9,
    {
      panSpeed: 0.3,
      backgroundColor: getColorArray(warpBackgroundColorPicker),
      baseLineColor: getColorArray(warpMiddleGroundColorPicker),
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
      backgroundColor: getColorArray(warpForegroundColorPicker),
      baseLineColor: getColorArray(warpMiddleGroundColorPicker),
      foregroundColor: getColorArray(warpBackgroundColorPicker),
    }
  )
]

warpMiddleGroundColorPicker.onChange = () => {
  warpRenderers.forEach(([renderer, config], i) => {
    console.log(`changing mg colors for ${i} to ${getColorArray(warpMiddleGroundColorPicker)}`)
    config.baseLineColor = getColorArray(warpMiddleGroundColorPicker);
  })
}
warpMiddleGroundColorPicker.onInput = warpMiddleGroundColorPicker.onChange


warpBackgroundColorPicker.onChange = () => {
  let c = getColorArray(warpBackgroundColorPicker);
  warpRenderers[0][1].backgroundColor = c;
  warpRenderers[1][1].foregroundColor = c;
}
warpBackgroundColorPicker.onInput = warpBackgroundColorPicker.onChange

warpForegroundColorPicker.onChange = () => {
  let c = getColorArray(warpForegroundColorPicker);
  warpRenderers[0][1].foregroundColor = c;
  warpRenderers[1][1].backgroundColor = c;
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
const temperatureRenderers = [
  await createRendering(
    'linescape_colors.fs',
    '',
    get_li(temperature_renders_list),
    (window.innerWidth - 30),
    window.innerHeight * .9,
    {
      panSpeed: 0.3,
      backgroundColor: getColorArray(temperatureColorPicker),
      baseLineColor: getColorArray(temperatureColorPicker),
      foregroundColor: getColorArray(temperatureColorPicker),
    }
  )
]

temperatureColorPicker.onChange = () => {
  temperatureRenderers.forEach(([renderer, config], i) => {
    console.log(`changing mg colors for ${i} to ${getColorArray(temperatureColorPicker)}`)
    config.baseLineColor = getColorArray(temperatureColorPicker);
  })
}
temperatureColorPicker.onInput = temperatureColorPicker.onChange

let temperature_pause_button = document.getElementById('temperature_pause');
temperature_pause_button.addEventListener("click", () => {
  console.log('pause button clicked');
  temperatureRenderers.forEach(([renderer, config], i) => {
    config.pauseRender = !config.pauseRender
  })
})
