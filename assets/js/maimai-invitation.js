const machine = document.getElementById("machine");
const scene = document.getElementById("scene");
const app = document.querySelector(".invitation-app");
const toggleOpenButton = document.getElementById("toggle-open");
const resetViewButton = document.getElementById("reset-view");
const canvas = document.getElementById("spark-canvas");
const ctx = canvas.getContext("2d");

const state = {
  yaw: 0,
  pitch: 0,
  open: 0,
  closedWidth: 0,
  mode: null,
  pointerId: null,
  startX: 0,
  startY: 0,
  startYaw: 0,
  startPitch: 0,
  startOpen: 0,
  reduceMotion: globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches
};

const sparks = Array.from({ length: state.reduceMotion ? 0 : 42 }, () => createSpark());

applyMachineState();
updateLayout();
resizeCanvas();
drawSparks();

globalThis.addEventListener("resize", () => {
  updateLayout();
  resizeCanvas();
});

app.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".hud")) {
    return;
  }

  const door = event.target.closest(".pull-panel");
  const sceneRect = scene.getBoundingClientRect();
  const xRatio = (event.clientX - sceneRect.left) / Math.max(1, sceneRect.width);
  const startsInScene =
    event.clientX >= sceneRect.left &&
    event.clientX <= sceneRect.right &&
    event.clientY >= sceneRect.top &&
    event.clientY <= sceneRect.bottom;
  const startsOnPullZone = startsInScene && (xRatio < 0.48 || xRatio > 0.52);
  const canOpenFromHere = startsOnPullZone && !isBackFacing();
  state.pointerId = event.pointerId;
  state.startX = event.clientX;
  state.startY = event.clientY;
  state.startYaw = state.yaw;
  state.startPitch = state.pitch;
  state.startOpen = state.open;
  state.mode = door && !isBackFacing() ? "door" : canOpenFromHere ? "door" : "rotate";
  machine.classList.add("is-dragging");
  scene.classList.toggle("is-rotating", state.mode === "rotate");
  event.currentTarget.setPointerCapture(event.pointerId);
});

app.addEventListener("pointermove", (event) => {
  if (event.pointerId !== state.pointerId || !state.mode) {
    return;
  }

  const dx = event.clientX - state.startX;
  const dy = event.clientY - state.startY;

  if (state.mode === "door") {
    const direction = state.startX < scene.getBoundingClientRect().left + scene.clientWidth / 2 ? -1 : 1;
    const pull = direction * dx;
    state.open = clamp(state.startOpen + pull / Math.max(220, state.closedWidth * 0.32), 0, 1);
  } else {
    state.yaw = normalizeDegrees(state.startYaw + dx * 0.38);
    state.pitch = clamp(state.startPitch - dy * 0.22, -24, 24);
  }

  applyMachineState();
});

app.addEventListener("pointerup", endPointer);
app.addEventListener("pointercancel", endPointer);

toggleOpenButton.addEventListener("click", () => {
  if (isBackFacing()) {
    return;
  }
  state.open = state.open > 0.5 ? 0 : 1;
  applyMachineState();
});

resetViewButton.addEventListener("click", () => {
  state.yaw = 0;
  state.pitch = 0;
  state.open = 0;
  applyMachineState();
});

function endPointer(event) {
  if (event.pointerId !== state.pointerId) {
    return;
  }

  if (state.mode === "door") {
    state.open = state.open > 0.38 ? 1 : 0;
    applyMachineState();
  }

  state.pointerId = null;
  state.mode = null;
  machine.classList.remove("is-dragging");
  scene.classList.remove("is-rotating");
}

function applyMachineState() {
  machine.style.setProperty("--yaw", `${state.yaw}deg`);
  machine.style.setProperty("--pitch", `${state.pitch}deg`);
  machine.style.setProperty("--open", `${state.open}`);
  machine.style.setProperty("--left-slide", `${(1 - state.open) * 100}%`);
  machine.style.setProperty("--right-slide", `${(1 - state.open) * -100}%`);
  machine.style.setProperty("--panel-flip", `${180 * state.open}deg`);
  machine.classList.toggle("is-back-facing", isBackFacing());
  toggleOpenButton.textContent = state.open > 0.5 ? "Close" : "Open";
  updateLayout();
}

function isBackFacing() {
  return Math.abs(normalizeDegrees(state.yaw)) > 90;
}

function updateLayout() {
  const viewportWidth = globalThis.innerWidth;
  const viewportHeight = globalThis.innerHeight;
  const isDesktop = viewportWidth >= 760;
  const maxOpenWidth = isDesktop ? viewportWidth * 0.9 : viewportWidth * 0.96;
  const maxClosedByHeight = viewportHeight * (viewportWidth >= 760 ? 0.72 : 0.32) * (1000 / 1415);
  const maxClosedByWidth = maxOpenWidth / 2;
  const preferredClosed = isDesktop ? 700 : viewportWidth * 0.48;
  const minClosed = isDesktop ? 280 : 168;
  state.closedWidth = Math.max(minClosed, Math.min(preferredClosed, maxClosedByWidth, maxClosedByHeight || preferredClosed));

  const sceneWidth = state.closedWidth * (1 + state.open);
  const sceneHeight = state.closedWidth * (1415 / 1000);
  const machineWidth = state.closedWidth * 2;
  const machineShift = -state.closedWidth * 0.5 * (1 - state.open);

  scene.style.width = `${sceneWidth}px`;
  scene.style.height = `${sceneHeight}px`;
  machine.style.width = `${machineWidth}px`;
  machine.style.setProperty("--shift", `${machineShift}px`);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeDegrees(value) {
  let normalized = value % 360;
  if (normalized > 180) {
    normalized -= 360;
  }
  if (normalized < -180) {
    normalized += 360;
  }
  return normalized;
}

function resizeCanvas() {
  const ratio = globalThis.devicePixelRatio || 1;
  canvas.width = Math.floor(globalThis.innerWidth * ratio);
  canvas.height = Math.floor(globalThis.innerHeight * ratio);
  canvas.style.width = `${globalThis.innerWidth}px`;
  canvas.style.height = `${globalThis.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function createSpark() {
  return {
    x: Math.random(),
    y: Math.random(),
    size: 2 + Math.random() * 5,
    speed: 0.001 + Math.random() * 0.002,
    drift: -0.25 + Math.random() * 0.5,
    hue: Math.random() > 0.5 ? "#ff8a21" : "#68d9ff",
    phase: Math.random() * Math.PI * 2
  };
}

function drawSparks(time = 0) {
  ctx.clearRect(0, 0, globalThis.innerWidth, globalThis.innerHeight);

  for (const spark of sparks) {
    spark.y -= spark.speed;
    spark.x += spark.drift * 0.0008;
    if (spark.y < -0.04) {
      spark.y = 1.04;
      spark.x = Math.random();
    }

    const pulse = 0.55 + Math.sin(time * 0.004 + spark.phase) * 0.35;
    const x = spark.x * globalThis.innerWidth;
    const y = spark.y * globalThis.innerHeight;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time * 0.001 + spark.phase);
    ctx.globalAlpha = 0.25 + pulse * 0.45;
    ctx.fillStyle = spark.hue;
    ctx.fillRect(-spark.size / 2, -spark.size / 2, spark.size, spark.size);
    ctx.restore();
  }

  if (!state.reduceMotion) {
    globalThis.requestAnimationFrame(drawSparks);
  }
}
