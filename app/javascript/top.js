let boundTopPage = null;
let boundTopModalBindings = [];
let boundTopCloseBindings = [];
let boundTopKeydownHandler = null;

function hasVisibleTopModal() {
  return boundTopModalBindings.some(({ modal }) => !modal.hidden);
}

function openTopModal(modal) {
  boundTopModalBindings.forEach(({ modal: currentModal }) => {
    if (currentModal !== modal) closeTopModal(currentModal);
  });

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeTopModal(modal) {
  modal.hidden = true;

  if (!hasVisibleTopModal()) {
    document.body.style.overflow = "";
  }
}

function cleanupTopModal() {
  boundTopModalBindings.forEach(({ modal }) => {
    modal.hidden = true;
  });

  boundTopModalBindings.forEach(({ openButton, openHandler }) => {
    openButton.removeEventListener("click", openHandler);
  });
  boundTopModalBindings = [];

  boundTopCloseBindings.forEach(({ element, handler }) => {
    element.removeEventListener("click", handler);
  });
  boundTopCloseBindings = [];

  if (boundTopKeydownHandler) {
    document.removeEventListener("keydown", boundTopKeydownHandler);
    boundTopKeydownHandler = null;
  }

  if (boundTopPage) {
    delete boundTopPage.dataset.topBound;
  }

  document.body.style.overflow = "";
  boundTopPage = null;
}

function initializeTopModal() {
  const topPage = document.querySelector("[data-top-page]");
  const openButtons = Array.from(document.querySelectorAll("[data-top-modal-open]"));
  const modals = Array.from(document.querySelectorAll("[data-top-modal]"));

  if (!topPage || openButtons.length === 0 || modals.length === 0) {
    cleanupTopModal();
    return;
  }

  if (topPage.dataset.topBound === "true") return;

  topPage.dataset.topBound = "true";
  boundTopPage = topPage;

  openButtons.forEach((openButton) => {
    const modalId = openButton.getAttribute("aria-controls");
    if (!modalId) return;

    const modal = document.getElementById(modalId);
    if (!modal) return;

    const openHandler = () => {
      openTopModal(modal);
    };
    openButton.addEventListener("click", openHandler);
    boundTopModalBindings.push({ modal, openButton, openHandler });

    modal.querySelectorAll("[data-top-modal-close]").forEach((element) => {
      const closeHandler = () => {
        if (!modal.hidden) closeTopModal(modal);
      };

      boundTopCloseBindings.push({ element, handler: closeHandler });
      element.addEventListener("click", closeHandler);
    });
  });

  boundTopKeydownHandler = (event) => {
    if (event.key !== "Escape") return;

    const openedModalBinding = boundTopModalBindings.find(({ modal }) => !modal.hidden);
    if (!openedModalBinding) return;

    closeTopModal(openedModalBinding.modal);
  };
  document.addEventListener("keydown", boundTopKeydownHandler);
}

document.addEventListener("turbo:load", initializeTopModal);
document.addEventListener("turbo:before-cache", cleanupTopModal);
