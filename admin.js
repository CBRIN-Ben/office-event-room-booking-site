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

async function previewRunSheet(bookingId) {
  try {
    const response = await fetch(`${API_BASE}/admin/runsheet/${bookingId}?adminKey=${encodeURIComponent(getAdminKey())}`);
    const body = await response.text();
    if (!response.ok) {
      showAdminMessage("Unable to load run sheet.", "error");
      return;
    }
    const url = URL.createObjectURL(new Blob([body], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    showAdminMessage("Unable to load run sheet.", "error");
  }
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
    const calendarStatus = card.querySelector(".calendar-status");

    article.dataset.bookingId = booking.id;
    title.textContent = booking.eventTitle;
    statusPill.textContent = booking.status;
    statusPill.classList.add(`status-pill--${booking.status}`);
    summary.textContent = `${booking.roomsRequired?.join(", ") || booking.room} - ${formatDateTime(booking)}`;
    adminNotes.value = booking.adminNotes || "";
    runSheetLink.addEventListener("click", () => previewRunSheet(booking.id));
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
