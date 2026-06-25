const API_BASE = 'https://pesosdageuqdcocwcfqe.supabase.co/functions/v1/booking-app';
const feedbackForm = document.querySelector("#feedbackForm");
const feedbackMessage = document.querySelector("#feedbackMessage");

// #region agent log
function agentLog(runId, hypothesisId, message, data = {}) {
  fetch('http://127.0.0.1:7543/ingest/80c137fa-069d-428e-8f98-f2649c4c55a5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'837bd1'},body:JSON.stringify({sessionId:'837bd1',runId,hypothesisId,location:'docs/feedback.js',message,data,timestamp:Date.now()})}).catch(()=>{});
}
// #endregion

function showFeedbackMessage(text, type = "info") {
  feedbackMessage.textContent = text;
  feedbackMessage.className = `message message--${type}`;
}

feedbackForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showFeedbackMessage("Submitting feedback...");

  try {
    const formData = new FormData(feedbackForm);
    const payload = Object.fromEntries(formData.entries());
    agentLog("initial-live-test", "H3-feedback-submit", "feedback submit start", { apiBase: API_BASE, hasEventName: Boolean(payload.eventName), role: payload.role || null, assessment: payload.assessment || null, testimonialPermission: payload.testimonialPermission || null });
    const response = await fetch(`${API_BASE}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    agentLog("initial-live-test", "H3-feedback-submit", "feedback submit response", { status: response.status, ok: response.ok, hasFeedbackId: Boolean(result.feedback?.id), hasErrors: Boolean(result.errors?.length) });

    if (!response.ok) {
      showFeedbackMessage(result.errors?.join(" ") || "Unable to submit feedback.", "error");
      return;
    }

    feedbackForm.reset();
    showFeedbackMessage("Thanks. Your feedback has been submitted.", "success");
  } catch {
    showFeedbackMessage("Unable to reach the feedback server. Please try again.", "error");
  }
});
