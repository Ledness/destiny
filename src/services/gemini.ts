export async function askGM(prompt: string) {
  try {
    const response = await fetch("/api/gm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) throw new Error("Server error");
    const data = await response.json();
    return data.text || "진행자가 침묵에 빠졌습니다...";
  } catch (error) {
    console.error("GM API Error:", error);
    return "진행자와의 연결이 끊겼습니다. (서버 에러 발생)";
  }
}
