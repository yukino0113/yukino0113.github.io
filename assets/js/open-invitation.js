const ACHIEVEMENT_STORAGE_KEY = "open-invitation-achievements-v1";
const CYCLE_WINDOW_MS = 5000;
const EEVEE_COLLECTION_SIZE = 5;

const ACHIEVEMENTS = Object.freeze({
  "page-loaded": {
    title: "歡迎加入伺服器",
    description: "玩家已成功連線。",
    hint: "先讓公開版喜帖完成載入。"
  },
  "invitation-opened": {
    title: "芝麻開門？",
    description: "新的區域已解鎖。",
    hint: "試試看打開喜帖"
  },
  "back-facing": {
    title: "事情還有另一面",
    description: "原來背面也有東西。",
    hint: "可以試試看用滑鼠或是手指轉動？"
  },
  "edge-on": {
    title: "超出世界邊界",
    description: "你成功把喜帖弄不見了。",
    hint: "可以把喜帖變不見?!"
  },
  "open-close-10-in-5s": {
    title: "這不是音遊",
    description: "喜帖上沒有譜面，不要這樣...",
    hint: "打開喜帖應該不需要這麼高的手速吧......"
  },
  "page-and-back": {
    title: "非常感謝你",
    description: "你解鎖了喜帖所有內容。",
    hint: "解鎖喜帖所有內容"
  },
  "eevee-any": {
    title: "野生的伊布出現了！",
    description: "你發現了一隻伊布。",
    hint: "到處都有伊布，試著跟伊布們互動 !!"
  },
  "coin-slot": {
    title: "為什麼你連喜帖都要投幣...",
    description: "CREDIT +1",
    hint: "CREDITS +1"
  },
  "eevee-all": {
    title: "伊布圖鑑完成",
    description: "五隻，一隻都沒放過。",
    hint: "伊布：布!!!"
  },
  "eevee-10-in-5s": {
    title: "摸夠了沒？",
    description: "伊布開始對你提高警戒。",
    hint: "伊布好像很喜歡被摸？大概吧。"
  },
  "eevee-tail": {
    title: "伊布對你使用搖尾巴",
    description: "你的防禦下降了！",
    hint: "伊布的尾巴也許藏著秘密。"
  },
  "all-achievements": {
    title: "你到底是怎麼做到的？",
    description: "你真的全部解完了，為什麼...",
    hint: "先完成其他所有成就。"
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
    this.eeveeIds = new Set();
    this.wasBackFacing = false;
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

    if (isBackFacing && !this.wasBackFacing) {
      this.unlock("back-facing");
    }

    this.wasBackFacing = isBackFacing;
  }

  handleRotationEnded(detail) {
    if (detail.isEdgeOn) {
      this.unlock("edge-on");
    }
  }

  handleHotspotClicked(detail) {
    if (detail.kind === "coin-slot") {
      this.unlock("coin-slot");
      return;
    }

    const isEeveeTail = detail.kind === "eevee-tail";
    if (detail.kind !== "eevee" && !isEeveeTail) {
      return;
    }

    this.unlock("eevee-any");

    if (detail.kind === "eevee" && detail.id) {
      this.eeveeIds.add(detail.id);
      if (this.eeveeIds.size >= EEVEE_COLLECTION_SIZE) {
        this.unlock("eevee-all");
      }
    }

    const now = Date.now();
    this.eeveeClickTimestamps = this.eeveeClickTimestamps.filter(
      (timestamp) => now - timestamp <= CYCLE_WINDOW_MS
    );
    this.eeveeClickTimestamps.push(now);

    if (this.eeveeClickTimestamps.length >= 10) {
      this.unlock("eevee-10-in-5s");
    }

    if (isEeveeTail) {
      this.unlock("eevee-tail");
    }
  }

  renderList() {
    const list = document.getElementById("achievement-list");
    const progress = document.getElementById("achievement-progress");
    const summary = document.getElementById("achievement-panel-summary");
    const entries = Object.entries(this.definitions);
    const unlockedCount = entries.filter(([id]) => this.unlocked.has(id)).length;

    if (!list || !progress || !summary) {
      return;
    }

    progress.textContent = `${unlockedCount} / ${entries.length}`;
    summary.textContent =
      unlockedCount === entries.length
        ? "你真的全部解完了，為什麼..."
        : `已解鎖 ${unlockedCount} 項，繼續探索喜帖吧。`;

    list.replaceChildren(
      ...entries.map(([id, achievement]) => {
        const isUnlocked = this.unlocked.has(id);
        const item = document.createElement("li");
        item.className = `achievement-list-item ${isUnlocked ? "is-unlocked" : "is-locked"}`;
        item.dataset.achievementId = id;

        const icon = document.createElement("span");
        icon.className = "achievement-list-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = isUnlocked ? "✓" : "?";

        const copy = document.createElement("div");
        copy.className = "achievement-list-copy";

        const heading = document.createElement("div");
        heading.className = "achievement-list-heading";

        const title = document.createElement("strong");
        title.className = "achievement-list-title";
        title.textContent = isUnlocked ? achievement.title : "尚未解鎖";

        const status = document.createElement("span");
        status.className = "achievement-list-status";
        status.textContent = isUnlocked ? "已解鎖" : "未解鎖";

        const description = document.createElement("p");
        description.className = "achievement-list-description";
        description.textContent = isUnlocked
          ? achievement.description
          : `提示：${achievement.hint || "繼續探索喜帖。"}`;

        heading.append(title, status);
        copy.append(heading, description);
        item.append(icon, copy);
        return item;
      })
    );
  }

  unlock(id) {
    if (this.unlocked.has(id) || !this.definitions[id]) {
      return;
    }

    this.unlocked.add(id);
    this.saveUnlocked();
    this.renderList();
    this.toastQueue.enqueue(this.definitions[id]);

    if (
      id !== "page-and-back" &&
      this.unlocked.has("page-loaded") &&
      this.unlocked.has("back-facing")
    ) {
      this.unlock("page-and-back");
    }

    this.maybeUnlockAll();
  }

  maybeUnlockAll() {
    const requiredIds = Object.keys(this.definitions).filter(
      (achievementId) => achievementId !== "all-achievements"
    );

    if (requiredIds.every((achievementId) => this.unlocked.has(achievementId))) {
      this.unlock("all-achievements");
    }
  }

  loadUnlocked() {
    try {
      const saved = JSON.parse(localStorage.getItem(ACHIEVEMENT_STORAGE_KEY) || "[]");
      const unlocked = new Set(Array.isArray(saved) ? saved : []);
      const removedOldCollection = unlocked.delete("eevee-all");
      const removedOldCompletion = unlocked.delete("all-achievements");
      const hadOldCollectionAchievements = removedOldCollection || removedOldCompletion;

      if (hadOldCollectionAchievements) {
        localStorage.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify([...unlocked]));
      }

      return unlocked;
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

const achievementPanel = document.getElementById("achievement-panel");
const achievementToggleButton = document.getElementById("toggle-achievements");
const achievementCloseButton = document.getElementById("close-achievements");

function setAchievementPanelOpen(isOpen) {
  if (!achievementPanel || !achievementToggleButton) {
    return;
  }

  achievementPanel.hidden = !isOpen;
  achievementToggleButton.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    achievementCloseButton?.focus();
  } else {
    achievementToggleButton.focus();
  }
}

achievementToggleButton?.addEventListener("click", () => {
  setAchievementPanelOpen(achievementPanel?.hidden ?? true);
});

achievementCloseButton?.addEventListener("click", () => {
  setAchievementPanelOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && achievementPanel && !achievementPanel.hidden) {
    setAchievementPanelOpen(false);
  }
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

globalThis.addEventListener("invitation:rotation-ended", (event) => {
  achievementEngine.handleRotationEnded(event.detail || {});
});

document.querySelectorAll("[data-hotspot-kind]").forEach((hotspot) => {
  hotspot.addEventListener("click", (event) => {
    event.stopPropagation();
    globalThis.dispatchEvent(
      new CustomEvent("invitation:hotspot-clicked", {
        detail: {
          id: hotspot.dataset.hotspotId,
          kind: hotspot.dataset.hotspotKind,
          surface: hotspot.dataset.hotspotSurface,
          scope: hotspot.dataset.hotspotScope
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
achievementEngine.renderList();
achievementEngine.handlePageLoaded();
