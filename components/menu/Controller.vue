<script setup lang="ts">
import { getCurrentWindow } from "@tauri-apps/api/window";

withDefaults(defineProps<{
  showMin?: boolean
  showMax?: boolean
  showClose?: boolean
}>(), {
  showMin: true,
  showMax: true,
  showClose: true,
});
const appWindow = getCurrentWindow();

const isMaximized = ref(false);
const isAlwaysOnTopVal = ref(false);
async function onToggleWindow(type: "min" | "max" | "close" | "alwaysOnTop") {
  if (type === "min")
    await appWindow.minimize();
  if (type === "max") {
    await appWindow.toggleMaximize();
    const isMax = await appWindow.isMaximized();
    isMaximized.value = isMax;
  };
  if (type === "close") {
    await appWindow.minimize();
    await appWindow.hide();
    // ElMessageBox.confirm("是否关闭至托盘？", {
    //   title: "提示",
    //   confirmButtonText: "关闭",
    //   confirmButtonClass: "el-button--danger",
    //   center: true,
    //   cancelButtonText: "取消",
    //   lockScroll: true,
    //   callback: async (action: string) => {
    //     if (action === "confirm") {
    //       appWindow.minimize();
    //       setTimeout(() => {
    //         appWindow.hide();
    //       }, 300);
    //     }
    //   },
    // });
  }
  if (type === "alwaysOnTop") {
    isAlwaysOnTopVal.value = !isAlwaysOnTopVal.value;
    appWindow.setAlwaysOnTop(isAlwaysOnTopVal.value);
  }
  return {
    isMaximized: isMaximized.value,
    isAlwaysOnTopVal: isAlwaysOnTopVal.value,
  };
}
const data = {
  onToggleWindow,
};
</script>

<template>
  <slot name="start" :data="data" />
  <ElButton
    v-if="showMin"
    text size="small" style="font-size: 1.4rem;padding: 0;width: 2.6rem;height: 1.8rem;;;margin: 0;" @click="onToggleWindow('min')"
  >
    <i
      i-carbon:subtract btn-primary title="最小化"
    />
  </ElButton>
  <ElButton
    v-if="showMax" text
    size="small" style="font-size: 1rem;padding: 0;width: 2.6rem;height: 1.8rem;;;margin: 0;" @click="onToggleWindow('max')"
  >
    <i
      :class="isMaximized ? 'i-tabler:minimize' : 'i-tabler:maximize'"
      :title="isMaximized ? '还原' : '最大化'"
      btn-primary
    />
  </ElButton>
  <ElButton v-if="showClose" text size="small" class="text-amber-1" style="font-size: 1.2rem;padding: 0;width: 2.6rem;height: 1.8rem;margin: 0;" @click="onToggleWindow('close')">
    <i i-carbon:close btn-primary title="关闭" />
  </ElButton>
  <slot name="end" />
</template>

<style lang="">

</style>
