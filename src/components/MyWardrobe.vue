<template>
  <section class="wardrobe">
    <div class="sectionTitle">我的衣橱</div>
    <div v-if="items.length === 0" class="empty">还没有衣物照片，先上传一张吧</div>

    <div v-else class="grid" role="list">
      <div v-for="(item, index) in items" :key="item.id" class="card" role="listitem">
        <div class="card__imgWrap">
          <img class="card__img" :src="item.imageUrl" :alt="`衣橱照片 ${index + 1}`" />
        </div>
        <div class="meta">{{ categoryLabel[item.category] }} · {{ styleLabel[item.style] }}</div>
        <div class="meta meta--secondary">
          {{ sourceLabel(item) }}
        </div>
        <button type="button" class="editBtn" @click="toggleEditor(item.id)">
          {{ editingId === item.id ? '收起编辑' : '修正标签' }}
        </button>
        <div v-if="editingId === item.id" class="editor">
          <label class="editor__row">
            <span>类别</span>
            <select
              :value="item.category"
              @change="onFieldChange(item.id, 'category', ($event.target as HTMLSelectElement).value)"
            >
              <option value="top">上衣</option>
              <option value="bottom">下装</option>
              <option value="outerwear">外套</option>
              <option value="shoes">鞋履</option>
              <option value="hat">帽子</option>
              <option value="accessory">配饰</option>
              <option value="dress">连衣裙</option>
            </select>
          </label>
          <label class="editor__row">
            <span>风格</span>
            <select
              :value="item.style"
              @change="onFieldChange(item.id, 'style', ($event.target as HTMLSelectElement).value)"
            >
              <option value="casual">休闲</option>
              <option value="sport">运动</option>
              <option value="formal">通勤</option>
            </select>
          </label>
          <label class="editor__row">
            <span>色调</span>
            <select
              :value="item.colorTone"
              @change="onFieldChange(item.id, 'colorTone', ($event.target as HTMLSelectElement).value)"
            >
              <option value="neutral">中性</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
              <option value="colorful">彩色</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ClothingCategory, ClothingStyle, WardrobeItem } from '../utils/outfitEngine';

defineProps<{
  items: WardrobeItem[];
}>();

const emit = defineEmits<{
  (e: 'update-item', payload: { id: string; field: 'category' | 'style' | 'colorTone'; value: string }): void;
}>();

const editingId = ref<string | null>(null);

function toggleEditor(id: string) {
  editingId.value = editingId.value === id ? null : id;
}

function onFieldChange(
  id: string,
  field: 'category' | 'style' | 'colorTone',
  value: string,
) {
  emit('update-item', { id, field, value });
}

function sourceLabel(item: WardrobeItem): string {
  if (item.source === 'dashscope') {
    const confidence = Math.round((item.confidence ?? 0) * 100);
    return `百炼识别 · 置信度 ${confidence}%`;
  }
  return '本地规则识别';
}

const categoryLabel: Record<ClothingCategory, string> = {
  top: '上衣',
  bottom: '下装',
  outerwear: '外套',
  shoes: '鞋履',
  hat: '帽子',
  accessory: '配饰',
  dress: '连衣裙',
};

const styleLabel: Record<ClothingStyle, string> = {
  casual: '休闲',
  sport: '运动',
  formal: '通勤',
};
</script>

<style scoped>
.wardrobe {
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

.empty {
  padding: 18px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 13px;
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
  gap: 8px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.card__imgWrap {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 1 / 1;
}

.card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.meta {
  font-size: 12px;
  opacity: 0.9;
}

.meta--secondary {
  font-size: 11px;
  opacity: 0.75;
}

.editBtn {
  height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  font-size: 12px;
}

.editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.editor__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}

.editor__row select {
  min-width: 104px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(16, 20, 30, 0.9);
  color: #e8eefc;
}
</style>
