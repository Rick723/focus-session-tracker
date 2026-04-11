let boundTopModal = null;

function openTopModal(modal) {
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeTopModal(modal) {
  modal.hidden = true;
  document.body.style.overflow = "";
}

function initializeTopModal() {
  const topPage = document.querySelector("[data-top-page]");
  const modal = document.querySelector("[data-top-modal]");
  const openButton = document.querySelector("[data-top-modal-open]");

  if (!topPage || !modal || !openButton) return;

  if (boundTopModal && boundTopModal !== modal) {
    document.removeEventListener("keydown", boundTopModal.__topModalKeydownHandler);
    boundTopModal = null;
  }

  if (topPage.dataset.topBound === "true") return;

  topPage.dataset.topBound = "true";

  openButton.addEventListener("click", () => {
    openTopModal(modal);
  });

  modal.querySelectorAll("[data-top-modal-close]").forEach((element) => {
    element.addEventListener("click", () => {
      if (!modal.hidden) closeTopModal(modal);
    });
  });

  const keydownHandler = (event) => {
    if (event.key !== "Escape" || modal.hidden) return;

    closeTopModal(modal);
  };

  modal.__topModalKeydownHandler = keydownHandler;
  boundTopModal = modal;
  document.addEventListener("keydown", keydownHandler);
}

document.addEventListener("turbo:load", initializeTopModal);
