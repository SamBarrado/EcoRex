import type { DinoAttributes } from '../../shared/types';

export async function generateDinoImage(
  attrs: DinoAttributes,
  apiKey: string,
  fetchFn: typeof fetch = fetch
): Promise<string> {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing or empty');
  }

  const prompt = `A friendly cartoon dinosaur for a children's app, ${attrs.size} size, living in ${attrs.habitat}, ${attrs.diet} diet, with ${attrs.feature}, ${attrs.personality} personality. Colorful, simple, no text, no watermark, solid background color #0d1a0f.`;

  const response = await fetchFn('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'low',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = (await response.json()) as { data: { b64_json: string }[] };
  if (!data.data?.[0]?.b64_json) {
    throw new Error('No image data in OpenAI response');
  }
  return data.data[0].b64_json;
}

// Ecorex addition (not part of the ported DinoDiscovery file): unique-variant
// discoveries are generated image-to-image over the curated species/phase
// anchor, not from free-form attributes, so this calls /v1/images/edits with
// the anchor bytes as input instead of /v1/images/generations.
export async function generateDinoVariant(
  anchorImage: ArrayBuffer,
  prompt: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch
): Promise<string> {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing or empty');
  }

  const form = new FormData();
  form.append('model', 'gpt-image-2');
  form.append('image', new Blob([anchorImage], { type: 'image/png' }), 'anchor.png');
  form.append('prompt', prompt);
  form.append('n', '1');
  form.append('size', '1024x1024');
  form.append('quality', 'low');

  const response = await fetchFn('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = (await response.json()) as { data: { b64_json: string }[] };
  if (!data.data?.[0]?.b64_json) {
    throw new Error('No image data in OpenAI response');
  }
  return data.data[0].b64_json;
}
