export type ClothingCategory =
  | 'top'
  | 'bottom'
  | 'outerwear'
  | 'shoes'
  | 'hat'
  | 'accessory'
  | 'dress';
export type ClothingStyle = 'casual' | 'sport' | 'formal';
export type ColorTone = 'light' | 'dark' | 'neutral' | 'colorful';

export type WardrobeItem = {
  id: string;
  imageUrl: string;
  name: string;
  category: ClothingCategory;
  style: ClothingStyle;
  colorTone: ColorTone;
  warmth: number;
  confidence?: number;
  source?: 'local' | 'dashscope';
};

export type OutfitResult = {
  items: WardrobeItem[];
  score: number;
};

const categoryKeywords: Array<{ category: ClothingCategory; keywords: string[] }> = [
  { category: 'outerwear', keywords: ['jacket', 'coat', '风衣', '外套', '大衣', '夹克'] },
  { category: 'top', keywords: ['shirt', 'tshirt', 'tee', 'blouse', '衬衫', '上衣', '卫衣', '针织', 't恤'] },
  {
    category: 'bottom',
    keywords: ['pants', 'pant', 'jeans', 'trousers', 'skirt', 'shorts', '裤子', '长裤', '短裤', '裤', '裙'],
  },
  { category: 'shoes', keywords: ['shoe', 'sneaker', 'boots', '鞋', '靴'] },
  { category: 'hat', keywords: ['hat', 'cap', 'beanie', '帽'] },
  { category: 'accessory', keywords: ['bag', 'belt', 'necklace', 'scarf', '包', '腰带', '项链', '围巾'] },
  { category: 'dress', keywords: ['dress', '连衣裙'] },
];

const styleKeywords: Array<{ style: ClothingStyle; keywords: string[] }> = [
  { style: 'sport', keywords: ['sport', 'run', '运动'] },
  { style: 'formal', keywords: ['suit', 'formal', '西装', '通勤'] },
  { style: 'casual', keywords: ['casual', '休闲', 'daily'] },
];

const toneKeywords: Array<{ tone: ColorTone; keywords: string[] }> = [
  { tone: 'dark', keywords: ['black', 'navy', '深', '黑', '藏青'] },
  { tone: 'light', keywords: ['white', 'beige', '浅', '白', '米色'] },
  { tone: 'colorful', keywords: ['red', 'pink', 'yellow', '彩', '红', '粉', '黄'] },
  { tone: 'neutral', keywords: ['gray', 'grey', 'neutral', '灰', '中性'] },
];

function pickByKeywords<T extends string>(
  source: string,
  candidates: Array<{ value: T; keywords: string[] }>,
  fallback: T,
): T {
  const text = source.toLowerCase();
  for (const candidate of candidates) {
    if (candidate.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      return candidate.value;
    }
  }
  return fallback;
}

function pickCategoryByScore(source: string): ClothingCategory {
  const text = source.toLowerCase();
  const scored = categoryKeywords.map((item) => {
    const score = item.keywords.reduce((sum, keyword) => {
      const key = keyword.toLowerCase();
      return sum + (text.includes(key) ? key.length : 0);
    }, 0);
    return { category: item.category, score };
  });

  scored.sort((a, b) => b.score - a.score);
  if (scored[0].score > 0) return scored[0].category;
  return 'top';
}

export const warmthByCategory: Record<ClothingCategory, number> = {
  top: 2,
  bottom: 2,
  outerwear: 4,
  shoes: 2,
  hat: 1,
  accessory: 1,
  dress: 2,
};

export function inferWardrobeItem(
  fileName: string,
  imageUrl: string,
  override?: Partial<Pick<WardrobeItem, 'category' | 'style' | 'colorTone'>>,
): WardrobeItem {
  const inferredCategory = pickCategoryByScore(fileName);
  const inferredStyle = pickByKeywords(
    fileName,
    styleKeywords.map((item) => ({ value: item.style, keywords: item.keywords })),
    'casual',
  );
  const inferredColorTone = pickByKeywords(
    fileName,
    toneKeywords.map((item) => ({ value: item.tone, keywords: item.keywords })),
    'neutral',
  );

  const category = override?.category ?? inferredCategory;
  const style = override?.style ?? inferredStyle;
  const colorTone = override?.colorTone ?? inferredColorTone;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    imageUrl,
    name: fileName,
    category,
    style,
    colorTone,
    warmth: warmthByCategory[category],
  };
}

function targetWarmthByTemp(temp: number): number {
  if (temp > 28) return 1.5;
  if (temp > 22) return 2;
  if (temp > 16) return 2.6;
  if (temp > 10) return 3.3;
  return 4.2;
}

function weatherRulePass(item: WardrobeItem, temp: number): boolean {
  if (temp >= 26 && item.category === 'outerwear') return false;
  if (temp <= 10 && item.category === 'top' && item.warmth <= 1) return false;
  return true;
}

function scoreItems(items: WardrobeItem[], temp: number): number {
  if (items.length === 0) return -999;

  const targetWarmth = targetWarmthByTemp(temp);
  const avgWarmth = items.reduce((sum, item) => sum + item.warmth, 0) / items.length;
  const warmthScore = Math.max(0, 40 - Math.abs(avgWarmth - targetWarmth) * 16);

  const styles = new Set(items.map((item) => item.style));
  const styleScore = styles.size === 1 ? 30 : styles.size === 2 ? 18 : 10;

  const tones = items.map((item) => item.colorTone);
  const colorfulCount = tones.filter((tone) => tone === 'colorful').length;
  const toneScore = colorfulCount <= 1 ? 20 : 10;

  const categories = new Set(items.map((item) => item.category));
  const categoryScore = categories.size * 3;
  const accessoryBonus = (categories.has('hat') ? 4 : 0) + (categories.has('accessory') ? 4 : 0);
  return warmthScore + styleScore + toneScore + categoryScore + accessoryBonus;
}

export function buildOutfitCandidates(items: WardrobeItem[], temp: number): OutfitResult[] {
  const pool = items.filter((item) => weatherRulePass(item, temp));
  if (pool.length === 0) return [];

  const tops = pool.filter((item) => item.category === 'top');
  const bottoms = pool.filter((item) => item.category === 'bottom');
  const outerwears = pool.filter((item) => item.category === 'outerwear');
  const shoes = pool.filter((item) => item.category === 'shoes');
  const hats = pool.filter((item) => item.category === 'hat');
  const accessories = pool.filter((item) => item.category === 'accessory');

  const combinations: WardrobeItem[][] = [];
  // Core rule: an outfit must include top + bottom + shoes.
  if (tops.length === 0 || bottoms.length === 0 || shoes.length === 0) return [];

  for (const top of tops) {
    for (const bottom of bottoms) {
      for (const shoe of shoes) {
        const base = [top, bottom, shoe];
        combinations.push(base);

        if (temp <= 18 && outerwears.length > 0) {
          for (const outerwear of outerwears) {
            combinations.push([outerwear, ...base]);
          }
        }

        if (hats.length > 0) {
          for (const hat of hats) combinations.push([...base, hat]);
        }
        if (accessories.length > 0) {
          for (const accessory of accessories) combinations.push([...base, accessory]);
        }
        if (hats.length > 0 && accessories.length > 0) {
          for (const hat of hats) {
            for (const accessory of accessories) combinations.push([...base, hat, accessory]);
          }
        }
      }
    }
  }

  if (combinations.length === 0) {
    const fallback = [...pool].sort((a, b) => b.warmth - a.warmth).slice(0, Math.min(3, pool.length));
    return [{ items: fallback, score: scoreItems(fallback, temp) }];
  }

  const ranked: OutfitResult[] = [];
  for (const combo of combinations) {
    const score = scoreItems(combo, temp);
    ranked.push({ items: combo, score });
  }
  ranked.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const deduped: OutfitResult[] = [];
  for (const candidate of ranked) {
    const key = candidate.items
      .map((item) => item.id)
      .sort()
      .join('|');
    if (!seen.has(key)) {
      deduped.push(candidate);
      seen.add(key);
    }
    if (deduped.length >= 3) break;
  }
  return deduped;
}

export function buildRecommendedOutfit(items: WardrobeItem[], temp: number): OutfitResult | null {
  return buildOutfitCandidates(items, temp)[0] ?? null;
}
