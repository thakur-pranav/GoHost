// "Display total after taxes" switch on the listings page.
(() => {
  const toggle = document.getElementById("taxSwitch");
  if (!toggle) return;
  toggle.addEventListener("change", (e) => {
    for (const info of document.querySelectorAll(".tax-info")) {
      info.style.display = e.target.checked ? "inline" : "none";
    }
  });
})();
