let remaining = 1500;
let intervalId = null;

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
  renderTimer();
}

function stopTimer() {
  if (intervalId === null) return;

  clearInterval(intervalId);
  intervalId = null;
}

function tick() {
  remaining -= 1;
  renderTimer();

  if (remaining === 1200) {
    console.log("5分到達");
  }

  if (remaining <= 0) {
    stopTimer();
    console.log("25分完了");
    // TODO: 完了時UI表示　
  }
}

function startTimer() {
  if (intervalId !== null) return;

  renderTimer();
  intervalId = setInterval(() => {
    tick();
  }, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
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