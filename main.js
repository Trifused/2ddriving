// Wait for the DOM to load before executing the script
document.addEventListener("DOMContentLoaded", () => {

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
    speed: 0.0001, // Initial speed of the vehicle
    position: [-115.1398, 36.1699], // Initial position of the vehicle (longitude, latitude)
    velocity: { x: 0, y: 0 }, // Velocity in x and y directions
    trailCoordinates: [], // Array to store trail coordinates
  };

  // Array of colors for vehicle marker
  const COLORS = ["red", "green", "blue", "orange", "yellow"];
  let currentColorIndex = Math.floor(Math.random() * COLORS.length); // Select a random initial color

  // Function to get the next color in the COLORS array
  function getNextColor() {
    currentColorIndex = (currentColorIndex + 1) % COLORS.length;
    return COLORS[currentColorIndex];
  }

  // Function to create the vehicle marker with a triangle pointer
  function createVehicleMarker() {
    // Create a container for the car marker
    const vehicleMarkerEl = document.createElement('div');
    vehicleMarkerEl.style.width = '40px';
    vehicleMarkerEl.style.height = '40px';
    vehicleMarkerEl.style.position = 'relative';

    const carIcon = document.createElement('img');

    // Example Base64 image data (replace this with your actual Base64-encoded string)
    const base64CarImage = 'data:image/png;base64,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';

    // Set the Base64 image as the src
    carIcon.src = base64CarImage;
    carIcon.alt = 'Car Icon';

    // Styling the car icon to fit its container and allow rotation
    carIcon.style.width = '100%';
    carIcon.style.height = '100%';
    carIcon.style.objectFit = 'contain';  // Ensures the image maintains aspect ratio
    carIcon.style.transform = 'rotate(0deg)';  // Allows rotation for direction

    // Append the car icon to the desired container (e.g., vehicle marker element)
    vehicleMarkerEl.appendChild(carIcon);
    // Append the car icon to the marker container
    vehicleMarkerEl.appendChild(carIcon);

    // Return a Mapbox marker with the car icon and initial position
    return new mapboxgl.Marker(vehicleMarkerEl).setLngLat(vehicle.position);
  }


  // Function to add a point to the trail
  function addTrailPoint() {
    vehicle.trailCoordinates.push(vehicle.position);
  }

  // Function to update the trail line on the map
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

  // Function to clear the trail points
  function clearTrail() {
    vehicle.trailCoordinates = [];
    updateTrail();
  }

  // Function to update the speed display in the top-left corner
  function updateSpeedDisplay() {

    const speedDisplay = document.getElementById("speed-display");
    if (vehicle.v) {
      speedDisplay.textContent = `Speed: 0.00`;
    }
    else if (speedDisplay) {
      speedDisplay.textContent = `Speed: ${vehicle.speed.toFixed(2)} (${(vehicle.speed.toFixed(1) * 30).toFixed(0)}/${(vehicle.speed.toFixed(1) * 48.3).toFixed(1)} MPH/KPH) `;
    }
  }



  // Function to move the vehicle based on the key pressed
  function moveVehicle(keyCode) {
    const acceleration = 0.05; // Acceleration factor for speed changes
    const maxSpeed = 200; // Maximum speed
    const minSpeed = -2; // Minimum speed (backward)

    let dx = 0;
    let dy = vehicle.speed; // Default dy for automatic forward movement

    // Handle key inputs
    switch (keyCode) {
      case KEY_CODES.LEFT:
        // Steer left by decreasing the map bearing
        map.setBearing(map.getBearing() - 5);
        break;
      case KEY_CODES.UP:
        // Accelerate forward
        vehicle.speed = Math.min(vehicle.speed + acceleration, maxSpeed);
        break;
      case KEY_CODES.RIGHT:
        // Steer right by increasing the map bearing
        map.setBearing(map.getBearing() + 5);
        break;
      case KEY_CODES.DOWN:
        // Decelerate or move backward
        vehicle.speed = Math.max(vehicle.speed - acceleration, minSpeed);
        break;
      case KEY_CODES.HANDBRAKE:
        // Stop the vehicle
        vehicle.speed = 0;
        break;
      default:
        break;
    }

    // Calculate direction based on map bearing
    const bearingRad = (map.getBearing() * Math.PI) / 180;
    const rotatedDx = dy * Math.sin(bearingRad);
    const rotatedDy = dy * Math.cos(bearingRad);

    // Update velocity
    vehicle.velocity.x = rotatedDx;
    vehicle.velocity.y = rotatedDy;

    // Update vehicle position based on velocity
    const lng = vehicle.position[0] + vehicle.velocity.x * 0.0001;
    const lat = vehicle.position[1] + vehicle.velocity.y * 0.0001;

    vehicle.position = [lng, lat];
    vehicleMarker.setLngLat(vehicle.position); // Update marker position

    // Update the trail
    addTrailPoint(); // Add current position to the trail
    updateTrail(); // Update the trail line on the map

    // Rotate the vehicle marker based on velocity direction
    const rotation = Math.atan2(vehicle.velocity.y, vehicle.velocity.x);
    const rotationDeg = (rotation * 180) / Math.PI;
    vehicleMarker.getElement().style.transform = `rotate(${rotationDeg - 90}deg)`;

    map.setCenter([lng, lat]); // Center the map on the vehicle's new position
    updateSpeedDisplay(); // Update the speed display on the screen
  }


  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") {

      vehicle.speed += 0.1; // Increase speed
      // updateSpeedDisplay();
      moveVehicle(38);
    } else if (event.key === "ArrowDown") {
      vehicle.speed -= 0.1; // Decrease speed
      if (vehicle.speed < 0) vehicle.speed = 0; // Prevent negative speed
      // updateSpeedDisplay();
      moveVehicle(40);

    }
  });

  // // Continuously update the vehicle's position
  setInterval(moveVehicle, 100);

  // Mapbox access token (replace with your own token)
  mapboxgl.accessToken = mapboxAccessToken;

  // Create a new Mapbox map
  const map = new mapboxgl.Map({
    container: 'map', // HTML element ID for map container
    style: 'mapbox://styles/mapbox/streets-v11', // Map style
    center: vehicle.position, // Initial map center
    zoom: 15, // Initial zoom level
  });

  // Create and add vehicle marker to the map
  const vehicleMarker = createVehicleMarker();

  // Wait for the map to load before adding layers and controls
  map.on("load", () => {
    vehicleMarker.addTo(map);

    // Add a GeoJSON source for the vehicle's trail
    map.addSource('trail', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: vehicle.trailCoordinates,
        },
      },
    });

    // Add a layer to visualize the vehicle's trail
    map.addLayer({
      id: 'trail',
      type: 'line',
      source: 'trail',
      paint: {
        'line-color': 'blue', // Trail color
        'line-width': 3, // Trail width
      },
    });

    // Event listener for keydown events to move the vehicle or clear the trail
    document.addEventListener("keydown", (event) => {
      if (Object.values(KEY_CODES).includes(event.keyCode)) {
        event.preventDefault(); // Prevent default behavior for arrow keys
        moveVehicle(event.keyCode); // Move vehicle based on key code
      } else if (event.key === 'c' || event.key === 'C') {
        event.preventDefault(); // Prevent default behavior for 'C' key
        clearTrail(); // Clear the vehicle's trail
      } else if (event.key === 'p' || event.key === 'P') {
        event.preventDefault(); // Prevent default behavior for 'P' key
        vehicleMarker.getElement().style.backgroundColor = getNextColor(); // Change vehicle color
      }
    });

    // Event listeners for button clicks to move the vehicle
    document.getElementById("btn-up").addEventListener("click", () => moveVehicle(KEY_CODES.UP));
    document.getElementById("btn-left").addEventListener("click", () => moveVehicle(KEY_CODES.LEFT));
    document.getElementById("btn-right").addEventListener("click", () => moveVehicle(KEY_CODES.RIGHT));
    document.getElementById("btn-down").addEventListener("click", () => moveVehicle(KEY_CODES.DOWN));

    updateSpeedDisplay(); // Initialize the speed display
  });

});

// Load the main.js file dynamically with a timestamp to prevent caching
const mainJs = document.createElement('script');
mainJs.src = 'main.js?t=' + new Date().getTime();
document.body.appendChild(mainJs);
