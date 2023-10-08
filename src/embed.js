import * as THREE from 'three';

let camera, scene, renderer;
let moon;
let magnitude = 0;

init();
animate();

function init() {
    magnitude = getMagnitudeFromURL() || 0;
    setupScene();
    setupLights();
    setupMoon();
    addStars()
    setupSkybox()
    setupRenderer();
    window.addEventListener('resize', onWindowResize);
}

function getMagnitudeFromURL() {
    const params = new URLSearchParams(window.location.search);
    return parseFloat(params.get('m'));
}

function setupScene() {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.y = 1100;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    scene.fog = new THREE.Fog(0xffffff, 0, 750);
}

function setupLights() {
    const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 2.5);
    light.position.set(0.5, 1, 0.75);
    scene.add(light);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
}

function setupMoon() {
    const textureLoader = new THREE.TextureLoader();
    const moonTexture = textureLoader.load('assets/img/texture/LOD2.png');
    const moonDisplacementMap = textureLoader.load('assets/img/displacement/LOD2.png');

    const moonRadius = 1000;
    const moonGeometry = new THREE.SphereGeometry(moonRadius, 200, 200);
    const moonMaterial = new THREE.MeshPhongMaterial({
        map: moonTexture,
        displacementMap: moonDisplacementMap,
        displacementScale: 50,
        displacementBias: -0.5 * 50,
        side: THREE.DoubleSide
    });

    moon = new THREE.Mesh(moonGeometry, moonMaterial);
    scene.add(moon);
}

function setupRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true, precision: 'highp' });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function applyCameraShake(magnitude) {
    if (magnitude > 0) {
        const deltaX = (Math.random() - 0.5) * magnitude;
        const deltaY = (Math.random() - 0.5) * magnitude;
        const deltaZ = (Math.random() - 0.5) * magnitude;

        camera.position.x += deltaX;
        camera.position.y += deltaY;
        camera.position.z += deltaZ;
    }
}

function animate() {
    applyCameraShake(magnitude);
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function setupSkybox() {
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
        'assets/img/background/bg_black.png', // right
        'assets/img/background/bg_black.png', // left
        'assets/img/background/bg_black.png', // top
        'assets/img/background/bg_black.png', // bottom
        'assets/img/background/bg_black.png', // front
        'assets/img/background/bg_black.png' // back
    ]);
    scene.background = texture;
}

function addStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ color: 0xFFFFFF });

    const vertices = [];

    for (let i = 0; i < 1000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = Math.random() * 1000;
        const z = (Math.random() - 0.5) * 2000;
        vertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}
