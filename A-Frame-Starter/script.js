// Game variables
let player;
let gameActive = false;
let moveCount = 0;
let coinsCollected = 0;
let startTime;
let coins = [];
let lastPosition = {x: 0, z: 0};
let playerLight = null;
let playerSpeed = 0.15; // Default player speed
let garfieldVenoms = []; // Array to hold Garfield Venom entities

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Get player reference
  player = document.getElementById('player');
  playerLight = document.getElementById('player-light');

  // Setup start button
  document.getElementById('start-button').addEventListener('click', startGame);

  // Setup play again button
  document.getElementById('play-again').addEventListener('click', resetGame);

  // Setup movement
  setupControls();

  // Ensure WASD controls work correctly
  setupWASDControls();
});

// Key states tracking
const keyState = {
  w: false,
  a: false,
  s: false,
  d: false,
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false
};

function setupWASDControls() {
  // Set up key state tracking
  document.addEventListener('keydown', function(event) {
    if (event.key.toLowerCase() in keyState) {
      keyState[event.key] = true;
    }
  });
  
  document.addEventListener('keyup', function(event) {
    if (event.key.toLowerCase() in keyState) {
      keyState[event.key] = false;
    }
  });
  
  // Use requestAnimationFrame for smooth movement
  function updatePlayerPosition() {
    if (!gameActive) {
      requestAnimationFrame(updatePlayerPosition);
      return;
    }
    
    const player = document.getElementById('player');
    const speed = playerSpeed || 0.15;
    const pos = player.getAttribute('position');
    const rotation = player.getAttribute('rotation');
    const rotationY = rotation.y * (Math.PI / 180); // Convert to radians
    
    let moveX = 0, moveZ = 0;
    
    // Forward/backward
    if (keyState.w || keyState.W || keyState.ArrowUp) {
      moveZ = -Math.cos(rotationY);
      moveX = -Math.sin(rotationY);
    } else if (keyState.s || keyState.S || keyState.ArrowDown) {
      moveZ = Math.cos(rotationY);
      moveX = Math.sin(rotationY);
    }
    
    // Left/right strafing
    if (keyState.a || keyState.A || keyState.ArrowLeft) {
      moveZ += Math.sin(rotationY);
      moveX += -Math.cos(rotationY);
    } else if (keyState.d || keyState.D || keyState.ArrowRight) {
      moveZ += -Math.sin(rotationY);
      moveX += Math.cos(rotationY);
    }
    
    // Normalize movement vector for consistent speed in all directions
    if (moveX !== 0 || moveZ !== 0) {
      const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
      moveX = moveX / length * speed;
      moveZ = moveZ / length * speed;
      
      // Apply movement
      player.setAttribute('position', {
        x: pos.x + moveX,
        y: pos.y,
        z: pos.z + moveZ
      });
      
      // Update last position for move counting
      const distance = Math.sqrt(
        Math.pow(pos.x - lastPosition.x, 2) + 
        Math.pow(pos.z - lastPosition.z, 2)
      );
      
      if (distance > 0.4) {
        moveCount++;
        lastPosition = {x: pos.x, z: pos.z};
        updateUI();
      }
    }
    
    requestAnimationFrame(updatePlayerPosition);
  }
  
  // Start the animation loop
  requestAnimationFrame(updatePlayerPosition);
}

function startGame() {
  // Hide start screen, show game UI
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('game-ui').style.display = 'block';

  // Reset game state
  moveCount = 0;
  coinsCollected = 0;
  startTime = Date.now();

  // Set initial position
  player.setAttribute('position', '-10 1.6 -10');
  lastPosition = {x: -10, z: -10};

  // Initialize UI first
  document.getElementById('moves').innerText = `Moves: ${moveCount}`;
  document.getElementById('coins').innerText = `Coins: ${coinsCollected}`;
  document.getElementById('timer').innerText = `Time: 0s`;

  // Spawn coins
  spawnCoins(15);

  // Spawn Garfield Venom obstacles
  spawnGarfieldVenoms(5);

  // Set game as active
  gameActive = true;

  // Start checking for coin collection
  checkCoinCollection();

  // Start checking for win condition
  checkWinCondition();

  // Start checking for Garfield Venom collisions
  checkGarfieldVenomCollisions();

  // Start timer update
  updateTimer();
}

function setupControls() {
  setTimeout(() => {
    if (player) {
      lastPosition = {
        x: player.object3D.position.x,
        z: player.object3D.position.z
      };
    }
  }, 100);

  setInterval(() => {
    if (!gameActive || !player) return;

    const position = player.object3D.position;
    const distance = Math.sqrt(
      Math.pow(position.x - lastPosition.x, 2) + 
      Math.pow(position.z - lastPosition.z, 2)
    );

    if (distance > 0.4) {
      moveCount++;
      lastPosition = {x: position.x, z: position.z};
      updateUI();

      // Show help message and teleport option at 100 moves and multiples
      if (moveCount % 100 === 0) {
        showTeleportPrompt();
      }

      // Increase flashlight intensity
      playerLight.setAttribute('light', 'intensity', 0.5 + (distance / 10));
    }
  }, 200);
}

function spawnCoins(count) {
  // Set a moderate number of coins - not too many, not too few
  count = 20;

  const container = document.getElementById('coins-container');
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  coins = [];

  const endGoal = document.getElementById('end-goal');
  const endPos = endGoal.getAttribute('position');

  // Define key waypoints throughout the maze to ensure more even distribution
  const waypoints = [
    {x: -12, z: -12}, // Near start
    {x: -8, z: -5},
    {x: -3, z: -9},
    {x: 1, z: -7},
    {x: -5, z: 1},
    {x: 2, z: 3},
    {x: 5, z: -5},
    {x: 8, z: 3},
    {x: 3, z: 8},
    {x: 9, z: 9}  // Near end
  ];

  // Place some coins at waypoints
  for (let i = 0; i < Math.min(waypoints.length, count/2); i++) {
    // Add slight randomness to waypoint positions
    const x = waypoints[i].x + (Math.random() * 2 - 1);
    const z = waypoints[i].z + (Math.random() * 2 - 1);

    // Create coin at this position
    createCoinAtPosition(x, z, container);
  }

  // Place the rest randomly
  for (let i = waypoints.length; i < count; i++) {
    let x, z;

    // Divide the maze into sections for better distribution
    if (i < count / 5) {
      // Starting area
      x = Math.random() * 12 - 15;
      z = Math.random() * 12 - 15;
    } else if (i < count * 2 / 5) {
      // Left side of maze
      x = Math.random() * 12 - 15;
      z = Math.random() * 24 - 10;
    } else if (i < count * 3 / 5) {
      // Middle of maze
      x = Math.random() * 24 - 10;
      z = Math.random() * 24 - 10;
    } else if (i < count * 4 / 5) {
      // Right side of maze
      x = Math.random() * 12 + 3;
      z = Math.random() * 24 - 10;
    } else {
      // End area
      x = Math.random() * 12 + 3;
      z = Math.random() * 12 + 3;
    }

    createCoinAtPosition(x, z, container);
  }

  // Add click event listener for coin collection
  setupCoinClickListeners();
}

function createCoinAtPosition(x, z, container) {
  const coin = document.createElement('a-entity');
  coin.setAttribute('class', 'coin clickable');
  coin.setAttribute('geometry', 'primitive: sphere; radius: 0.3');
  coin.setAttribute('material', 'color: gold; metalness: 0.8; roughness: 0.2; emissive: #ffcc00');
  coin.setAttribute('position', `${x} 1.2 ${z}`);
  coin.setAttribute('animation', 'property: position; dir: alternate; dur: 1000; easing: easeInOutSine; loop: true; to: ' + x + ' 1.5 ' + z);

  const light = document.createElement('a-light');
  light.setAttribute('type', 'point');
  light.setAttribute('color', 'yellow');
  light.setAttribute('intensity', '0.7');
  light.setAttribute('distance', '3');
  coin.appendChild(light);

  container.appendChild(coin);
  coins.push(coin);
}

function setupCoinClickListeners() {
  // Get all coins
  const clickableCoins = document.querySelectorAll('.clickable');

  // Add click event listeners to each coin
  clickableCoins.forEach((coin, index) => {
    coin.addEventListener('click', function() {
      // Find the index in the coins array
      const coinIndex = coins.findIndex(c => c === coin);
      if (coinIndex !== -1) {
        collectCoin(coin, coinIndex);
      }
    });
  });
}

function checkCoinCollection() {
  if (!gameActive) return;

  // Keep this function for compatibility, but no longer collect coins by proximity
  requestAnimationFrame(checkCoinCollection);
}

function collectCoin(coin, index) {
  // Create a collection effect
  const coinPos = coin.getAttribute('position');
  createCollectionEffect(coinPos);

  // Remove the coin from the scene
  if (coin.parentNode) {
    coin.parentNode.removeChild(coin);
  }
  coins.splice(index, 1);

  // Update the coin count
  coinsCollected++;
  updateUI();

  // Show message
  showMessage("Coin collected! " + coinsCollected + " total coins!");

  // Check if player has collected exactly 8 coins or a multiple of 8
  if (coinsCollected > 0 && coinsCollected % 5 === 0) {
    showPowerUpOptions();
  }
}

function createCollectionEffect(position) {
  // Create particle effect for coin collection
  const scene = document.querySelector('a-scene');

  const particles = document.createElement('a-entity');
  particles.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
  particles.setAttribute('particle-system', 'preset: dust; color: gold; particleCount: 50; maxAge: 1; size: 0.3; blending: additive');
  scene.appendChild(particles);

  // Remove the particle effect after animation completes
  setTimeout(() => {
    if (scene.contains(particles)) {
      scene.removeChild(particles);
    }
  }, 1000);
}

// This function is now renamed to teleportCloserToGoalWithOption and defined in the added functions section
// We'll keep this for compatibility with any other calls
function teleportCloserToGoal() {
  teleportCloserToGoalWithOption();
}

function showTeleportPrompt() {
  // Create the notification popup
  const popup = document.createElement('div');
  popup.classList.add('teleport-popup');
  popup.style.position = 'fixed';
  popup.style.top = '50%';
  popup.style.left = '50%';
  popup.style.transform = 'translate(-50%, -50%)';
  popup.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  popup.style.padding = '20px';
  popup.style.borderRadius = '10px';
  popup.style.color = 'white';
  popup.style.zIndex = '1000';
  popup.style.fontFamily = 'Arial, sans-serif';
  popup.style.textAlign = 'center';

  popup.innerHTML = `
    <p>Seems like you're stuck! Do you want to teleport closer to the end?</p>
    <button id="teleport-yes" style="margin: 5px; padding: 10px 20px; background-color: #4CAF50; border: none; color: white; border-radius: 5px; cursor: pointer;">Yes</button>
    <button id="teleport-no" style="margin: 5px; padding: 10px 20px; background-color: #f44336; border: none; color: white; border-radius: 5px; cursor: pointer;">No</button>
  `;

  // Add the popup to the body
  document.body.appendChild(popup);

  // Handle button clicks
  document.getElementById('teleport-yes').addEventListener('click', () => {
    teleportCloserToGoalWithOption();
    popup.remove();
  });

  document.getElementById('teleport-no').addEventListener('click', () => {
    showMessage("Okay, get lost in this maze forever! Mwahahaha!");
    popup.remove();
  });

  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (document.body.contains(popup)) {
      popup.remove();
    }
  }, 10000);
}

function checkWinCondition() {
  if (!gameActive) return;

  const playerPos = player.getAttribute('position');
  const endGoal = document.getElementById('end-goal');
  const endPos = endGoal.getAttribute('position');

  const distance = Math.sqrt(
    Math.pow(playerPos.x - endPos.x, 2) + 
    Math.pow(playerPos.z - endPos.z, 2)
  );

  if (distance < 3) {
    showVictoryScreen();
  } else {
    requestAnimationFrame(checkWinCondition);
  }
}

function updateTimer() {
  if (!gameActive) return;

  const currentTime = Math.floor((Date.now() - startTime) / 1000);
  document.getElementById('timer').innerText = `Time: ${currentTime}s`;

  if (currentTime >= 60) {
    // Implement 1-minute animation here.  Example:
    createOneMinuteAnimation();
  }

  setTimeout(updateTimer, 1000);
}

function updateUI() {
  document.getElementById('moves').innerText = `Moves: ${moveCount}`;
  document.getElementById('coins').innerText = `Coins: ${coinsCollected}`;
}

function showVictoryScreen() {
  gameActive = false;

  // Create victory animation
  createVictoryEffect();

  // Show victory message first
  showMessage("Victory! You've escaped the maze!", 3000);

  // Wait a moment before showing the full victory screen
  setTimeout(() => {
    // Update final score
    document.getElementById('final-moves').innerText = moveCount;
    document.getElementById('final-coins').innerText = coinsCollected;
    document.getElementById('final-time').innerText = Math.floor((Date.now() - startTime) / 1000);

    // Show victory screen
    document.getElementById('victory-screen').style.display = 'flex';
    document.getElementById('game-ui').style.display = 'none';
  }, 3000);
}

function createVictoryEffect() {
  // Create particles all over the screen for celebration
  const scene = document.querySelector('a-scene');
  const camera = document.querySelector('[camera]');
  const cameraPosition = camera.getAttribute('position');

  // Create colorful particles
  for (let i = 0; i < 5; i++) {
    const colors = ['gold', 'red', 'blue', 'green', 'purple'];

    const particles = document.createElement('a-entity');
    particles.setAttribute('position', `${cameraPosition.x} ${cameraPosition.y} ${cameraPosition.z - 2}`);

    // Different positions around the player for multiple particle bursts
    const offsetX = (Math.random() - 0.5) * 2;
    const offsetY = (Math.random() - 0.5) * 2;
    const offsetZ = (Math.random() - 0.5) * 2;

    particles.setAttribute('position', `${cameraPosition.x + offsetX} ${cameraPosition.y + offsetY} ${cameraPosition.z + offsetZ}`);
    particles.setAttribute('particle-system', `preset: confetti; color: ${colors[i]}; particleCount: 150; maxAge: 3; size: 0.5; blending: additive`);
    scene.appendChild(particles);

    // Remove particles after animation
    setTimeout(() => {
      if (scene.contains(particles)) {
        scene.removeChild(particles);
      }
    }, 3000);
  }

  // Add a flash of light
  const flash = document.createElement('a-entity');
  flash.setAttribute('light', 'type: ambient; color: white; intensity: 5');
  scene.appendChild(flash);

  // Fade out the flash
  setTimeout(() => {
    flash.setAttribute('light', 'intensity: 0.05');
    setTimeout(() => {
      if (scene.contains(flash)) {
        scene.removeChild(flash);
      }
    }, 1000);
  }, 100);
}

function resetGame() {
  // Hide victory screen, show start screen
  document.getElementById('victory-screen').style.display = 'none';
  document.getElementById('start-screen').style.display = 'flex';

  // Reset game state
  gameActive = false;
  moveCount = 0;
  coinsCollected = 0;
  playerSpeed = 0.15; // Reset player speed

  // Remove all coins
  const coinsContainer = document.getElementById('coins-container');
  if (coinsContainer) {
    while (coinsContainer.firstChild) {
      coinsContainer.removeChild(coinsContainer.firstChild);
    }
  }
  coins = [];

  // Remove all Garfield Venoms
  garfieldVenoms.forEach(venom => {
    if (venom.parentNode) {
      venom.parentNode.removeChild(venom);
    }
  });
  garfieldVenoms = [];

  // Reset player position (will be set properly when game starts)
  player.setAttribute('position', '-10 1.6 -10');

  // Reset player light
  if (playerLight) {
    playerLight.setAttribute('light', 'intensity', 2.0);
    playerLight.setAttribute('light', 'distance', 12);
  }
}

// Add updateUI function if it's missing
function updateUI() {
  if (!gameActive) return;
  
  const movesElement = document.getElementById('moves');
  const coinsElement = document.getElementById('coins');
  
  if (movesElement) {
    movesElement.innerText = `Moves: ${moveCount}`;
  }
  
  if (coinsElement) {
    coinsElement.innerText = `Coins: ${coinsCollected}`;
  }
}

function createTeleportEffect(fromPos, toPos) {
  const scene = document.querySelector('a-scene');

  // Create particle effect at start position
  const particles = document.createElement('a-entity');
  particles.setAttribute('position', `${fromPos.x} ${fromPos.y} ${fromPos.z}`);
  particles.setAttribute('particle-system', 'preset: dust; color: gold; particleCount: 100; maxAge: 1; size: 0.5');
  scene.appendChild(particles);

  // Remove after animation completes
  setTimeout(() => {
    scene.removeChild(particles);
  }, 1000);
}

function showMessage(text, duration = 3000) {
  // Remove any existing message
  const existingMsg = document.querySelector('.game-message');
  if (existingMsg) {
    existingMsg.remove();
  }

  // Create new message
  const msg = document.createElement('div');
  msg.classList.add('game-message');
  msg.textContent = text;
  msg.style.fontSize = '24px';
  msg.style.fontWeight = 'bold';
  msg.style.textShadow = '0 0 5px black';
  msg.style.animation = 'fadeInOut 1s ease-in-out';
  document.body.appendChild(msg);

  // Remove after delay
  setTimeout(() => {
    msg.style.animation = 'fadeOut 1s ease-in-out';
    setTimeout(() => {
      if (document.body.contains(msg)) {
        msg.remove();
      }
    }, 1000);
  }, duration);
}

function teleportCloserToGoalWithOption() {
  const endGoal = document.getElementById('end-goal');
  const playerPos = player.object3D.position;
  const endPos = endGoal.getAttribute('position');

  const newX = playerPos.x + (endPos.x - playerPos.x) * 0.2;
  const newZ = playerPos.z + (endPos.z - playerPos.z) * 0.2;

  player.setAttribute('position', {x: newX, y: 1.6, z: newZ});
  lastPosition = {x: newX, z: newZ};

  createTeleportEffect(playerPos, {x: newX, y: 1.6, z: newZ});
}


function showPowerUpOptions() {
  // Create the powerup popup
  const popup = document.createElement('div');
  popup.classList.add('powerup-popup');
  popup.style.position = 'fixed';
  popup.style.top = '50%';
  popup.style.left = '50%';
  popup.style.transform = 'translate(-50%, -50%)';
  popup.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  popup.style.padding = '20px';
  popup.style.borderRadius = '10px';
  popup.style.color = 'white';
  popup.style.zIndex = '1000';
  popup.style.fontFamily = 'Arial, sans-serif';
  popup.style.textAlign = 'center';
  popup.style.border = '2px solid gold';
  popup.style.boxShadow = '0 0 20px gold';

  const coinCount = Math.floor(coinsCollected / 5) * 5;

  popup.innerHTML = `
    <h2 style="color: gold; margin-top: 0;">Power-Up Available!</h2>
    <p>You've collected ${coinCount} coins! Choose a power-up:</p>
    <button id="power-speed" style="margin: 5px; padding: 10px 20px; background-color: #2196F3; border: none; color: white; border-radius: 5px; cursor: pointer; font-weight: bold;">Speed Boost</button>
    <button id="power-teleport" style="margin: 5px; padding: 10px 20px; background-color: #9C27B0; border: none; color: white; border-radius: 5px; cursor: pointer; font-weight: bold;">Teleport Closer</button>
    <button id="power-light" style="margin: 5px; padding: 10px 20px; background-color: #FF9800; border: none; color: white; border-radius: 5px; cursor: pointer; font-weight: bold;">Brighter Light</button>
  `;

  // Add the popup to the body
  document.body.appendChild(popup);

  // Handle button clicks
  document.getElementById('power-speed').addEventListener('click', () => {
    const controls = player.getAttribute('movement-controls');
    const newSpeed = parseFloat(controls.speed) * 1.5;
    player.setAttribute('movement-controls', 'speed', newSpeed);
    showMessage("Speed increased by 50%!");
    popup.remove();
    coinsCollected -= 5;
    updateUI();
  });

  document.getElementById('power-teleport').addEventListener('click', () => {
    teleportCloserToGoalWithOption();
    showMessage("Teleported closer to the goal!");
    popup.remove();
    coinsCollected -= 5;
    updateUI();
  });

  document.getElementById('power-light').addEventListener('click', () => {
    const currentLight = playerLight.getAttribute('light');
    playerLight.setAttribute('light', 'intensity', currentLight.intensity * 1.5);
    playerLight.setAttribute('light', 'distance', currentLight.distance * 1.5);
    showMessage("Flashlight brightness increased!");
    popup.remove();
    coinsCollected -= 5;
    updateUI();
  });
}

function createOneMinuteAnimation() {
  // Add your 1-minute animation code here.  This is a placeholder.
  console.log("One minute has passed!  Implement your animation here.");
  //Example:  Create a temporary element that fades in and out.
  const minuteAnimation = document.createElement('div');
  minuteAnimation.style.position = 'fixed';
  minuteAnimation.style.top = '50%';
  minuteAnimation.style.left = '50%';
  minuteAnimation.style.transform = 'translate(-50%, -50%)';
  minuteAnimation.style.backgroundColor = 'rgba(255,255,0,0.7)'; //Yellow
  minuteAnimation.style.padding = '20px';
  minuteAnimation.style.borderRadius = '10px';
  minuteAnimation.style.color = 'black';
  minuteAnimation.style.zIndex = '1000';
  minuteAnimation.textContent = "ONE MINUTE!";
  document.body.appendChild(minuteAnimation);
  setTimeout(() => {
    minuteAnimation.style.opacity = 0;
    setTimeout(() => {
      document.body.removeChild(minuteAnimation)
    }, 1000);
  }, 2000); // Show for 2 seconds
}

function spawnGarfieldVenoms(count) {
  // Clear existing Garfield Venoms
  garfieldVenoms.forEach(venom => {
    if (venom.parentNode) {
      venom.parentNode.removeChild(venom);
    }
  });
  garfieldVenoms = [];

  const scene = document.querySelector('a-scene');

  // Define waypoints throughout the maze for Garfield Venom placement
  const waypoints = [
    {x: -5, z: -5},   // Middle of starting area
    {x: 0, z: 0},     // Center of maze
    {x: 5, z: -8},    // Left side
    {x: -8, z: 5},    // Right side
    {x: 5, z: 5}      // Towards end
  ];

  // Create Garfield Venoms at waypoints
  for (let i = 0; i < count; i++) {
    const waypointIndex = Math.min(i, waypoints.length - 1);

    // Add some randomness to position
    const x = waypoints[waypointIndex].x + (Math.random() * 2 - 1);
    const z = waypoints[waypointIndex].z + (Math.random() * 2 - 1);

    const garfieldVenom = document.createElement('a-entity');
    garfieldVenom.setAttribute('gltf-model', 'garfieldvenom.glb');
    garfieldVenom.setAttribute('position', `${x} 0 ${z}`);
    garfieldVenom.setAttribute('scale', '0.5 0.5 0.5');
    garfieldVenom.setAttribute('rotation', '0 ' + Math.random() * 360 + ' 0');
    garfieldVenom.setAttribute('animation', 'property: rotation; to: 0 ' + (Math.random() * 360 + 360) + ' 0; loop: true; dur: 10000; easing: linear');

    // Add an ambient light to make Garfield more visible
    const light = document.createElement('a-light');
    light.setAttribute('type', 'point');
    light.setAttribute('color', '#ff3300');
    light.setAttribute('intensity', '0.5');
    light.setAttribute('distance', '3');
    garfieldVenom.appendChild(light);

    scene.appendChild(garfieldVenom);
    garfieldVenoms.push(garfieldVenom);
  }
}

function checkGarfieldVenomCollisions() {
  if (!gameActive) return;

  const playerPos = player.getAttribute('position');

  // Check each Garfield Venom for collision
  garfieldVenoms.forEach(venom => {
    const venomPos = venom.getAttribute('position');

    // Calculate distance between player and Garfield Venom
    const distance = Math.sqrt(
      Math.pow(playerPos.x - venomPos.x, 2) + 
      Math.pow(playerPos.z - venomPos.z, 2)
    );

    // If player is close enough to Garfield Venom, trigger the collision effect
    if (distance < 1.5) {
      garfieldVenomCollision(venom);
    }
  });

  requestAnimationFrame(checkGarfieldVenomCollisions);
}

function garfieldVenomCollision(venom) {
  const venomPos = venom.getAttribute('position');

  // Create collision effect
  createGarfieldCollisionEffect(venomPos);

  // Penalize the player
  if (coinsCollected > 0) {
    // Lose half of coins (rounded down)
    const lostCoins = Math.floor(coinsCollected / 2);
    coinsCollected -= lostCoins;
    updateUI();

    showMessage(`Oh no! Garfield Venom took ${lostCoins} coins!`, 3000);
  } else {
    showMessage("Garfield Venom laughs at your empty pockets!", 3000);
  }

  // Teleport player to a random location farther from the goal
  teleportFartherFromGoal();

  // Respawn the Garfield Venom to a new location
  const x = Math.random() * 24 - 12;
  const z = Math.random() * 24 - 12;
  venom.setAttribute('position', `${x} 0 ${z}`);
}

function createGarfieldCollisionEffect(position) {
  const scene = document.querySelector('a-scene');

  // Create red flash
  const flash = document.createElement('a-entity');
  flash.setAttribute('light', 'type: point; color: red; intensity: 2; distance: 15');
  flash.setAttribute('position', position);
  flash.setAttribute('animation', 'property: light.intensity; from: 2; to: 0; dur: 1000; easing: easeInQuad');
  scene.appendChild(flash);

  // Create explosion particles
  const particles = document.createElement('a-entity');
  particles.setAttribute('position', position);
  particles.setAttribute('particle-system', 'preset: dust; color: red; particleCount: 100; maxAge: 1; size: 0.5; blending: additive');
  scene.appendChild(particles);

  // Create warning text
  const warningText = document.createElement('a-entity');
  warningText.setAttribute('position', `${position.x} ${position.y + 2} ${position.z}`);
  warningText.setAttribute('text', 'value: GARFIELD ATTACK!; color: red; align: center; width: 10; font: mozillavr');
  warningText.setAttribute('animation', 'property: scale; from: 0.1 0.1 0.1; to: 2 2 2; dur: 1000; easing: easeOutBounce');
  warningText.setAttribute('look-at', '#player');
  scene.appendChild(warningText);

  // Remove effects after animation completes
  setTimeout(() => {
    if (scene.contains(flash)) scene.removeChild(flash);
    if (scene.contains(particles)) scene.removeChild(particles);
    if (scene.contains(warningText)) scene.removeChild(warningText);
  }, 2000);
}

function teleportFartherFromGoal() {
  const endGoal = document.getElementById('end-goal');
  const playerPos = player.object3D.position;
  const endPos = endGoal.getAttribute('position');

  // Calculate vector from end goal to player
  const dirX = playerPos.x - endPos.x;
  const dirZ = playerPos.z - endPos.z;

  // Normalize vector
  const length = Math.sqrt(dirX * dirX + dirZ * dirZ);
  const normX = dirX / length;
  const normZ = dirZ / length;

  // Move player farther from goal, at least 5 units away from current position
  const distance = 5 + Math.random() * 10;
  const newX = playerPos.x + normX * distance;
  const newZ = playerPos.z + normZ * distance;

  // Keep within maze bounds
  const boundedX = Math.max(-14, Math.min(14, newX));
  const boundedZ = Math.max(-14, Math.min(14, newZ));

  // Teleport player
  player.setAttribute('position', {x: boundedX, y: 1.6, z: boundedZ});
  lastPosition = {x: boundedX, z: boundedZ};

  // Create teleport effect
  createTeleportEffect(playerPos, {x: boundedX, y: 1.6, z: boundedZ});
}