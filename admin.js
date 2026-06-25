const API_BASE = 'https://pesosdageuqdcocwcfqe.supabase.co/functions/v1/booking-app';
const adminKeyInput = document.querySelector("#adminKey");
const loadBookingsButton = document.querySelector("#loadBookings");
const refreshBookingsButton = document.querySelector("#refreshBookings");
const statusFilter = document.querySelector("#statusFilter");
const adminMessage = document.querySelector("#adminMessage");
const bookingsList = document.querySelector("#bookingsList");
const bookingCardTemplate = document.querySelector("#bookingCardTemplate");

let bookings = [];

function getAdminKey() {
  return adminKeyInput.value.trim();
}

function showAdminMessage(text, type = "info") {
  adminMessage.textContent = text;
  adminMessage.className = `message message--${type}`;
}

function formatDateTime(booking) {
  return `${booking.eventDate} ${booking.startTime} - ${booking.booking1EndDate || booking.eventDate} ${booking.endTime}`;
}

function calendarText(calendar) {
  if (!calendar) return "Calendar: not synced yet.";
  if (calendar.htmlLink) return "Calendar: event created.";
  if (calendar.skipped) return `Calendar: ${calendar.reason}`;
  if (calendar.error) return `Calendar error: ${calendar.error}`;
  return "Calendar: status unknown.";
}

function detailRows(booking) {
  return [
    ["Contact", booking.contact || "Not provided"],
    ["Rooms required", booking.roomsRequired?.length ? booking.roomsRequired.join(", ") : booking.room],
    ["Booking 1", formatDateTime(booking)],
    ["Booking 2", booking.booking2Date ? `${booking.booking2Date} ${booking.booking2StartTime || ""} - ${booking.booking2EndDate || booking.booking2Date} ${booking.booking2EndTime || ""}` : "Not requested"],
    ["Attendees", booking.attendees],
    ["Layout", booking.layout],
    ["About event", booking.eventDescription || booking.eventTitle],
    ["CBRIN support", booking.supportRequired?.length ? booking.supportRequired.join(", ") : "None"],
    ["AV", booking.avRequirements?.length ? booking.avRequirements.join(", ") : "None"],
    ["Support details", booking.supportDetails || "None"],
    ["Equipment", booking.equipmentByRequest?.length ? booking.equipmentByRequest.join(", ") : "None"],
    ["Catering", booking.cateringRequired?.length ? booking.cateringRequired.join(", ") : "None"],
    ["Dietary requirements", booking.dietaryRequirements || "None"],
    ["Room calendar", booking.calendar?.events?.map((event) => `${event.room}: ${event.calendarId}`).join(", ") || booking.calendar?.calendarId || "Not created yet"],
    ["Submitted", new Date(booking.createdAt).toLocaleString()]
  ];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatList(items) {
  return Array.isArray(items) && items.length ? items.join(", ") : "None";
}

function slugify(value) {
  return String(value || "run-sheet").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "run-sheet";
}

function buildRunSheetHtml(booking, adminNotes = "") {
  const rooms = booking.roomsRequired?.length ? booking.roomsRequired : [booking.room].filter(Boolean);
  const notes = adminNotes || booking.adminNotes || "Confirm room reset and next steps.";
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Run Sheet - ${escapeHtml(booking.eventTitle)}</title>
  <style>
    :root{--text:#301548;--muted:#6f617b;--line:#e6d8ee;--cream:#fff9f2;--primary:#5b2d82;--accent:#d8a12b}
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;color:var(--text);line-height:1.45;margin:0;background:#f8f4fb}
    main{max-width:980px;margin:0 auto;padding:32px 20px}
    .sheet{background:#fff;border:1px solid var(--line);border-radius:22px;padding:28px}
    .sheet-header{align-items:flex-start;border-bottom:3px solid var(--primary);display:flex;gap:16px;justify-content:space-between;margin-bottom:22px;padding-bottom:18px}
    .eyebrow{color:var(--accent);font-size:12px;font-weight:700;letter-spacing:.14em;margin:0 0 8px;text-transform:uppercase}
    h1{font-size:34px;line-height:1.05;margin:0} h2{font-size:18px;margin:26px 0 12px}
    .print-button{background:var(--accent);border:0;border-radius:999px;color:var(--text);cursor:pointer;font-weight:900;padding:12px 18px;white-space:nowrap}
    .meta{background:var(--cream);border:1px solid var(--line);border-radius:14px;display:grid;gap:8px;grid-template-columns:repeat(2,minmax(0,1fr));padding:14px;margin:18px 0}
    .meta p{margin:0}
    table{border-collapse:collapse;width:100%;margin-top:12px}
    th,td{border:1px solid var(--line);padding:12px;text-align:left;vertical-align:top}
    th{background:var(--cream)}
    .notes{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px}
    @media print{body{background:#fff}main{max-width:none;padding:0}.sheet{border:0;border-radius:0;padding:0}.print-button{display:none}.meta{break-inside:avoid}table{break-inside:auto}tr{break-inside:avoid}}
  </style>
</head>
<body>
  <main>
    <section class="sheet">
      <div class="sheet-header">
        <div>
          <p class="eyebrow">CBRIN Event Run Sheet</p>
          <h1>${escapeHtml(booking.eventTitle)}</h1>
        </div>
        <button class="print-button" onclick="window.print()">Print / Save PDF</button>
      </div>
      <div class="meta">
        <p><strong>Date/time:</strong> ${escapeHtml(booking.eventDate)} ${escapeHtml(booking.startTime)} - ${escapeHtml(booking.booking1EndDate || booking.eventDate)} ${escapeHtml(booking.endTime)}</p>
        <p><strong>Room(s):</strong> ${escapeHtml(formatList(rooms))}</p>
        <p><strong>Expected attendees:</strong> ${escapeHtml(booking.attendees)}</p>
        <p><strong>Contact:</strong> ${escapeHtml(booking.contact)}</p>
    </div>
    <table>
      <thead><tr><th>Time</th><th>Item</th><th>Misc Info</th><th>Jobs</th></tr></thead>
      <tbody>
        <tr><td>${escapeHtml(booking.startTime)}</td><td>Client arrival / room access</td><td>${escapeHtml(booking.contact)}</td><td>CBRIN team</td></tr>
        <tr><td>${escapeHtml(booking.startTime)}</td><td>Room set up</td><td>Layout: ${escapeHtml(booking.layout)}</td><td>Facilities</td></tr>
        <tr><td>${escapeHtml(booking.startTime)}</td><td>AV / tech check</td><td>${escapeHtml(formatList(booking.avRequirements))}</td><td>AV support</td></tr>
        <tr><td>${escapeHtml(booking.startTime)}</td><td>Catering / dietary check</td><td>${escapeHtml(formatList(booking.cateringRequired))}<br>${escapeHtml(booking.dietaryRequirements || "None")}</td><td>CBRIN team</td></tr>
        <tr><td>${escapeHtml(booking.endTime)}</td><td>Event close / pack down</td><td>${escapeHtml(notes)}</td><td>CBRIN team</td></tr>
      </tbody>
    </table>
    <h2>Event Notes</h2>
      <div class="notes">
        <p>${escapeHtml(booking.eventDescription || "None")}</p>
        <p><strong>Support required:</strong> ${escapeHtml(formatList(booking.supportRequired))}</p>
        <p><strong>Equipment:</strong> ${escapeHtml(formatList(booking.equipmentByRequest))}</p>
      </div>
    </section>
  </main>
</body>
</html>`;
}

function previewRunSheet(booking, adminNotes) {
  const url = URL.createObjectURL(new Blob([buildRunSheetHtml(booking, adminNotes)], { type: "text/html" }));
  window.open(url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function downloadRunSheet(booking, adminNotes) {
  const url = URL.createObjectURL(new Blob([buildRunSheetHtml(booking, adminNotes)], { type: "application/msword" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(booking.eventTitle)}-run-sheet.doc`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function renderBookings() {
  const filter = statusFilter.value;
  const visibleBookings = filter === "all" ? bookings : bookings.filter((booking) => booking.status === filter);

  bookingsList.replaceChildren();
  if (!visibleBookings.length) {
    bookingsList.innerHTML = '<p class="empty-state">No bookings match this filter.</p>';
    return;
  }

  visibleBookings.forEach((booking) => {
    const card = bookingCardTemplate.content.cloneNode(true);
    const article = card.querySelector(".booking-card");
    const title = card.querySelector("h2");
    const statusPill = card.querySelector(".status-pill");
    const summary = card.querySelector(".booking-summary");
    const detailsGrid = card.querySelector(".details-grid");
    const adminNotes = card.querySelector(".admin-notes");
    const runSheetLink = card.querySelector(".run-sheet-link");
    const runSheetDownloadLink = card.querySelector(".run-sheet-download-link");
    const calendarStatus = card.querySelector(".calendar-status");

    article.dataset.bookingId = booking.id;
    title.textContent = booking.eventTitle;
    statusPill.textContent = booking.status;
    statusPill.classList.add(`status-pill--${booking.status}`);
    summary.textContent = `${booking.roomsRequired?.join(", ") || booking.room} - ${formatDateTime(booking)}`;
    adminNotes.value = booking.adminNotes || "";
    runSheetLink.addEventListener("click", () => previewRunSheet(booking, adminNotes.value));
    runSheetDownloadLink.addEventListener("click", () => downloadRunSheet(booking, adminNotes.value));
    calendarStatus.textContent = calendarText(booking.calendar);
    if (booking.calendar?.htmlLink) {
      const calendarLink = document.createElement("a");
      calendarLink.href = booking.calendar.htmlLink;
      calendarLink.target = "_blank";
      calendarLink.rel = "noopener";
      calendarLink.textContent = " Open calendar event";
      calendarStatus.append(calendarLink);
    }

    detailRows(booking).forEach(([label, value]) => {
      const term = document.createElement("dt");
      const detail = document.createElement("dd");
      term.textContent = label;
      detail.textContent = value;
      detailsGrid.append(term, detail);
    });

    card.querySelector(".approve-button").addEventListener("click", () => updateBooking(booking.id, "approve", adminNotes.value));
    card.querySelector(".reject-button").addEventListener("click", () => updateBooking(booking.id, "reject", adminNotes.value));
    card.querySelector(".pending-button").addEventListener("click", () => updateBooking(booking.id, "pending", adminNotes.value));

    bookingsList.append(card);
  });
}

async function loadBookings() {
  if (!getAdminKey()) {
    showAdminMessage("Enter the admin key first.", "error");
    return;
  }

  showAdminMessage("Loading bookings...");
  try {
    const response = await fetch(`${API_BASE}/api/bookings`, {
      headers: { "X-Admin-Key": getAdminKey() }
    });
    const result = await response.json();

    if (!response.ok) {
      showAdminMessage(result.errors?.join(" ") || "Unable to load bookings.", "error");
      return;
    }

    bookings = result.bookings;
    renderBookings();
    showAdminMessage(`Loaded ${bookings.length} booking request${bookings.length === 1 ? "" : "s"}.`, "success");
  } catch {
    showAdminMessage("Unable to reach the booking server.", "error");
  }
}

async function updateBooking(bookingId, action, adminNotes) {
  showAdminMessage("Updating booking...");
  try {
    const response = await fetch(`${API_BASE}/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": getAdminKey()
      },
      body: JSON.stringify({ action, adminNotes })
    });
    const result = await response.json();

    if (!response.ok) {
      const conflictText = result.conflicts?.length
        ? ` Conflict: ${result.conflicts.map((event) => `${new Date(event.start).toLocaleString()} - ${new Date(event.end).toLocaleTimeString()}`).join(", ")}.`
        : "";
      showAdminMessage(`${result.errors?.join(" ") || "Unable to update booking."}${conflictText}`, "error");
      return;
    }

    bookings = bookings.map((booking) => (booking.id === bookingId ? result.booking : booking));
    renderBookings();
    showAdminMessage(`Booking ${result.booking.status}.`, "success");
  } catch {
    showAdminMessage("Unable to update booking.", "error");
  }
}

loadBookingsButton.addEventListener("click", loadBookings);
refreshBookingsButton.addEventListener("click", loadBookings);
statusFilter.addEventListener("change", renderBookings);
