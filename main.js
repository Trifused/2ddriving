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
  
    function moveVehicle(keyCode) {
      const bearing = map.getBearing();
      let dx = 0;
      let dy = 0;
      const acceleration = 0.1;
  
      switch (keyCode) {
        case KEY_CODES.LEFT:
          // Steer left
          map.setBearing(map.getBearing() - 5);
          vehicleMarker.getElement().style.transform = `rotate(${map.getBearing() - 90}deg)`;
          break;
        case KEY_CODES.UP:
          // Accelerate or move forward
          dy = vehicle.speed;
          break;
        case KEY_CODES.RIGHT:
          // Steer right
          map.setBearing(map.getBearing() + 5);
          vehicleMarker.getElement().style.transform = `rotate(${map.getBearing() - 90}deg)`;
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
  
      const bearingRad = (bearing * Math.PI) / 180;
      const rotatedDx = dx * Math.cos(bearingRad) - dy * Math.sin(bearingRad);
      const rotatedDy = dx * Math.sin(bearingRad) + dy * Math.cos(bearingRad);
  
      const lng = vehicle.position[0] + rotatedDx * 0.0001;
      const lat = vehicle.position[1] + rotatedDy * 0.0001;
  
      map.setCenter([lng, lat]);
      vehicle.position = [lng, lat];
      vehicleMarker.setLngLat(vehicle.position);
  
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
      zoom:     15
    });
  
    const vehicleMarker = createVehicleMarker();
  
    map.on("load", () => {
      vehicleMarker.addTo(map);
  
      document.addEventListener("keydown", (event) => {
        if (Object.values(KEY_CODES).includes(event.keyCode)) {
          event.preventDefault();
          moveVehicle(event.keyCode);
        }
      });
  
      document.getElementById("btn-up").addEventListener("click", () => moveVehicle(KEY_CODES.UP));
      document.getElementById("btn-left").addEventListener("click", () => moveVehicle(KEY_CODES.LEFT));
      document.getElementById("btn-right").addEventListener("click", () => moveVehicle(KEY_CODES.RIGHT));
      document.getElementById("btn-down").addEventListener("click", () => moveVehicle(KEY_CODES.DOWN));
    });
  
  });
  
  