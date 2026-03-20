// TODO: Stop時（5分以上）の update 処理を実装する（ISSUE6時点では保留）
let remaining = 1500;
let intervalId = null;
let startedAt = null;
let focusSessionId = null;

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

function resetTimer() {
  remaining = 1500;
  intervalId = null;
  startedAt = null;
  focusSessionId = null;
  renderTimer();
}

function stopTimer() {
  if (intervalId === null) return;

  clearInterval(intervalId);
  intervalId = null;
}

async function tick() {
  remaining -= 1;
  renderTimer();

  const durationSeconds = 1500 - remaining;
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

  if (remaining === 1200) {
    // 5分到達時：開始時刻と経過時間（300秒）を保存
    const response = await fetch("/focus_sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken
      },
      body: JSON.stringify({
        focus_session: {
          started_at: startedAt,
          duration_seconds: durationSeconds
        }
      })
    });

    if (!response.ok) {
      console.error("POST失敗", response.status);
      return;
    }

    const data = await response.json();
    focusSessionId = data.id;
    console.log("5分到達");
    console.log("focusSessionId:", focusSessionId);
  }

  if (remaining <= 0) {
    stopTimer();

    // 25分完了時：同じセッションを更新し、完了時刻と最終経過時間を保存
    const response = await fetch(`/focus_sessions/${focusSessionId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken
      },
      body: JSON.stringify({
        focus_session: {
          duration_seconds: 1500,
          completed_at: new Date().toISOString()
        }
      })
    });

    if (!response.ok) {
      console.error("PATCH失敗", response.status);
      return;
    }

    console.log("25分完了");
    console.log("focusSessionId:", focusSessionId);
    console.log("PATCH status:", response.status);
  }
}

function startTimer() {
  if (intervalId !== null) return;

  startedAt = new Date().toISOString();
  renderTimer();

  intervalId = setInterval(() => {
    tick();
  }, 1000);
}

document.addEventListener("turbo:load", () => {
  const startButton = document.getElementById("start-button");
  const stopButton = document.getElementById("stop-button");

  renderTimer();

  if (startButton) {
    startButton.addEventListener("click", startTimer);
  }

  if (stopButton) {
    stopButton.addEventListener("click", () => {
      stopTimer();
      resetTimer();
    });
  }
});