// Live price estimate on the booking form. The server recalculates the real
// price when the booking is made; this is only a preview.
(() => {
  const form = document.getElementById("booking-form");
  if (!form) return;

  const price = Number(form.dataset.price) || 0;
  const checkIn = document.getElementById("checkIn");
  const checkOut = document.getElementById("checkOut");
  const estimate = document.getElementById("booking-estimate");
  const DAY_MS = 24 * 60 * 60 * 1000;
  const inr = (n) => "₹ " + n.toLocaleString("en-IN");

  const update = () => {
    // Check-out must be at least the day after check-in.
    if (checkIn.value) {
      const next = new Date(Date.parse(checkIn.value) + DAY_MS).toISOString().slice(0, 10);
      checkOut.min = next;
      if (checkOut.value && checkOut.value < next) checkOut.value = "";
    }

    estimate.textContent = "";
    if (!checkIn.value || !checkOut.value) return;
    const nights = Math.round((Date.parse(checkOut.value) - Date.parse(checkIn.value)) / DAY_MS);
    if (nights <= 0) return;

    const subtotal = price * nights;
    const tax = Math.round(subtotal * 0.18);
    estimate.textContent =
      `${inr(price)} x ${nights} night${nights > 1 ? "s" : ""} = ${inr(subtotal)} + ${inr(tax)} GST = ` +
      `${inr(subtotal + tax)}`;
  };

  checkIn.addEventListener("change", update);
  checkOut.addEventListener("change", update);
})();
