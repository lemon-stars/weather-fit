import type { ClothingCategory, ClothingStyle, ColorTone } from './outfitEngine';

type VisionLabels = {
  category: ClothingCategory;
  style: ClothingStyle;
  colorTone: ColorTone;
  confidence: number;
};

const VALID_CATEGORIES: ClothingCategory[] = [
  'top',
  'bottom',
  'outerwear',
  'shoes',
  'hat',
  'accessory',
  'dress',
];
const VALID_STYLES: ClothingStyle[] = ['casual', 'sport', 'formal'];
const VALID_TONES: ColorTone[] = ['light', 'dark', 'neutral', 'colorful'];

function clampConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function pickValid<T extends string>(value: unknown, allow: T[]): T | null {
  if (typeof value !== 'string') return null;
  return allow.includes(value as T) ? (value as T) : null;
}

function safeJsonParse<T>(raw: string): T | null {
  const trimmed = raw.trim();
  const cleaned = trimmed
    .replace(/^```json/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed reading file'));
    reader.readAsDataURL(file);
  });
}

export async function classifyClothingWithDashscope(file: File): Promise<VisionLabels | null> {
  const apiKey = import.meta.env.VITE_DASHSCOPE_API_KEY?.trim();
  if (!apiKey) return null;

  const model = import.meta.env.VITE_DASHSCOPE_MODEL?.trim() || 'qwen-vl-max-latest';
  const imageDataUrl = await fileToDataUrl(file);

  const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content:
            '你是服饰标签助手。只返回JSON，不要解释。字段为category/style/colorTone/confidence。',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                '请识别图片里的主要单品并只输出 JSON：' +
                '{"category":"top|bottom|outerwear|shoes|hat|accessory|dress",' +
                '"style":"casual|sport|formal",' +
                '"colorTone":"light|dark|neutral|colorful",' +
                '"confidence":0-1}',
            },
            {
              type: 'image_url',
              image_url: { url: imageDataUrl },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const errData = (await res.json()) as {
        error?: { message?: string };
        message?: string;
      };
      detail = errData.error?.message ?? errData.message ?? '';
    } catch {
      // Ignore JSON parse errors for non-2xx responses.
    }
    throw new Error(detail || `DashScope classify failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) return null;

  const parsed = safeJsonParse<{
    category?: string;
    style?: string;
    colorTone?: string;
    confidence?: number;
  }>(raw);
  if (!parsed) return null;

  const category = pickValid(parsed.category, VALID_CATEGORIES);
  const style = pickValid(parsed.style, VALID_STYLES);
  const colorTone = pickValid(parsed.colorTone, VALID_TONES);
  const confidence = clampConfidence(parsed.confidence);

  if (!category || !style || !colorTone) return null;
  return { category, style, colorTone, confidence };
}

