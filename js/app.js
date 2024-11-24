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

async function createRendering(fsFilename, label, parent_node, values) {
  const fileContents = await loadFile(fsFilename);

  let container_template = document.getElementById('render-template').cloneNode(true);
  let container = container_template.content.firstElementChild;
  container.querySelector('.render-title').innerHTML = label;
  let canvas = container.querySelector('.render-canvas');

  canvas.width = window.innerWidth * .9;
  canvas.height = window.innerHeight * .45;

  parent_node.append(container);

  // Using webgl2 for non-power-of-two textures
  const gl = canvas.getContext('webgl2');
  const renderer = new Renderer(gl);
  renderer.loadSource(fileContents);

  values = values || {}

  const animate = () => {
    requestAnimationFrame(animate);

    if (values) {
      for (const [key, value] of Object.entries(values)) {
        renderer.setValue(key, value)
      }
    }

    renderer.draw(canvas);
  };

  requestAnimationFrame(animate);

  if (values) {
    for (const [key, value] of Object.entries(values)) {
      renderer.setValue(key, value)
    }
  }

  renderer.draw(canvas);

  return [renderer, values];
}

function getColorArray(picker) {
  return [picker.channel('R') / 255.0, picker.channel('G') / 255.0, picker.channel('B') / 255.0, picker.channel('A')]
}

let renders_list = document.getElementById('renders-list');
const get_li = (container) => {
  let li = document.createElement('li');
  renders_list.appendChild(li);
  return li;
};

const lineColorPicker = new JSColor(document.getElementById('line_color_picker'), {
  preset: "dark large thick",
  format: 'rgba'
})

const backgroundColorPicker = new JSColor(document.getElementById('background_color_picker'), {
  preset: "dark large thick",
  format: 'rgba'
})

const renderers = [
  await createRendering('squigglyline.fs', '', get_li(), {
    line_color: getColorArray(lineColorPicker),
    background_color: getColorArray(backgroundColorPicker),
  }),
  await createRendering('colorwarp.fs', '', get_li(), {
    line_color: getColorArray(lineColorPicker),
    background_color: getColorArray(backgroundColorPicker),
  }),
  await createRendering('colorwarp.fs', '', get_li(), {
    line_color: getColorArray(lineColorPicker),
    background_color: getColorArray(backgroundColorPicker),
  }),
  await createRendering('colorwarp.fs', '', get_li(), {
    line_color: getColorArray(lineColorPicker),
    background_color: getColorArray(backgroundColorPicker),
  })
]

lineColorPicker.onChange = () => {
  renderers.forEach(([renderer, config], i) => {
    console.log(`changing colors for ${i} to ${getColorArray(lineColorPicker)}`)
    config.lineColor = getColorArray(lineColorPicker);
    config.backgroundBaseColor = getColorArray(backgroundColorPicker);
  })
}

backgroundColorPicker.onChange = () => {
  renderers.forEach(([renderer, config], i) => {
    console.log(`changing bg colors for ${i} to ${getColorArray(backgroundColorPicker)}`)
    config.backgroundBaseColor = getColorArray(backgroundColorPicker);
  })
}

