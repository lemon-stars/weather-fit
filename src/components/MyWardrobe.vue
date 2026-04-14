<template>
  <section class="wardrobe">
    <div class="sectionTitle">我的衣橱</div>
    <div v-if="images.length === 0" class="empty">还没有衣物照片，先上传一张吧</div>

    <div v-else class="grid" role="list">
      <div v-for="(image, index) in images" :key="`${image}-${index}`" class="card" role="listitem">
        <div class="card__imgWrap">
          <img class="card__img" :src="image" :alt="`衣橱照片 ${index + 1}`" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  images: string[];
}>();
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
</style>
