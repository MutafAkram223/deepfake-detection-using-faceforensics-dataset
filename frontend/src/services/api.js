const API_BASE = "http://127.0.0.1:8000";

export async function predictVideo(file) {
  const formData = new FormData();
  formData.append("video", file);

  const response = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Prediction failed");
  }

  return await response.json();
}