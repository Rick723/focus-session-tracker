let remaining = 1500;
let intervalId = null;
let startedAt = null;
let focusSessionId = null;
let isInitializing = false;
let reloadRequired = false;
let pendingUiLocked = false;

function setStatusMessage(message) {
  const statusMessage = document.getElementById("timer-status-message");
  if (!statusMessage) return;

  statusMessage.textContent = message;
}

function clearStatusMessage() {
  const statusMessage = document.getElementById("timer-status-message");
  if (!statusMessage) return;

  statusMessage.textContent = "";
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

function renderCreature(icon) {
  const creature = document.getElementById("creature-icon");
  if (!creature) return;

  creature.innerText = icon;
}

function toggleTimerButtons(isRunning) {
  const startButton = document.getElementById("start-button");
  const stopButton = document.getElementById("stop-button");

  if (!startButton || !stopButton) return;

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

function lockTimerForReload(message) {
  reloadRequired = true;
  stopTimer();
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
  reloadRequired = false;
  pendingUiLocked = false;
  remaining = 1500;
  intervalId = null;
  startedAt = null;
  focusSessionId = null;

  localStorage.removeItem("startedAt");
  localStorage.removeItem("focusSessionId");
  localStorage.removeItem("postedStartedAt");

  toggleTimerButtons(false);
  setTimerButtonsDisabled(false);
  renderCreature("🥚");
  renderTimer();
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

function restoreTimerState() {
  const storedStartedAt = localStorage.getItem("startedAt");
  const storedFocusSessionId = localStorage.getItem("focusSessionId");

  startedAt = storedStartedAt;
  focusSessionId = storedFocusSessionId;

  if (!storedStartedAt) {
    remaining = 1500;
    renderCreature("🥚");
    return false;
  }

  const elapsedSeconds = elapsedSecondsFrom(storedStartedAt);
  remaining = Math.max(1500 - elapsedSeconds, 0);

  if (storedFocusSessionId) {
    renderCreature("⚫");
  } else {
    renderCreature("🥚");
  }

  return true;
}

async function createFocusSession(currentStartedAt, durationSeconds, allowPending = !isInitializing) {
  if (!currentStartedAt) return { status: "failure" };

  const postedStartedAt = localStorage.getItem("postedStartedAt");
  const currentFocusSessionId = focusSessionId || localStorage.getItem("focusSessionId");

  if (currentFocusSessionId) {
    focusSessionId = currentFocusSessionId;
    renderCreature("⚫");
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
    renderCreature("⚫");

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

  const patched = await patchFocusSession(1500, new Date().toISOString());
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

  // 完了通知バナー本体は ISSUE9 で扱う
  clearStatusMessage();
  resetTimer();
}

async function finalizeExpiredTimer() {
  const currentStartedAt = startedAt || localStorage.getItem("startedAt");
  const currentFocusSessionId = focusSessionId || localStorage.getItem("focusSessionId");

  // MVPでは25分超過時も25分固定で扱う
  if (!currentFocusSessionId) {
    const created = await createFocusSession(currentStartedAt, 1500, true);
    if (created.status === "failure") {
      lockTimerForReload("保存に失敗しました。再読み込みして復旧をお試しください。");
      return;
    }

    if (created.status === "pending") {
      pendingUiLocked = true;
      toggleTimerButtons(true);
      setTimerButtonsDisabled(true);
      setStatusMessage("保存処理を確認中です。少し待ってから再読み込みしてください。");
      return;
    }
  }

  await completeTimer();
}

async function tick() {
  remaining -= 1;
  renderTimer();

  const durationSeconds = 1500 - remaining;

  if (remaining === 1200) {
    const currentStartedAt = startedAt || localStorage.getItem("startedAt");
    const created = await createFocusSession(currentStartedAt, durationSeconds);
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

  reloadRequired = false;
  pendingUiLocked = false;
  remaining = 1500;
  startedAt = new Date().toISOString();
  focusSessionId = null;

  localStorage.setItem("startedAt", startedAt);
  localStorage.removeItem("focusSessionId");
  localStorage.removeItem("postedStartedAt");

  clearStatusMessage();
  toggleTimerButtons(true);
  setTimerButtonsDisabled(false);
  renderCreature("🥚");
  renderTimer();

  intervalId = setInterval(() => {
    tick();
  }, 1000);
}

async function handleStop() {
  if (isInitializing) return;

  stopTimer();

  const durationSeconds = 1500 - remaining;
  const currentFocusSessionId = focusSessionId || localStorage.getItem("focusSessionId");

  if (!currentFocusSessionId) {
    clearStatusMessage();
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

  clearStatusMessage();
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
      toggleTimerButtons(false);
      clearStatusMessage();
      return;
    }

    // A: 25分超過再訪時は通常復元より先に専用経路へ
    if (remaining <= 0) {
      await finalizeExpiredTimer();
      return;
    }

    const durationSeconds = 1500 - remaining;

    if (durationSeconds >= 300) {
      const created = await createFocusSession(startedAt, durationSeconds);

      if (created.status === "failure") {
        lockTimerForReload("保存に失敗しました。再読み込みして復旧をお試しください。");
        return;
      }
    }

    toggleTimerButtons(true);

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
  const startButton = document.getElementById("start-button");
  const stopButton = document.getElementById("stop-button");

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
});
