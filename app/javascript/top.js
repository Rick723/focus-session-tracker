let boundTopModal = null;
let boundTopPage = null;
let boundTopOpenButton = null;
let boundTopOpenHandler = null;
let boundTopCloseBindings = [];
let boundTopKeydownHandler = null;

function openTopModal(modal) {
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeTopModal(modal) {
  modal.hidden = true;
  document.body.style.overflow = "";
}

function cleanupTopModal() {
  if (boundTopOpenButton && boundTopOpenHandler) {
    boundTopOpenButton.removeEventListener("click", boundTopOpenHandler);
  }

  boundTopCloseBindings.forEach(({ element, handler }) => {
    element.removeEventListener("click", handler);
  });
  boundTopCloseBindings = [];

  if (boundTopKeydownHandler) {
    document.removeEventListener("keydown", boundTopKeydownHandler);
    boundTopKeydownHandler = null;
  }

  if (boundTopModal && !boundTopModal.hidden) {
    closeTopModal(boundTopModal);
  }

  if (boundTopPage) {
    delete boundTopPage.dataset.topBound;
  }

  boundTopModal = null;
  boundTopPage = null;
  boundTopOpenButton = null;
  boundTopOpenHandler = null;
}

function initializeTopModal() {
  const topPage = document.querySelector("[data-top-page]");
  const modal = document.querySelector("[data-top-modal]");
  const openButton = document.querySelector("[data-top-modal-open]");

  if (!topPage || !modal || !openButton) {
    cleanupTopModal();
    return;
  }

  if (boundTopModal && boundTopModal !== modal) {
    cleanupTopModal();
  }

  if (topPage.dataset.topBound === "true") return;

  topPage.dataset.topBound = "true";
  boundTopPage = topPage;
  boundTopModal = modal;
  boundTopOpenButton = openButton;

  boundTopOpenHandler = () => {
    openTopModal(modal);
  };
  openButton.addEventListener("click", boundTopOpenHandler);

  modal.querySelectorAll("[data-top-modal-close]").forEach((element) => {
    const closeHandler = () => {
      if (!modal.hidden) closeTopModal(modal);
    };

    boundTopCloseBindings.push({ element, handler: closeHandler });
    element.addEventListener("click", closeHandler);
  });

  boundTopKeydownHandler = (event) => {
    if (event.key !== "Escape" || modal.hidden) return;

    closeTopModal(modal);
  };
  document.addEventListener("keydown", boundTopKeydownHandler);
}

document.addEventListener("turbo:load", initializeTopModal);
document.addEventListener("turbo:before-cache", cleanupTopModal);
