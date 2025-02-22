<script lang="ts" setup>
interface Props {
  type: "friend" | "group"
  immediate?: boolean
  autoStop?: boolean
}
type DataVO = { type: "friend"; data: ChatUserFriendVO } | { type: "group"; data: ChatContactVO };

const props = withDefaults(defineProps<Props>(), {
  immediate: true,
  autoStop: true,
});

const isLoading = ref<boolean>(false);
const chat = useChatStore();
const setting = useSettingStore();
const user = useUserStore();

const pageInfo = ref({
  cursor: null as null | string,
  isLast: false,
  size: 10,
});
const list = ref<ChatUserFriendVO[] | ChatContactVO[]>([]);
const isReload = ref(true);

// 加载数据
async function loadData() {
  if (isLoading.value || pageInfo.value.isLast)
    return;
  isLoading.value = true;
  try {
    const { data } = props.type === "friend"
      ? await getChatFriendPage(pageInfo.value.size, pageInfo.value.cursor, user.getToken)
      : await getChatContactPage({
        pageSize: pageInfo.value.size,
        cursor: pageInfo.value.cursor,
        type: RoomType.GROUP,
      }, user.getToken);

    if (data?.list)
      list.value.push(...data.list as any[]);
    pageInfo.value.isLast = data.isLast;
    pageInfo.value.cursor = data.cursor;
  }
  catch (e) {
    console.error(e);
  }
  finally {
    isLoading.value = false;
    isReload.value = false;
  }
}

// 重新加载数据
async function reloadData() {
  pageInfo.value.cursor = null;
  pageInfo.value.isLast = false;
  list.value = [];
  await loadData();
}


// 好友相关监听
if (props.type === "friend") {
  watch(() => chat.isAddNewFriend, (val) => {
    if (val && !isLoading.value) {
      reloadData();
      chat.isAddNewFriend = false;
    }
  });
}

// 群组相关监听
if (props.type === "group") {
  watchDebounced(() => chat.delGroupId, (val) => {
    if (val) {
      list.value = list.value.filter(p => (p as ChatContactVO).data.roomId !== val) as ChatContactVO[];
      chat.setDelGroupId(undefined);
    }
  });
}
else if (props.type === "friend") {
  watch(() => chat.delUserId, (val) => {
    if (val) {
      list.value = list.value.filter(p => (p as ChatUserFriendVO).userId !== val) as ChatUserFriendVO[];
      chat.setDelUserId("");
    }
  });
}

// 首次加载动画
const isFirstLoad = ref(false);
onMounted(() => {
  loadData();
  isFirstLoad.value = true;
});
onUnmounted(() => {
  isFirstLoad.value = false;
});
onDeactivated(() => {
  isFirstLoad.value = false;
});
</script>

<template>
  <div>
    <ListAutoIncre
      :immediate="immediate"
      :auto-stop="autoStop"
      :no-more="pageInfo.isLast"
      loading-class="op-0"
      @load="loadData"
    >
      <!-- 骨架屏
      <div v-if="isReload" class="animate-(fade-in duration-200)">
        <div v-for="p in 2" :key="p" class="item">
          <div class="avatar-icon !bg-skeleton" />
          <span class="bg-skeleton h-1.2em w-8em rounded-4px" />
        </div>
      </div> -->
      <div
        v-for="p in list"
        :key="p.id"
        class="item"
        :class="{ 'animate-(fade-in duration-200)': isFirstLoad }"
        @click="chat.setTheFriendOpt(
          type === 'friend' ? FriendOptType.User : FriendOptType.GroupFriend,
          type === 'friend' ? { id: (p as ChatUserFriendVO).userId } : p,
        )"
      >
        <CardElImage
          class="avatar-icon overflow-hidden rounded-6px"
          :src="BaseUrlImg + p.avatar"
          fit="cover"
        />
        <span>{{ type === 'friend' ? (p as ChatUserFriendVO).nickName : (p as ChatContactVO).name || '未填写' }}</span>
      </div>
    </ListAutoIncre>
  </div>
</template>

<style lang="scss" scoped>
.avatar-icon {
  --at-apply: "h-2.4rem card-default w-2.4rem flex-row-c-c rounded-6px shadow-sm";
}
.item {
  --at-apply: "border-(1px solid transparent) flex items-center gap-4 p-2 cursor-pointer rounded-6px mt-2 hover:(border-default bg-menu-color) transition-300";
}
</style>
