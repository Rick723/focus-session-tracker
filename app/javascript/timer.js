let remaining = 1500;
let intervalId = null;
let startedAt = null;
let focusSessionId = null;
let isInitializing = false;

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

function httpError(response, action) {
  setStatusMessage(`${action}に失敗しました。もう一度お試しください。`);
  console.error(`${action} HTTP失敗`, response.status);
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

function resetTimer() {
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

async function createFocusSession(currentStartedAt, durationSeconds) {
  if (!currentStartedAt) return false;

  const postedStartedAt = localStorage.getItem("postedStartedAt");
  const currentFocusSessionId = focusSessionId || localStorage.getItem("focusSessionId");

  if (currentFocusSessionId) {
    focusSessionId = currentFocusSessionId;
    renderCreature("⚫");
    return true;
  }

  if (postedStartedAt === currentStartedAt) {
    return false;
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
      httpError(response, "セッション作成");
      return false;
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

    return true;
  } catch (error) {
    localStorage.removeItem("postedStartedAt");
    setStatusMessage("セッション作成に失敗しました。もう一度お試しください。");
    console.error("POST通信エラー", error);
    return false;
  }
}

// 文言は呼び出し元で決める
async function patchFocusSession(durationSeconds, completedAt = null) {
  const currentFocusSessionId = focusSessionId || localStorage.getItem("focusSessionId");
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

  if (!currentFocusSessionId) {
    return false;
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
      // TODO(ISSUE9): 409 などの失敗種別を呼び出し元で分岐しやすいよう、
      // 必要なら status を返す設計へ広げることを検討する。
      console.error("PATCH HTTP失敗", response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error("PATCH通信エラー", error);
    return false;
  }
}

async function completeTimer() {
  stopTimer();

  const currentFocusSessionId = focusSessionId || localStorage.getItem("focusSessionId");
  if (!currentFocusSessionId) {
    setStatusMessage("完了保存に失敗しました。再読み込み後にもう一度お試しください。");
    console.error("focusSessionId がないため PATCH できません");
    return;
  }

  const patched = await patchFocusSession(1500, new Date().toISOString());
  if (!patched) {
    setStatusMessage("完了保存に失敗しました。再読み込み後にもう一度お試しください。");
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
    const created = await createFocusSession(currentStartedAt, 1500);
    if (!created) {
      // TODO(ISSUE9): create 失敗時に remaining=0 / startedAt残存 / localStorage残存 などの
      // 半端状態が残りうる。ここは ISSUE9 で「reset へ倒す」か
      // 「再試行専用UIに寄せる」かを決めて整理する。
      setStatusMessage("セッション復元に失敗しました。再読み込み後にもう一度お試しください。");
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
    await createFocusSession(currentStartedAt, durationSeconds);
  }

  if (remaining <= 0) {
    await completeTimer();
  }
}

function startTimer() {
  if (isInitializing) return;
  if (intervalId !== null) return;

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
  if (!patched) {
    toggleTimerButtons(false);
    setTimerButtonsDisabled(false);
    renderTimer();

    // TODO(ISSUE9): Stop失敗時は UI を idle 表示へ戻す一方で localStorage は保持しているため、
    // 「見た目は新規開始できそうだが、未保存状態は残っている」というズレが少し残る。
    // ISSUE9で、Start無効化 / 再読み込み専用導線 / 文言再整理 のいずれかを検討する。
    setStatusMessage("停止の保存に失敗しました。再読み込みで復旧を試してください。開始し直すと未保存状態は破棄されます。");
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
      await createFocusSession(startedAt, durationSeconds);
    }

    toggleTimerButtons(true);

    if (intervalId === null) {
      intervalId = setInterval(() => {
        tick();
      }, 1000);
    }
  } finally {
    isInitializing = false;
    setTimerButtonsDisabled(false);
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