
<script lang="ts" setup>
import { WsStatusEnum } from "~/composables/types/WsType";

const user = useUserStore();
const ws = useWs();
const setting = useSettingStore();
const chat = useChatStore();
const online = useOnline();
</script>

<template>
  <main class="h-full flex flex-col !overflow-hidden">
    <div
      v-if="user.isLogin"
      class="relative h-full flex flex-col overflow-hidden"
    >
      <MenuHeaderMenuBar>
        <template #drag-content>
          <div
            v-if="ws.status !== WsStatusEnum.OPEN || !user.isLogin"
            class="group relative h-2/3 flex-row-c-c overflow-hidden rounded-8 px-2 text-center sm:px-4"
            w-10em animate-zoom-in-down shadow-md shadow-inset
          >
            <small truncate text-10px tracking-0.1em el-color-danger>
              {{ ws.status !== WsStatusEnum.OPEN ? "会话断开" : (!user.isLogin && !user.getToken) ? "未登录" : '网络错误' }}
              <span v-if="online" class="text-[var(--el-color-danger)]">(无网络)</span>
            </small>
            <div class="absolute h-full w-full flex-row-bt-c scale-80 px-1.5 op-0 transition-all group-hover:(scale-100 op-100) bg-color">
              <BtnElButton
                icon-class="i-solar:refresh-outline mr-1"
                class="hover:shadow-md"
                type="primary"
                round
                size="small"
                style="padding: 0 0.8em;height: 1.8em;line-height: 1.8em;"
                @click="ws.reload()"
              >
                重连
              </BtnElButton>
              <BtnElButton
                icon-class="i-solar:power-bold mr-1"
                class="hover:shadow-md"
                type="danger"
                round
                size="small"
                style="padding: 0 0.8em;height: 1.8em;line-height: 1.8em;"
                @click="navigateTo('/login')"
              >
                登录
              </BtnElButton>
            </div>
          </div>
        </template>
      </MenuHeaderMenuBar>
      <div
        class="main-box relative"
        v-bind="$attrs"
      >
        <MenuChatMenu class="hidden sm:block" />
        <!-- 会话列表 -->
        <ChatContactList v-show="$route.path === '/'" />
        <!-- 聊天框 -->
        <ChatContent v-show="$route.path === '/'" v-if=" chat.theContact.roomId" class="flex-1 border-default-l" />
        <!-- 缓存内容 -->
        <NuxtPage keepalive />
      </div>
    </div>
    <div v-else class="relative h-full flex flex-col overflow-hidden" />
    <LazyMenuBottomMenu v-if="user.isLogin && setting.isOpenContact" class="grid sm:hidden" />
  </main>
</template>

<style lang="scss" scoped>
.main-box {
  --at-apply: "mx-a py-4 flex-1 w-full flex overflow-hidden p-0 bg-color";
  padding: 0 !important;
}
</style>
