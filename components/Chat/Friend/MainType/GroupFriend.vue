<script setup lang="ts">
/**
 * 群聊适配器
 */
const {
  data,
} = defineProps<{
  data: TheFriendOpt<ChatContactVO>
}>();
const isLoading = ref(false);
const isOnGroup = ref<boolean | undefined>(false);
const room = ref<Partial<ChatRoomInfoVO>>({});
const user = useUserStore();
const chat = useChatStore();

// 加载房间数据
async function loadData(val: number) {
  if (isLoading.value)
    return;
  isOnGroup.value = false;
  isLoading.value = true;
  // 获取房间信息
  const res = await getRoomGroupInfo(val, user.getToken);
  if (res.code === StatusCode.SUCCESS)
    room.value = res.data;
  isLoading.value = false;
  // 确认是否为在群
  isOnGroup.value = true; // 假设用户已经在群中，根据实际情况进行判断
}

// 退出群聊
function exitRoom(roomId: number) {
  ElMessageBox.confirm("是否退出该群聊？", {
    confirmButtonText: "退出",
    cancelButtonText: "取消",
    center: true,
    title: "提醒",
    lockScroll: false,
    type: "warning",
    callback: async (action: string) => {
      if (action === "confirm") {
        const res = await exitRoomGroup(roomId, user.getToken);
        if (res.code === StatusCode.SUCCESS) {
          ElNotification.success("退出成功！");
          chat.setTheFriendOpt(FriendOptType.Empty, {});
          chat.setDelGroupId(roomId); // 清除房间
        }
      }
    },
  });
};

// 群聊申请
const roomId = computed(() => data.data.roomId);
watch(roomId, val => loadData(val));


// 去发消息
async function toSend(roomId: number) {
  if (!isOnGroup.value)
    return;
  const res = await getChatContactInfo(roomId, user.getToken, RoomType.GROUP);
  if (!res)
    return;
  if (res && res.code !== StatusCode.SUCCESS)
    return ElMessage.error(res ? res.message : "没有找到对应群聊！");
  chat.setContact(res.data);
  nextTick(() => {
    navigateTo({
      path: "/",
    });
  });
}
// @unocss-include
const loadingIcon = `
<svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24"><g fill="none" fill-rule="evenodd"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"/><path fill="currentColor" d="M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15M1.5 12C1.5 6.201 6.201 1.5 12 1.5S22.5 6.201 22.5 12S17.799 22.5 12 22.5S1.5 17.799 1.5 12" opacity=".1"/><path fill="currentColor" d="M12 4.5a7.46 7.46 0 0 0-5.187 2.083a1.5 1.5 0 0 1-2.075-2.166A10.46 10.46 0 0 1 12 1.5a1.5 1.5 0 0 1 0 3"/></g></svg>
`;
</script>

<template>
  <div
    v-loading="isLoading"
    element-loading-text="加载中..."
    element-loading-background="transparent"
    :element-loading-spinner="loadingIcon"
  >
    <div
      v-show="!isLoading"
      class="h-full w-full flex-1 animate-[0.3s_fade-in] px-2 py-1 bg-color"
      v-bind="$attrs"
    >
      <!-- 顶部 -->
      <div
        absolute left-0 top-0 w-full flex items-center gap-4 p-3 px-5 shadow bg-color
      >
        <CardElImage
          :src="BaseUrlImg + data.data.avatar" fit="cover"
          class="h-2.4rem w-2.4rem flex-shrink-0 overflow-auto object-cover shadow-sm border-default card-default"
        />
        <strong text-1rem>{{ room.groupName }}</strong>
        <small op-60 el-color-info>在线：{{ room.onlineNum || "0" }}</small>
      </div>
      <!-- 群成员 -->
      <ChatRoomGroupGrid class="mx-a mt-24 max-h-50vh sm:w-2/3" :data="data.data" />
      <div class="mx-a my-6 w-4/5 border-0 border-b-1px sm:(my-10 w-3/5) border-default" />
      <!-- 按钮 -->
      <div flex-row-c-c gap-4>
        <BtnElButton
          icon-class="i-solar:exit-outline p-2 mr-2"
          class="op-80"
          type="danger"
          plain
          @click="exitRoom(roomId)"
        >
          退出群聊&ensp;
        </BtnElButton>
        <BtnElButton
          icon-class="i-solar:chat-line-line-duotone p-2 mr-2"
          class="border-default"
          type="info"
          @click="toSend(roomId)"
        >
          发消息&ensp;
        </BtnElButton>
        <!-- <BtnElButton
          v-else
          icon-class="i-solar:user-plus-bold p-2 mr-2"
          class="op-80"
          type="primary"
          @click="isShowApply = true"
        >
          添加群聊&ensp;
        </BtnElButton> -->
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
</style>
