// Wait for the DOM to load before executing the script
document.addEventListener("DOMContentLoaded", () => {

    // Define the current version of the application
    const appVersion = "1.33h (RoadLocker)";

    // Array of colors for vehicle marker
    const COLORS = ["red", "green", "blue", "orange", "yellow"];
    let currentColorIndex = Math.floor(Math.random() * COLORS.length);

    // Key codes for controlling the vehicle's movement
    const KEY_CODES = {
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        HANDBRAKE: 32, // Space bar for handbrake
        LOCK: 76, // L Key for Lock
        SHOOT: 88 // X Shoot
    };

    // Setup X Shot Screen Buton v1.33e  
    const shootButton = document.getElementById("shoot-button");

    if (shootButton) {
        shootButton.addEventListener("touchstart", function (event) {
            event.preventDefault(); // ✅ Prevents conflicts with joystick v1.33h
            console.log("Shoot button pressed (touch)!");
            shootBullet();
        }, { passive: false });
    
        shootButton.addEventListener("mousedown", function () {
            console.log("Shoot button pressed (mouse)!");
            shootBullet();
        });
    } else {
        console.error("Shoot button not found in the DOM.");
    }
    
    document.addEventListener("touchmove", function (event) {
        if (!event.target.closest("#joystick-container, #shoot-button")) {
            event.preventDefault(); // ✅ Stops unwanted scrolling/zooming v1.33h
        }
    }, { passive: false });
    

    // Setup Screen Break B Button v1.32
    const brakeButton = document.getElementById("brake-button");
    if (brakeButton) {
        brakeButton.addEventListener("click", () => {
            console.log("Brake button pressed!");
            vehicle.speed = 0; // Stop the vehicle
            updateSpeedDisplay(); // Update the speed indicator
        });
    } else {
        console.error("Brake button not found in the DOM.");
    }

    //State Tracking - v1.33b
    let isAccelerating = false;
    let isBraking = false;
    let isTurningLeft = false;
    let isTurningRight = false;

    // Define Vehicle object to track position, speed, velocity, and trail coordinates
    let vehicle = {
        x: 0,
        y: 0,
        v: false,
        speed: 0.0000, // Initial speed of the vehicle
        position: [-115.1398, 36.1699], // Initial position (longitude, latitude) (Las Vegas. Mevada)
        velocity: { x: 0, y: 0 },
        trailCoordinates: [], // Stores trail coordinates
    };

    const HIT_DISTANCE = 0.00009; // Adjust as needed for accuracy

    // Define Bullet object to active speed and velocity
    let bullet = {
        active: false,
        position: [0, 0],  
        velocity: { x: 0, y: 0 }
    };

    // Define Target object state, size speed and velocity
    let target = {
        position: [vehicle.position[0] + 0.0005, vehicle.position[1]], // Initial position
        angle: 0, 
        radius: 0.0000001,
        speed: 0.02,
        marker: null, // Ensure we initialize marker properly
        alive: true // New state tracker
    };
    
    // Prevent Double-Tap Zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault(); // Prevent zooming
        }
        lastTouchEnd = now;
    }, false);
    
    // Initialize Mapbox
    mapboxgl.accessToken = mapboxAccessToken;
    const map = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/streets-v11",
        center: vehicle.position,
        zoom: 18,
    });



    // Initialize Vehicle on Screen
    const vehicleMarker = createVehicleMarker();
    vehicleMarker.addTo(map);


    // ======================================================
    // Functions
    // ======================================================


    // Update the version number overlay
    function updateVersionOverlay(version) {
        const versionOverlay = document.getElementById("version-overlay");
        if (versionOverlay) {
            versionOverlay.textContent = `2D ZiZ V${version}`;
        } else {
            console.error("Version overlay element not found.");
        }
    }

    // Snap to Road | 1.33a and 1.33e - not working
    async function snapToRoad() {
        if (!vehicle.roadLock) return;        
        const url = `https://api.mapbox.com/matching/v5/mapbox/driving/${vehicle.position[0]},${vehicle.position[1]}?access_token=${mapboxAccessToken}`;        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`Road snapping failed: ${response.status} ${response.statusText}`);
                return;
            }            
            const data = await response.json();
            if (data.code === "Ok" && data.matchings.length > 0) {
                vehicle.position = data.matchings[0].geometry.coordinates[0];  
                console.log("🚗 Snapped to Road:", vehicle.position);
            } else {
                console.warn("⚠️ No road match found!");
            }
        } catch (error) {
            console.error("❌ Error fetching road data:", error);
        }
    }
    
    // Get the next color in the COLORS array
    function getNextColor() {
        currentColorIndex = (currentColorIndex + 1) % COLORS.length;
        return COLORS[currentColorIndex];
    }

    // Function to update button state
    function updateShootButtonState() {
        if (bullet.active) {
            shootButton.classList.remove("shoot-ready");
            shootButton.classList.add("shoot-not-ready");
        } else {
            shootButton.classList.remove("shoot-not-ready");
            shootButton.classList.add("shoot-ready");
        }
    }
    
    // Shoot Bullet v1.33e
    // Modify `shootBullet()` to change button to "Not Ready" when fired
    function shootBullet() {
        if (bullet.active) {
            console.log("🚫 Cannot fire: Bullet still active!");
            return;
        }

        console.log("🔫 Bullet Fired!");
        bullet.active = true;
        bullet.position = [...vehicle.position];

        const bulletSpeed = 0.00005;   // This works good zoom 18
        const bearingRad = (map.getBearing() * Math.PI) / 180;
        bullet.velocity.x = bulletSpeed * Math.sin(bearingRad);
        bullet.velocity.y = bulletSpeed * Math.cos(bearingRad);

        // Remove any old bullet before creating a new one
        if (map.getLayer("bulletLayer")) {
            map.removeLayer("bulletLayer");
        }
        if (map.getSource("bulletSource")) {
            map.removeSource("bulletSource");
        }

        // Create new bullet source & layer
        map.addSource("bulletSource", {
            type: "geojson",
            data: {
                type: "Feature",
                geometry: { type: "Point", coordinates: bullet.position }
            }
        });

        map.addLayer({
            id: "bulletLayer",
            type: "circle",
            source: "bulletSource",
            paint: { "circle-radius": 5, "circle-color": "red" }
        });

        // Update button state to "Not Ready"
        updateShootButtonState();

        // Expire bullet after 1 seconds
        setTimeout(() => {
            expireBullet();
        }, 1000);
    }
    
    // Expire Bullet 
    // Modify `expireBullet()` to change button back to "Ready"
    function expireBullet() {
        if (!bullet.active) return;

        console.log("💨 Bullet Expired! Resetting...");

        if (map.getLayer("bulletLayer")) {
            map.removeLayer("bulletLayer");
        }
        if (map.getSource("bulletSource")) {
            map.removeSource("bulletSource");
        }

        bullet.active = false;
        bullet.position = [0, 0];  
        bullet.velocity = { x: 0, y: 0 };

        console.log("✅ Bullet Reset! Ready to Fire Again.");

        // Update button state to "Ready"
        updateShootButtonState();
    }

    // Function Move Bullit v1.33e
    function moveBullet() {
        if (!bullet.active) return; // No bullet to move
    
        // Move bullet
        bullet.position[0] += bullet.velocity.x;
        bullet.position[1] += bullet.velocity.y;
    
        if (map.getSource("bulletSource")) {
            map.getSource("bulletSource").setData({
                type: "Feature",
                geometry: { type: "Point", coordinates: bullet.position }
            });
        }
    
        // Check if bullet hits target
        const distance = Math.sqrt(
            Math.pow(bullet.position[0] - target.position[0], 2) +
            Math.pow(bullet.position[1] - target.position[1], 2)
        );
    
        if (distance < HIT_DISTANCE) {
            console.log("🎯 Target Hit!");
            hitTarget(); // Call hit function
            expireBullet(); // Remove the bullet
            return;
        }
    
        // Remove bullet if it goes too far
        if (
            bullet.position[0] > 180 || bullet.position[0] < -180 ||
            bullet.position[1] > 90 || bullet.position[1] < -90
        ) {
            console.log("💨 Bullet Expired by Out of Bounds!");
            expireBullet();
        }
    }

    // Function create the vehicle marker with a triangle pointer
    function createVehicleMarker() {
        const vehicleMarkerEl = document.createElement('div');
        Object.assign(vehicleMarkerEl.style, {
            width: '18px',
            height: '40px',
            backgroundColor: COLORS[currentColorIndex],
            borderRadius: '5px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        });

        const triangleEl = document.createElement('div');
        Object.assign(triangleEl.style, {
            width: '0',
            height: '0',
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderBottom: '15px solid black',
            position: 'absolute',
            top: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
        });

        vehicleMarkerEl.appendChild(triangleEl);

        return new mapboxgl.Marker({ element: vehicleMarkerEl }).setLngLat(vehicle.position);
    }

    // Add a point to the trail
    function addTrailPoint() {
        vehicle.trailCoordinates.push(vehicle.position);
    }

    // Update the trail line on the map
    function updateTrail() {
        if (map.getSource('trail')) {
            map.getSource('trail').setData({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: vehicle.trailCoordinates,
                },
            });
        }
    }

    // Clear the trail points
    function clearTrail() {
        vehicle.trailCoordinates = [];
        updateTrail();
    }

    // Update the speed display
    function updateSpeedDisplay() {
        const speedDisplay = document.getElementById("speed-display");
        const metersPerSecond = vehicle.speed * 50;
        const mph = (metersPerSecond * 2.23694).toFixed(1);
        const kph = (metersPerSecond * 3.6).toFixed(1);

        speedDisplay.textContent = vehicle.speed === 0 ?
            `Speed: 0.00 (0.0 MPH / 0.0 KPH)` :
            `Speed: ${vehicle.speed.toFixed(2)} (${mph} MPH / ${kph} KPH)`;
    }

// Initialize WebGL context and texture
let gl, webglCanvas, exampleTexture;

function initializeWebGL() {
    // Create a canvas for WebGL rendering
    webglCanvas = document.createElement('canvas');
    webglCanvas.width = 256;
    webglCanvas.height = 256;
    document.body.appendChild(webglCanvas); // Add to DOM for visibility/debugging

    // Get WebGL context
    gl = webglCanvas.getContext('webgl');
    if (!gl) {
        console.error("WebGL not supported!");
        return;
    }

    // Create a texture
    exampleTexture = gl.createTexture();
    const exampleImageData = new Uint8Array([
        255, 0, 0, 255,   // Red pixel
        0, 255, 0, 255,   // Green pixel
        0, 0, 255, 255,   // Blue pixel
        255, 255, 0, 255  // Yellow pixel
    ]);

    // Upload texture using the reusable function
    uploadTexture(gl, exampleTexture, exampleImageData, 2, 2, {
        flipY: true,
        premultiplyAlpha: false,
        format: gl.RGBA,
        type: gl.UNSIGNED_BYTE
    });

    console.log("WebGL initialized and texture uploaded!");
}

    // Flip Correction 
    function uploadTexture(gl, texture, imageData, width, height, options = {}) {
        const {
            flipY = false,
            premultiplyAlpha = false,
            format = gl.RGBA,
            type = gl.UNSIGNED_BYTE
        } = options;
    
        gl.bindTexture(gl.TEXTURE_2D, texture);
    
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiplyAlpha);
    
        if (imageData instanceof Image || imageData instanceof HTMLCanvasElement) {
            gl.texImage2D(gl.TEXTURE_2D, 0, format, format, type, imageData);
        } else if (imageData instanceof Uint8Array || imageData instanceof Float32Array) {
            gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, type, imageData);
        } else {
            console.error("Unsupported texture source type.");
        }
    
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
    
    // Move the Target object Function
    function moveTarget() {
        if (!target.alive) {
            console.warn("⚠️ Target is not alive. Skipping movement.");
            return;
        }
    
        if (!target.marker) {
            console.warn("⚠️ Target marker missing! Attempting to recreate...");
            recreateTarget();
            return;
        }
    
        // 🌊 Depth Effect: Modify radius over time using a sine wave
        const depthFactor = Math.sin(performance.now() * 0.005) * 0.0001; // Controls depth change speed and range
        target.radius = 0.00045 + depthFactor;
    
        // ⚡ Dynamic Speed Variation: Oscillates between 0.01 and 0.03
        const speedFactor = Math.abs(Math.sin(performance.now() * 0.003)) * 0.02; // Smooth speed changes
        target.speed = 0.01 + speedFactor; // Base speed + variation
    
        //console.log(`🔵 Target Radius: ${target.radius.toFixed(6)} | ⚡ Speed: ${target.speed.toFixed(4)}`);
    
        // Update target position for circular motion
        target.angle += target.speed;
        target.position[0] = vehicle.position[0] + target.radius * Math.cos(target.angle);
        target.position[1] = vehicle.position[1] + target.radius * Math.sin(target.angle);
    
        target.marker.setLngLat(target.position);
    
        if (map.getSource("hitZone")) {
            map.getSource("hitZone").setData({
                type: "Feature",
                geometry: { type: "Point", coordinates: target.position }
            });
        }
    }
        
    // Move vehicle Function ---  v1.33b, 1.33c, 1.33d
    function moveVehicle() {
        const acceleration = 0.001; // Increase or decrease this value
        const maxSpeed = 200; // Increase or decrease this value
        const minSpeed = -2; // Increase or decrease this value
    
        // Update speed based on input states
        if (isAccelerating) {
            vehicle.speed = Math.min(vehicle.speed + acceleration, maxSpeed);
        } else if (isBraking) {
            vehicle.speed = Math.max(vehicle.speed - acceleration, minSpeed);
        }
        else {  // Cruse Control and Varable Friciton when not on road future 
            // Remove friction logic to prevent automatic slowing
            vehicle.speed *= 0.99; // Comment out or remove this line
        }

        // Update turning based on input states
        if (isTurningLeft) {
            map.setBearing(map.getBearing() - 5);
        } else if (isTurningRight) {
            map.setBearing(map.getBearing() + 5);
        }
    
        // Update position based on current speed and bearing
        const bearingRad = (map.getBearing() * Math.PI) / 180;
        const rotatedDx = vehicle.speed * Math.sin(bearingRad);
        const rotatedDy = vehicle.speed * Math.cos(bearingRad);
    
        vehicle.velocity.x = rotatedDx;
        vehicle.velocity.y = rotatedDy;
    
        const lng = vehicle.position[0] + vehicle.velocity.x * 0.0001;
        const lat = vehicle.position[1] + vehicle.velocity.y * 0.0001;
    
        vehicle.position = [lng, lat];
    
        // Snap to road if roadLock is enabled
        if (vehicle.roadLock) {
            snapToRoad();
        }
    
        // Update vehicle marker position and rotation
        vehicleMarker.setLngLat(vehicle.position);
        const rotationDeg = (Math.atan2(vehicle.velocity.y, vehicle.velocity.x) * 180) / Math.PI;
        vehicleMarker.getElement().style.transform = `rotate(${rotationDeg - 90}deg)`;
    
        // Center the map on the vehicle
        map.setCenter([lng, lat]);
    
        // Add a new point to the trail
        addTrailPoint();
    }

    // Initialize NippleJS joystick
    function initializeJoystick() {
        const joystickContainer = document.getElementById("joystick-container");
        if (!joystickContainer) {
            console.error("Joystick container not found!");
            return;
        }

        const joystick = nipplejs.create({
            zone: document.getElementById("joystick-container"),
            mode: "dynamic",
            size: 120,
            color: "blue",
            multitouch: true,  // ✅ Allows multiple touches v1.33h
            maxNumberOfNipples: 2,  // ✅ Supports 2 fingers (joystick + button) v1.33h
            fadeTime: 250,
            restOpacity: 0.7,
        });

        joystick.on("move", (evt, data) => {
            if (!data.direction) return;
            let force = data.force;

            switch (data.direction.angle) {
                case "up": vehicle.speed = Math.min(vehicle.speed + force * 0.005, 200); break;
                case "down": vehicle.speed = Math.max(vehicle.speed - force * 0.005, -2); break;
                case "left": map.setBearing(map.getBearing() - force * 3); break;
                case "right": map.setBearing(map.getBearing() + force * 3); break;
            }
        });

        joystick.on("end", () => {
            vehicle.speed *= 0.9;
        });

        console.log("Joystick initialized successfully!");
    }

    // Hit Target Function
    function hitTarget() {
        console.log("💥 Target Destroyed!");
        
        target.alive = false; // Mark as dead
    
        if (target.marker) {
            target.marker.remove();
            target.marker = null;
        }
    
        if (map.getLayer("hitZoneLayer")) {
            map.removeLayer("hitZoneLayer");
        }
        if (map.getSource("hitZone")) {
            map.removeSource("hitZone");
        }
    
        createExplosion(target.position);
    
        // Respawn after delay
        setTimeout(() => {
            recreateTarget();
        }, 2000);
    }

    // Recreate Target  
    function recreateTarget() {
        console.log("♻️ Recreating Target...");
    
        target.position = [
            vehicle.position[0] + (Math.random() * 0.002 - 0.001),
            vehicle.position[1] + (Math.random() * 0.002 - 0.001)
        ];
    
        const targetMarkerEl = document.createElement("div");
        Object.assign(targetMarkerEl.style, {
            width: "20px",
            height: "20px",
            backgroundColor: "purple",
            borderRadius: "50%",
            position: "absolute",
        });
    
        target.marker = new mapboxgl.Marker({ element: targetMarkerEl })
            .setLngLat(target.position)
            .addTo(map);
    
        target.alive = true; // ✅ Mark target as alive
    
        console.log("✅ Target Respawned & Alive!");
    
        if (map.getSource("hitZone")) {
            map.removeSource("hitZone");
        }
    
        map.addSource("hitZone", {
            type: "geojson",
            data: {
                type: "Feature",
                geometry: { type: "Point", coordinates: target.position }
            }
        });
    
        if (map.getLayer("hitZoneLayer")) {
            map.removeLayer("hitZoneLayer");
        }
    
        map.addLayer({
            id: "hitZoneLayer",
            type: "circle",
            source: "hitZone",
            paint: {
                "circle-radius": 15,
                "circle-color": "rgba(255, 0, 0, 0.3)",
                "circle-stroke-color": "red",
                "circle-stroke-width": 2
            }
        });
    }
      
    // Explosion Function v1.33f
    function createExplosion(position) {
        console.log("💥 Explosion Triggered!");
    
        // Create explosion element
        const explosionEl = document.createElement("div");
        explosionEl.className = "explosion";
    
        // Style explosion (make sure it's properly sized & positioned)
        Object.assign(explosionEl.style, {
            width: "50px",
            height: "50px",
            backgroundColor: "orange",
            borderRadius: "50%",
            position: "absolute",
            transform: "translate(-50%, -50%)", // Center explosion
            animation: "explode 0.5s ease-out forwards",
            zIndex: "1000", // Ensure it's above other elements
        });
    
        // Attach explosion to the body instead of mapbox marker
        document.body.appendChild(explosionEl);
    
        // Convert map position to screen position
        const point = map.project(position);
        explosionEl.style.left = `${point.x}px`;
        explosionEl.style.top = `${point.y}px`;
    
        // Remove explosion after animation ends
        setTimeout(() => {
            explosionEl.remove();
            console.log("🔥 Explosion Removed");
        }, 500);
    }
    
    //  ----   Map Logic  --------

    // Map Load Logic
    map.on("load", () => {
        // Mapbox setup
        map.addSource("trail", {
            type: "geojson",
            data: { type: "Feature", geometry: { type: "LineString", coordinates: vehicle.trailCoordinates } },
        });
    
        map.addLayer({
            id: "trail",
            type: "line",
            source: "trail",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "blue", "line-width": 3, "line-opacity": 0.7 },
        });
    
        // Create target marker
        const targetMarkerEl = document.createElement("div");
        Object.assign(targetMarkerEl.style, {
            width: "20px",
            height: "20px",
            backgroundColor: "purple",
            borderRadius: "50%",
            position: "absolute",
        });
    
        target.marker = new mapboxgl.Marker({ element: targetMarkerEl })
            .setLngLat(target.position)
            .addTo(map);
    
        // Add a hit zone source (a circle around the target)
        map.addSource("hitZone", {
            type: "geojson",
            data: {
                type: "Feature",
                geometry: { type: "Point", coordinates: target.position }
            }
        });
    
        map.addLayer({
            id: "hitZoneLayer",
            type: "circle",
            source: "hitZone",
            paint: {
                "circle-radius": 15, // Adjust to match the HIT_DISTANCE
                "circle-color": "rgba(255, 0, 0, 0.3)", // Transparent red
                "circle-stroke-color": "red",
                "circle-stroke-width": 2
            }
        });
    
        // Initialize WebGL (optional texture-based rendering)
        initializeWebGL();

        // Initialize Joystick
        initializeJoystick();
    });
    
    // Add key listiners -- 1.33b and 1.33c
    document.addEventListener("keydown", (event) => {
        switch (event.keyCode) {
            case KEY_CODES.UP: 
                isAccelerating = true; 
                break;
            case KEY_CODES.DOWN: 
                isBraking = true; 
                break;
            case KEY_CODES.LEFT: 
                isTurningLeft = true; 
                break;
            case KEY_CODES.RIGHT: 
                isTurningRight = true; 
                break;
            case KEY_CODES.HANDBRAKE: // Spacebar
                event.preventDefault(); // Prevent the default scroll behavior
                vehicle.speed = 0; // Stop the vehicle immediately
                updateSpeedDisplay(); // Update the speed display
                break;
            case KEY_CODES.LOCK: // L key
                vehicle.roadLock = !vehicle.roadLock; // Toggle road lock
                console.log("Road Lock:", vehicle.roadLock ? "ON" : "OFF");
                break;
            case KEY_CODES.SHOOT: // X key
                shootBullet();
                break;
            case 67: // C key (ASCII code for 'C')
                clearTrail(); // Clear the trail
                console.log("Trail cleared!");
                break;
            case 80: // P key (ASCII code for 'P')
                const newColor = getNextColor(); // Get the next color
                vehicleMarker.getElement().style.backgroundColor = newColor; // Update the marker color
                console.log("Marker color changed to:", newColor);
                break;
        }
    });
    
    document.addEventListener("keyup", (event) => {
        switch (event.keyCode) {
            case KEY_CODES.UP: isAccelerating = false; break;
            case KEY_CODES.DOWN: isBraking = false; break;
            case KEY_CODES.LEFT: isTurningLeft = false; break;
            case KEY_CODES.RIGHT: isTurningRight = false; break;
        }
    });
    document.addEventListener('touchmove', function (e) {
        if (!e.target.closest('#control-area')) {
            e.preventDefault(); // Stop touchmove outside the control area
        }
    }, { passive: false });

    function mainLoop() {
        // ****** Main Function -- Continuously update the vehicle's position - v1.33a and 1.33c
        // This loop runs indefinitely, executing the moveVehicle function every 100 milliseconds.
        // - Purpose: Update the vehicle's position, trail, and marker on the map in real time.
        // - Interval: 100ms ensures smooth movement and quick response to user inputs.
        moveVehicle(); // Update vehicle position
        updateTrail(); // Update the trail
        updateVersionOverlay(appVersion); // Update the version overlay
        updateSpeedDisplay()   // Update Speed Display
        requestAnimationFrame(mainLoop); // Request the next frame
        moveBullet(); // Move bullet if active
        moveTarget(); // Move the target in a circle
    }


    updateShootButtonState();
    mainLoop(); // Start the main loop -v1.33a
    //setInterval(moveVehicle, 100);
    // ****** Main Loop End --

});
