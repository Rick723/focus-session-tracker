let remaining = 1500;
let intervalId = null;
let startedAt = null;
let focusSessionId = null;

function httpError(response, action) {
  alert("通信に失敗しました。もう一度お試しください。");
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

function resetTimer() {
  remaining = 1500;
  intervalId = null;
  startedAt = null;
  focusSessionId = null;

  localStorage.removeItem("startedAt");
  localStorage.removeItem("focusSessionId");
  localStorage.removeItem("postedStartedAt");

  toggleTimerButtons(false);

  const creature = document.getElementById("creature-icon");
  if (creature) {
    creature.innerText = "🥚";
  }

  renderTimer();
}

function stopTimer() {
  if (intervalId === null) return;

  clearInterval(intervalId);
  intervalId = null;
}

// TODO(ISSUE8以降):
// リロード時にタイマー進行状態（残り時間・表示状態）を復元する
async function tick() {
  remaining -= 1;
  renderTimer();

  const durationSeconds = 1500 - remaining;
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

  if (remaining === 1200) {
    const currentStartedAt = startedAt || localStorage.getItem("startedAt");
    const postedStartedAt = localStorage.getItem("postedStartedAt");
    const alreadyPosted = currentStartedAt === postedStartedAt;

    if (!alreadyPosted) {
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
          httpError(response, "POST");
          return;
        }

        const data = await response.json();
        focusSessionId = data.id;

        localStorage.setItem("focusSessionId", String(focusSessionId));
        localStorage.setItem("postedStartedAt", currentStartedAt);

        const creature = document.getElementById("creature-icon");
        if (creature) {
          creature.innerText = "⚫";
        }

        console.log("5分到達");
        console.log("startedAt", currentStartedAt);
        console.log("postedStartedAt(after save)", localStorage.getItem("postedStartedAt"));
        console.log("focusSessionId:", focusSessionId);
      } catch (error) {
        alert("通信に失敗しました。もう一度お試しください。");
        console.error("POST通信エラー", error);
        return;
      }
    }
  }

  if (remaining <= 0) {
    stopTimer();

    if (!focusSessionId) {
      focusSessionId = localStorage.getItem("focusSessionId");
    }

    if (!focusSessionId) {
      alert("通信に失敗しました。もう一度お試しください。");
      console.error("focusSessionId がないため PATCH できません");
      return;
    }

    try {
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
        httpError(response, "PATCH");
        return;
      }

      console.log("25分完了");
      console.log("focusSessionId:", focusSessionId);
      console.log("PATCH status:", response.status);

      // 25分完了後は初期状態へ戻す
      resetTimer();
    } catch (error) {
      alert("通信に失敗しました。もう一度お試しください。");
      console.error("PATCH通信エラー", error);
      return;
    }
  }
}

function startTimer() {
  if (intervalId !== null) return;

  startedAt = new Date().toISOString();
  localStorage.setItem("startedAt", startedAt);

  toggleTimerButtons(true);
  renderTimer();

  intervalId = setInterval(() => {
    tick();
  }, 1000);
}

async function handleStop() {
  stopTimer();

  const durationSeconds = 1500 - remaining;
  const currentFocusSessionId = focusSessionId || localStorage.getItem("focusSessionId");
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

  if (!currentFocusSessionId) {
    resetTimer();
    return;
  }

  try {
    const response = await fetch(`/focus_sessions/${currentFocusSessionId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken
      },
      body: JSON.stringify({
        focus_session: {
          duration_seconds: durationSeconds
        }
      })
    });

    if (!response.ok) {
      httpError(response, "STOP時PATCH");

      // 失敗時は localStorage を消さず、UIだけ初期表示に戻す
      toggleTimerButtons(false);
      renderTimer();
      return;
    }

    resetTimer();
  } catch (error) {
    alert("通信に失敗しました。もう一度お試しください。");
    console.error("STOP時PATCH通信エラー", error);

    // 通信失敗時も localStorage は保持し、UIだけ戻す
    toggleTimerButtons(false);
    renderTimer();
    return;
  }
}

document.addEventListener("turbo:load", () => {
  startedAt = localStorage.getItem("startedAt");
  focusSessionId = localStorage.getItem("focusSessionId");

  const startButton = document.getElementById("start-button");
  const stopButton = document.getElementById("stop-button");

  renderTimer();
  toggleTimerButtons(false);

  if (startButton) {
    startButton.addEventListener("click", startTimer);
  }

  if (stopButton) {
    stopButton.addEventListener("click", () => {
      const confirmed = window.confirm("タイマーを停止してセッションを終了しますか？");
      if (!confirmed) return;

      handleStop();
    });
  }
});