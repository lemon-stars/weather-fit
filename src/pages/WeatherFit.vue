<template>
  <main class="page">
    <header class="top">
      <div class="top__left">
        <div class="city">{{ city }}</div>
        <div class="weather">
          <span class="weather__label">天气</span>
          <span class="weather__value">{{ weatherText }}</span>
        </div>
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
        @change="onPickImage"
      />

      <button class="uploadBtn" type="button" @click="pickImage">
        <span class="uploadBtn__title">上传穿搭照片</span>
        <span class="uploadBtn__desc">支持拍照或从相册选择</span>
      </button>

      <div v-if="pickedImageUrl" class="preview" aria-label="已选择的图片预览">
        <img class="preview__img" :src="pickedImageUrl" alt="穿搭照片预览" />
      </div>
    </section>

    <section class="bottom">
      <div class="sectionTitle">今日推荐搭配</div>

      <div class="grid" role="list">
        <div v-for="item in recommendations" :key="item.id" class="card" role="listitem">
          <div class="card__imgWrap">
            <img v-if="item.imageUrl" class="card__img" :src="item.imageUrl" :alt="item.title" />
            <div v-else class="card__placeholder" aria-hidden="true" />
          </div>
          <div class="card__title">{{ item.title }}</div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

type Recommendation = {
  id: string;
  title: string;
  imageUrl?: string;
};

const city = ref('成都');
const weatherText = ref('（预留天气信息位置）');

const fileInputRef = ref<HTMLInputElement | null>(null);
const pickedFile = ref<File | null>(null);
const pickedObjectUrl = ref<string | null>(null);

const pickedImageUrl = computed(() => pickedObjectUrl.value);

const recommendations = ref<Recommendation[]>([
  { id: '1', title: '简约通勤 · 白衬衫 + 牛仔裤' },
  { id: '2', title: '春日清爽 · 卫衣 + 休闲裤' },
  { id: '3', title: '轻户外 · 风衣 + 运动鞋' },
  { id: '4', title: '约会氛围 · 针织 + 半裙' },
  { id: '5', title: '周末出游 · T 恤 + 短裤' },
  { id: '6', title: '高级感 · 西装外套 + 阔腿裤' },
]);

function pickImage() {
  fileInputRef.value?.click();
}

function revokePickedUrl() {
  if (pickedObjectUrl.value) URL.revokeObjectURL(pickedObjectUrl.value);
  pickedObjectUrl.value = null;
}

function onPickImage(e: Event) {
  const input = e.target as HTMLInputElement | null;
  const file = input?.files?.[0] ?? null;

  revokePickedUrl();
  pickedFile.value = file;
  if (file) pickedObjectUrl.value = URL.createObjectURL(file);

  if (input) input.value = '';
}

onBeforeUnmount(() => {
  revokePickedUrl();
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

.sectionTitle {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.2px;
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

