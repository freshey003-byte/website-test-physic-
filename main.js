import * as THREE from 'three';
import * as CANNON from 'https://unpkg.com/cannon-es@0.20.0/dist/cannon-es.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Sky } from 'three/addons/objects/Sky.js';

// กล้องและฉาก
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const control = new PointerLockControls(camera, document.body);
scene.add(control.object);

const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0)
});

const groundBody = new CANNON.Body ({
    mass: 0,
    shape: new CANNON.Plane()
});
groundBody.quaternion.setFromEuler(-Math.PI/2,0,0);
world.addBody(groundBody);


scene.fog = new THREE.Fog(0xa0a0a0, 2, 20);
scene.background = new THREE.Color(0x87ceeb)

const sky = new Sky();
sky.scale.setScalar(1000);
scene.add(sky);

const sun = new THREE.Vector3();

const uniforms = sky.material.uniforms;
uniforms['turbidity'].value = 10;
uniforms['rayleigh'].value = 2;
uniforms['mieCoefficient'].value = 1;
uniforms['mieDirectionalG'].value = 1;

sun.set(0,1,0);

uniforms['sunPosition'].value.copy(sun);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;



document.body.appendChild(renderer.domElement)

const hemilight = new THREE.HemisphereLight( 
    0xffffcc, 0x444444, 1

)
scene.add(hemilight)

const directlight = new THREE.DirectionalLight(
    0xffffff, 1 
)
directlight.position.set(5,10,2)
directlight.target.position.set(0,0,0);
scene.add(directlight)
scene.add(directlight.target)

const clock = new THREE.Clock();

// cannon js
    // ของ box
const boxShape = new CANNON.Box(new CANNON.Vec3(0.5,0.5,0.5));
const boxBody = new CANNON.Body({
    mass: 1,
    shape: boxShape,
    position: new CANNON.Vec3(0,5,-3)
});

const groundMaterial = new CANNON.Material('ground');
const boxMaterial = new CANNON.Material('box');
groundBody.material = groundMaterial;

const GroundBoxContact = new CANNON.ContactMaterial(
    groundMaterial,boxMaterial,{
        friction: 0.6, restitution: 0.1
    }
);
boxBody.material = boxMaterial;
boxBody.linearDamping = 0.3;
boxBody.angularDamping = 0.6;
    // สิ้นสุดของ box

    // ของ ball






world.addBody(boxBody);
// cannon js

const floorGeo = new THREE.PlaneGeometry(20, 20);
const floorMac = new THREE.MeshStandardMaterial({
    color:0x808080
});
const floor = new THREE.Mesh(floorGeo, floorMac)

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
const cube = new THREE.Mesh(geometry, material);

const ballGeo = new THREE.SphereGeometry(0.25);
const ballMat = new THREE.MeshStandardMaterial({color: 0xff4444})
const ballMesh = new THREE.Mesh(ballGeo, ballMat)

ballMesh.castShadow = true;
ballMesh.position.set(1,5,3);
scene.add(ballMesh);

const ballShape = new CANNON.Sphere(0.25);
const ballBody = new CANNON.Body({mass: 1 , shape: ballShape, position: new CANNON.Vec3(1,5,-3)});
ballBody.linearDamping = 0.25;
ballBody.angularDamping = 0.4;
world.addBody(ballBody);

const ballMaterial = new CANNON.Material('ball')
ballBody.material = ballMaterial
const GroundBallContact = new CANNON.ContactMaterial(groundMaterial, ballMaterial,
    {friction: 1,restitution: 0.5}
)

world.addContactMaterial(GroundBallContact)
world.addContactMaterial(GroundBoxContact);


floor.rotation.x = -Math.PI/2
floor.receiveShadow = true; 

directlight.castShadow = true;
cube.castShadow = true;



scene.add(floor);
scene.add(cube);
scene.add(cube)


control.object.position.y = 1.6;


// interact

const raycaster = new THREE.Raycaster();
let pickedBody = null;
let pickedMesh = null;

function tryPick() {
    if (pickedBody) return;

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    raycaster.set(camera.position, direction);

    const intersects = raycaster.intersectObjects([cube, ballMesh]);

    if (intersects.length === 0) return;

    const hitObject = intersects[0].object;

    if (hitObject === cube) {
        pickedBody = boxBody;
        pickedMesh = cube;
    } else if (hitObject === ballMesh) {
        pickedBody = ballBody;
        pickedMesh = ballMesh;
    }

    pickedBody.mass = 0;
    pickedBody.updateMassProperties();




}


// ตรวจจับการกดของคีย์บอร์ด
const keyboard = {};

window.addEventListener('keydown', (event) => {
    keyboard[event.key] = true;
})

window.addEventListener('keyup', (event) => {
    keyboard[event.key] = false;
})

window.addEventListener('keydown', (e) => {
    if (e.key === 'e') {
        tryPick();
    }
})

window.addEventListener('mousedown', (e)  => {
    if (e.button === 0) {
        throwObject();
    }
});

document.addEventListener('click', () => {
    control.lock();
});


function throwObject() {
    if (!pickedBody) return;

    const body = pickedBody;
    pickedBody = null;
    pickedMesh = null;

    body.mass = 1; 
    body.updateMassProperties();

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.normalize();
    direction.y += 0.25;

    const force = 4.5;

    const impulse = new CANNON.Vec3(
        direction.x * force,
        direction.y * force,
        direction.z * force
    );

   body.applyImpulse(impulse, body.position);
}



function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const speed = 2;

    world.step(1/60, delta, 3);

    cube.position.copy(boxBody.position);
    cube.quaternion.copy(boxBody.quaternion);
    ballMesh.position.copy(ballBody.position);
    ballMesh.quaternion.copy(ballBody.quaternion);

    if (keyboard['w']) {
        control.moveForward (speed * delta);
    }
    if (keyboard['s']) {
        control.moveForward (-speed * delta);
    }
    if (keyboard['a']) {        
        control.moveRight (-speed * delta);
    }
    if (keyboard['d']) {
        control.moveRight (speed * delta);
    }

    // interact and pickup the mesh

    if (pickedBody) {
        const holdPos = new THREE.Vector3(0, -0.2, -1);

        
        holdPos.applyQuaternion(camera.quaternion);
        holdPos.add(camera.position);

        pickedBody.position.copy(holdPos);
        pickedBody.velocity.set(0,0,0);
        pickedBody.angularVelocity.set(0,0,0);
    }

    renderer.render(scene, camera);
    // 
  
}

animate();