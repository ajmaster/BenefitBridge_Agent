export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read audio data."));
        return;
      }
      // `result` is a data URL like "data:audio/webm;base64,AAAA..."; keep only the payload.
      resolve(result.split(",", 2)[1] ?? "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read audio data."));
    reader.readAsDataURL(blob);
  });
}

export function playAudioBase64(base64: string, mimeType = "audio/mpeg"): void {
  const audio = new Audio(`data:${mimeType};base64,${base64}`);
  void audio.play().catch(() => {
    // Autoplay can be blocked by the browser; the text reply is still shown, so this is non-fatal.
  });
}
