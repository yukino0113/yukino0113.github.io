const ACHIEVEMENT_STORAGE_KEY = "open-invitation-achievements-v1";
const CYCLE_WINDOW_MS = 5000;

const ACHIEVEMENTS = Object.freeze({
  "page-loaded": {
    title: "初次見面",
    description: "成功載入公開喜帖。"
  },
  "invitation-opened": {
    title: "展開邀請",
    description: "把喜帖完整拉開。"
  },
  "back-facing": {
    title: "背面也很精彩",
    description: "把喜帖轉到背面。"
  },
  "edge-on": {
    title: "薄如紙片",
    description: "把喜帖轉到幾乎看不見的角度。"
  },
  "open-close-10-in-5s": {
    title: "手速驚人",
    description: "在 5 秒內完成 10 次完整開關。"
  },
  "page-and-back": {
    title: "探索喜帖",
    description: "完成載入頁面與轉到背面兩項成就。"
  },
  "eevee-any": {
    title: "伊布發現者",
    description: "點擊任意一隻外頁伊布。"
  },
  "eevee-10-in-5s": {
    title: "伊布連打",
    description: "在 5 秒內點擊外頁伊布 10 次。"
  }
});

class AchievementToastQueue {
  constructor(region) {
    this.region = region;
    this.queue = [];
    this.isShowing = false;
  }

  enqueue(achievement) {
    this.queue.push(achievement);
    this.showNext();
  }

  showNext() {
    if (this.isShowing || this.queue.length === 0) {
      return;
    }

    this.isShowing = true;
    const achievement = this.queue.shift();
    const toast = this.createToast(achievement);
    this.region.append(toast);

    requestAnimationFrame(() => {
      toast.classList.add("is-visible");
    });

    globalThis.setTimeout(() => {
      toast.classList.remove("is-visible");
      toast.classList.add("is-leaving");

      globalThis.setTimeout(() => {
        toast.remove();
        this.isShowing = false;
        this.showNext();
      }, 260);
    }, 4200);
  }

  createToast(achievement) {
    const toast = document.createElement("article");
    toast.className = "achievement-toast";
    toast.setAttribute("role", "status");

    const icon = document.createElement("span");
    icon.className = "achievement-toast-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "✦";

    const copy = document.createElement("span");
    copy.className = "achievement-toast-copy";

    const kicker = document.createElement("span");
    kicker.className = "achievement-toast-kicker";
    kicker.textContent = "成就已解鎖";

    const title = document.createElement("strong");
    title.className = "achievement-toast-title";
    title.textContent = achievement.title;

    const description = document.createElement("span");
    description.className = "achievement-toast-description";
    description.textContent = achievement.description;

    copy.append(kicker, title, description);
    toast.append(icon, copy);
    return toast;
  }
}

class AchievementEngine {
  constructor({ definitions, toastQueue }) {
    this.definitions = definitions;
    this.toastQueue = toastQueue;
    this.unlocked = this.loadUnlocked();
    this.hasOpenedSinceLastClose = false;
    this.cycleTimestamps = [];
    this.eeveeClickTimestamps = [];
    this.wasBackFacing = false;
    this.wasEdgeOn = false;
  }

  handlePageLoaded() {
    this.unlock("page-loaded");
  }

  handleOpened() {
    this.hasOpenedSinceLastClose = true;
    this.unlock("invitation-opened");
  }

  handleClosed() {
    if (!this.hasOpenedSinceLastClose) {
      return;
    }

    this.hasOpenedSinceLastClose = false;
    const now = Date.now();
    this.cycleTimestamps = this.cycleTimestamps.filter(
      (timestamp) => now - timestamp <= CYCLE_WINDOW_MS
    );
    this.cycleTimestamps.push(now);

    if (this.cycleTimestamps.length >= 10) {
      this.unlock("open-close-10-in-5s");
    }
  }

  handleStateChanged(detail) {
    const isBackFacing = Boolean(detail.isBackFacing);
    const isEdgeOn = Boolean(detail.isEdgeOn);

    if (isBackFacing && !this.wasBackFacing) {
      this.unlock("back-facing");
    }

    if (isEdgeOn && !this.wasEdgeOn) {
      this.unlock("edge-on");
    }

    this.wasBackFacing = isBackFacing;
    this.wasEdgeOn = isEdgeOn;
  }

  handleHotspotClicked(detail) {
    if (detail.kind !== "eevee") {
      return;
    }

    this.unlock("eevee-any");

    const now = Date.now();
    this.eeveeClickTimestamps = this.eeveeClickTimestamps.filter(
      (timestamp) => now - timestamp <= CYCLE_WINDOW_MS
    );
    this.eeveeClickTimestamps.push(now);

    if (this.eeveeClickTimestamps.length >= 10) {
      this.unlock("eevee-10-in-5s");
    }
  }

  unlock(id) {
    if (this.unlocked.has(id) || !this.definitions[id]) {
      return;
    }

    this.unlocked.add(id);
    this.saveUnlocked();
    this.toastQueue.enqueue(this.definitions[id]);

    if (
      id !== "page-and-back" &&
      this.unlocked.has("page-loaded") &&
      this.unlocked.has("back-facing")
    ) {
      this.unlock("page-and-back");
    }
  }

  loadUnlocked() {
    try {
      const saved = JSON.parse(localStorage.getItem(ACHIEVEMENT_STORAGE_KEY) || "[]");
      return new Set(Array.isArray(saved) ? saved : []);
    } catch {
      return new Set();
    }
  }

  saveUnlocked() {
    try {
      localStorage.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify([...this.unlocked]));
    } catch {
      // Achievements still work for the current visit when storage is unavailable.
    }
  }
}

const achievementRegion = document.getElementById("achievement-toast-region");
const achievementToastQueue = new AchievementToastQueue(achievementRegion);
const achievementEngine = new AchievementEngine({
  definitions: ACHIEVEMENTS,
  toastQueue: achievementToastQueue
});

globalThis.openInvitationAchievements = achievementEngine;

globalThis.addEventListener("invitation:page-loaded", () => {
  achievementEngine.handlePageLoaded();
});

globalThis.addEventListener("invitation:opened", () => {
  achievementEngine.handleOpened();
});

globalThis.addEventListener("invitation:closed", () => {
  achievementEngine.handleClosed();
});

globalThis.addEventListener("invitation:state-changed", (event) => {
  achievementEngine.handleStateChanged(event.detail || {});
});

document.querySelectorAll("[data-hotspot-kind]").forEach((hotspot) => {
  hotspot.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  hotspot.addEventListener("click", (event) => {
    event.stopPropagation();
    globalThis.dispatchEvent(
      new CustomEvent("invitation:hotspot-clicked", {
        detail: {
          id: hotspot.dataset.hotspotId,
          kind: hotspot.dataset.hotspotKind,
          surface: hotspot.dataset.hotspotSurface
        }
      })
    );
  });
});

globalThis.addEventListener("invitation:hotspot-clicked", (event) => {
  achievementEngine.handleHotspotClicked(event.detail || {});
});

// Defer scripts execute before DOMContentLoaded. This is a fallback if the core
// script is cached or replaced independently of the public entry point.
achievementEngine.handlePageLoaded();
