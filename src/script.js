import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const settings = {
    maxDistance: 1.04,
    minDistance: 8,
    zoomSpeed: 1.5,
    rotate: false,
    rotationSpeed: 0.01,
    orbit: false,
    fov: 75,
    directionalLightToggle: true,
    directionalLightAngle: 0,
    ambientLightIntensity: 2,
    ambientLight: true,
    timelineToggle: false,
    timelinePlay: false,
    timelineYear: 1969,
    clickInfo: false
};

let previousDot = null;

let scene, camera, renderer, controls, lod;

let moonquakeData = [];
let layerMeshes = {};

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let currentQuakeData = null;

const LODS = [
    { texture: 'assets/img/texture/LOD0.png', displacement: 'assets/img/displacement/LOD0.png', distance: 2 },
    { texture: 'assets/img/texture/LOD1.png', displacement: 'assets/img/displacement/LOD1.png', distance: 3.99 },
    { texture: 'assets/img/texture/LOD2.png', displacement: 'assets/img/displacement/LOD2.png', distance: 4 },
];

function init() {
    setupScene();
    loadSettings();
    setupEventListeners();
    setupLighting();
    addStars();
    setupSkybox();
    animate();
    loadTexturesAndCreateMoon();
    loadMoonquakeData();
    updateQuakeVisibility();
    setupTimeline();
    initLayers();
    setupLayerToggle();
}

function loadSettings() {
    document.getElementById('rotate').checked = settings.rotate;
    document.getElementById('orbit').checked = settings.orbit;
    document.getElementById('rotationSpeed').value = settings.rotationSpeed;
    document.getElementById('fov').value = settings.fov;
    document.getElementById('directionalLightToggle').checked = settings.directionalLightToggle;
    document.getElementById('directionalLightAngle').value = settings.directionalLightAngle;
    document.getElementById('ambientLight').checked = settings.ambientLight;
    document.getElementById('ambientLightIntensity').value = settings.ambientLightIntensity;
    document.getElementById('timelineToggle').checked = settings.timelineToggle;
    document.getElementById('clickInfo').checked = settings.clickInfo;
}

function setupScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.set(1, 1, 2);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.enableRotate = true;
    controls.dampingFactor = 0.25;
    controls.rotateSpeed = 0.25;
    controls.zoomSpeed = 1.50;
    controls.minDistance = 1.04;
    controls.maxDistance = 8;
    controls.update();
}

function setupLighting() {
    const light = new THREE.PointLight(0xFFFFFF, 1.5, 100);
    light.position.set(5, 5, 5);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.5);
    directionalLight.position.set(0, 1, 1);
    directionalLight.name = 'directionalLight';
    scene.add(directionalLight);
}

function addStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ color: 0xFFFFFF });

    const vertices = [];

    for (let i = 0; i < 1000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        vertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

function setupSkybox() {
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
        'assets/img/background/bg_black.png', // right
        'assets/img/background/bg_black.png', // left
        'assets/img/background/bg_black.png', // top
        'assets/img/background/bg_black.png', // bottom
        'assets/img/background/bg_black.png', // front
        'assets/img/background/bg_earth.png' // back
    ]);
    scene.background = texture;
}

function loadTexturesAndCreateMoon() {
    const manager = new THREE.LoadingManager();
    const textureLoader = new THREE.TextureLoader(manager);

    lod = new THREE.LOD();

    LODS.forEach(lodItem => {
        const moonTexture = textureLoader.load(lodItem.texture);
        const displacementTexture = textureLoader.load(lodItem.displacement);

        const material = new THREE.MeshPhongMaterial({
            map: moonTexture,
            displacementMap: displacementTexture,
            displacementScale: 0.05
        });

        const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), material);
        lod.addLevel(mesh, lodItem.distance);
    });

    manager.onLoad = () => {
        scene.add(lod);
        animate();
    };
}

function animate() {
    requestAnimationFrame(animate);
    if (settings.rotate) {
        lod.rotation.y += settings.rotationSpeed;
    }
    if (settings.orbit) {
        scene.rotation.y += settings.rotationSpeed;
    }
    controls.update();
    renderer.render(scene, camera);
}

function setupEventListeners() {
    let resizeTimeout;

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }, 100);
    });

    renderer.domElement.addEventListener('mousemove', onHover, false);
    renderer.domElement.addEventListener('click', onClick, false);
    renderer.domElement.addEventListener('contextmenu', onRightClick, false);

    document.getElementById('shallowWithMagnitude').addEventListener('change', updateMarkerVisibility);
    document.getElementById('shallowWithoutMagnitude').addEventListener('change', updateMarkerVisibility);
    document.getElementById('naturalImpacts').addEventListener('change', updateMarkerVisibility);
    document.getElementById('deepQuakes').addEventListener('change', updateMarkerVisibility);
    document.getElementById('artificialImpacts').addEventListener('change', updateMarkerVisibility);

    document.addEventListener('keydown', function (event) {
        switch (event.code) {
            case 'KeyW':
                lod.rotation.x -= 0.3;
                break;
            case 'KeyS':
                lod.rotation.x += 0.3;
                break;
            case 'KeyA':
                lod.rotation.y -= 0.3;
                break;
            case 'KeyD':
                lod.rotation.y += 0.3;
                break;
            case 'KeyQ':
                lod.rotation.z += 0.3;
                break;
            case 'KeyE':
                lod.rotation.z -= 0.3;
                break;
        }
    });

    document.getElementById('rotate').addEventListener('change', function () {
        settings.rotate = this.checked;
        removeDotFromMoon();
    });
    document.getElementById('rotationSpeed').addEventListener('input', function () {
        settings.rotationSpeed = parseFloat(this.value);
    });

    document.getElementById('orbit').addEventListener('change', function () {
        settings.orbit = this.checked;
        removeDotFromMoon();
    });

    document.getElementById('fov').addEventListener('input', function () {
        camera.fov = parseFloat(this.value);
        camera.updateProjectionMatrix();
    });
    document.getElementById('resetFOV').addEventListener('click', function () {
        document.getElementById('fov').value = settings.fov;
        camera.fov = settings.fov;
        camera.updateProjectionMatrix();
    });

    document.getElementById('directionalLightToggle').addEventListener('change', function () {
        const light = scene.getObjectByName('directionalLight');
        light.visible = this.checked;
    });
    document.getElementById('directionalLightAngle').addEventListener('input', function () {
        const angle = parseFloat(this.value);
        const light = scene.getObjectByName('directionalLight');

        const radians = THREE.MathUtils.degToRad(angle);

        light.position.x = Math.cos(radians);
        light.position.z = Math.sin(radians);

        light.position.y = Math.max(0, Math.sin(radians));
    });

    document.getElementById('ambientLightIntensity').addEventListener('input', function () {
        const intensity = parseFloat(this.value);

        const ambientLight = scene.children.find(child => child instanceof THREE.AmbientLight);

        ambientLight.intensity = intensity;
    });
    document.getElementById('ambientLight').addEventListener('change', function () {
        const isChecked = this.checked;

        const ambientLight = scene.children.find(child => child instanceof THREE.AmbientLight);

        ambientLight.visible = isChecked;
    });

    document.getElementById('timelineToggle').addEventListener('change', function () {
        const isTimelineEnabled = document.getElementById('timelineToggle').checked;

        document.getElementById('timeline').style.display = isTimelineEnabled ? 'block' : 'none';
        document.getElementById('timelineButton').style.display = isTimelineEnabled ? 'block' : 'none';
        document.getElementById('type').style.display = isTimelineEnabled ? 'none' : 'block';

        Array.from(document.getElementById('type').querySelectorAll('input[type="checkbox"]')).forEach(checkbox => {
            checkbox.disabled = isTimelineEnabled;
        });
        const timelineControlButton = document.getElementById('timelineControlButton');

        if (!isTimelineEnabled) {
            settings.timelinePlay = false;
            timelineControlButton.innerHTML = '<i class="bi bi-play-fill"></i>';
        }
        updateQuakeVisibility();
    });

    document.getElementById('timelineControlButton').addEventListener('click', function () {
        settings.timelinePlay = !settings.timelinePlay;

        if (settings.timelinePlay) {
            this.innerHTML = '<i class="bi bi-pause-fill"></i>';
            playTimeline();
        } else {
            this.innerHTML = '<i class="bi bi-play-fill"></i>';
        }
    });

    document.getElementById('clickInfo').addEventListener('change', function () {
        settings.clickInfo = this.checked;
        removeDotFromMoon();
    });

    document.addEventListener('DOMContentLoaded', function () {
        const $rangeInput = document.getElementById('timeline').querySelector('input');
        const $labels = document.querySelectorAll('.range-labels li');
        const sheet = document.createElement('style');
        document.body.appendChild(sheet);

        const getTrackStyle = function (el) {
            let curVal = el.value;
            let val = (curVal - 1969) * 12.5;
            let style = '';

            $labels.forEach(label => label.classList.remove('active', 'selected'));

            let curLabel = $labels[curVal - 1969];
            curLabel.classList.add('active', 'selected');
            curLabel.previousElementSibling?.classList.add('selected');

            style += `.range input::-webkit-slider-runnable-track {background: linear-gradient(to right, #37adbf 0%, #37adbf ${val}%, #b2b2b2 ${val}%, #b2b2b2 100%)};`;

            return style;
        };

        $rangeInput.addEventListener('input', function () {
            sheet.textContent = getTrackStyle(this);
        });

        $labels.forEach((label, idx) => {
            label.addEventListener('click', function () {
                $rangeInput.value = idx + 1969;
                $rangeInput.dispatchEvent(new Event('input'));
            });
        });
    });

    document.addEventListener("DOMContentLoaded", function() {
        var loadingScreen = document.getElementById("loading-screen");
        var loadingPercentage = document.getElementById("loading-percentage");
    
        var imagesToLoad = document.images;
        var imagesTotalCount = imagesToLoad.length;
        var imagesLoadedCount = 0;
    
        for(var i = 0; i < imagesTotalCount; i++) {
            var img_copy = new Image();
            img_copy.onload = imageLoaded;
            img_copy.onerror = imageLoaded;
            img_copy.src = imagesToLoad[i].src;
        }
    
        function imageLoaded() {
            imagesLoadedCount++;
            loadingPercentage.textContent = (((100 / imagesTotalCount) * imagesLoadedCount) << 0) + "%";
            
            if(imagesLoadedCount >= imagesTotalCount) {
                loadingScreen.style.opacity = "0";
                setTimeout(function() {
                    loadingScreen.style.display = "none";
                }, 500);
            }
        }
    });
    
    
}

function loadMoonquakeData() {
    fetch('./assets/data/combined_pse.csv')
        .then(response => response.text())
        .then(data => {
            const rows = data.split('\n').slice(1);
            rows.forEach(row => {
                const columns = row.split(',');
                const no = columns[0];
                const year = columns[1];
                const day = columns[2];
                const hour = columns[3];
                const minute = columns[4];
                const second = columns[5];
                const latitude = parseFloat(columns[6]);
                const longitude = parseFloat(columns[7]);
                const magnitude = parseFloat(columns[8]);
                const depth = parseFloat(columns[9]);
                const type = columns[10];
                const dataset = columns[11];

                if (!isNaN(latitude) && !isNaN(longitude)) {
                    moonquakeData.push({
                        no,
                        year,
                        day,
                        hour,
                        minute,
                        second,
                        latitude,
                        longitude,
                        magnitude,
                        depth,
                        type,
                        dataset
                    });
                }
            });
            plotMoonquakes();
        });
}

init();

function updateMarkerVisibility() {
    const showShallowWithMagnitude = document.getElementById('shallowWithMagnitude').checked;
    const showShallowWithoutMagnitude = document.getElementById('shallowWithoutMagnitude').checked;
    const showNaturalImpacts = document.getElementById('naturalImpacts').checked;
    const showDeepQuakes = document.getElementById('deepQuakes').checked;
    const showArtificialImpacts = document.getElementById('artificialImpacts').checked;

    moonquakeData.forEach(quake => {
        if (quake.type === "Shallow-Moonquake" && quake.magnitude > 0) {
            quake.marker.visible = showShallowWithMagnitude;
        } else if (quake.type === "Shallow-Moonquake") {
            quake.marker.visible = showShallowWithoutMagnitude;
        } else if (quake.type === "Natural-Impacts") {
            quake.marker.visible = showNaturalImpacts;
        } else if (quake.type.startsWith("Deep-Moonquake-")) {
            quake.marker.visible = showDeepQuakes;
        } else if (quake.type.startsWith("Artificial-Impact")) {
            quake.marker.visible = showArtificialImpacts;
        }
    });
}

function updateQuakeVisibility() {
    const isTimelineEnabled = document.getElementById('timelineToggle').checked;

    moonquakeData.forEach(quake => {
        if (isTimelineEnabled) {
            quake.marker.visible = (parseInt(quake.year, 10) === settings.timelineYear);
        } else {
            quake.marker.visible = true;
        }
    });
}

function plotMoonquakes() {
    moonquakeData.forEach(quake => {
        const point = pointFromLatLon(quake.latitude, quake.longitude);
        let marker;

        if (quake.type === "Shallow-Moonquake" && quake.magnitude > 0.01) {
            marker = placeQuakeMarkerOnMoon(point, quake.magnitude);
        } else if (quake.type === "Shallow-Moonquake") {
            marker = placeSimpleMarkerOnMoon(point, 'cyan');
        } else if (quake.type === "Natural-Impacts") {
            marker = placeSimpleMarkerOnMoon(point, 'orange');
        } else if (quake.type.startsWith("Deep-Moonquake-")) {
            marker = placeSimpleMarkerOnMoon(point, 'violet');
        } else if (quake.type.startsWith("Artificial-Impact")) {
            marker = placeSimpleMarkerOnMoon(point, 'yellow');
        }

        quake.marker = marker;
    });
}

function placeSimpleMarkerOnMoon(point, color) {
    const dotGeometry = new THREE.SphereGeometry(0.02, 32, 32);
    const dotMaterial = new THREE.MeshBasicMaterial({ color: color });
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);

    dot.position.set(point.x, point.y, point.z);
    lod.add(dot);

    return dot;
}

function pointFromLatLon(latitude, longitude) {
    const radius = 1;
    const phi = THREE.MathUtils.degToRad(90 - latitude);
    const theta = THREE.MathUtils.degToRad(longitude);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
}

function placeQuakeMarkerOnMoon(point, magnitude) {
    if (magnitude < 1) {
        magnitude = Math.ceil(magnitude);
    }
    const normal = point.clone().normalize();

    const quakeDotSize = getMarkerSizeFromMagnitude(magnitude);
    const quakeDotGeometry = new THREE.SphereGeometry(quakeDotSize, 32, 32);
    const quakeDotMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const quakeDot = new THREE.Mesh(quakeDotGeometry, quakeDotMaterial);

    const quakeDotOffset = 0.02;
    const quakeDotPosition = point.clone().add(normal.clone().multiplyScalar(quakeDotOffset));
    quakeDot.position.set(quakeDotPosition.x, quakeDotPosition.y, quakeDotPosition.z);
    lod.add(quakeDot);

    function createWave(initialScale) {
        const innerRadius = 0.05 * initialScale;
        const outerRadius = innerRadius + 0.001;
        const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);

        const ringOffset = 0.03;
        const ringPosition = point.clone().add(normal.clone().multiplyScalar(ringOffset));
        ring.position.set(ringPosition.x, ringPosition.y, ringPosition.z);
        ring.lookAt(new THREE.Vector3(0, 0, 0));
        lod.add(ring);

        function animateRing(ringMesh) {
            if (ringMesh.scale.x < 2) {
                ringMesh.scale.x += 0.005;
                ringMesh.scale.y += 0.005;
                requestAnimationFrame(() => animateRing(ringMesh));
            } else {
                lod.remove(ringMesh);
            }
        }
        animateRing(ring);
    }

    function emitWaves() {
        for (let i = 1; i <= magnitude; i++) {
            setTimeout(() => {
                if (quakeDot.visible) {
                    createWave(i);
                }
            }, i * 500);
        }
        setTimeout(emitWaves, magnitude * 500);
    }
    emitWaves();

    return quakeDot;
}

function getMarkerSizeFromMagnitude(magnitude) {
    return 0.005 + magnitude * 0.005;
}

function onHover(event) {
    const tooltip = document.getElementById('tooltip');

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(lod.children);

    if (intersects.length > 0 && intersects[0].object.visible) {
        const intersectedObject = intersects[0].object;
        const quakeData = moonquakeData.find(quake => quake.marker === intersectedObject);
        currentQuakeData = quakeData;

        if (quakeData) {
            const date = new Date(quakeData.year, 0, quakeData.day, quakeData.hour, quakeData.minute, quakeData.second);
            date.setMonth(0);
            date.setDate(quakeData.day);

            const dateString = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
            const timeString = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });

            const typeString = quakeData.type.replace(/-/g, ' ');
            const datasetString = quakeData.dataset.replace(/-/g, ' ');

            let tooltipHTML = "";

            if (quakeData.magnitude > 0) {
                const embedUrl = `./embed.html?m=${quakeData.magnitude}`;
                tooltipHTML += `<iframe src="${embedUrl}" width="400" height="125" style="border:none;"></iframe><br>`;
            }

            tooltipHTML += `
                Type: ${typeString}<br>
                Date: ${dateString}<br>
                Time: ${timeString}<br>
                Lat: ${quakeData.latitude} °<br>
                Lon: ${quakeData.longitude} °<br>
            `;

            if (quakeData.magnitude > 0) {
                tooltipHTML += `Magnitude: ${quakeData.magnitude}<br>`;
            }
            if (quakeData.depth > 0) {
                tooltipHTML += `Depth: ${quakeData.depth} km<br>`;
            }

            tooltipHTML += `Dataset: ${datasetString}<br>`;

            tooltip.style.left = `${event.clientX + 15}px`;
            tooltip.style.top = `${event.clientY - 50}px`;

            const imageUrl = `./assets/img/obspy/xa.s12.00.mhz.${quakeData.year}.${quakeData.day}.0.png`;

            fetch(imageUrl)
                .then(res => {
                    if (res.status === 200) {
                        tooltipHTML += `<img src="${imageUrl}" alt="Seismograph Image" width="400" height="125"><br>`;
                        tooltip.innerHTML = tooltipHTML;
                    }
                })
                .catch(err => { });

            tooltip.innerHTML = tooltipHTML;
            tooltip.style.display = 'block';
        } else {
            tooltip.style.display = 'none';
        }
    } else {
        tooltip.style.display = 'none';
        currentQuakeData = null;
    }
}


function setupTimeline() {
    const timeline = document.getElementById('timeline');

    const slider = document.createElement('div');
    slider.className = 'slider';
    timeline.appendChild(slider);

    updateSliderPosition();

    timeline.addEventListener('mousedown', function (event) {
        onMouseMove(event);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', () => {
            window.removeEventListener('mousemove', onMouseMove);
        });
    });
}

function onMouseMove(event) {
    const timeline = document.getElementById('timeline');
    let percentage = (event.clientX - timeline.getBoundingClientRect().left) / timeline.offsetWidth;
    settings.timelineYear = Math.round(1969 + percentage * (1977 - 1969));
    updateSliderPosition();
    updateQuakeVisibility();
}

function updateSliderPosition() {
    const timeline = document.getElementById('timeline');
    const sliderInput = timeline.querySelector('input');
    const years = document.querySelectorAll('.range-labels li');
    const percentage = (settings.timelineYear - 1969) / (1977 - 1969);

    years.forEach(y => y.classList.remove('active', 'selected'));

    const closestYear = Math.round(percentage * (years.length - 1));
    years[closestYear].classList.add('active', 'selected');
    years[closestYear].previousElementSibling?.classList.add('selected');

    sliderInput.value = settings.timelineYear;
}

function playTimeline() {
    if (settings.timelinePlay) {
        settings.timelineYear++;
        if (settings.timelineYear > 1977) {
            settings.timelineYear = 1969;
        }
        updateSliderPosition();
        updateQuakeVisibility();
        setTimeout(playTimeline, 2000);
    }
}

function initLayers() {
    const textureLoader = new THREE.TextureLoader();

    const layerTextures = {
        'layer1': 'assets/img/layer/layer1.png',
        'layer2': 'assets/img/layer/layer2.png',
        'layer3': 'assets/img/layer/layer3.png'
    };

    for (let id in layerTextures) {
        const texture = textureLoader.load(layerTextures[id]);
        const geometry = new THREE.SphereGeometry(1.04, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.visible = false;
        layerMeshes[id] = mesh;
        scene.add(mesh);
    }
}


function setupLayerToggle() {
    document.querySelectorAll('input[name="layer"]').forEach(input => {
        input.addEventListener('change', () => {
            for (let id in layerMeshes) {
                layerMeshes[id].visible = false;
            }

            if (input.id !== 'none') {
                layerMeshes[input.id].visible = true;
            }
        });
    });
}

function onClick(event) {
    if ((settings.rotate && settings.orbit) || !settings.clickInfo) {
        return;
    }

    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(lod);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        getLatLonFromPoint(point);
    }
}

function onRightClick(event) {
    event.preventDefault();
    removeDotFromMoon();
}

function getLatLonFromPoint(point) {
    const radius = point.length();
    const phi = Math.acos(point.y / radius);
    const theta = Math.atan2(point.z, point.x);

    const latitude = 90 - phi * (180 / Math.PI);
    let longitude = (theta + lod.rotation.y) * (180 / Math.PI);

    while (longitude < -180) {
        longitude += 360;
    }
    while (longitude > 180) {
        longitude -= 360;
    }

    updateInfo(latitude.toFixed(2), longitude.toFixed(2));

    placeDotOnMoon(point);
}

function updateInfo(latitude, longitude) {
    document.getElementById('info').textContent =
        `Latitude: ${latitude}, Longitude: ${longitude}`;
    document.getElementById('info').style.display = 'block';
}

function placeDotOnMoon(point) {
    if (previousDot) {
        scene.remove(previousDot);
    }

    const dotGeometry = new THREE.SphereGeometry(0.02, 32, 32);
    const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);

    const normal = point.clone().normalize();

    const offset = 0.02;
    point.add(normal.multiplyScalar(offset));

    dot.position.set(point.x, point.y, point.z);
    scene.add(dot);

    previousDot = dot;
}

function removeDotFromMoon() {
    if (previousDot) {
        scene.remove(previousDot);
        previousDot = null;
    }
    document.getElementById('info').style.display = 'none';
}
