const STORAGE_KEY = "billCalc.settings";
const DEFAULTS = { rate: 0, currency: "৳" };

const $ = (id) => document.getElementById(id);
const presentEl = $("present");
const previousEl = $("previous");
const errorEl = $("error");
const resultEl = $("result");
const unitsEl = $("unitsUsed");
const rateInlineEl = $("rateInline");
const totalEl = $("total");
const totalAmountEl = $("totalAmount");
const totalCurrencyEl = $("totalCurrency");
const copyBtn = $("copyBtn");
const clearBtn = $("clearBtn");
const rateChip = $("rateChip");
const rateDisplay = $("rateDisplay");
const rateDialog = $("rateDialog");
const rateForm = $("rateForm");
const rateInput = $("rateInput");
const currencyInput = $("currencyInput");
const rateCurrencyPrefix = $("rateCurrencyPrefix");
const toastEl = $("toast");

let settings = loadSettings();
let lastTotal = null;

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...DEFAULTS, ...saved };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable (private mode etc.) — keep working in memory.
  }
}

const fmt = (n, digits = 2) =>
  n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });

const money = (n) => `${fmt(n)} ${settings.currency}`;

function renderRate() {
  const text = settings.rate > 0 ? money(settings.rate) : "Set price";
  rateDisplay.textContent = text;
  rateInlineEl.textContent = settings.rate > 0 ? money(settings.rate) : "—";
}

function setError(message, fields = []) {
  errorEl.hidden = !message;
  errorEl.textContent = message || "";
  [presentEl, previousEl].forEach((el) =>
    el.parentElement.classList.toggle("invalid", fields.includes(el))
  );
}

function calculate() {
  const presentRaw = presentEl.value.trim();
  const previousRaw = previousEl.value.trim();
  const present = parseFloat(presentRaw);
  const previous = parseFloat(previousRaw);

  let total = null;
  let units = 0;

  if (presentRaw === "" || previousRaw === "") {
    setError("");
  } else if (present < previous) {
    setError("Present reading can't be less than the previous reading.", [presentEl]);
  } else if (!(settings.rate > 0)) {
    setError("Set a unit price first — tap the Unit price button above.");
    units = present - previous;
  } else {
    setError("");
    units = present - previous;
    total = units * settings.rate;
  }

  unitsEl.textContent = fmt(units, Number.isInteger(units) ? 0 : 2);
  totalAmountEl.textContent = fmt(total ?? 0);
  totalCurrencyEl.textContent = settings.currency;
  resultEl.classList.toggle("is-invalid", total === null);
  copyBtn.disabled = total === null;

  if (total !== null && total !== lastTotal) {
    totalEl.classList.add("bump");
    setTimeout(() => totalEl.classList.remove("bump"), 150);
  }
  lastTotal = total;
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

/* Readings */
[presentEl, previousEl].forEach((el) => el.addEventListener("input", calculate));

// Enter on "present" jumps to "previous" for quick entry
presentEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") previousEl.focus();
});

clearBtn.addEventListener("click", () => {
  presentEl.value = "";
  previousEl.value = "";
  calculate();
  presentEl.focus();
});

copyBtn.addEventListener("click", async () => {
  if (lastTotal === null) return;
  const text = fmt(lastTotal);
  try {
    await navigator.clipboard.writeText(text);
    showToast(`Copied ${money(lastTotal)}`);
  } catch {
    showToast("Couldn't copy — please copy manually");
  }
});

/* Unit price dialog */
function openRateDialog() {
  rateInput.value = settings.rate > 0 ? settings.rate : "";
  currencyInput.value = settings.currency;
  rateCurrencyPrefix.textContent = settings.currency;
  rateDialog.showModal();
  rateInput.select();
}

rateChip.addEventListener("click", openRateDialog);
currencyInput.addEventListener("input", () => {
  rateCurrencyPrefix.textContent = currencyInput.value || " ";
});

rateDialog.addEventListener("close", () => {
  if (rateDialog.returnValue !== "save") return;
  const rate = parseFloat(rateInput.value);
  if (!(rate >= 0)) return;
  settings = { rate, currency: currencyInput.value.trim() || DEFAULTS.currency };
  saveSettings();
  renderRate();
  calculate();
  showToast("Unit price saved");
});

// Close dialog when clicking the backdrop
rateDialog.addEventListener("click", (e) => {
  if (e.target === rateDialog) rateDialog.close("cancel");
});

/* Init */
renderRate();
calculate();
if (!(settings.rate > 0)) openRateDialog();
else presentEl.focus();
