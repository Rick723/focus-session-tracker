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

function sessionKindMeta(kind, calendarPage) {
  if (kind === "completed") {
    return {
      label: "ポモちゃん",
      toneClass: "calendar-session-item--completed",
      icon64: calendarPage.dataset.completedIconLarge
    };
  }

  if (kind === "reached_five_minutes") {
    return {
      label: "ドロちゃん",
      toneClass: "calendar-session-item--five-minutes",
      icon64: calendarPage.dataset.fiveMinutesIconLarge
    };
  }

  return {
    label: "きろく",
    toneClass: "calendar-session-item--other",
    icon64: ""
  };
}

function buildSessionItem(session, calendarPage) {
  const kindMeta = sessionKindMeta(session.kind, calendarPage);
  const item = document.createElement("article");
  item.className = `calendar-session-item ${kindMeta.toneClass}`;

  const icon = document.createElement("img");
  icon.className = "calendar-session-item-icon";
  icon.src = kindMeta.icon64;
  icon.alt = kindMeta.label;
  icon.width = 64;
  icon.height = 64;

  const body = document.createElement("div");
  body.className = "calendar-session-item-body";

  const heading = document.createElement("div");
  heading.className = "calendar-session-item-heading";

  const label = document.createElement("p");
  label.className = "calendar-session-item-label";
  label.textContent = kindMeta.label;

  const duration = document.createElement("p");
  duration.className = "calendar-session-item-duration";
  duration.textContent = formatDuration(session.duration_seconds);

  heading.append(label, duration);

  const time = document.createElement("p");
  time.className = "calendar-session-item-time";
  time.textContent = formatSessionTime(session.started_at);

  const meta = document.createElement("p");
  meta.className = "calendar-session-item-meta";
  meta.textContent = `開始時刻 ${formatSessionTime(session.started_at)}`;

  body.append(heading, meta);

  item.append(icon, body, time);
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
  const calendarPage = document.querySelector("[data-calendar-page]");
  const modal = document.querySelector("[data-calendar-modal]");
  if (!calendarPage || !modal || calendarPage.dataset.calendarBound === "true") return;

  const modalDate = modal.querySelector("[data-calendar-modal-date]");
  const modalList = modal.querySelector("[data-calendar-modal-list]");
  const modalEmpty = modal.querySelector("[data-calendar-modal-empty]");
  const modalSummary = modal.querySelector("[data-calendar-modal-summary]");

  if (!modalDate || !modalList || !modalEmpty || !modalSummary) return;

  calendarPage.dataset.calendarBound = "true";

  function renderModalSummary(sessions) {
    modalSummary.replaceChildren();

    const completedCount = sessions.filter((session) => session.kind === "completed").length;
    const fiveMinutesCount = sessions.filter((session) => session.kind === "reached_five_minutes").length;

    if (completedCount === 0 && fiveMinutesCount === 0) {
      modalSummary.hidden = true;
      return;
    }

    [
      {
        key: "completed",
        count: completedCount
      },
      {
        key: "reached_five_minutes",
        count: fiveMinutesCount
      }
    ].forEach(({ key, count }) => {
      if (count === 0) return;

      const kindMeta = sessionKindMeta(key, calendarPage);
      const badge = document.createElement("div");
      badge.className = "calendar-modal-summary-badge";

      const icon = document.createElement("img");
      icon.className = "calendar-modal-summary-badge__icon";
      icon.src = kindMeta.icon64;
      icon.alt = kindMeta.label;
      icon.width = 64;
      icon.height = 64;

      const text = document.createElement("div");
      text.className = "calendar-modal-summary-badge__text";

      const label = document.createElement("p");
      label.className = "calendar-modal-summary-badge__label";
      label.textContent = kindMeta.label;

      const countText = document.createElement("p");
      countText.className = "calendar-modal-summary-badge__count";
      countText.textContent = `${count}回`;

      text.append(label, countText);
      badge.append(icon, text);
      modalSummary.append(badge);
    });

    modalSummary.hidden = false;
  }

  async function showDayDetails(dayCard) {
    const { date } = dayCard.dataset;
    if (!date) return;

    try {
      const data = await fetchDayDetails(date);

      modalDate.textContent = data.date;
      modalList.replaceChildren();

      if (data.sessions.length === 0) {
        modalEmpty.hidden = false;
        modalSummary.hidden = true;
      } else {
        modalEmpty.hidden = true;
        renderModalSummary(data.sessions);
        data.sessions.forEach((session) => {
          modalList.append(buildSessionItem(session, calendarPage));
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
