const API_BASE = 'https://pesosdageuqdcocwcfqe.supabase.co/functions/v1/booking-app';
const bookingForm = document.querySelector("#bookingForm");
const formMessage = document.querySelector("#formMessage");
const roomInput = document.querySelector("#room");
const eventDateInput = document.querySelector("#eventDate");
const startTimeInput = document.querySelector("#startTime");
const endTimeInput = document.querySelector("#endTime");
const availabilitySummary = document.querySelector("#availabilitySummary");
const availabilityList = document.querySelector("#availabilityList");

let availabilityTimer;

// #region agent log
function agentLog(runId, hypothesisId, message, data = {}) {
  fetch('http://127.0.0.1:7543/ingest/80c137fa-069d-428e-8f98-f2649c4c55a5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'837bd1'},body:JSON.stringify({sessionId:'837bd1',runId,hypothesisId,location:'docs/booking.js',message,data,timestamp:Date.now()})}).catch(()=>{});
}
// #endregion

function showMessage(text, type = "info") {
  formMessage.textContent = text;
  formMessage.className = `message message--${type}`;
}

function getFormPayload(form) {
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  payload.roomsRequired = formData.getAll("roomsRequired");
  payload.supportRequired = formData.getAll("supportRequired");
  payload.avRequirements = formData.getAll("avRequirements");
  payload.equipmentByRequest = formData.getAll("equipmentByRequest");
  payload.cateringRequired = formData.getAll("cateringRequired");
  return payload;
}

function formatEventTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatAvailabilityDate(value) {
  return new Date(value).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}

function selectedRangeOverlaps(event) {
  if (!eventDateInput.value || !startTimeInput.value || !endTimeInput.value) return false;
  const selectedStart = new Date(`${eventDateInput.value}T${startTimeInput.value}:00`);
  const selectedEnd = new Date(`${eventDateInput.value}T${endTimeInput.value}:00`);
  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);
  return selectedStart < eventEnd && selectedEnd > eventStart;
}

function renderAvailability(events) {
  availabilityList.replaceChildren();
  const conflicts = events.filter(selectedRangeOverlaps);

  if (!events.length) {
    availabilitySummary.textContent = "No existing calendar bookings found for this room on the selected date.";
    return;
  }

  availabilitySummary.textContent = conflicts.length
    ? "The selected time overlaps an existing booking. Please choose another time."
    : "Existing bookings for this room on the selected date:";

  events.forEach((event) => {
    const item = document.createElement("li");
    item.className = selectedRangeOverlaps(event) ? "availability-conflict" : "";
    item.textContent = `${formatAvailabilityDate(event.start)} ${formatEventTime(event.start)} - ${formatEventTime(event.end)}: ${event.title}`;
    availabilityList.append(item);
  });
}

async function checkAvailability() {
  const room = roomInput.value;
  const date = eventDateInput.value;
  availabilityList.replaceChildren();

  if (!room || !date) {
    availabilitySummary.textContent = "Select a room and date to check existing calendar bookings.";
    return;
  }

  availabilitySummary.textContent = "Checking Google Calendar availability...";

  try {
    const params = new URLSearchParams({ room, date, days: "1" });
    agentLog("initial-live-test", "H1-calendar-api", "calendar request start", { apiBase: API_BASE, room, date });
    const response = await fetch(`${API_BASE}/api/calendar?${params}`);
    const result = await response.json();
    agentLog("initial-live-test", "H1-calendar-api", "calendar response", { status: response.status, ok: response.ok, skipped: Boolean(result.skipped), eventCount: Array.isArray(result.events) ? result.events.length : null, hasErrors: Boolean(result.errors?.length) });

    if (!response.ok) {
      availabilitySummary.textContent = result.errors?.join(" ") || "Unable to load room availability.";
      return;
    }

    if (result.skipped) {
      availabilitySummary.textContent = result.reason;
      return;
    }

    renderAvailability(result.events || []);
  } catch {
    availabilitySummary.textContent = "Unable to reach Google Calendar availability.";
  }
}

function scheduleAvailabilityCheck() {
  window.clearTimeout(availabilityTimer);
  availabilityTimer = window.setTimeout(checkAvailability, 250);
}

roomInput.addEventListener("change", scheduleAvailabilityCheck);
eventDateInput.addEventListener("change", scheduleAvailabilityCheck);
startTimeInput.addEventListener("change", scheduleAvailabilityCheck);
endTimeInput.addEventListener("change", scheduleAvailabilityCheck);

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("Submitting your booking request...");

  try {
    const submissionPayload = getFormPayload(bookingForm);
    agentLog("initial-live-test", "H2-booking-submit", "booking submit start", {
      apiBase: API_BASE,
      roomsCount: submissionPayload.roomsRequired.length,
      supportCount: submissionPayload.supportRequired.length,
      avCount: submissionPayload.avRequirements.length,
      cateringCount: submissionPayload.cateringRequired.length,
      hasContact: Boolean(submissionPayload.contact),
      hasDescription: Boolean(submissionPayload.eventDescription)
    });
    const response = await fetch(`${API_BASE}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submissionPayload)
    });
    const result = await response.json();
    agentLog("initial-live-test", "H2-booking-submit", "booking submit response", { status: response.status, ok: response.ok, hasBookingId: Boolean(result.booking?.id), returnedStatus: result.booking?.status || null, hasErrors: Boolean(result.errors?.length), conflictCount: Array.isArray(result.conflicts) ? result.conflicts.length : 0 });

    if (!response.ok) {
      const conflictText = result.conflicts?.length
        ? ` Existing booking: ${result.conflicts.map((event) => `${formatEventTime(event.start)} - ${formatEventTime(event.end)}`).join(", ")}.`
        : "";
      showMessage(`${result.errors?.join(" ") || "Unable to submit booking request."}${conflictText}`, "error");
      await checkAvailability();
      return;
    }

    bookingForm.reset();
    availabilityList.replaceChildren();
    availabilitySummary.textContent = "Select a room and date to check existing calendar bookings.";
    showMessage("Thanks. Your booking request has been submitted for review.", "success");
  } catch {
    showMessage("Unable to reach the booking server. Please try again or contact the office team.", "error");
  }
});
