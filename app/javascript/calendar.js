function formatSessionTime(startedAt) {
  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDuration(durationSeconds) {
  const minutes = Math.floor(Number(durationSeconds || 0) / 60);
  return `${minutes}分`;
}

function sessionKindIcon(kind) {
  if (kind === "completed") return "🟡";
  if (kind === "reached_five_minutes") return "⚫";

  return "";
}

function buildSessionItem(session) {
  const item = document.createElement("article");
  item.className = "calendar-session-item";

  const time = document.createElement("p");
  time.className = "calendar-session-item-time";
  time.textContent = formatSessionTime(session.started_at);

  const duration = document.createElement("p");
  duration.className = "calendar-session-item-duration";
  duration.textContent = formatDuration(session.duration_seconds);

  const kind = document.createElement("p");
  kind.className = "calendar-session-item-kind";
  kind.textContent = sessionKindIcon(session.kind);

  item.append(time, duration, kind);
  return item;
}

function openModal(modal) {
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal(modal) {
  modal.hidden = true;
  document.body.style.overflow = "";
}

async function fetchDayDetails(date) {
  const response = await fetch(`/calendar/day_details?date=${encodeURIComponent(date)}`, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`calendar day details failed: ${response.status}`);
  }

  return response.json();
}

function initializeCalendarModal() {
  const calendarPage = document.querySelector(".calendar-page");
  const modal = document.querySelector("[data-calendar-modal]");
  if (!calendarPage || !modal || calendarPage.dataset.calendarBound === "true") return;

  const modalDate = modal.querySelector("[data-calendar-modal-date]");
  const modalList = modal.querySelector("[data-calendar-modal-list]");
  const modalEmpty = modal.querySelector("[data-calendar-modal-empty]");

  if (!modalDate || !modalList || !modalEmpty) return;

  calendarPage.dataset.calendarBound = "true";

  async function showDayDetails(dayCard) {
    const { date } = dayCard.dataset;
    if (!date) return;

    try {
      const data = await fetchDayDetails(date);

      modalDate.textContent = data.date;
      modalList.replaceChildren();

      if (data.sessions.length === 0) {
        modalEmpty.hidden = false;
      } else {
        modalEmpty.hidden = true;
        data.sessions.forEach((session) => {
          modalList.append(buildSessionItem(session));
        });
      }

      openModal(modal);
    } catch (error) {
      console.error("日付詳細の取得に失敗しました", error);
    }
  }

  calendarPage.addEventListener("click", async (event) => {
    const dayCard = event.target.closest("[data-calendar-day]");
    if (!dayCard) return;

    await showDayDetails(dayCard);
  });

  calendarPage.addEventListener("keydown", async (event) => {
    const dayCard = event.target.closest("[data-calendar-day]");
    if (!dayCard) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    await showDayDetails(dayCard);
  });

  modal.querySelectorAll("[data-calendar-close]").forEach((element) => {
    element.addEventListener("click", () => {
      if (!modal.hidden) closeModal(modal);
    });
  });
}

document.addEventListener("turbo:load", initializeCalendarModal);
