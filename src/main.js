
// Skybox texture from: https://github.com/mrdoob/three.js/tree/master/examples/textures/cube/skybox

const THREE = require('three'); // older modules are imported like this. You shouldn't have to worry about this much
import Framework from './framework'

const PI = Math.PI;
// called after the scene loads
function onLoad(framework) {
  let {scene, camera, renderer, gui, stats, guiVars} = framework;

  // Set light
  let directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
  directionalLight.color.setHSL(0.1, 1, 0.95);
  directionalLight.position.set(1, 3, 2);
  directionalLight.position.multiplyScalar(10);

  // Set ambient light
  let ambientLight = new THREE.AmbientLight(0xffffff, 0.2);

  // set skybox
  let loader = new THREE.CubeTextureLoader();
  let urlPrefix = '/images/skymap/';

  let skymap = new THREE.CubeTextureLoader().load([
      urlPrefix + 'px.jpg', urlPrefix + 'nx.jpg',
      urlPrefix + 'py.jpg', urlPrefix + 'ny.jpg',
      urlPrefix + 'pz.jpg', urlPrefix + 'nz.jpg'
  ] );

  scene.background = skymap;


  // set camera position
  camera.position.set(5, 3, 15);
  camera.lookAt(new THREE.Vector3(5,0,0));

  scene.add(directionalLight);
  scene.add(ambientLight);

  // edit params and listen to changes like this
  // more information here: https://workshop.chromeexperiments.com/examples/gui/#1--Basic-Usage
  gui.add(camera, 'fov', 0, 180).onChange(function(newVal) {
      camera.updateProjectionMatrix();
  });

  render(framework);
}

// called on frame updates
function onUpdate(framework) {
  // let feather = framework.scene.getObjectByName("feather");
  // if (feather !== undefined) {
  //   // Simply flap wing
  //   let date = new Date();
  //   feather.rotateZ(Math.sin(date.getTime() / 100) * 2 * Math.PI / 180);
  // }
}

function lerp(a, b, t) {
  return a * (1 - t) + b * t;
}

function cubicPulse(c, w, x) {
  x = Math.abs(x - c);
  if (Math.abs(x) > w) {
    return 0;
  }
  x /= w;
  return 1 - x * x * (3 - 2 * x);
}

function parabola(x, k) {
  return Math.pow(4 * x * (1 - x), k);
}

function powerCurve(x, a, b) {
  let k = Math.pow(a + b, a + b) / (Math.pow(a, a) * Math.pow(b, b));
  return k * Math.pow(x, a) * Math.pow(1 - x, b);
}

function render(framework) {
  const SUB = 60;
  const LAYERS = 2;
  let {scene, guiVars} = framework;
  let feathers = [];
  let lower, upper, range;
  let featherLength = 0.8;
  // create a simple wing framework
  let curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, -1, 0),
    new THREE.Vector3(2, 1, 0),
    new THREE.Vector3(5, -1, 0)
  );
  let geometry = new THREE.Geometry();
  geometry.vertices = curve.getPoints(SUB);
  let material = new THREE.LineBasicMaterial({color: 0xffffff, linewidth: 2});
  let curveObj = new THREE.Line(geometry, material);
  scene.add(curveObj);
  // draw feathers
  let objLoader = new THREE.OBJLoader();
  objLoader.load('/geo/feather.obj', function(obj) {
    let lambertWhite = new THREE.MeshLambertMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide });
    let featherGeo = obj.children[0].geometry;
    let featherMesh = new THREE.Mesh(featherGeo, lambertWhite);
    featherMesh.rotation.set(0, PI / 2, -PI / 2);

    // Primaries
    lower = Math.floor(3 * SUB / 4);
    upper = Math.floor(SUB);
    range = upper - lower;
    geometry.vertices.slice(lower, upper).forEach((v, i) => {
      for (let j = LAYERS; j >= 0; j--) {
        if (i % (LAYERS - j + 1) !== 0) {
          continue;
        }
        let feather = featherMesh.clone(true);
        feather.name = `f_primaries${i}`;
        feather.position.set(v.x, v.y, v.z);
        feather.rotateY(lerp(0, -PI / 4, i / range));
        feather.scale.z += 0.2 * (LAYERS - j);
        feather.position.z = (LAYERS - j) / (LAYERS * 10);
        feather.scale.x = lerp(0.2, featherLength, j / LAYERS);
        feather.scale.x += powerCurve(i / range, 3, 1) / 2 + 0.3;
        scene.add(feather);
        feathers.push(feather);
      }
    });

    // Secondaries
    lower = Math.floor(1 * SUB / 4);
    upper = Math.floor(3 * SUB / 4);
    range = upper - lower;
    geometry.vertices.slice(lower, upper).forEach((v, i) => {
      for (let j = LAYERS; j >= 0; j--) {
        if (i % (LAYERS - j + 1) !== 0) {
          continue;
        }
        let feather = featherMesh.clone(true);
        feather.name = `f_primaries${i}_${j}`;
        feather.position.set(v.x, v.y, v.z);
        feather.rotateY(lerp(PI / 16, 0, i / range));
        feather.scale.z += 0.5 * (LAYERS - j);
        feather.position.z = (LAYERS - j) / (LAYERS * 10);
        feather.scale.x = lerp(0.3, featherLength, j / LAYERS);
        feather.scale.x += lerp(0.1, 0.3, i / range);
        feather.scale.x += parabola(i / range, 1.5) / 6;
        scene.add(feather);
        feathers.push(feather);
      }
    });

    // Tertiary + scapulars
    lower = Math.floor(0);
    upper = Math.floor(1 * SUB / 4);
    range = upper - lower;
    geometry.vertices.slice(lower, upper).forEach((v, i) => {
      for (let j = LAYERS; j >= 0; j--) {
        if (i % (LAYERS - j + 1) !== 0) {
          continue;
        }
        let feather = featherMesh.clone(true);
        feather.name = `f_primaries${i}_${j}`;
        feather.position.set(v.x, v.y, v.z);
        feather.rotateY(lerp(PI / 8, PI / 16, i / range));
        feather.scale.z = 2
        feather.position.z = (LAYERS - j) / (LAYERS * 10);
        feather.scale.x = lerp(0.3, featherLength, j / LAYERS);
        feather.scale.x += cubicPulse(0, range + 5, i) / 2
        scene.add(feather);
        feathers.push(feather);
      }
    });
  });
}

function clear(framework) {
  let {scene} = framework;
  scene.children.forEach((o) => {
    scene.remove(o);
  });
}

// when the scene is done initializing, it will call onLoad, then on frame updates, call onUpdate
Framework.init(onLoad, onUpdate);
