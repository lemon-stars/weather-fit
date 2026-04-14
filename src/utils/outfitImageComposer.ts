import type { WardrobeItem } from './outfitEngine';

type DashscopeImageResponse = {
  output?: {
    choices?: Array<{
      message?: {
        content?: Array<{ image?: string }>;
      };
    }>;
  };
  message?: string;
  code?: string;
};

function urlToDataUrl(url: string): Promise<string> {
  return fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`Fetch image failed: ${res.status}`);
      return res.blob();
    })
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? ''));
          reader.onerror = () => reject(reader.error ?? new Error('Convert image failed'));
          reader.readAsDataURL(blob);
        }),
    );
}

export async function generateOutfitCompositeImage(items: WardrobeItem[]): Promise<string | null> {
  const apiKey = import.meta.env.VITE_DASHSCOPE_API_KEY?.trim();
  if (!apiKey) return null;

  const model = import.meta.env.VITE_DASHSCOPE_IMAGE_MODEL?.trim() || 'qwen-image-2.0-pro';

  const top = items.find((item) => item.category === 'top');
  const bottom = items.find((item) => item.category === 'bottom');
  const shoes = items.find((item) => item.category === 'shoes');
  if (!top || !bottom || !shoes) return null;

  const [topData, bottomData, shoesData] = await Promise.all([
    urlToDataUrl(top.imageUrl),
    urlToDataUrl(bottom.imageUrl),
    urlToDataUrl(shoes.imageUrl),
  ]);

  const content: Array<{ image?: string; text?: string }> = [
    { image: topData },
    { image: bottomData },
    { image: shoesData },
    {
      text:
        '请把图1上衣、图2裤子、图3鞋子抠图并拼成一张干净的穿搭展示图。' +
        '背景用浅灰或白色，服饰按从上到下排布，像电商搭配海报。' +
        '保留原始颜色和材质，不要添加多余人物。',
    },
  ];

  const res = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: {
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      },
      parameters: {
        n: 1,
        watermark: false,
        prompt_extend: true,
        size: '1024*1536',
      },
    }),
  });

  const data = (await res.json()) as DashscopeImageResponse;
  if (!res.ok) {
    const detail = data.message || data.code || `Image compose failed: ${res.status}`;
    throw new Error(detail);
  }

  const imageUrl = data.output?.choices?.[0]?.message?.content?.find((c) => Boolean(c.image))?.image;
  return imageUrl ?? null;
}

