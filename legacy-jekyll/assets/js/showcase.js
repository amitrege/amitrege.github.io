(function () {
  var storageKey = "showcase-theme";
  var themes = ["signal", "neural", "graph"];
  var buttons = Array.prototype.slice.call(document.querySelectorAll(".theme-btn"));

  function setTheme(theme) {
    if (themes.indexOf(theme) === -1) return;
    document.body.dataset.theme = theme;
    buttons.forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.theme === theme);
    });
    try {
      localStorage.setItem(storageKey, theme);
    } catch (error) {
      // Ignore localStorage failures in private browsing modes.
    }
  }

  var savedTheme = null;
  try {
    savedTheme = localStorage.getItem(storageKey);
  } catch (error) {
    savedTheme = null;
  }
  if (savedTheme) setTheme(savedTheme);

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      setTheme(button.dataset.theme);
    });
  });
})();
