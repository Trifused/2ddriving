// Wait for the DOM to load before executing the script
document.addEventListener("DOMContentLoaded", () => {

    // Define the current version of the application
    const appVersion = "1.32a (TouchMe)";

    // Key codes for controlling the vehicle's movement
    const KEY_CODES = {
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        HANDBRAKE: 32, // Space bar for handbrake
    };

    // Vehicle object to track position, speed, velocity, and trail coordinates
    let vehicle = {
        x: 0,
        y: 0,
        v: false,
        speed: 0.0000, // Initial speed of the vehicle
        position: [-115.1398, 36.1699], // Initial position (longitude, latitude)
        velocity: { x: 0, y: 0 },
        trailCoordinates: [], // Stores trail coordinates
    };

    // Update the version number overlay
    function updateVersionOverlay(version) {
        const versionOverlay = document.getElementById("version-overlay");
        if (versionOverlay) {
            versionOverlay.textContent = `2D ZiZ V${version}`;
        } else {
            console.error("Version overlay element not found.");
        }
    }

    // Array of colors for vehicle marker
    const COLORS = ["red", "green", "blue", "orange", "yellow"];
    let currentColorIndex = Math.floor(Math.random() * COLORS.length);

    // Get the next color in the COLORS array
    function getNextColor() {
        currentColorIndex = (currentColorIndex + 1) % COLORS.length;
        return COLORS[currentColorIndex];
    }

    // Function to create the vehicle marker with a triangle pointer
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

    // Move the vehicle based on input
    function moveVehicle(keyCode) {
        const acceleration = 0.05;
        const maxSpeed = 200;
        const minSpeed = -2;
        let dy = vehicle.speed;

        switch (keyCode) {
            case KEY_CODES.LEFT:
                map.setBearing(map.getBearing() - 5);
                break;
            case KEY_CODES.UP:
                vehicle.speed = Math.min(vehicle.speed + acceleration, maxSpeed);
                break;
            case KEY_CODES.RIGHT:
                map.setBearing(map.getBearing() + 5);
                break;
            case KEY_CODES.DOWN:
                vehicle.speed = Math.max(vehicle.speed - acceleration, minSpeed);
                break;
            case KEY_CODES.HANDBRAKE:
                vehicle.speed = 0;
                break;
        }

        const bearingRad = (map.getBearing() * Math.PI) / 180;
        const rotatedDx = dy * Math.sin(bearingRad);
        const rotatedDy = dy * Math.cos(bearingRad);

        vehicle.velocity.x = rotatedDx;
        vehicle.velocity.y = rotatedDy;

        const lng = vehicle.position[0] + vehicle.velocity.x * 0.0001;
        const lat = vehicle.position[1] + vehicle.velocity.y * 0.0001;

        vehicle.position = [lng, lat];
        vehicleMarker.setLngLat(vehicle.position);
        addTrailPoint();
        updateTrail();
        updateVersionOverlay(appVersion);

        const rotationDeg = (Math.atan2(vehicle.velocity.y, vehicle.velocity.x) * 180) / Math.PI;
        vehicleMarker.getElement().style.transform = `rotate(${rotationDeg - 90}deg)`;

        map.setCenter([lng, lat]);
        updateSpeedDisplay();
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

    document.addEventListener("keydown", (event) => {
        if (Object.values(KEY_CODES).includes(event.keyCode)) {
            event.preventDefault();
            moveVehicle(event.keyCode);
        } else if (event.key === 'c' || event.key === 'C') {
            event.preventDefault();
            clearTrail();
        } else if (event.key === 'p' || event.key === 'P') {
            event.preventDefault();
            vehicleMarker.getElement().style.backgroundColor = getNextColor();
        }
    });

    // Click the B Screen Break Button
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

  // ****** Main Loop Start -- Continuously update the vehicle's position
  // This loop runs indefinitely, executing the moveVehicle function every 100 milliseconds.
  // - Purpose: Update the vehicle's position, trail, and marker on the map in real time.
  // - Interval: 100ms ensures smooth movement and quick response to user inputs.
  setInterval(moveVehicle, 100);
  // ****** Main Loop End --

});
