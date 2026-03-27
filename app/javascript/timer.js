// ISSUE6-2 実装内容
// - 5分到達時に FocusSession を作成
// - 同一 started_at を同一セッション識別子として扱い、重複POSTを防止
// - startedAt / focusSessionId / postedStartedAt を localStorage に保持
// - 5分到達時に UI を 🥚→⚫ に更新
// - 通信失敗時は alert で最低限通知

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

  localStorage.removeItem("startedAt");
  localStorage.removeItem("focusSessionId");
  localStorage.removeItem("postedStartedAt");

  // TODO UIを画像にすり替えること（ISSUEfinal：最終調整）
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

// TODO: リロード時にタイマー進行状態（残り時間・表示状態）を復元する(今後対応)
async function tick() {
  remaining -= 1;
  renderTimer();

  const durationSeconds = 1500 - remaining;
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

  if (remaining === 1200) {
    // 今のセッション識別子（同一 started_at を同一セッションとして扱う）
    const currentStartedAt = startedAt || localStorage.getItem("startedAt");

    // 5分POST済みかを判定するための値
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
          alert("通信に失敗しました。もう一度お試しください。");
          console.error("POST失敗", response.status);
          return;
        }

        const data = await response.json();
        focusSessionId = data.id;

        // POST成功後にのみ永続化する
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
        console.error("PATCH失敗", response.status);
        alert("通信に失敗しました。もう一度お試しください。");
        return;
      }

      console.log("25分完了");
      console.log("focusSessionId:", focusSessionId);
      console.log("PATCH status:", response.status);
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

  // セッション開始時刻を永続化
  localStorage.setItem("startedAt", startedAt);

  renderTimer();

  intervalId = setInterval(() => {
    tick();
  }, 1000);
}

document.addEventListener("turbo:load", () => {
  startedAt = localStorage.getItem("startedAt");
  focusSessionId = localStorage.getItem("focusSessionId");

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