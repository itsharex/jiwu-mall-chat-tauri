<script lang="ts" setup>
defineProps<{
  src: string
  loadClass?: string
  loadRootClass?: string
  errorRootClass?: string
  errorClass?: string
}>();
const setting = useSettingStore();
</script>

<template>
  <el-image
    :src="src"
    fit="cover"
    hide-on-click-modal
    :close-on-press-escape="!setting.settingPage.isEscMin"
    v-bind="$attrs"
  >
    <!-- 占位 -->
    <template #placeholder>
      <div :class="loadClass !== undefined ? loadClass : 'sky-loading h-full w-full'" />
    </template>
    <!-- 错误 -->
    <template #error>
      <div class="h-full w-full flex-row-c-c" :class="errorRootClass">
        <i class="icon i-solar-gallery-remove-bold-duotone op-60" :class="errorClass" />
      </div>
    </template>
  </el-image>
</template>

<style scoped lang="scss">
.icon {
  --at-apply: "block max-w-4/5 min-h-5 min-w-5"
}
</style>
