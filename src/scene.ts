import {
  OrbitControls,
  Timer,
  TransformControls,
} from "three/examples/jsm/Addons.js";
import "./style.css";
import * as THREE from "three";
import GUI from "lil-gui";
import CANNON from "cannon";

/* SETUP */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};
const canvas = document.getElementById("canvas")!;

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const gui = new GUI({ width: 400, closeFolders: true });

window.addEventListener("keydown", (event) => {
  switch (event.key.toLowerCase()) {
    case "h":
      gui.show(gui._hidden);
  }
});

/* SCENE */
const sceneParameters = {
  backgroundColor: 0xb5cfff,
  reset: () => {
    objectToUpdate.forEach(({ mesh, body }) => {
      scene.remove(mesh);

      body.removeEventListener("collide", playBallHit);
      body.removeEventListener("collide", playBlockHit);
      world.remove(body);
    });
    objectToUpdate.splice(0, objectToUpdate.length);
    scene.background = new THREE.Color(0xb5cfff);
  },
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(sceneParameters.backgroundColor);

/* SCENE TWEAKS */
const sceneTweaks = gui.addFolder("Scene");
sceneTweaks
  .addColor(sceneParameters, "backgroundColor")
  .name("background")
  .onChange(() => {
    scene.background = new THREE.Color(sceneParameters.backgroundColor);
  });
sceneTweaks.add(sceneParameters, "reset").name("Reset Scene");
sceneTweaks.open();

/* CAMERA */
const camera = new THREE.PerspectiveCamera(
  45,
  sizes.width / sizes.height,
  0.1,
  1000
);
camera.position.set(-4, 5, 8);
scene.add(camera);

/* RENDERER */
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const render = () => {
  renderer.render(scene, camera);
};

/* ORBIT CONTROLS */
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;

/* TEXTURE LOADER */
const textureLoader = new THREE.TextureLoader();
const grassTexture = textureLoader.load("./textures/grass/color.jpg");
grassTexture.colorSpace = THREE.SRGBColorSpace;
grassTexture.generateMipmaps = false;
grassTexture.minFilter = THREE.NearestFilter;
grassTexture.magFilter = THREE.NearestFilter;
grassTexture.wrapS = THREE.RepeatWrapping;
grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(5, 5);

/* ANIMATION */
const timer = new Timer();
const animate = () => {
  window.requestAnimationFrame(animate);
  timer.update();
  const deltaTime = timer.getDelta();

  world.step(1 / 60, deltaTime, 3);

  objectToUpdate.forEach(({ mesh, body }) => {
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  });

  orbitControls.update();
  render();
};

/* SOUNDS */
const ballHit = new Audio("./sounds/ball-hit.mp3");
const blockHit = new Audio("./sounds/block-hit.mp3");

const collisionSoundsTimeout = 15; // ms

let canBallHitSoundPlay = true;
const playBallHit = (collision: CANNON.ICollisionEvent) => {
  const impactStrength = collision.contact.getImpactVelocityAlongNormal();

  if (impactStrength > 1.5 && canBallHitSoundPlay) {
    const volume = Math.min(1, (impactStrength - 1.5) / (10 - 1.5));
    ballHit.volume = volume;
    ballHit.currentTime = 0;
    ballHit.play();

    canBallHitSoundPlay = false;
    setTimeout(() => {
      canBallHitSoundPlay = true;
    }, collisionSoundsTimeout);
  }
};

let canBlockHitSoundPlay = true;
const playBlockHit = (collision: CANNON.ICollisionEvent) => {
  const impactStrength = collision.contact.getImpactVelocityAlongNormal();

  if (impactStrength > 1.5 && canBlockHitSoundPlay) {
    const volume = Math.min(1, (impactStrength - 1.5) / (10 - 1.5));
    blockHit.volume = volume;
    blockHit.currentTime = 0;
    blockHit.play();
    canBlockHitSoundPlay = false;
    setTimeout(() => {
      canBlockHitSoundPlay = true;
    }, collisionSoundsTimeout);
  }
};

/* UTILS */
/* OBJECTS */
const objectParameters = {
  floor: {
    width: 7.5,
    height: 0.05,
    depth: 7.5,
  },
  sphere: {
    radius: 0.5,
    color: 0xfb2c36,
  },
  box: {
    width: 1,
    height: 1,
    depth: 1,
    color: 0x45fb2d,
  },
};

const objectToUpdate: { mesh: THREE.Mesh; body: CANNON.Body }[] = [];

/* FLOOR */
const createFloor = () => {
  // three.js
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(
      objectParameters.floor.width,
      objectParameters.floor.height,
      objectParameters.floor.depth
    ),
    new THREE.MeshStandardMaterial({ map: grassTexture })
  );
  mesh.position.y = -objectParameters.floor.height / 2;
  mesh.receiveShadow = true;

  // cannon.js
  const shape = new CANNON.Box(
    new CANNON.Vec3(
      objectParameters.floor.width / 2,
      objectParameters.floor.height / 2,
      objectParameters.floor.depth / 2
    )
  );
  const body = new CANNON.Body({
    shape,
    mass: 0,
    material: grassMaterial,
  });
  body.position.y = -objectParameters.floor.height / 2;

  world.addBody(body);
  scene.add(mesh);
};

/* SPHERE */
const debugSphere = {
  create: () =>
    createSphere(
      objectParameters.sphere.radius,
      new THREE.Color(objectParameters.sphere.color),
      new THREE.Vector3(
        (Math.random() - 0.5) * objectParameters.floor.width,
        3,
        (Math.random() - 0.5) * objectParameters.floor.depth
      )
    ),
  random: () => {
    const randomColor = new THREE.Color();
    randomColor.r = Math.random();
    randomColor.g = Math.random();
    randomColor.b = Math.random();
    createSphere(
      Math.random() * 1.5,
      randomColor,
      new THREE.Vector3(
        (Math.random() - 0.5) * objectParameters.floor.width,
        3,
        (Math.random() - 0.5) * objectParameters.floor.depth
      )
    );
  },
};

const sphereTweaks = gui.addFolder("Sphere");
sphereTweaks.add(objectParameters.sphere, "radius").min(0).max(2).step(0.01);
sphereTweaks.addColor(objectParameters.sphere, "color");
sphereTweaks.add(debugSphere, "create").name("create Sphere");
sphereTweaks.add(debugSphere, "random").name("random Sphere");

const sphereGeometry = new THREE.SphereGeometry(1, 48, 48);

const createSphere = (
  radius: number,
  color: THREE.Color,
  position: THREE.Vector3
) => {
  // three.js
  const mesh = new THREE.Mesh(
    sphereGeometry,
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
    })
  );
  mesh.scale.setScalar(radius);
  mesh.position.copy(position);
  mesh.position.y += 0.001;
  mesh.castShadow = true;

  // cannon.js
  const shape = new CANNON.Sphere(radius);
  const body = new CANNON.Body({
    shape,
    mass: 1,
    material: rubberMaterial,
  });
  body.position.set(position.x, position.y, position.z);
  body.addEventListener("collide", playBallHit);

  objectToUpdate.push({ mesh, body });

  world.addBody(body);
  scene.add(mesh);
};

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);

const debugBox = {
  create: () =>
    createBox(
      objectParameters.box.width,
      objectParameters.box.height,
      objectParameters.box.depth,
      new THREE.Color(objectParameters.box.color),
      new THREE.Vector3(
        (Math.random() - 0.5) * objectParameters.floor.width,
        3,
        (Math.random() - 0.5) * objectParameters.floor.depth
      )
    ),
  random: () => {
    const randomColor = new THREE.Color();
    randomColor.r = Math.random();
    randomColor.g = Math.random();
    randomColor.b = Math.random();
    createBox(
      (0.25 + Math.random()) * 2,
      (0.25 + Math.random()) * 2,
      (0.25 + Math.random()) * 2,
      randomColor,
      new THREE.Vector3(
        (Math.random() - 0.5) * objectParameters.floor.width,
        3,
        (Math.random() - 0.5) * objectParameters.floor.depth
      )
    );
  },
};

const boxTweaks = gui.addFolder("Box");
boxTweaks.add(objectParameters.box, "width").min(0).max(2).step(0.01);
boxTweaks.add(objectParameters.box, "height").min(0).max(2).step(0.01);
boxTweaks.add(objectParameters.box, "depth").min(0).max(2).step(0.01);
boxTweaks.addColor(objectParameters.box, "color");
boxTweaks.add(debugBox, "create").name("create box");
boxTweaks.add(debugBox, "random").name("random box");

const createBox = (
  width: number,
  height: number,
  depth: number,
  color: THREE.Color,
  position: THREE.Vector3
) => {
  // three.js
  const mesh = new THREE.Mesh(
    boxGeometry,
    new THREE.MeshStandardMaterial({ color })
  );
  mesh.scale.set(width, height, depth);
  mesh.position.copy(position);
  mesh.position.y += 0.001;
  mesh.castShadow = true;

  // cannon.js
  const shape = new CANNON.Box(
    new CANNON.Vec3(width / 2, height / 2, depth / 2)
  );
  const body = new CANNON.Body({
    shape,
    mass: 1,
    material: rubberMaterial,
  });
  body.position.set(position.x, position.y, position.z);
  body.addEventListener("collide", playBlockHit);

  objectToUpdate.push({ mesh, body });
  world.addBody(body);
  scene.add(mesh);
};

/* PHYSICS */
const world = new CANNON.World();
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.gravity.set(0, -9.82, 0);

/* PHYSICS MATERIALS */
const grassMaterial = new CANNON.Material("grass");
const rubberMaterial = new CANNON.Material("rubber");

const grassRubberContactMaterial = new CANNON.ContactMaterial(
  grassMaterial,
  rubberMaterial,
  {
    friction: 0.6,
    restitution: 0.7,
  }
);
world.addContactMaterial(grassRubberContactMaterial);

/* LIGHTS */
const lightParameters = {
  ambientLight: {
    color: 0xffffff,
    intensity: 2,
  },
  directionalLight: {
    color: 0xffffff,
    intensity: 2.7,
    showControls: false,
  },
};
const ambientLight = new THREE.AmbientLight(
  lightParameters.ambientLight.color,
  lightParameters.ambientLight.intensity
);
const directionalLight = new THREE.DirectionalLight(
  lightParameters.directionalLight.color,
  lightParameters.directionalLight.intensity
);
directionalLight.position.set(2, 4, 3);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 9;
const directionalLightControls = new TransformControls(
  camera,
  renderer.domElement
);
directionalLightControls.attach(directionalLight);
const directionalLightControlsHelper = directionalLightControls.getHelper();
directionalLightControlsHelper.visible =
  lightParameters.directionalLight.showControls;
directionalLightControls.enabled =
  lightParameters.directionalLight.showControls;
directionalLightControls.addEventListener("dragging-changed", (event) => {
  orbitControls.enabled = !event.value;
});

scene.add(ambientLight, directionalLight, directionalLightControlsHelper);

/* LIGHT TWEAKS */
const lightTweaks = gui.addFolder("Lights");
const ambientLightTweaks = lightTweaks.addFolder("Ambient Light");
const directionalLightTweaks = lightTweaks.addFolder("Directional Light");

ambientLightTweaks
  .addColor(lightParameters.ambientLight, "color")
  .onChange(() => {
    ambientLight.color.set(lightParameters.ambientLight.color);
  });
ambientLightTweaks
  .add(lightParameters.ambientLight, "intensity")
  .min(0)
  .max(3)
  .step(0.001)
  .onChange(() => {
    ambientLight.intensity = lightParameters.ambientLight.intensity;
  });

directionalLightTweaks
  .addColor(lightParameters.directionalLight, "color")
  .onChange(() => {
    directionalLight.color.set(lightParameters.directionalLight.color);
  });
directionalLightTweaks
  .add(lightParameters.directionalLight, "intensity")
  .min(0)
  .max(6)
  .step(0.001)
  .onChange(() => {
    directionalLight.intensity = lightParameters.directionalLight.intensity;
  });

directionalLightTweaks
  .add(lightParameters.directionalLight, "showControls")
  .name("show controls")
  .onChange(() => {
    directionalLightControlsHelper.visible =
      lightParameters.directionalLight.showControls;
    directionalLightControls.enabled =
      lightParameters.directionalLight.showControls;
  });

createFloor();
createSphere(
  objectParameters.sphere.radius,
  new THREE.Color(objectParameters.sphere.color),
  new THREE.Vector3(0, 3, 0)
);

animate();
