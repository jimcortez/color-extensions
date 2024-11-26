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
    if(!values.pauseRender){
      requestAnimationFrame(animate);

      if (values) {
        for (const [key, value] of Object.entries(values)) {
          if(key != 'pauseRender'){
            renderer.setValue(key, value)
          }
        }
      }

      renderer.draw(canvas);
    }else{
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

const lineColorPicker = new JSColor(document.getElementById('line_color_picker'), {
  preset: "dark large thick",
  format: 'rgb',
  value: 'rgb(125,65,116)',
  alphaElement: '<input type="hidden">'
})

const backgroundColorPicker = new JSColor(document.getElementById('background_color_picker'), {
  preset: "dark large thick",
  format: 'rgba',
  value: 'rgb(170,88,157)',
  alphaElement: '<input type="hidden">'
})

const warpBackgroundColorPicker = new JSColor(document.getElementById('warp_background_color_picker'), {
  preset: "dark large thick",
  format: 'rgba',
  value: 'rgb(170,88,157)',
  alphaElement: '<input type="hidden">'
})

let line_renders_list = document.getElementById('line-renders-list');
const lineRenderers = [
  await createRendering(
    'squigglyline.fs',
    '',
    get_li(line_renders_list),
    window.innerWidth - 30,
    window.innerHeight * .45,
    {
      lineColor: getColorArray(lineColorPicker),
      backgroundBaseColor: getColorArray(backgroundColorPicker),
      gradientSpeed: 0.5
    })
]

lineColorPicker.onChange = () => {
  lineRenderers.forEach(([renderer, config], i) => {
    console.log(`changing colors for ${i} to ${getColorArray(lineColorPicker)}`)
    config.lineColor = getColorArray(lineColorPicker);
    config.backgroundBaseColor = getColorArray(backgroundColorPicker);
  })
}
lineColorPicker.onInput = lineColorPicker.onChange

backgroundColorPicker.onChange = () => {
  lineRenderers.forEach(([renderer, config], i) => {
    console.log(`changing bg colors for ${i} to ${getColorArray(backgroundColorPicker)}`)
    config.backgroundBaseColor = getColorArray(backgroundColorPicker);
  })
}
backgroundColorPicker.onInput = backgroundColorPicker.onChange

let line_pause_button = document.getElementById('line_pause');
line_pause_button.addEventListener("click", () => {
  console.log('pause button clicked');
  lineRenderers.forEach(([renderer, config], i) => {
    config.pauseRender = !config.pauseRender
  })
})


let thickness = 0.25;
let warp_renders_list = document.getElementById('warp-renders-list');
const warpRenderers = [
  await createRendering(
    'colorwarp.fs',
    '',
    get_li(warp_renders_list),
    (window.innerWidth - 30) / 3,
    window.innerHeight * .9,
    {
      thickness: thickness,
      warp: 3.1,
      baseColor: scaleColor256toFloat([113, 72, 14, 1]),
      luminanceScale: 0.25,
      rate: 0.7,
      // invert: true,
      lineColor: getColorArray(warpBackgroundColorPicker),
    }
  ),
  await createRendering(
    'colorwarp.fs',
    '',
    get_li(warp_renders_list),
    (window.innerWidth - 30) / 3,
    window.innerHeight * .9,
    {
      thickness: thickness,
      warp: 3.1,
      baseColor: scaleColor256toFloat([113, 72, 14, 1]),
      luminanceScale: 1.0,
      rate: 0.7,
      // invert: true,
      lineColor: getColorArray(warpBackgroundColorPicker),
    }
  ),
  await createRendering(
    'colorwarp.fs',
    '',
    get_li(warp_renders_list),
    (window.innerWidth - 30) / 3,
    window.innerHeight * .9,
    {
      thickness: thickness,
      warp: 3.1,
      baseColor: scaleColor256toFloat([113, 72, 14, 1]),
      luminanceScale: 1.75,
      rate: 0.7,
      // invert: true,
      lineColor: getColorArray(warpBackgroundColorPicker),
    }
  )
]


warpBackgroundColorPicker.onChange = () => {
  warpRenderers.forEach(([renderer, config], i) => {
    console.log(`changing bg colors for ${i} to ${getColorArray(warpBackgroundColorPicker)}`)
    config.lineColor = getColorArray(warpBackgroundColorPicker);
  })
}
warpBackgroundColorPicker.onInput = warpBackgroundColorPicker.onChange


let pause_button = document.getElementById('warp_pause');
pause_button.addEventListener("click", () => {
  console.log('pause button clicked');
  warpRenderers.forEach(([renderer, config], i) => {
    config.pauseRender = !config.pauseRender
  })
})
