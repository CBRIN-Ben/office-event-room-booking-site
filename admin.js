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
    body{font-family:Arial,sans-serif;color:#301548;line-height:1.45}
    main{max-width:900px;margin:0 auto;padding:36px 20px}
    h1{font-size:32px;margin:0 0 8px} h2{margin:0 0 18px}
    .meta{background:#fff9f2;border:1px solid #e6d8ee;border-radius:14px;padding:14px;margin:18px 0}
    table{border-collapse:collapse;width:100%;margin-top:18px}
    th,td{border:1px solid #e6d8ee;padding:12px;text-align:left;vertical-align:top}
    th{background:#fff9f2}
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(booking.eventTitle)}</h1>
    <h2>Run Sheet</h2>
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
    <p>${escapeHtml(booking.eventDescription || "None")}</p>
    <p><strong>Support required:</strong> ${escapeHtml(formatList(booking.supportRequired))}</p>
    <p><strong>Equipment:</strong> ${escapeHtml(formatList(booking.equipmentByRequest))}</p>
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
