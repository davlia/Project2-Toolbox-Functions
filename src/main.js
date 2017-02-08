
// Skybox texture from: https://github.com/mrdoob/three.js/tree/master/examples/textures/cube/skybox

const THREE = require('three'); // older modules are imported like this. You shouldn't have to worry about this much
import Framework from './framework'

const PI = Math.PI;
const EPSILON = 1e-5;
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
  let urlPrefix = '';

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

  gui.add(camera, 'fov', 0, 180).onChange((v) => {
      camera.updateProjectionMatrix();
  });

  // control all wing related attributes
  let wingControl = gui.addFolder('Wing Controls');
  range(4).forEach((c) => {
    let folder = wingControl.addFolder(`Bezier Offset Control ${c}`);
    ['x', 'y', 'z'].forEach((axis) => {
      let name = `${axis}`;
      folder.add(framework.controlPoints[c], name, -50, 50).listen().onChange((v) => {
        moveWingTo(framework, framework.controlPoints);
      });
      folder.open();
    });
  });

  // control all feather related attributes
  guiVars['length'] = 0.8;
  guiVars['width'] = 1.1;
  guiVars['color'] = 0xffffff;
  guiVars['distribution'] = 6;
  guiVars['layers'] = 2;
  let featherControl = gui.addFolder('Feather Controls');
  [
    featherControl.add(guiVars, 'length', 0, 3),
    featherControl.add(guiVars, 'width', 0, 3),
    featherControl.add(guiVars, 'distribution'),
    featherControl.add(guiVars, 'layers', 0, 10).step(1),
    featherControl.addColor(guiVars, 'color')
  ].forEach((c) => {
    c.onChange((v) => {
      render(framework);
    });
  });

  // control all wind related attributes
  let windControl = gui.addFolder('Wind Controls');
  let args = [
    ['windSpeed', 0.0, 10.0],
    ['windDirX', -1.0, 1.0],
    ['windDirY', -1.0, 1.0],
  ];
  args.forEach((arg) => {
    guiVars[arg[0]] = 0.1;
    windControl.add(guiVars, ...arg).listen();
    guiVars[arg[0]] = 0;
  });

  // control all wing motion related attributes
  guiVars['flappingSpeed'] = 0;
  let motionControl = gui.addFolder('Motion Controls');
  motionControl.add(guiVars, 'flappingSpeed', 0, 10);
  let motionKeyFrameControl = motionControl.addFolder('Motion Keyframe Controls');
  range(5).forEach((kf) => {
    let kfolder = motionKeyFrameControl.addFolder(`Keyframe Controls ${kf}`);
    range(4).forEach((c) => {
      let folder = kfolder.addFolder(`Bezier Offset Control ${c}`);
      ['x', 'y', 'z'].forEach((axis) => {
        let name = `${axis}`;
        folder.add(framework.keyframes[kf][c], name, -50, 50).listen().onChange((v) => {});
        folder.open();
      });
    });
    kfolder.open();
  });



  wingControl.open();
  featherControl.open();
  windControl.open();
  motionControl.open();



  render(framework);
}

// called on frame updates
function onUpdate(framework) {
  let {feathers, guiVars, keyframes} = framework;
  let date = new Date();
  if (guiVars.windSpeed > EPSILON) {
    feathers.forEach((f, i) => {
      restoreTruth(f);
      let randomOffset = Math.random() * PI / 4 * guiVars.windSpeed;
      f.rotateZ((Math.sin(date.getTime() / 100 + randomOffset) - guiVars.windSpeed) * 2 * Math.PI / 180);
      f.rotateX(guiVars.windDirX * PI / 36);
      f.rotateY(guiVars.windDirY * PI / 36);
    })
  }
  if (guiVars.flappingSpeed > EPSILON) {
    const STEPS = Math.floor(100 / guiVars.flappingSpeed);
    if (!framework.t) {
      framework.t = 0;
    }
    // for each controlpoint, lerp wing to location

    moveWing(framework, diff(framework.controlPoints, framework.keyframes[0], STEPS));
    if (framework.t % STEPS === 0) {
      framework.keyframes.push(framework.keyframes.shift(1));
    }
    framework.t++;
  } else {
    framework.t = undefined;
  }
}

function newCTP_deprecated(framework, ctps) {
  let {guiVars} = framework;
  return [
    new THREE.Vector3(ctps[0][0] + guiVars.bc0x, ctps[0][1] + guiVars.bc0y, ctps[0][2] + guiVars.bc0z),
    new THREE.Vector3(ctps[1][0] + guiVars.bc1x, ctps[1][1] + guiVars.bc1y, ctps[1][2] + guiVars.bc1z),
    new THREE.Vector3(ctps[2][0] + guiVars.bc2x, ctps[2][1] + guiVars.bc2y, ctps[2][2] + guiVars.bc2z),
    new THREE.Vector3(ctps[3][0] + guiVars.bc3x, ctps[3][1] + guiVars.bc3y, ctps[3][2] + guiVars.bc3z)
  ];
}

function newCTP(ctps) {
  return [
    new THREE.Vector3(ctps[0][0], ctps[0][1], ctps[0][2]),
    new THREE.Vector3(ctps[1][0], ctps[1][1], ctps[1][2]),
    new THREE.Vector3(ctps[2][0], ctps[2][1], ctps[2][2]),
    new THREE.Vector3(ctps[3][0], ctps[3][1], ctps[3][2])
  ];
}

function moveWingTo(framework, controlPoints) {
  let {scene, guiVars, feathers, bone} = framework
  scene.remove(bone);
  let curveObj = generateBone(framework, controlPoints);
  framework.controlPoints = controlPoints;
  feathers.forEach((f, i) => {
    let v = curveObj.geometry.vertices[f.geoIdx];
    f.position.set(v.x, v.y, v.z);
  });
}

function moveWing(framework, offsetPoints) {
  let {scene, guiVars, feathers, controlPoints, bone} = framework
  scene.remove(bone);
  controlPoints.forEach((cp, i) => {
    return cp.add(offsetPoints[i]);
  });
  let curveObj = generateBone(framework, controlPoints);
  feathers.forEach((f, i) => {
    let v = curveObj.geometry.vertices[f.geoIdx];
    f.position.set(v.x, v.y, v.z);
  });
}

function diff(ctp1, ctp2, steps) {
  return ctp1.map((ctp, i) => {
    let c = ctp2[i].clone();
    c.sub(ctp).divideScalar(steps)
    return c;
  });
}

/*
framework.controlPoints = [
  new THREE.Vector3(0 + guiVars.bc0X, 0 + guiVars.bc0Y, 0 + guiVars.bc0Z),
  new THREE.Vector3(1 + guiVars.bc1X, -1 + guiVars.bc1Y, 1 + guiVars.bc1Z),
  new THREE.Vector3(2 + guiVars.bc2X, 1 + guiVars.bc2Y, -1 + guiVars.bc2Z),
  new THREE.Vector3(5 + guiVars.bc3X, -1 + guiVars.bc3Y, 1 + guiVars.bc3Z)
];
*/
function generateBone(framework, controlPoints) {
  let {guiVars, bone} = framework
  let SUB = guiVars.distribution * 10;
  let curve = new THREE.CubicBezierCurve3(...controlPoints);
  let geometry = new THREE.Geometry();
  geometry.vertices = curve.getPoints(SUB);
  let material = new THREE.LineBasicMaterial({color: 0xffffff, linewidth: 2});
  let curveObj = new THREE.Line(geometry, material);
  return curveObj;
}

function render(framework) {
  let {scene, guiVars, feathers, controlPoints, bone} = framework
  let SUB = guiVars.distribution * 10;
  let LAYERS = guiVars.layers;
  let lower, upper, range;
  let featherLength = guiVars.length;
  feathers.forEach((f) => {
    scene.remove(f);
  });
  scene.remove(bone);

  // create a simple wing framework
  let curveObj = generateBone(framework, controlPoints);
  framework.bone = curveObj;
  scene.add(curveObj);
  // draw feathers
  let objLoader = new THREE.OBJLoader();
  objLoader.load('/feather.obj', function(obj) {
    let lambertWhite = new THREE.MeshLambertMaterial({color: guiVars.color, side: THREE.DoubleSide});
    let featherGeo = obj.children[0].geometry;
    let featherMesh = new THREE.Mesh(featherGeo, lambertWhite);
    featherMesh.rotation.set(0, PI / 2, -3 * PI / 4);
    featherMesh.scale.z = guiVars.width;

    // Primaries
    lower = Math.floor(3 * SUB / 4);
    upper = Math.floor(SUB);
    range = upper - lower;
    curveObj.geometry.vertices.slice(lower, upper).forEach((v, i) => {
      for (let j = LAYERS; j >= 0; j--) {
        if (i % (LAYERS - j + 1) !== 0) {
          continue;
        }
        let feather = featherMesh.clone(true);
        feather.name = `f_primaries${i}_${j}`;
        feather.geoIdx = lower + i;
        feather.layer = j;
        feather.position.set(v.x, v.y, v.z);
        feather.rotateY(lerp(0, -PI / 4, i / range));
        feather.scale.z += 0.2 * (LAYERS - j);
        feather.position.z += (LAYERS - j) / (LAYERS * 10);
        feather.scale.x = lerp(featherLength / 3, featherLength, j / LAYERS);
        feather.scale.x += powerCurve(i / range, 3, 1) / 2 + 0.3;
        updateTruth(feather);
        scene.add(feather);
        feathers.push(feather);
      }
    });

    // Secondaries
    lower = Math.floor(1 * SUB / 4);
    upper = Math.floor(3 * SUB / 4);
    range = upper - lower;
    curveObj.geometry.vertices.slice(lower, upper).forEach((v, i) => {
      for (let j = LAYERS; j >= 0; j--) {
        if (i % (LAYERS - j + 1) !== 0) {
          continue;
        }
        let feather = featherMesh.clone(true);
        feather.name = `f_primaries${i}_${j}`;
        feather.geoIdx = lower + i;
        feather.layer = j;
        feather.position.set(v.x, v.y, v.z);
        feather.rotateY(lerp(PI / 16, 0, i / range));
        feather.scale.z += 0.5 * (LAYERS - j);
        feather.position.z += (LAYERS - j) / (LAYERS * 10);
        feather.scale.x = lerp(featherLength / 3, featherLength, j / LAYERS);
        feather.scale.x += lerp(0.1, 0.3, i / range);
        feather.scale.x += parabola(i / range, 1.5) / 6;
        updateTruth(feather);
        scene.add(feather);
        feathers.push(feather);
      }
    });

    // Tertiary + scapulars
    lower = Math.floor(0);
    upper = Math.floor(1 * SUB / 4);
    range = upper - lower;
    curveObj.geometry.vertices.slice(lower, upper).forEach((v, i) => {
      for (let j = LAYERS; j >= 0; j--) {
        if (i % (LAYERS - j + 1) !== 0) {
          continue;
        }
        let feather = featherMesh.clone(true);
        feather.name = `f_primaries${i}_${j}`;
        feather.geoIdx = lower + i;
        feather.layer = j;
        feather.position.set(v.x, v.y, v.z);
        feather.rotateY(lerp(PI / 8, PI / 16, i / range));
        feather.scale.z = 2
        feather.position.z += (LAYERS - j) / (LAYERS * 10);
        feather.scale.x = lerp(featherLength / 3, featherLength, j / LAYERS);
        feather.scale.x += cubicPulse(0, range + 5, i) / 2
        updateTruth(feather);
        scene.add(feather);
        feathers.push(feather);
      }
    });
  });
}

function resetMesh(mesh) {
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.set(1, 1, 1);
}

function clear(framework) {
  let {scene} = framework;
  scene.children.forEach((o) => {
    scene.remove(o);
  });
}

function restoreTruth(obj) {
  obj.position.set(obj.truth.position.x, obj.truth.position.y, obj.truth.position.z);
  obj.scale.set(obj.truth.scale.x, obj.truth.scale.y, obj.truth.scale.z);
  obj.rotation.set(obj.truth.rotation.x, obj.truth.rotation.y, obj.truth.rotation.z);
}

function updateTruth(obj) {
  obj.truth = {
    position: {
      x: obj.position.x,
      y: obj.position.y,
      z: obj.position.z,
    },
    scale: {
      x: obj.scale.x,
      y: obj.scale.y,
      z: obj.scale.z,
    },
    rotation: {
      x: obj.rotation.x,
      y: obj.rotation.y,
      z: obj.rotation.z,
    },
  }
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


// http://stackoverflow.com/questions/8273047/javascript-function-similar-to-python-range
function range(start, stop, step) {
    if (typeof stop == 'undefined') {
        stop = start;
        start = 0;
    }

    if (typeof step == 'undefined') {
        step = 1;
    }

    if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
        return [];
    }

    var result = [];
    for (var i = start; step > 0 ? i < stop : i > stop; i += step) {
        result.push(i);
    }

    return result;
};

// when the scene is done initializing, it will call onLoad, then on frame updates, call onUpdate
Framework.init(onLoad, onUpdate);
