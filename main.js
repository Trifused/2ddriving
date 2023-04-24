document.addEventListener("DOMContentLoaded", () => {
  // Your existing main.js code goes here

  const KEY_CODES = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    HANDBRAKE: 32,
  };

  let vehicle = {
    x: 0,
    y: 0,
    speed: 1,
    position: [-115.1398, 36.1699],
    velocity: { x: 0, y: 0 },
    trailCoordinates: [],
  };

  function createVehicleMarker() {
    const vehicleMarkerEl = document.createElement('div');
    vehicleMarkerEl.style.width = '50px';
    vehicleMarkerEl.style.height = '30px';
    vehicleMarkerEl.style.backgroundColor = 'red';
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

    vehicleMarkerEl.appendChild(triangleEl);

    return new mapboxgl.Marker(vehicleMarkerEl)
      .setLngLat(vehicle.position);
  }

  function addTrailPoint() {
    vehicle.trailCoordinates.push(vehicle.position);
  }

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

  function clearTrail() {
    vehicle.trailCoordinates = [];
    updateTrail();
  }

  function moveVehicle(keyCode) {
    let dx = 0;
    let dy = 0;
    const acceleration = 0.1;

    switch (keyCode) {
      case KEY_CODES.LEFT:
        // Steer left
        map.setBearing(map.getBearing() - 5);
        break;
      case KEY_CODES.UP:
        // Accelerate or move forward
        dy = vehicle.speed;
        break;
      case KEY_CODES.RIGHT:
        // Steer right
        map.setBearing(map.getBearing() + 5);
        break;
      case KEY_CODES.DOWN:
        // Brake or reverse
        dy = -vehicle.speed;
        break;
      case KEY_CODES.HANDBRAKE:
        // Handbrake or emergency brake
        vehicle.speed = 0;
        break;
      default:
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

    const rotation = Math.atan2(vehicle.velocity.y, vehicle.velocity.x);
    
    
        const rotationDeg = (rotation * 180) / Math.PI;
    vehicleMarker.getElement().style.transform = `rotate(${rotationDeg - 90}deg)`;

    map.setCenter([lng, lat]);

    if (dy > 0) {
      vehicle.speed += acceleration;
    } else if (dy < 0) {
      vehicle.speed -= acceleration;
    }
  }

  mapboxgl.accessToken = mapboxAccessToken;

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: vehicle.position,
    zoom: 15,
  });

  const vehicleMarker = createVehicleMarker();

  map.on("load", () => {
    vehicleMarker.addTo(map);

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

    map.addLayer({
      id: 'trail',
      type: 'line',
      source: 'trail',
      paint: {
        'line-color': 'blue',
        'line-width': 3,
      },
    });

    document.addEventListener("keydown", (event) => {
      if (Object.values(KEY_CODES).includes(event.keyCode)) {
        event.preventDefault();
        moveVehicle(event.keyCode);
      } else if (event.key === 'c' || event.key === 'C') {
        event.preventDefault();
        clearTrail();
      }
    });

    document.getElementById("btn-up").addEventListener("click", () => moveVehicle(KEY_CODES.UP));
    document.getElementById("btn-left").addEventListener("click", () => moveVehicle(KEY_CODES.LEFT));
    document.getElementById("btn-right").addEventListener("click", () => moveVehicle(KEY_CODES.RIGHT));
    document.getElementById("btn-down").addEventListener("click", () => moveVehicle(KEY_CODES.DOWN));
  });

});

    
