const API_BASE = 'https://pesosdageuqdcocwcfqe.supabase.co/functions/v1/booking-app';
const bookingForm = document.querySelector("#bookingForm");
const formMessage = document.querySelector("#formMessage");
const roomInputs = Array.from(document.querySelectorAll('input[name="roomsRequired"]'));
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

function getSelectedRooms() {
  return roomInputs.filter((input) => input.checked).map((input) => input.value);
}

function renderAvailability(calendars) {
  availabilityList.replaceChildren();
  const events = calendars.flatMap((calendar) => (calendar.events || []).map((event) => ({ ...event, room: calendar.room })));
  const conflicts = events.filter(selectedRangeOverlaps);

  if (!events.length) {
    availabilitySummary.textContent = "No existing calendar bookings found for the selected room(s) on this date.";
    calendars.forEach((calendar) => {
      const item = document.createElement("li");
      item.textContent = `${calendar.room}: no existing bookings found.`;
      availabilityList.append(item);
    });
    return;
  }

  availabilitySummary.textContent = conflicts.length
    ? "The selected time overlaps an existing booking. Please choose another time."
    : "Existing bookings for this room on the selected date:";

  events.forEach((event) => {
    const item = document.createElement("li");
    item.className = selectedRangeOverlaps(event) ? "availability-conflict" : "";
    item.textContent = `${event.room}: ${formatAvailabilityDate(event.start)} ${formatEventTime(event.start)} - ${formatEventTime(event.end)}: ${event.title}`;
    availabilityList.append(item);
  });
}

async function checkAvailability() {
  const rooms = getSelectedRooms();
  const date = eventDateInput.value;
  availabilityList.replaceChildren();

  if (!rooms.length || !date) {
    availabilitySummary.textContent = "Select one or more rooms and a date to check existing calendar bookings.";
    return;
  }

  availabilitySummary.textContent = "Checking Google Calendar availability...";

  try {
    const calendars = await Promise.all(rooms.map(async (room) => {
      const params = new URLSearchParams({ room, date, days: "1" });
      const response = await fetch(`${API_BASE}/api/calendar?${params}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.errors?.join(" ") || `Unable to load availability for ${room}.`);
      return result;
    }));
    const skipped = calendars.find((calendar) => calendar.skipped);
    if (skipped) {
      availabilitySummary.textContent = skipped.reason;
      return;
    }
    renderAvailability(calendars);
  } catch {
    availabilitySummary.textContent = "Unable to reach Google Calendar availability.";
  }
}

function scheduleAvailabilityCheck() {
  window.clearTimeout(availabilityTimer);
  availabilityTimer = window.setTimeout(checkAvailability, 250);
}

roomInputs.forEach((input) => input.addEventListener("change", scheduleAvailabilityCheck));
eventDateInput.addEventListener("change", scheduleAvailabilityCheck);
startTimeInput.addEventListener("change", scheduleAvailabilityCheck);
endTimeInput.addEventListener("change", scheduleAvailabilityCheck);

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("Submitting your booking request...");

  try {
    const submissionPayload = getFormPayload(bookingForm);
    const response = await fetch(`${API_BASE}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submissionPayload)
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
    availabilitySummary.textContent = "Select one or more rooms and a date to check existing calendar bookings.";
    showMessage("Thanks. Your booking request has been submitted for review.", "success");
  } catch {
    showMessage("Unable to reach the booking server. Please try again or contact the office team.", "error");
  }
});
