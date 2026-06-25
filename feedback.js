const API_BASE = 'https://pesosdageuqdcocwcfqe.supabase.co/functions/v1/booking-app';
const feedbackForm = document.querySelector("#feedbackForm");
const feedbackMessage = document.querySelector("#feedbackMessage");

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
    const response = await fetch(`${API_BASE}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

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
