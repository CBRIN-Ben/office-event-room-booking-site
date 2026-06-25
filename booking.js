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
    const response = await fetch(`${API_BASE}/api/calendar?${params}`);
    const result = await response.json();

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
    const response = await fetch(`${API_BASE}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getFormPayload(bookingForm))
    });
    const result = await response.json();

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
