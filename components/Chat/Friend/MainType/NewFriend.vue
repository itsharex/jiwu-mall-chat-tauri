<script lang="ts" setup>
/**
 * 消息适配器
 */
defineProps<{
  data: TheFriendOpt
}>();
</script>

<template>
  <div class="relative flex flex-col">
    <h4 class="flex items-center rounded-0 p-4 px-8 shadow bg-color md:p-4">
      <i i-solar:user-plus-bold mr-2 bg-light p-3 />
      新的朋友
    </h4>
    <el-scrollbar class="bg-white dark:bg-dark-7" view-class="p-2rem md:w-1/2 mx-a" wrap-class="w-full flex-1 h-full">
      <ChatFriendApplyList />
    </el-scrollbar>
  </div>
</template>

