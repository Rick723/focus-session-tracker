const TOTAL_DURATION_SECONDS = 1500;
const FIVE_MINUTES_SECONDS = 300;
const DEFAULT_STATUS_MESSAGE = "たねをまいて集中タイムを始めましょう！";
const COMPLETION_NOTIFICATION_ENABLED_KEY = "completionNotificationEnabled";
const POST_CELEBRATION_RESET_DELAY_MS = document.body?.dataset.railsEnv === "test" ? null : 2000;

const STAGE_CONFIG = {
  seed: {
    label: "たね",
    alt: "たね",
    phase: "たねのじかん",
    runningMessage: "まずは５分だけ集中を続けましょう"
  },
  sprout: {
    label: "ドロちゃん",
    alt: "ドロちゃん",
    phase: "そだちのじかん",
    runningMessage: "その調子！ドロちゃんがすくすく育っています"
  },
  harvest: {
    label: "ポモちゃん",
    alt: "ポモちゃん",
    phase: "しゅうかくのじかん",
    runningMessage: "ポモちゃんが元気に実りました！"
  }
};

let remaining = TOTAL_DURATION_SECONDS;
let intervalId = null;
let startedAt = null;
let focusSessionId = null;
let isInitializing = false;
let reloadRequired = false;
let pendingUiLocked = false;
let postCelebrationResetTimeoutId = null;

function notificationApiAvailable() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    typeof Notification.requestPermission === "function"
  );
}

function supportsDesktopCompletionNotification() {
  const desktopWidthAvailable =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(min-width: 721px)").matches;

  if (!desktopWidthAvailable) {
    return false;
  }

  if (document.body?.dataset.railsEnv === "test") {
    return true;
  }

  return (
    notificationApiAvailable()
  );
}

function completionNotificationEnabled() {
  if (!notificationApiAvailable()) {
    return false;
  }

  const savedValue = localStorage.getItem(COMPLETION_NOTIFICATION_ENABLED_KEY);

  if (savedValue === null) {
    return Notification.permission === "granted";
  }

  return savedValue === "true";
}

function setCompletionNotificationEnabled(enabled) {
  localStorage.setItem(COMPLETION_NOTIFICATION_ENABLED_KEY, String(enabled));
}

function updateNotificationButtonState() {
  const button = document.getElementById("timer-notification-button");
  if (!button) return;

  if (!supportsDesktopCompletionNotification()) {
    button.hidden = true;
    return;
  }

  button.hidden = false;

  if (!notificationApiAvailable()) {
    button.dataset.notificationState = "default";
    button.textContent = "PC通知をオン";
    button.disabled = false;
    return;
  }

  if (Notification.permission === "granted") {
    if (localStorage.getItem(COMPLETION_NOTIFICATION_ENABLED_KEY) === null) {
      setCompletionNotificationEnabled(true);
    }

    const enabled = completionNotificationEnabled();
    button.dataset.notificationState = enabled ? "enabled" : "disabled";
    button.textContent = enabled ? "PC通知をオフ" : "PC通知をオン";
    button.disabled = false;
    return;
  }

  if (Notification.permission === "denied") {
    button.dataset.notificationState = "denied";
    button.textContent = "通知がブロックされています";
    button.disabled = true;
    return;
  }

  button.dataset.notificationState = "default";
  button.textContent = "PC通知をオン";
  button.disabled = false;
}

async function requestCompletionNotificationPermission() {
  if (!supportsDesktopCompletionNotification()) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setCompletionNotificationEnabled(true);
    }
  } catch (error) {
    console.error("通知権限の取得に失敗しました", error);
  } finally {
    updateNotificationButtonState();
  }
}

function toggleCompletionNotification() {
  if (!supportsDesktopCompletionNotification()) return;
  if (!notificationApiAvailable()) return;

  if (Notification.permission === "granted") {
    setCompletionNotificationEnabled(!completionNotificationEnabled());
    updateNotificationButtonState();
    return;
  }

  requestCompletionNotificationPermission();
}

function notifyCompletionIfNeeded() {
  if (!supportsDesktopCompletionNotification()) return;
  if (Notification.permission !== "granted") return;
  if (!completionNotificationEnabled()) return;

  new Notification("ポモちゃんが実りました！", {
    body: "25分の集中が完了しました。ひとやすみして次のたねをまきましょう！"
  });
}

function setPageLinksHidden(hidden) {
  const pageLinks = document.getElementById("page-links");
  if (!pageLinks) return;

  pageLinks.hidden = hidden;
}

function installTimerTestHooks() {
  if (document.body?.dataset.railsEnv !== "test") return;

  window.timerTestHooks = {
    finishCelebration() {
      finalizeCelebrationReset();
    },
    setFocusSessionId(value) {
      focusSessionId = value;
    },
    setRemaining(value) {
      remaining = value;
      const fakeStartedAt = new Date(
        Date.now() - (TOTAL_DURATION_SECONDS - value + 1) * 1000
      ).toISOString();

      startedAt = fakeStartedAt;
      localStorage.setItem("startedAt", fakeStartedAt);
    },
    stopTimer() {
      stopTimer();
    },
    async tick() {
      await tick();
    }
  };
}

function setStatusMessage(message) {
  const statusMessage = document.getElementById("timer-status-message");
  if (!statusMessage) return;

  statusMessage.textContent = message;
}

function clearStatusMessage() {
  setStatusMessage("");
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function renderTimer() {
  const timerDisplay = document.getElementById("time");
  if (!timerDisplay) return;

  timerDisplay.textContent = formatTime(remaining);
}

function resolveStageFromRemaining(remainingSeconds) {
  const elapsedSeconds = TOTAL_DURATION_SECONDS - remainingSeconds;

  if (elapsedSeconds >= FIVE_MINUTES_SECONDS) {
    return "sprout";
  }

  return "seed";
}

function updateSceneStage(stage) {
  const timerPage = document.getElementById("timer-page");
  if (!timerPage) return;

  timerPage.dataset.stage = stage;
}

function setSceneMode(mode) {
  const timerPage = document.getElementById("timer-page");
  if (!timerPage) return;

  timerPage.dataset.scene = mode;
}

function setCelebrationVisible(visible) {
  const resultIcon = document.getElementById("result-icon");
  const resultConfirmButton = document.getElementById("timer-result-confirm");
  if (!resultIcon) return;

  resultIcon.hidden = !visible;
  resultIcon.setAttribute("aria-hidden", String(!visible));

  if (resultConfirmButton) {
    resultConfirmButton.disabled = false;
  }
}

function renderCreature(stage) {
  const creature = document.getElementById("creature-icon");
  if (!creature) return;

  const creatureImage = document.getElementById("creature-image");
  const creatureLabel = document.getElementById("creature-label");
  const timerPhase = document.getElementById("timer-phase");
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.seed;
  const imageSource = creature.dataset[`${stage}Image`] || creature.dataset.seedImage;

  creature.dataset.creatureStage = stage;
  updateSceneStage(stage);

  if (creatureImage && imageSource) {
    creatureImage.src = imageSource;
    creatureImage.alt = config.alt;
  }

  if (creatureLabel) {
    creatureLabel.textContent = config.label;
  }

  if (timerPhase) {
    timerPhase.textContent = config.phase;
  }
}

function toggleTimerButtons(isRunning, options = {}) {
  const { hideAll = false } = options;
  const startButton = document.getElementById("start-button");
  const stopButton = document.getElementById("stop-button");

  if (!startButton || !stopButton) return;

  if (hideAll) {
    startButton.hidden = true;
    stopButton.hidden = true;
    return;
  }

  if (isRunning) {
    startButton.hidden = true;
    stopButton.hidden = false;
  } else {
    startButton.hidden = false;
    stopButton.hidden = true;
  }
}

function setTimerButtonsDisabled(disabled) {
  const startButton = document.getElementById("start-button");
  const stopButton = document.getElementById("stop-button");

  if (startButton) startButton.disabled = disabled;
  if (stopButton) stopButton.disabled = disabled;
}

function clearPersistedTimerState() {
  localStorage.removeItem("startedAt");
  localStorage.removeItem("focusSessionId");
  localStorage.removeItem("postedStartedAt");
}

function clearPostCelebrationResetTimeout() {
  if (postCelebrationResetTimeoutId === null) return;

  clearTimeout(postCelebrationResetTimeoutId);
  postCelebrationResetTimeoutId = null;
}

function finalizeCelebrationReset() {
  clearPostCelebrationResetTimeout();
  resetTimer();
}

function queuePostCelebrationReset() {
  clearPostCelebrationResetTimeout();

  if (POST_CELEBRATION_RESET_DELAY_MS === null) {
    finalizeCelebrationReset();
    return;
  }

  postCelebrationResetTimeoutId = setTimeout(() => {
    finalizeCelebrationReset();
  }, POST_CELEBRATION_RESET_DELAY_MS);
}

function lockTimerForReload(message) {
  reloadRequired = true;
  stopTimer();
  setPageLinksHidden(true);
  setSceneMode("locked");
  setCelebrationVisible(false);
  toggleTimerButtons(true);
  setTimerButtonsDisabled(true);
  renderTimer();
  setStatusMessage(message);
}

function resetTimerFor409(route, currentFocusSessionId, status, message) {
  console.warn("PATCH conflict handled", {
    route,
    status,
    focusSessionId: currentFocusSessionId
  });
  resetTimer();
  setStatusMessage(message);
}

function resetTimer() {
  clearPostCelebrationResetTimeout();
  reloadRequired = false;
  pendingUiLocked = false;
  remaining = TOTAL_DURATION_SECONDS;
  intervalId = null;
  startedAt = null;
  focusSessionId = null;

  clearPersistedTimerState();
  setPageLinksHidden(false);
  setSceneMode("idle");
  setCelebrationVisible(false);
  toggleTimerButtons(false);
  setTimerButtonsDisabled(false);
  renderCreature("seed");
  renderTimer();
  setStatusMessage(DEFAULT_STATUS_MESSAGE);
}

function stopTimer() {
  if (intervalId === null) return;

  clearInterval(intervalId);
  intervalId = null;
}

function elapsedSecondsFrom(startedAtValue) {
  if (!startedAtValue) return 0;

  const elapsedMilliseconds = Date.now() - new Date(startedAtValue).getTime();
  if (Number.isNaN(elapsedMilliseconds) || elapsedMilliseconds < 0) {
    return 0;
  }

  return Math.floor(elapsedMilliseconds / 1000);
}

function remainingSecondsFrom(startedAtValue) {
  return Math.max(TOTAL_DURATION_SECONDS - elapsedSecondsFrom(startedAtValue), 0);
}

function restoreTimerState() {
  const storedStartedAt = localStorage.getItem("startedAt");
  const storedFocusSessionId = localStorage.getItem("focusSessionId");

  startedAt = storedStartedAt;
  focusSessionId = storedFocusSessionId;

  if (!storedStartedAt) {
    remaining = TOTAL_DURATION_SECONDS;
    renderCreature("seed");
    return false;
  }

  remaining = remainingSecondsFrom(storedStartedAt);
  renderCreature(resolveStageFromRemaining(remaining));

  return true;
}

async function createFocusSession(currentStartedAt, durationSeconds, allowPending = !isInitializing) {
  if (!currentStartedAt) return { status: "failure" };

  const postedStartedAt = localStorage.getItem("postedStartedAt");
  const currentFocusSessionId = focusSessionId || localStorage.getItem("focusSessionId");

  if (currentFocusSessionId) {
    focusSessionId = currentFocusSessionId;
    renderCreature("sprout");
    return { status: "success" };
  }

  if (postedStartedAt === currentStartedAt && allowPending) {
    return { status: "pending" };
  }

  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

  // 軽いロック。厳密な最終防衛はサーバー側ガード前提
  // TODO(ISSUE9): postedStartedAt ロックはクライアント側の軽い防御にとどまる。
  // ほぼ同時の別タブ到達や競合の最終防衛はサーバー側で担保する。
  localStorage.setItem("postedStartedAt", currentStartedAt);

  try {
    const response = await fetch("/focus_sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken
      },
      body: JSON.stringify({
        focus_session: {
          started_at: currentStartedAt,
          duration_seconds: durationSeconds
        }
      })
    });

    if (!response.ok) {
      localStorage.removeItem("postedStartedAt");
      console.error("セッション作成 HTTP失敗", response.status);
      return { status: "failure" };
    }

    const data = await response.json();
    focusSessionId = String(data.id);

    localStorage.setItem("focusSessionId", focusSessionId);
    localStorage.setItem("postedStartedAt", currentStartedAt);
    renderCreature("sprout");
    setStatusMessage(STAGE_CONFIG.sprout.runningMessage);

    console.log("5分到達");
    console.log("startedAt", currentStartedAt);
    console.log("durationSeconds", durationSeconds);
    console.log("focusSessionId:", focusSessionId);

    return { status: "success" };
  } catch (error) {
    localStorage.removeItem("postedStartedAt");
    console.error("POST通信エラー", error);
    return { status: "failure" };
  }
}

// 文言は呼び出し元で決める
async function patchFocusSession(durationSeconds, completedAt = null) {
  const currentFocusSessionId = focusSessionId || localStorage.getItem("focusSessionId");
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

  if (!currentFocusSessionId) {
    return { ok: false, status: 0 };
  }

  focusSessionId = currentFocusSessionId;

  const focusSession = { duration_seconds: durationSeconds };
  if (completedAt) {
    focusSession.completed_at = completedAt;
  }

  try {
    const response = await fetch(`/focus_sessions/${currentFocusSessionId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken
      },
      body: JSON.stringify({ focus_session: focusSession })
    });

    if (!response.ok) {
      if (response.status !== 409) {
        console.error("PATCH HTTP失敗", response.status);
      }
      return { ok: false, status: response.status };
    }

    return { ok: true, status: response.status };
  } catch (error) {
    console.error("PATCH通信エラー", error);
    return { ok: false, status: 0 };
  }
}

async function completeTimer() {
  stopTimer();

  const currentFocusSessionId = focusSessionId || localStorage.getItem("focusSessionId");
  if (!currentFocusSessionId) {
    lockTimerForReload("保存に失敗しました。再読み込みして復旧をお試しください。");
    console.error("focusSessionId がないため PATCH できません");
    return;
  }

  const patched = await patchFocusSession(TOTAL_DURATION_SECONDS, new Date().toISOString());
  if (!patched.ok) {
    if (patched.status === 409) {
      resetTimerFor409(
        "completeTimer",
        currentFocusSessionId,
        patched.status,
        "すでに保存済みのため初期状態に戻しました。"
      );
      return;
    }

    lockTimerForReload("保存に失敗しました。再読み込みして復旧をお試しください。");
    return;
  }

  console.log("25分完了");
  console.log("focusSessionId:", currentFocusSessionId);

  clearPersistedTimerState();
  startedAt = null;
  focusSessionId = null;
  setPageLinksHidden(true);
  setSceneMode("celebrating");
  setCelebrationVisible(true);
  toggleTimerButtons(true, { hideAll: true });
  setTimerButtonsDisabled(true);
  renderCreature("harvest");
  setStatusMessage("ポモちゃんが実りました！ 次のたねもまけます。");
  notifyCompletionIfNeeded();
}

async function finalizeExpiredTimer() {
  const currentStartedAt = startedAt || localStorage.getItem("startedAt");
  const currentFocusSessionId = focusSessionId || localStorage.getItem("focusSessionId");

  remaining = 0;
  renderTimer();

  // MVPでは25分超過時も25分固定で扱う
  if (!currentFocusSessionId) {
    const created = await createFocusSession(currentStartedAt, FIVE_MINUTES_SECONDS, true);
    if (created.status === "failure") {
      lockTimerForReload("保存に失敗しました。再読み込みして復旧をお試しください。");
      return;
    }

    if (created.status === "pending") {
      pendingUiLocked = true;
      setPageLinksHidden(true);
      setSceneMode("pending");
      renderCreature("sprout");
      toggleTimerButtons(true);
      setTimerButtonsDisabled(true);
      setStatusMessage("保存処理を確認中です。少し待ってから再読み込みしてください。");
      return;
    }
  }

  await completeTimer();
}

async function tick() {
  const currentStartedAt = startedAt || localStorage.getItem("startedAt");
  if (!currentStartedAt) {
    resetTimer();
    return;
  }

  const previousRemaining = remaining;
  remaining = remainingSecondsFrom(currentStartedAt);
  renderTimer();

  if (
    previousRemaining > TOTAL_DURATION_SECONDS - FIVE_MINUTES_SECONDS &&
    remaining <= TOTAL_DURATION_SECONDS - FIVE_MINUTES_SECONDS
  ) {
    const created = await createFocusSession(currentStartedAt, FIVE_MINUTES_SECONDS);
    if (created.status === "failure") {
      lockTimerForReload("保存に失敗しました。再読み込みして復旧をお試しください。");
      return;
    }
  }

  if (remaining <= 0) {
    await completeTimer();
  }
}

function startTimer() {
  if (isInitializing) return;
  if (intervalId !== null) return;

  clearPostCelebrationResetTimeout();
  reloadRequired = false;
  pendingUiLocked = false;
  remaining = TOTAL_DURATION_SECONDS;
  startedAt = new Date().toISOString();
  focusSessionId = null;

  localStorage.setItem("startedAt", startedAt);
  localStorage.removeItem("focusSessionId");
  localStorage.removeItem("postedStartedAt");

  setSceneMode("running");
  setPageLinksHidden(true);
  setCelebrationVisible(false);
  toggleTimerButtons(true);
  setTimerButtonsDisabled(false);
  renderCreature("seed");
  renderTimer();
  setStatusMessage(STAGE_CONFIG.seed.runningMessage);

  intervalId = setInterval(() => {
    tick();
  }, 1000);
}

async function handleStop() {
  if (isInitializing) return;

  stopTimer();

  const currentStartedAt = startedAt || localStorage.getItem("startedAt");
  if (currentStartedAt) {
    remaining = remainingSecondsFrom(currentStartedAt);
    renderTimer();
  }

  const durationSeconds = TOTAL_DURATION_SECONDS - remaining;
  let currentFocusSessionId = focusSessionId || localStorage.getItem("focusSessionId");

  if (!currentFocusSessionId && currentStartedAt && durationSeconds >= FIVE_MINUTES_SECONDS) {
    const created = await createFocusSession(currentStartedAt, FIVE_MINUTES_SECONDS);
    if (created.status === "failure") {
      lockTimerForReload("保存に失敗しました。再読み込みして復旧をお試しください。");
      return;
    }

    currentFocusSessionId = focusSessionId || localStorage.getItem("focusSessionId");
  }

  if (!currentFocusSessionId) {
    resetTimer();
    return;
  }

  const patched = await patchFocusSession(durationSeconds, null);
  if (!patched.ok) {
    if (patched.status === 409) {
      resetTimerFor409(
        "handleStop",
        currentFocusSessionId,
        patched.status,
        "すでに保存済みのため初期状態に戻しました。"
      );
      return;
    }

    lockTimerForReload("保存に失敗しました。再読み込みして復旧をお試しください。");
    return;
  }

  resetTimer();
}

async function initializeTimer() {
  isInitializing = true;
  setTimerButtonsDisabled(true);

  try {
    const hasStoredTimer = restoreTimerState();

    renderTimer();

    if (!hasStoredTimer) {
      reloadRequired = false;
      setPageLinksHidden(false);
      setSceneMode("idle");
      setCelebrationVisible(false);
      toggleTimerButtons(false);
      setStatusMessage(DEFAULT_STATUS_MESSAGE);
      return;
    }

    // 25分超過再訪時は通常復元より先に専用経路へ
    if (remaining <= 0) {
      await finalizeExpiredTimer();
      return;
    }

    const durationSeconds = TOTAL_DURATION_SECONDS - remaining;

    if (durationSeconds >= FIVE_MINUTES_SECONDS) {
      const created = await createFocusSession(startedAt, FIVE_MINUTES_SECONDS);

      if (created.status === "failure") {
        lockTimerForReload("保存に失敗しました。再読み込みして復旧をお試しください。");
        return;
      }
    }

    setPageLinksHidden(true);
    setSceneMode("running");
    setCelebrationVisible(false);
    toggleTimerButtons(true);
    setStatusMessage(STAGE_CONFIG[resolveStageFromRemaining(remaining)].runningMessage);

    if (intervalId === null) {
      intervalId = setInterval(() => {
        tick();
      }, 1000);
    }
  } finally {
    isInitializing = false;
    setTimerButtonsDisabled(reloadRequired || pendingUiLocked);
  }
}

document.addEventListener("turbo:load", () => {
  const timerPage = document.getElementById("timer-page");
  const startButton = document.getElementById("start-button");
  const stopButton = document.getElementById("stop-button");
  const notificationButton = document.getElementById("timer-notification-button");
  const resultConfirmButton = document.getElementById("timer-result-confirm");

  if (!timerPage) return;

  installTimerTestHooks();
  updateNotificationButtonState();
  initializeTimer();

  if (startButton && !startButton.dataset.bound) {
    startButton.dataset.bound = "true";
    startButton.addEventListener("click", startTimer);
  }

  if (stopButton && !stopButton.dataset.bound) {
    stopButton.dataset.bound = "true";
    stopButton.addEventListener("click", () => {
      if (isInitializing) return;

      const confirmed = window.confirm("タイマーを停止してセッションを終了しますか？");
      if (!confirmed) return;

      handleStop();
    });
  }

  if (notificationButton && !notificationButton.dataset.bound) {
    notificationButton.dataset.bound = "true";
    notificationButton.addEventListener("click", () => {
      toggleCompletionNotification();
    });
  }

  if (resultConfirmButton && !resultConfirmButton.dataset.bound) {
    resultConfirmButton.dataset.bound = "true";
    resultConfirmButton.addEventListener("click", () => {
      resultConfirmButton.disabled = true;
      setCelebrationVisible(false);
      setStatusMessage("次のたねを準備しています…");
      queuePostCelebrationReset();
    });
  }
});
