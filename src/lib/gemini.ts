import { GoogleGenAI } from "@google/genai";

export async function identifyStudent(liveCaptureBase64: string, candidates: { id: string, photoUrl: string }[]): Promise<{
  matchId: string | null;
  confidence: number;
  reason?: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { matchId: null, confidence: 0, reason: "API key error" };
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Helper to extract data and mime type
  const SUPPORTED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

  const getImageData = async (input: string) => {
    if (!input) return null;
    
    let mimeType = "image/jpeg";
    let data = "";

    const match = input.match(/^data:(image\/[a-zA-Z1-9.-]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      data = match[2];
    } else if (input.startsWith('http')) {
      try {
        const response = await fetch(input);
        const blob = await response.blob();
        mimeType = blob.type || "image/jpeg";
        const buffer = await blob.arrayBuffer();
        data = btoa(new Uint8Array(buffer).reduce((d, byte) => d + String.fromCharCode(byte), ''));
      } catch (err) {
        return null;
      }
    } else {
      data = input.replace(/\s/g, '');
    }

    if (!SUPPORTED_MIMES.includes(mimeType)) {
      console.warn(`Unsupported MIME type: ${mimeType}. Skipping image.`);
      return null;
    }

    return { mimeType, data };
  };

  const liveImg = await getImageData(liveCaptureBase64);
  if (!liveImg) return { matchId: null, confidence: 0, reason: "Invalid capture" };

  // Get data for all candidates
  const candidateImages = await Promise.all(
    candidates.map(async (c) => ({
      id: c.id,
      data: await getImageData(c.photoUrl)
    }))
  );

  const validCandidates = candidateImages.filter(c => c.data !== null);
  if (validCandidates.length === 0) return { matchId: null, confidence: 0, reason: "No valid candidates" };

  const prompt = `Task: Face Recognition for Bus Entry System.
  Compare the "Live Capture" image from the bus entry camera with the provided "Student Records" (profile pictures).
  
  Instructions:
  1. Carefully analyze facial features (eyes, nose, mouth, jawline) between the Live Capture and each Student Record.
  2. The Live Capture may have different lighting, background, or camera angle.
  3. Identify which Student ID from the records matches the person in the Live Capture.
  4. If no student matches with reasonable confidence (e.g., a stranger or very poor match), set matchId to null.
  
  Respond ONLY with a JSON object:
  {
    "matchId": "the matching student id or null",
    "confidence": number (0-1),
    "reason": "short explanation of the match or mismatch"
  }`;

  try {
    const parts: any[] = [{ text: prompt }];

    // Add Live Capture
    parts.push({ text: "Live Capture:" });
    parts.push({ inlineData: { mimeType: liveImg.mimeType, data: liveImg.data } });

    // Add Candidates
    parts.push({ text: "Student Records:" });
    validCandidates.forEach((c) => {
      parts.push({ text: `Student ID: ${c.id}` });
      parts.push({ inlineData: { mimeType: c.data!.mimeType, data: c.data!.data } });
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts }],
      config: { responseMimeType: "application/json" }
    });

    const parsed = JSON.parse(response.text || "{}");
    return {
      matchId: parsed.matchId || null,
      confidence: Number(parsed.confidence) || 0,
      reason: parsed.reason
    };
  } catch (error) {
    console.error("Gemini identification failed:", error);
    return { matchId: null, confidence: 0, reason: "AI processing error" };
  }
}
