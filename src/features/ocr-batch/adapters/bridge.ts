import { BridgeConfig, OcrResult } from "../types";

export const runBridgeOcr = async (file: File, config: BridgeConfig): Promise<OcrResult> => {
  if (!config.baseUrl || !config.apiKey) {
    throw new Error("Bridge configuration (URL or API Key) is missing.");
  }

  // Construct full URL ensuring no double slashes
  const baseUrl = config.baseUrl.replace(/\/$/, "");
  const endpoint = config.endpoint.replace(/^\//, "");
  const fullUrl = `${baseUrl}/${endpoint}`;

  const formData = new FormData();
  formData.append('file', file);
  // We can send additional metadata if needed by the backend
  formData.append('filename', file.name);

  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'X-Api-Key': config.apiKey,
        // Content-Type is set automatically by fetch for FormData to include boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Bridge Error (${response.status}): ${errText.substring(0, 100)}`);
    }

    const result: OcrResult = await response.json();

    // Basic validation to ensure it matches our schema
    if (!result.extraction || !result.full_text) {
        throw new Error("Bridge returned invalid JSON schema.");
    }

    return result;

  } catch (error: any) {
    console.error("Bridge OCR Error:", error);
    throw new Error(error.message || "Failed to communicate with Bridge.");
  }
};
