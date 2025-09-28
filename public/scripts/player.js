document.addEventListener('DOMContentLoaded', () => {
    const uuid = localStorage.getItem('uuid') || crypto.randomUUID();
    const socket = io({ query: { uuid } });
    localStorage.setItem('uuid', uuid);
    const sphere = document.querySelector('#sphere');
    const status = document.querySelector('#status');

    let point = 0;
    let gameStarted = false;

    //HUD
    const parentHUD = document.getElementById("hud");
    const POINTHUD_Z = -1;
    const pointTextHUD = HUDFC.createPointTextHUD(POINTHUD_Z);
    HUDFC.setHUDContent(pointTextHUD, HUDFC.thinkPointHUDContent(0));
    parentHUD.appendChild(pointTextHUD);

    function updateHUD() {
        parentHUD.setAttribute("position", HUDFC.thinkPointHUDResponsivePosition(POINTHUD_Z));
        HUDFC.setHUDContent(pointTextHUD, HUDFC.thinkPointHUDContent(point));
    }

    setInterval(updateHUD, 100);

    socket.on('updateBoxHp', (newHp) => {
        console.log('updateBoxHp received:', newHp);
        const currentBox = document.querySelector('#movingBox');
        if (!currentBox) return;
        currentBox.setAttribute('visible', newHp > 0);

        // Play ding sound if damaged
        if (newHp > 0) {
            currentBox.emit('play-ding');
        }
    });

    socket.on('connect', () => {
        status.textContent = '✅ 接続成功！';
    });

    socket.on('disconnect', () => {
        status.textContent = '❌ 接続が切れました';
    });

    socket.on('sceneUpdate', (sceneName) => {
        console.log('🔁 シーン更新:', sceneName);
        // Only handle gltf scene
        if (sceneName === 'gltf') {
            // Remove the sky and add the gltf model
            const sphere = document.getElementById('sphere');
            if (sphere) sphere.parentNode.removeChild(sphere);
            if (!document.getElementById('gltf-scene')) {
                const scene = document.querySelector('a-scene');
                const gltf = document.createElement('a-entity');
                gltf.setAttribute('id', 'gltf-scene');
                gltf.setAttribute('gltf-model', 'assets/scene.gltf');
                gltf.setAttribute('scale', '1 1 1'); // Adjust as needed
                gltf.setAttribute('position', '0 -550 -3'); // Adjust as needed
                scene.appendChild(gltf);
            }
            // Hide overlay and mark game as started
            const overlay = document.getElementById('black-overlay');
            if (overlay) overlay.style.display = 'none';
            gameStarted = true;
        }
    });

    socket.on('boxPosition', (pos) => {
        const currentBox = document.querySelector('#movingBox');
        if (currentBox) currentBox.setAttribute('position', pos);
    });

    socket.on('boxColor', (color) => {
        const currentBox = document.querySelector('#movingBox');
        if (currentBox) currentBox.setAttribute('color', color);
    });

    socket.on('spawnBox', (boxData) => {
        if (!gameStarted) return; // Don't spawn box before game start

        const oldBox = document.querySelector(`#${boxData.id}`);
        if (oldBox) oldBox.parentNode.removeChild(oldBox);

        const scene = document.querySelector('a-scene');
        const box = document.createElement('a-box');
        box.setAttribute('id', boxData.id);
        box.setAttribute('class', 'clickable');
        box.setAttribute('position', boxData.position);
        box.setAttribute('color', boxData.color);
        box.setAttribute('depth', 1);
        box.setAttribute('height', 1);
        box.setAttribute('width', 1);
        box.setAttribute('rotation', '0 45 0');
        box.setAttribute('damage-on-hover', '');
        // Use the new event name here
        box.setAttribute('sound', 'src: #ding; on: play-ding; volume: 2');

        scene.appendChild(box);
    });

    socket.on('getPoint', val => {
        point += val;
        updateHUD();
    });

    socket.on('updatePoints', pointsObj => {
        // Only update this player's point
        const uuid = localStorage.getItem('uuid');
        if (uuid && pointsObj[uuid] !== undefined) {
            point = pointsObj[uuid];
        }
        updateHUD();
    });

    // Move this inside the DOMContentLoaded callback
    AFRAME.registerComponent('damage-on-hover', {
        init: function () {
            let intervalId = null;
            this.el.addEventListener('mouseenter', () => {
                if (intervalId) return;
                socket.emit('startDamage');
                intervalId = setInterval(() => {
                    socket.emit('hitBox');
                }, 200);
            });
            this.el.addEventListener('mouseleave', () => {
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
                socket.emit('stopDamage');
            });
        }
    });

    // Example function to call when the box is damaged
    function onBoxDamaged() {
        var box = document.querySelector('#damageBox');
        if (box) {
            box.emit('play-ding');
        }
        // ...other damage logic...
    }

    // Call onBoxDamaged() when appropriate in your game logic

    socket.on('storyProgress', (stage) => {
        // alert(`ストーリーが進みました！ステージ: ${stage}`);
        // You can also update the UI or trigger new events here
    });
});