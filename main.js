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
    speed: 1, // Initial speed of the vehicle
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
    const vehicleMarkerEl = document.createElement('div');
    vehicleMarkerEl.style.width = '18px';
    vehicleMarkerEl.style.height = '40px';
    vehicleMarkerEl.style.backgroundColor = COLORS[currentColorIndex]; // Use the current color
    vehicleMarkerEl.style.borderRadius = '5px';
    vehicleMarkerEl.style.position = 'relative';

    const triangleEl = document.createElement('div');
    triangleEl.style.width = 0;
    triangleEl.style.height = 0;
    triangleEl.style.borderLeft = '10px solid transparent';
    triangleEl.style.borderRight = '10px solid transparent';
    triangleEl.style.borderBottom = '15px solid black';
    triangleEl.style.position = 'absolute';
    triangleEl.style.top = '-5px';
    triangleEl.style.left = 'calc(50% - 10px)';

    // Append triangle to the vehicle marker
    vehicleMarkerEl.appendChild(triangleEl);

    // Return a Mapbox marker with the vehicle element and initial position
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
    if (speedDisplay) {
      speedDisplay.textContent = `Speed: ${vehicle.speed.toFixed(2)}`;
    }
  }

  // Function to move the vehicle based on the key pressed
  function moveVehicle(keyCode) {
    let dx = 0;
    let dy = 0;
    const acceleration = 0.1; // Acceleration factor for speed changes

    switch (keyCode) {
      case KEY_CODES.LEFT:
        // Steer left by decreasing the map bearing
        map.setBearing(map.getBearing() - 5);
        break;
      case KEY_CODES.UP:
        // Move forward by increasing dy
        dy = vehicle.speed;
        break;
      case KEY_CODES.RIGHT:
        // Steer right by increasing the map bearing
        map.setBearing(map.getBearing() + 5);
        break;
      case KEY_CODES.DOWN:
        // Move backward by decreasing dy
        dy = -vehicle.speed;
        break;
      case KEY_CODES.HANDBRAKE:
        // Stop the vehicle by setting speed to 0
        vehicle.speed = 0;
        break;
      default:
        break;
    }

    // Calculate the direction based on map bearing
    const bearingRad = (map.getBearing() * Math.PI) / 180;
    const rotatedDx = dy * Math.sin(bearingRad);
    const rotatedDy = dy * Math.cos(bearingRad);

    // Update vehicle velocity
    vehicle.velocity.x = rotatedDx;
    vehicle.velocity.y = rotatedDy;

    // Update vehicle position based on velocity
    const lng = vehicle.position[0] + vehicle.velocity.x * 0.0001;
    const lat = vehicle.position[1] + vehicle.velocity.y * 0.0001;

    vehicle.position = [lng, lat];
    vehicleMarker.setLngLat(vehicle.position); // Update marker position

    addTrailPoint(); // Add current position to the trail
    updateTrail(); // Update the trail line on the map

    // Rotate the vehicle marker based on velocity direction
    const rotation = Math.atan2(vehicle.velocity.y, vehicle.velocity.x);
    const rotationDeg = (rotation * 180) / Math.PI;
    vehicleMarker.getElement().style.transform = `rotate(${rotationDeg - 90}deg)`;

    map.setCenter([lng, lat]); // Center the map on the new vehicle position

    // Update vehicle speed based on acceleration or deceleration
    if (dy > 0) {
      vehicle.speed += acceleration;
    } else if (dy < 0) {
      vehicle.speed -= acceleration;
    }

    updateSpeedDisplay(); // Update the speed display on the screen
  }

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
