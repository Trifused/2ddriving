// Wait for the DOM to load before executing the script
document.addEventListener("DOMContentLoaded", () => {

    // Define the current version of the application
    const appVersion = "1.33e (RoadLocker)";

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
        shootButton.addEventListener("click", () => {
            console.log("Shoot button pressed!");
            shootBullet(); // Fire a bullet when clicked
        });
    } else {
        console.error("Shoot button not found in the DOM.");
    }

    // Setup B Screen Break Button v1.32
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

    // Vehicle object to track position, speed, velocity, and trail coordinates
    let vehicle = {
        x: 0,
        y: 0,
        v: false,
        speed: 0.0000, // Initial speed of the vehicle
        position: [-115.1398, 36.1699], // Initial position (longitude, latitude) (Las Vegas. Mevada)
        velocity: { x: 0, y: 0 },
        trailCoordinates: [], // Stores trail coordinates
    };

    let bullet = {
        active: false,
        position: [0, 0],  
        velocity: { x: 0, y: 0 }
    };

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

    // Snap to Road 1.33a - not working
    async function snapToRoad() {
        if (!vehicle.roadLock) return;
        const url = `https://api.mapbox.com/matching/v5/mapbox/driving/${vehicle.position[0]},${vehicle.position[1]}?access_token=${mapboxAccessToken}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.code === "Ok" && data.matchings.length > 0) {
                vehicle.position = data.matchings[0].geometry.coordinates[0];
            }
        } catch (error) {
            console.error("Error fetching road data:", error);
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

        const bulletSpeed = 0.0005;
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

        bullet.position[0] += bullet.velocity.x;
        bullet.position[1] += bullet.velocity.y;

        if (map.getSource("bulletSource")) {
            map.getSource("bulletSource").setData({
                type: "Feature",
                geometry: { type: "Point", coordinates: bullet.position }
            });
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

    // Move vehicle Function based on input v1.33b, 1.33c, 1.33d
    function moveVehicle() {
        const acceleration = 0.05; // Increase or decrease this value
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
            zone: joystickContainer,
            mode: "dynamic",
            size: 120,
            color: "white",
            fadeTime: 250,
            restOpacity: 0.7,
        });

        joystick.on("move", (evt, data) => {
            if (!data.direction) return;
            let force = data.force;

            switch (data.direction.angle) {
                case "up": vehicle.speed = Math.min(vehicle.speed + force * 0.1, 200); break;
                case "down": vehicle.speed = Math.max(vehicle.speed - force * 0.1, -2); break;
                case "left": map.setBearing(map.getBearing() - force * 3); break;
                case "right": map.setBearing(map.getBearing() + force * 3); break;
            }
        });

        joystick.on("end", () => {
            vehicle.speed *= 0.9;
        });

        console.log("Joystick initialized successfully!");
    }

    // Initialize Mapbox
    mapboxgl.accessToken = mapboxAccessToken;
    const map = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/streets-v11",
        center: vehicle.position,
        zoom: 15,
    });

    const vehicleMarker = createVehicleMarker();
    vehicleMarker.addTo(map);

    map.on("load", () => {
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

        initializeJoystick();
    });

    // Add key listiner 1.33b and 1.33c
    document.addEventListener("keydown", (event) => {
        switch (event.keyCode) {
            case KEY_CODES.UP: isAccelerating = true; break;
            case KEY_CODES.DOWN: isBraking = true; break;
            case KEY_CODES.LEFT: isTurningLeft = true; break;
            case KEY_CODES.RIGHT: isTurningRight = true; break;
            case KEY_CODES.HANDBRAKE: // Spacebar
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
    }


    updateShootButtonState();
    mainLoop(); // Start the main loop -v1.33a
    //setInterval(moveVehicle, 100);
    // ****** Main Loop End --

});
