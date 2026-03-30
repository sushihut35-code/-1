/**
 * Google Gemini API utility for image generation
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

export interface GenerateImageOptions {
  prompt: string;
  itemName?: string;
  style?: 'product' | 'realistic' | 'minimal' | 'studio';
}

/**
 * Generate an image using Gemini API
 */
export async function generateImage(options: GenerateImageOptions): Promise<string> {
  const { prompt, itemName, style = 'product' } = options;

  if (!API_KEY) {
    throw new Error('Gemini API key is not configured');
  }

  // Build a detailed prompt for product photography
  const enhancedPrompt = buildProductPrompt(prompt, itemName, style);

  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: enhancedPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();

    // Check if the response contains image data
    // Note: Gemini may return inlineData or a different format
    if (data.candidates?.[0]?.content?.parts?.[0]) {
      const part = data.candidates[0].content.parts[0];

      // Handle inlineData (base64 image)
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }

      // Handle text response with image URL
      if (part.text) {
        // Try to extract image URL from text
        const urlMatch = part.text.match(/https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)/i);
        if (urlMatch) {
          return urlMatch[0];
        }
      }
    }

    throw new Error('No image data in response');
  } catch (error) {
    console.error('Failed to generate image:', error);
    throw error;
  }
}

/**
 * Build a detailed prompt for product photography
 */
function buildProductPrompt(basePrompt: string, itemName?: string, style: 'product' | 'realistic' | 'minimal' | 'studio' = 'product'): string {
  let prompt = 'Generate a high-quality product photograph of ';

  if (itemName) {
    prompt += `${itemName}. `;
  } else {
    prompt += `${basePrompt}. `;
  }

  // Add style-specific instructions
  switch (style) {
    case 'product':
      prompt += 'Professional product photography, clean white background, studio lighting, high resolution, commercial quality. ';
      break;
    case 'realistic':
      prompt += 'Photorealistic, detailed texture, natural lighting, real-world setting. ';
      break;
    case 'minimal':
      prompt += 'Minimalist style, clean background, simple composition, neutral colors. ';
      break;
    case 'studio':
      prompt += 'Studio photography, soft lighting, gradient background, professional setup. ';
      break;
  }

  // Add the user's specific requirements
  if (basePrompt && !basePrompt.includes(itemName || '')) {
    prompt += basePrompt;
  }

  // Add technical specifications
  prompt += ' 4K quality, sharp focus, no watermark, no text overlay.';

  return prompt;
}

/**
 * Generate multiple variations of a product image
 */
export async function generateImageVariations(basePrompt: string, count: number = 3): Promise<string[]> {
  const variations: string[] = [];

  for (let i = 0; i < count; i++) {
    const variationPrompt = `${basePrompt}, variation ${i + 1}, different angle ${i % 3 === 0 ? 'front view' : i % 3 === 1 ? 'side view' : 'top view'}`;
    try {
      const imageUrl = await generateImage({ prompt: variationPrompt });
      variations.push(imageUrl);
    } catch (error) {
      console.error(`Failed to generate variation ${i + 1}:`, error);
    }
  }

  return variations;
}
