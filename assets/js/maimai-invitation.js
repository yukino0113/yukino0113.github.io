const machine = document.getElementById("machine");
const scene = document.getElementById("scene");
const sceneShell = document.querySelector(".scene-shell");
const app = document.querySelector(".invitation-app");
const hud = document.querySelector(".hud");
const toggleHudButton = document.getElementById("toggle-hud");
const toggleOpenButton = document.getElementById("toggle-open");
const resetViewButton = document.getElementById("reset-view");
const orientationHint = document.getElementById("orientation-hint");
const closedFrontCover = document.querySelector(".closed-front-cover");
const canvas = document.getElementById("spark-canvas");
const ctx = canvas.getContext("2d");
const foldedAspectRatio = 850.499992 / 594.95996;

const state = {
  yaw: 0,
  pitch: 0,
  open: 0,
  committedOpen: 0,
  closedWidth: 0,
  viewScale: 1,
  viewX: 0,
  viewY: 0,
  mode: null,
  pointerId: null,
  activePointers: new Map(),
  startX: 0,
  startY: 0,
  startYaw: 0,
  startPitch: 0,
  startOpen: 0,
  gestureStartDistance: 0,
  gestureStartCenterX: 0,
  gestureStartCenterY: 0,
  gestureStartScale: 1,
  gestureStartViewX: 0,
  gestureStartViewY: 0,
  hudCollapsed: shouldPreferCollapsedHud(),
  hudTouched: false,
  reduceMotion: globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches
};

const sparks = Array.from({ length: state.reduceMotion ? 0 : 42 }, () => createSpark());

setHudCollapsed(state.hudCollapsed);
applyMachineState();
applyViewState();
updateLayout();
updateOrientationHint();
resizeCanvas();
drawSparks();
emitInvitationEvent("invitation:page-loaded", {
  open: state.open,
  yaw: state.yaw,
  pitch: state.pitch
});

globalThis.addEventListener("resize", () => {
  if (!state.hudTouched) {
    setHudCollapsed(shouldPreferCollapsedHud());
  }
  updateLayout();
  clampViewToScreen();
  applyViewState();
  updateOrientationHint();
  resizeCanvas();
});

toggleHudButton.addEventListener("click", () => {
  state.hudTouched = true;
  setHudCollapsed(!state.hudCollapsed);
});

app.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".hud")) {
    return;
  }

  stopBrowserGesture(event);
  state.activePointers.set(event.pointerId, pointerPoint(event));
  event.currentTarget.setPointerCapture(event.pointerId);

  if (state.activePointers.size >= 2) {
    beginGesture();
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
});

app.addEventListener("pointermove", (event) => {
  if (!state.activePointers.has(event.pointerId) && event.pointerId !== state.pointerId) {
    return;
  }

  stopBrowserGesture(event);

  if (state.activePointers.has(event.pointerId)) {
    state.activePointers.set(event.pointerId, pointerPoint(event));
  }

  if (state.mode === "gesture") {
    updateGesture();
    return;
  }

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
  commitOpenState(state.open > 0.5 ? 0 : 1);
});

resetViewButton.addEventListener("click", () => {
  state.yaw = 0;
  state.pitch = 0;
  state.open = 0;
  state.committedOpen = 0;
  state.viewScale = 1;
  state.viewX = 0;
  state.viewY = 0;
  applyMachineState();
  applyViewState();
});

function setHudCollapsed(collapsed) {
  state.hudCollapsed = collapsed;
  hud.classList.toggle("is-collapsed", collapsed);
  toggleHudButton.setAttribute("aria-expanded", `${!collapsed}`);
  toggleHudButton.textContent = collapsed ? "功能" : "收合";
  toggleHudButton.setAttribute("aria-label", collapsed ? "展開功能表" : "收合功能表");
}

function stopBrowserGesture(event) {
  if (event.cancelable) {
    event.preventDefault();
  }
}

function endPointer(event) {
  state.activePointers.delete(event.pointerId);

  if (state.mode === "gesture") {
    sceneShell.classList.remove("is-gesturing");
    if (state.activePointers.size >= 2) {
      beginGesture();
      return;
    }
    state.pointerId = null;
    state.mode = null;
    machine.classList.remove("is-dragging");
    scene.classList.remove("is-rotating");
    return;
  }

  if (event.pointerId !== state.pointerId) {
    return;
  }

  if (state.mode === "door") {
    commitOpenState(state.open > 0.38 ? 1 : 0);
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
  machine.style.setProperty("--seam-overlap", "0px");
  closedFrontCover.style.opacity = `${1 - state.open}`;
  closedFrontCover.style.visibility = state.open > 0.02 ? "hidden" : "visible";
  machine.classList.toggle("is-back-facing", isBackFacing());
  toggleOpenButton.textContent = state.open > 0.5 ? "關閉" : "打開";
  machine.classList.toggle("is-open", state.open > 0.02);
  updateLayout();
  emitInvitationEvent("invitation:state-changed", {
    open: state.open,
    yaw: state.yaw,
    pitch: state.pitch,
    isBackFacing: isBackFacing(),
    isEdgeOn: isEdgeOn()
  });
}

function applyViewState() {
  sceneShell.style.setProperty("--view-scale", `${state.viewScale}`);
  sceneShell.style.setProperty("--view-x", `${state.viewX}px`);
  sceneShell.style.setProperty("--view-y", `${state.viewY}px`);
}

function beginGesture() {
  const points = getGesturePoints();
  if (!points) {
    return;
  }

  state.mode = "gesture";
  state.pointerId = null;
  state.gestureStartDistance = distance(points[0], points[1]);
  const center = midpoint(points[0], points[1]);
  state.gestureStartCenterX = center.x;
  state.gestureStartCenterY = center.y;
  state.gestureStartScale = state.viewScale;
  state.gestureStartViewX = state.viewX;
  state.gestureStartViewY = state.viewY;
  machine.classList.add("is-dragging");
  scene.classList.remove("is-rotating");
  sceneShell.classList.add("is-gesturing");
}

function updateGesture() {
  const points = getGesturePoints();
  if (!points || !state.gestureStartDistance) {
    return;
  }

  const currentDistance = distance(points[0], points[1]);
  const currentCenter = midpoint(points[0], points[1]);
  state.viewScale = clamp(state.gestureStartScale * (currentDistance / state.gestureStartDistance), 0.72, 2.6);
  state.viewX = state.gestureStartViewX + currentCenter.x - state.gestureStartCenterX;
  state.viewY = state.gestureStartViewY + currentCenter.y - state.gestureStartCenterY;
  clampViewToScreen();
  applyViewState();
}

function isBackFacing() {
  return Math.abs(normalizeDegrees(state.yaw)) > 90;
}

function isEdgeOn() {
  const absoluteYaw = Math.abs(normalizeDegrees(state.yaw));
  return Math.abs(absoluteYaw - 90) <= 10;
}

function emitInvitationEvent(name, detail = {}) {
  globalThis.dispatchEvent(new CustomEvent(name, { detail }));
}

function commitOpenState(nextOpen) {
  const previousOpen = state.committedOpen;
  state.open = nextOpen;
  applyMachineState();

  if (previousOpen === nextOpen) {
    return;
  }

  state.committedOpen = nextOpen;
  emitInvitationEvent(nextOpen === 1 ? "invitation:opened" : "invitation:closed", {
    previousOpen,
    open: nextOpen
  });
}

function updateLayout() {
  const viewportWidth = globalThis.innerWidth;
  const viewportHeight = globalThis.innerHeight;
  const isDesktop = viewportWidth >= 760;
  const maxOpenWidth = isDesktop ? viewportWidth * 0.9 : viewportWidth * 0.96;
  const maxClosedByHeight = viewportHeight * (viewportWidth >= 760 ? 0.72 : 0.32) / foldedAspectRatio;
  const maxClosedByWidth = maxOpenWidth / 2;
  const preferredClosed = isDesktop ? 700 : viewportWidth * 0.48;
  const minClosed = isDesktop ? 280 : 168;
  state.closedWidth = Math.max(minClosed, Math.min(preferredClosed, maxClosedByWidth, maxClosedByHeight || preferredClosed));

  const sceneWidth = state.closedWidth * (1 + state.open);
  const sceneHeight = state.closedWidth * foldedAspectRatio;
  const machineWidth = state.closedWidth * 2;
  const machineShift = -state.closedWidth * 0.5 * (1 - state.open);

  scene.style.width = `${sceneWidth}px`;
  scene.style.height = `${sceneHeight}px`;
  machine.style.width = `${machineWidth}px`;
  machine.style.setProperty("--shift", `${machineShift}px`);
}

function updateOrientationHint() {
  const shouldShow = globalThis.innerWidth < globalThis.innerHeight;
  orientationHint.hidden = !shouldShow;
}

function shouldPreferCollapsedHud() {
  return globalThis.innerWidth <= 760 || globalThis.innerHeight <= 520;
}

function clampViewToScreen() {
  const maxX = globalThis.innerWidth * 0.9 * state.viewScale;
  const maxY = globalThis.innerHeight * 0.7 * state.viewScale;
  state.viewX = clamp(state.viewX, -maxX, maxX);
  state.viewY = clamp(state.viewY, -maxY, maxY);
}

function getGesturePoints() {
  const points = Array.from(state.activePointers.values());
  if (points.length < 2) {
    return null;
  }
  return [points[0], points[1]];
}

function pointerPoint(event) {
  return {
    x: event.clientX,
    y: event.clientY
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  };
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
