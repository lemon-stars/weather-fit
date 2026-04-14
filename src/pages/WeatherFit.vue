<template>
  <main class="page">
    <header class="top">
      <div class="top__left">
        <div class="city">{{ city }}</div>
        <div class="weather">
          <span class="weather__label">天气</span>
          <span class="weather__value">{{ weatherText }}</span>
        </div>
        <div class="tip">{{ outfitTip }}</div>
        <div v-if="classifyTip" class="tip tip--muted">{{ classifyTip }}</div>
      </div>

      <div class="top__right">
        <div class="badge">H5</div>
      </div>
    </header>

    <section class="middle">
      <input
        ref="fileInputRef"
        class="sr-only"
        type="file"
        accept="image/*"
        multiple
        @change="onPickImage"
      />

      <button class="uploadBtn" type="button" @click="pickImage">
        <span class="uploadBtn__title">上传穿搭照片</span>
        <span class="uploadBtn__desc">支持拍照或从相册选择</span>
      </button>

      <div v-if="latestImageUrl" class="preview" aria-label="最近上传图片预览">
        <img class="preview__img" :src="latestImageUrl" alt="最近上传穿搭照片预览" />
      </div>
    </section>

    <section class="bottom">
      <template v-if="activeTab === 'home'">
        <div class="sectionHeader">
          <div class="sectionTitle">今日推荐搭配</div>
          <div class="headerActions">
            <button
              type="button"
              class="switchBtn"
              :disabled="generatingOutfitImage || recommendationCards.length === 0"
              @click="generateOutfitImage"
            >
              {{ generatingOutfitImage ? '生成中...' : '生成搭配图' }}
            </button>
            <button
              v-if="outfitCandidates.length > 1"
              type="button"
              class="switchBtn"
              @click="switchOutfit"
            >
              换一套（{{ activeCandidateIndex + 1 }}/{{ outfitCandidates.length }}）
            </button>
          </div>
        </div>
        <div v-if="outfitImageTip" class="tip tip--muted">{{ outfitImageTip }}</div>
        <div v-if="generatedOutfitImageUrl" class="preview" aria-label="生成的搭配合成图">
          <img class="preview__img" :src="generatedOutfitImageUrl" alt="AI 生成搭配图" />
        </div>
        <div v-if="recommendationCards.length === 0" class="emptyRecommendation">
          请至少上传上衣、下装、鞋子各一张，系统会自动搭配，帽子和配饰可选
        </div>
        <div class="grid" role="list">
          <div v-for="item in recommendationCards" :key="item.id" class="card" role="listitem">
            <div class="card__imgWrap">
              <img v-if="item.imageUrl" class="card__img" :src="item.imageUrl" :alt="item.title" />
              <div v-else class="card__placeholder" aria-hidden="true" />
            </div>
            <div class="card__title">{{ item.title }}</div>
          </div>
        </div>
      </template>
      <MyWardrobe v-else :items="wardrobeItems" @update-item="onUpdateWardrobeItem" />
    </section>

    <nav class="tabbar" aria-label="底部导航">
      <button
        type="button"
        class="tabbar__item"
        :class="{ 'tabbar__item--active': activeTab === 'home' }"
        @click="activeTab = 'home'"
      >
        首页
      </button>
      <button
        type="button"
        class="tabbar__item"
        :class="{ 'tabbar__item--active': activeTab === 'wardrobe' }"
        @click="activeTab = 'wardrobe'"
      >
        我的衣橱
      </button>
    </nav>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import MyWardrobe from '../components/MyWardrobe.vue';
import { buildOutfitCandidates, inferWardrobeItem, type WardrobeItem, warmthByCategory } from '../utils/outfitEngine';
import { classifyClothingWithDashscope } from '../utils/visionClassifier';
import { generateOutfitCompositeImage } from '../utils/outfitImageComposer';

type Recommendation = {
  id: string;
  title: string;
  imageUrl?: string;
};

const city = ref('成都');
const weatherText = ref('正在获取温度...');
const outfitTip = ref('正在生成穿衣建议...');
const classifyTip = ref('');
const outfitImageTip = ref('');
const generatedOutfitImageUrl = ref('');
const generatingOutfitImage = ref(false);

const DEFAULT_LNG = 104.06;
const DEFAULT_LAT = 30.67;
const activeTab = ref<'home' | 'wardrobe'>('home');
const currentTemperature = ref<number | null>(null);
const activeCandidateIndex = ref(0);

const fileInputRef = ref<HTMLInputElement | null>(null);
const wardrobeItems = ref<WardrobeItem[]>([]);

const latestImageUrl = computed(() => {
  const lastIndex = wardrobeItems.value.length - 1;
  return lastIndex >= 0 ? wardrobeItems.value[lastIndex].imageUrl : null;
});

const outfitCandidates = computed(() => {
  if (wardrobeItems.value.length === 0) return [];
  const temp = currentTemperature.value ?? 22;
  return buildOutfitCandidates(wardrobeItems.value, temp);
});

const recommendationCards = computed<Recommendation[]>(() => {
  const current = outfitCandidates.value[activeCandidateIndex.value];
  if (!current) return [];
  return current.items.map((item) => ({
    id: item.id,
    title: item.name,
    imageUrl: item.imageUrl,
  }));
});

const activeOutfitItems = computed<WardrobeItem[]>(() => {
  const current = outfitCandidates.value[activeCandidateIndex.value];
  return current?.items ?? [];
});

function pickImage() {
  fileInputRef.value?.click();
}

async function onPickImage(e: Event) {
  const input = e.target as HTMLInputElement | null;
  const files = input?.files ? Array.from(input.files) : [];
  if (files.length === 0) return;

  classifyTip.value = '正在识别图片内容...';
  let firstVisionError = '';
  const newItems = await Promise.all(
    files.map(async (file) => {
      const imageUrl = URL.createObjectURL(file);
      try {
        const visionResult = await classifyClothingWithDashscope(file);
        if (visionResult) {
          const item = inferWardrobeItem(file.name, imageUrl, {
            category: visionResult.category,
            style: visionResult.style,
            colorTone: visionResult.colorTone,
          });
          item.confidence = visionResult.confidence;
          item.source = 'dashscope';
          return item;
        }
      } catch (error) {
        if (!firstVisionError) {
          firstVisionError = error instanceof Error ? error.message : String(error);
        }
      }

      const fallback = inferWardrobeItem(file.name, imageUrl);
      fallback.confidence = 0;
      fallback.source = 'local';
      return fallback;
    }),
  );

  if (newItems.length > 0) {
    wardrobeItems.value.push(...newItems);
  }
  const modelTaggedCount = newItems.filter((item) => item.source === 'dashscope').length;
  if (modelTaggedCount > 0) {
    classifyTip.value = `已用百炼识别 ${modelTaggedCount}/${newItems.length} 张图片`;
  } else if (firstVisionError.includes('Access to model denied')) {
    classifyTip.value = '百炼返回模型无权限，请在控制台开通当前模型或更换可用模型';
  } else if (firstVisionError) {
    classifyTip.value = `百炼识别失败，已回退本地规则：${firstVisionError}`;
  } else {
    classifyTip.value = '未检测到百炼配置，已使用本地规则识别';
  }

  if (input) input.value = '';
}

function onUpdateWardrobeItem(payload: {
  id: string;
  field: 'category' | 'style' | 'colorTone';
  value: string;
}) {
  const target = wardrobeItems.value.find((item) => item.id === payload.id);
  if (!target) return;

  if (payload.field === 'category') {
    target.category = payload.value as WardrobeItem['category'];
    target.warmth = warmthByCategory[target.category];
    return;
  }

  if (payload.field === 'style') target.style = payload.value as WardrobeItem['style'];
  if (payload.field === 'colorTone') target.colorTone = payload.value as WardrobeItem['colorTone'];
}

function switchOutfit() {
  if (outfitCandidates.value.length <= 1) return;
  activeCandidateIndex.value =
    (activeCandidateIndex.value + 1) % outfitCandidates.value.length;
  generatedOutfitImageUrl.value = '';
  outfitImageTip.value = '';
}

async function generateOutfitImage() {
  if (activeOutfitItems.value.length === 0 || generatingOutfitImage.value) return;

  generatingOutfitImage.value = true;
  outfitImageTip.value = '正在生成搭配合成图...';
  try {
    const imageUrl = await generateOutfitCompositeImage(activeOutfitItems.value);
    if (imageUrl) {
      generatedOutfitImageUrl.value = imageUrl;
      outfitImageTip.value = '已生成搭配图';
    } else {
      outfitImageTip.value = '当前搭配缺少上衣/下装/鞋子，无法合成';
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    outfitImageTip.value = `合成失败：${msg}`;
  } finally {
    generatingOutfitImage.value = false;
  }
}

function getOutfitTipByTemperature(temp: number): string {
  if (temp > 28) return '天气较热，建议短袖短裤，注意防晒补水';
  if (temp > 22) return '天气温暖，建议单衣单裤';
  if (temp > 16) return '天气舒适，建议薄外套搭配长裤';
  if (temp > 10) return '天气微凉，建议卫衣或针织衫加外套';
  return '天气偏冷，建议厚外套并注意保暖';
}

function getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (err) => reject(err),
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  });
}

async function reverseGeocodeCity(latitude: number, longitude: number): Promise<string | null> {
  const reverseUrl =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}` +
    '&zoom=10&addressdetails=1&accept-language=zh-CN';

  const res = await fetch(reverseUrl, {
    headers: {
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Reverse geocode failed with ${res.status}`);

  const data = (await res.json()) as {
    address?: {
      city?: string;
      town?: string;
      county?: string;
      state?: string;
    };
  };

  const nextCity =
    data.address?.city ?? data.address?.town ?? data.address?.county ?? data.address?.state ?? null;
  return nextCity;
}

async function loadWeather() {
  let latitude = DEFAULT_LAT;
  let longitude = DEFAULT_LNG;

  try {
    const position = await getCurrentPosition();
    latitude = position.latitude;
    longitude = position.longitude;
  } catch {
    // Location denied or unavailable, fallback to Chengdu.
  }

  try {
    const nextCity = await reverseGeocodeCity(latitude, longitude);
    if (nextCity) city.value = nextCity;
  } catch {
    city.value = '成都';
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    '&current=temperature_2m';

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed with ${res.status}`);

    const data = (await res.json()) as {
      current?: { temperature_2m?: number };
    };
    const temperature = data.current?.temperature_2m;
    if (typeof temperature !== 'number') throw new Error('Invalid response payload');

    currentTemperature.value = temperature;
    weatherText.value = `${temperature.toFixed(1)}°C`;
    outfitTip.value = getOutfitTipByTemperature(temperature);
  } catch {
    currentTemperature.value = null;
    weatherText.value = '温度获取失败';
    outfitTip.value = '暂时无法获取天气，建议按体感穿搭';
  }
}

onMounted(() => {
  loadWeather();
});

watch(outfitCandidates, () => {
  if (activeCandidateIndex.value >= outfitCandidates.value.length) {
    activeCandidateIndex.value = 0;
  }
  generatedOutfitImageUrl.value = '';
  outfitImageTip.value = '';
});

onBeforeUnmount(() => {
  wardrobeItems.value.forEach((item) => URL.revokeObjectURL(item.imageUrl));
});
</script>

<style scoped>
.page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
  gap: 16px;
  background: #0b1220;
  color: #e8eefc;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(93, 153, 255, 0.25), rgba(125, 224, 255, 0.12));
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.top__left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.city {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.weather {
  display: flex;
  align-items: baseline;
  gap: 8px;
  opacity: 0.95;
}

.weather__label {
  font-size: 12px;
  opacity: 0.8;
}

.weather__value {
  font-size: 14px;
}

.tip {
  font-size: 12px;
  opacity: 0.9;
}

.tip--muted {
  opacity: 0.75;
}

.badge {
  font-size: 12px;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.middle {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.uploadBtn {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 14px 14px;
  border-radius: 14px;
  border: 1px dashed rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  -webkit-tap-highlight-color: transparent;
}

.uploadBtn:active {
  transform: translateY(1px);
}

.uploadBtn__title {
  font-size: 15px;
  font-weight: 700;
}

.uploadBtn__desc {
  font-size: 12px;
  opacity: 0.8;
}

.preview {
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
}

.preview__img {
  width: 100%;
  height: 220px;
  object-fit: cover;
  display: block;
}

.bottom {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tabbar {
  display: flex;
  gap: 10px;
  padding-top: 4px;
}

.tabbar__item {
  flex: 1;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 14px;
  font-weight: 600;
}

.tabbar__item--active {
  border-color: rgba(125, 224, 255, 0.6);
  background: rgba(93, 153, 255, 0.25);
}

.sectionTitle {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.2px;
}

.sectionHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.headerActions {
  display: flex;
  gap: 8px;
}

.switchBtn {
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(125, 224, 255, 0.4);
  background: rgba(93, 153, 255, 0.2);
  color: inherit;
  font-size: 12px;
}

.switchBtn:disabled {
  opacity: 0.55;
}

.emptyRecommendation {
  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  font-size: 12px;
  opacity: 0.9;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.card__imgWrap {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  background: rgba(255, 255, 255, 0.04);
}

.card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.card__placeholder {
  width: 100%;
  height: 100%;
  background:
    radial-gradient(60% 60% at 30% 20%, rgba(255, 255, 255, 0.18), transparent 60%),
    radial-gradient(70% 70% at 70% 80%, rgba(93, 153, 255, 0.22), transparent 55%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
}

.card__title {
  font-size: 12px;
  line-height: 1.35;
  opacity: 0.92;
}

.sr-only {
  position: absolute !important;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>

