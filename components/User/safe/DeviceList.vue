<script lang="ts" setup>
import { getLoginDeviceList, toUserOffline } from "@/composables/api/user/safe";

const [autoAnimateRef, enable] = useAutoAnimate({
  duration: 200,
});
onMounted(() => {
  const setting = useSettingStore();
  enable(!setting.settingPage.isCloseAllTransition);
});
const user = useUserStore();
const isLoading = ref<boolean>(false);

const deviceList = ref<DeviceInfo[]>([]);
// 信息
async function getDeviceList() {
  const res = await getLoginDeviceList(user.getToken);
  if (res.code === StatusCode.SUCCESS) {
    deviceList.value = res.data.sort((a, b) => a.isLocal);
  }
  return true;
}
getDeviceList();
// 刷新
async function reload() {
  if (isLoading.value)
    return;
  deviceList.value.splice(0);
  const flag = await getDeviceList();
  setTimeout(() => {
    ElMessage.success(flag ? "刷新成功🎉！" : "刷新失败，请稍后重试！");
  }, 300);
}

// 用户下线
function exitLogin(ua?: string) {
  ElMessageBox.confirm("是否确认下线用户?", "确认选择", {
    cancelButtonText: "取消",
    lockScroll: false,
    center: true,
    confirmButtonText: "确认下线",
    confirmButtonClass: "el-button--danger",
  })
    .then(async (action: string) => {
      if (action === "confirm") {
        const arr = ua ? [ua] : (deviceList.value?.map(p => p.userAgentString) as string[]);
        const { code, message } = await toUserOffline(arr, user.getToken);
        if (code === StatusCode.SUCCESS) {
          if (deviceList.value) {
            for (let i = 0; i < deviceList.value.length; i++) {
              if (deviceList?.value?.[i]?.userAgentString === ua) {
                deviceList.value.splice(i, 1);
                break;
              }
            }
          }
          ElMessage.success("下线成功！");
        }
        else {
          ElMessage.error(message);
        }
      }
    })
    .catch(() => {});
}
// @unocss-include
const loadingIcon = `
<svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24"><g fill="none" fill-rule="evenodd"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"/><path fill="currentColor" d="M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15M1.5 12C1.5 6.201 6.201 1.5 12 1.5S22.5 6.201 22.5 12S17.799 22.5 12 22.5S1.5 17.799 1.5 12" opacity=".1"/><path fill="currentColor" d="M12 4.5a7.46 7.46 0 0 0-5.187 2.083a1.5 1.5 0 0 1-2.075-2.166A10.46 10.46 0 0 1 12 1.5a1.5 1.5 0 0 1 0 3"/></g></svg>
`;
</script>

<template>
  <div class="group flex flex-col">
    <small my-4 block opacity-70>
      登录设备
      <i class="i-solar:devices-outline ml-2 p-2.5" />
      <i
        opacity-100
        transition-300 group-hover:opacity-100 md:opacity-0 class="i-solar:refresh-outline float-right cursor-pointer bg-[var(--el-color-info)] px-3 transition-300 hover:rotate-180"
        @click="reload"
      />
    </small>
    <div
      v-loading="isLoading"
      rounde-4 h-62vh overflow-y-auto
      :element-loading-spinner="loadingIcon"
    >
      <!-- 列表 -->
      <div
        ref="autoAnimateRef"
        class="relative grid grid-cols-1 gap-2 pb-4rem lg:grid-cols-3 sm:grid-cols-2"
      >
        <UserSafeDeviceCard
          v-for="p in deviceList"
          :key="p.id"
          class="cursor-pointer active:scale-97 hover:(border-[var(--el-color-info)] border-solid shadow)"
          :data="p"
        >
          <div />
          <el-button
            v-if="!p.isLocal"
            size="small"
            type="danger"
            style="padding: 0 8px"
            plain
            @click="exitLogin(p.userAgentString)"
          >
            下线
          </el-button>
        </UserSafeDeviceCard>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.bg-btn {
  background-color: var(--el-color-danger);
  border-color: var(--el-color-danger);
}
</style>
