<script lang="ts" setup>
import { getVersion } from "@tauri-apps/api/app";
import { open as openFile } from "@tauri-apps/plugin-shell";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { dayjs } from "element-plus";
import { MdPreview } from "md-editor-v3";
import { DEFAULT_RTC_CALL_BELL_URL } from "~/composables/store/useSettingStore";
import { appKeywords, appName } from "~/constants";
import "md-editor-v3/lib/preview.css";


useSeoMeta({
  title: `设置 - ${appName}`,
  description: "极物聊天 - 极物聊天 开启你的极物之旅！",
  keywords: appKeywords,
});

const isLoading = ref(false);
const user = useUserStore();
const setting = useSettingStore();
// 字体监听
watchDebounced(
  () => setting.settingPage.fontFamily.value,
  (val: string) => {
    if (val && document) {
      isLoading.value = true;
      localStorage.setItem("--font-family", val);
      document.documentElement.style.setProperty("--font-family", val);
      setTimeout(() => {
        isLoading.value = false;
      }, 300);
    }
  },
);

// 通知
const notificationTypeList = computed(() => (setting.isMobile || setting.isWeb)
  ? [
      {
        label: "系统",
        value: NotificationEnums.SYSTEM,
      },
      {
        label: "关闭",
        value: NotificationEnums.CLOSE,
      },
    ]
  : [
      {
        label: "托盘",
        value: NotificationEnums.TRAY,
      },
      {
        label: "系统",
        value: NotificationEnums.SYSTEM,
      },
      {
        label: "关闭",
        value: NotificationEnums.CLOSE,
      },
    ],
);

// 主题
const themeConfigList = setting.settingPage.modeToggle.list.map(item => ({
  ...item,
  label: item.name,
  value: item.value,
}));
const thePostion = ref({
  clientX: 0,
  clientY: 0,
});
function isColseChange(val: any) {
  if (val)
    document.documentElement.classList.add("stop-transition-all");
  else
    document.documentElement.classList.remove("stop-transition-all");
}
const colorMode = useColorMode();
const theme = computed({
  get: () => setting.settingPage.modeToggle.value,
  set: (val: string) => {
    useModeToggle(val, thePostion.value as MouseEvent);
    setting.settingPage.modeToggle.value = val;
  },
});

// 公告
const showNotice = ref(false);
const notice = ref<string>("# 暂无内容");

// 显示新版本 + 当前版本 更新时间线
const showUpateNoticeLine = ref(false);
const noticeList = ref<UpdateNoticeItem[]>([]);
interface UpdateNoticeItem {
  version: string;
  notice: string;
  createTime: string;
}
function getIsNewVersion(version: string) {
  const v = version.replaceAll("v", "");
  return noticeList.value.find(item => item.version === v)?.createTime || "";
}

// 更新
onMounted(async () => {
  setting.loadSystemFonts();
  if (setting.isWeb)
    return;
  noticeList.value = [];
  const version = await getVersion();
  // 公告
  if (version) {
    getVersionNotice(version).then((res) => {
      if (res.code !== StatusCode.SUCCESS)
        ElMessage.closeAll("error");
      noticeList.value.push({
        createTime: res.data?.createTime && dayjs(res.data?.createTime).format("YYYY-MM-DD HH:mm:ss"),
        version: res.data.version,
        notice: res.data.notice || "",
      });

      if (res?.data?.notice)
        notice.value = (res.data.notice || "");
    });
  }
  // 公告列表
  if (setting.isDesktop) {
    const update = (await check()) as Update;
    if (update && !noticeList.value.find(item => item.version === update?.version)) {
      getNewVersionInfo(update?.version);
    }
  }
  // 检查更新
  setting.appUploader.version = version;
  if (!setting.appUploader.isCheckUpdatateLoad) {
    setting.checkUpdates(false);
  }
});

// 获取新版本公告
async function getNewVersionInfo(newVersion: string) {
  if (newVersion) {
    // 请求获取新公告
    const res = await getVersionNotice(newVersion);
    if (res.code !== StatusCode.SUCCESS)
      ElMessage.closeAll("error");
    if (setting.appUploader.version !== res.data.version) {
      noticeList.value.push({
        createTime: dayjs(res.data.createTime).format("YYYY-MM-DD HH:mm:ss"),
        version: res.data.version,
        notice: res.data.notice || "",
      });
    }
    if (res?.data?.notice)
      notice.value = (res.data.notice || "");
  }
}

// 公告
function showVersionNotice(version: string) {
  const v = version.replaceAll("v", "");
  notice.value = noticeList.value.find(item => item.version === v)?.notice || "";
  showNotice.value = true;
}

// 打开下载文件夹
async function openFileFolder() {
  if (!await existsFile(setting.appDataDownloadDirUrl)) {
    ElMessageBox.confirm("下载目录不存在，是否创建？", {
      title: "提示",
      center: true,
      confirmButtonText: "创建",
      cancelButtonText: "取消",
      confirmButtonClass: "el-button-warning",
      lockScroll: true,
      callback: async (action: string) => {
        if (action === "confirm") {
          mkdirFile(setting.appDataDownloadDirUrl);
        }
      },
    });
    return;
  }
  openFile(setting.appDataDownloadDirUrl);
}

// 切换默认铃声
function toggleRtcCallBell() {
  ElMessageBox.prompt("", {
    title: "更改铃声",
    inputType: "text",
    inputValue: setting.settingPage.rtcCallBellUrl,
    center: true,
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    inputErrorMessage: "请输入正确的铃声地址",
    inputPlaceholder: "请输入铃声网络地址",
    lockScroll: true,
  }).then(({ value, action }) => {
    const val = value?.trim();
    if (action === "confirm") {
      if (!val) {
        ElNotification.warning("已关闭铃声！");
        setting.settingPage.rtcCallBellUrl = "";
        return;
      }
      // 正则判断
      const reg = /^https?:\/\/[^\s/$.?#].\S*$/;
      if (DEFAULT_RTC_CALL_BELL_URL !== val && !reg.test(val)) {
        ElMessage.error("请输入正确的铃声地址");
        return;
      }
      setting.settingPage.rtcCallBellUrl = val;
    }
  });
}

// 播放默认铃声
const audioRaw = ref<HTMLAudioElement>();
function togglePlayRtcCallBell(url?: string) {
  if (!url)
    return;
  if (audioRaw.value) {
    audioRaw.value.pause?.();
    audioRaw.value.remove?.();
    audioRaw.value = undefined;
    return;
  }
  audioRaw.value = new Audio(url);
  audioRaw.value.play();
  audioRaw.value.onended = () => {
    audioRaw.value?.remove?.();
    audioRaw.value = undefined;
  };
}
onDeactivated(() => {
  audioRaw.value?.pause?.();
  audioRaw.value?.remove?.();
  audioRaw.value = undefined;
});
</script>

<template>
  <main v-loading.fullscreen.lock="isLoading" class="mt-8 flex flex-1 flex-col p-4 md:p-6">
    <h3 flex items-center>
      系统设置
      <i i-solar:settings-bold ml-2 inline-block p0.6em opacity-60 hover:animate-spin />
    </h3>
    <ElDivider class="opacity-60" />
    <section text-0.9rem grid="~ cols-1 gap-4">
      <!-- 字体 -->
      <div class="group h-8 flex-row-bt-c">
        字体设置
        <el-select
          v-model="setting.settingPage.fontFamily.value"
          allow-create
          style="width: 13rem;" :teleported="false"
          :disabled="isLoading"
          placement="bottom-end"
          class="inputs"
          fit-input-width
          filterable
          default-first-option
          placeholder="请选择主题字体"
        >
          <el-option
            v-for="item in setting.settingPage.fontFamily.list" :key="item.value"
            :value="item.value"
            :label="item.name"
          >
            {{ item.name }}
          </el-option>
        </el-select>
      </div>
      <!-- 黑暗 -->
      <div :id="DEFAULT_THEME_TOGGLE_ID" class="group h-8 flex-row-bt-c">
        深色模式
        <el-segmented
          v-model="theme"
          class="inputs border-default"
          style="width:13rem;background-color: transparent;--el-segmented-item-selected-color: #fff;--el-border-radius-base: 2rem;"
          :options="themeConfigList"
          @click="(e: MouseEvent) => thePostion = { clientX: e.clientX, clientY: e.clientY }"
        />
      </div>
      <!-- 关闭动画 -->
      <div class="group h-8 flex-row-bt-c">
        流畅模式
        <el-tooltip
          :content="!setting.settingPage.isCloseAllTransition ? '开启动画' : '关闭动画'" placement="left"
          popper-style="padding: 0 0.5em;"
        >
          <el-switch
            v-model="setting.settingPage.isCloseAllTransition" size="large" active-text="开启"
            inactive-text="关闭" inline-prompt @change="isColseChange"
          />
        </el-tooltip>
      </div>
      <!-- 上下按键切换会话 -->
      <div v-if="!setting.isMobileSize" class="group h-8 flex-row-bt-c">
        切换会话
        <el-tooltip
          :content="!setting.downUpChangeContact ? '开启方向上下键切换' : '关闭方向上下键切换'" placement="left"
          popper-style="padding: 0 0.5em;"
        >
          <el-switch
            v-model="setting.downUpChangeContact" size="large" active-text="开启"
            inactive-text="关闭" inline-prompt
          />
        </el-tooltip>
      </div>
      <!-- 消息通知 -->
      <div class="group h-8 flex-row-bt-c">
        消息通知
        <el-segmented
          v-model="setting.settingPage.notificationType"
          class="inputs border-default"
          style="width:13rem;background-color: transparent;--el-segmented-item-selected-color: #fff;--el-border-radius-base: 2rem;"
          :options="notificationTypeList"
        />
      </div>
      <!-- Esc -->
      <div v-if="setting.isDesktop" class="group h-8 flex-row-bt-c">
        ESC关闭
        <el-switch
          v-model="setting.settingPage.isEscMin"
          size="large"
          active-text="开启"
          inactive-text="关闭"
          :active-value="true"
          :inactive-value="false"
          inline-prompt @change="(val: string | number | boolean) => setting.settingPage.isEscMin = !!val"
        />
      </div>
      <!-- 自启动 -->
      <div v-if="setting.isDesktop" :id="DEFAULT_THEME_TOGGLE_ID" class="group h-8 flex-row-bt-c">
        开机自启
        <el-switch
          v-model="setting.settingPage.isAutoStart" size="large" active-text="自启"
          inactive-text="关闭" inline-prompt
        />
      </div>
      <!-- 更新 -->
      <div v-if="!setting.isWeb" class="group h-8 flex-row-bt-c">
        关于更新
        <div class="ml-a flex items-center gap-4">
          <span v-if="setting.appUploader.version" class="text-0.8rem tracking-0.1em !btn-info" @click="showUpateNoticeLine = true">v{{ setting.appUploader.version }}版本公告</span>
          <template v-if="setting.isDesktop">
            <el-badge
              v-if="!setting.appUploader.isUpdating"
              :offset="[-5, 5]" :hidden="!setting.appUploader.isUpload"
              is-dot
              :value="+setting.appUploader.isUpload"
            >
              <ElButton
                class="flex-row-c-c cursor-pointer transition-all"
                round plain
                style="height: 2em;padding: 0 0.8em;"
                :type="setting.appUploader.isUpdating ? 'warning' : 'info'"
                @click="!setting.appUploader.isCheckUpdatateLoad && setting.checkUpdates(true)"
              >
                <span flex-row-c-c>
                  <i
                    i-solar:refresh-outline mr-1 inline-block p-2
                    :class="setting.appUploader.isCheckUpdatateLoad ? 'animate-spin' : ''"
                  />
                  检查更新
                </span>
              </ElButton>
            </el-badge>
            <el-progress
              v-else
              :percentage="+((setting.appUploader.downloaded / setting.appUploader.contentLength) * 100 || 0).toFixed(2)"
              :stroke-width="18"
              striped
              striped-flow
              text-inside
              class="progress-bar w-13rem"
            >
              {{ setting.appUploader.downloadedText || "- / - MB" }}
            </el-progress>
          </template>
        </div>
      </div>
      <!-- 通话铃声 -->
      <div id="chat-bell" class="group h-8 flex-row-bt-c">
        通话铃声
        <div class="ml-a flex items-center gap-3" :title="setting.isDefaultRtcCallBell ? '默认铃声' : '自定义铃声'">
          <span
            v-if="!setting.isDefaultRtcCallBell"
            class="cursor-pointer text-0.8rem tracking-0.1em op-0 btn-warning group-hover:op-100"
            @click="setting.settingPage.rtcCallBellUrl = DEFAULT_RTC_CALL_BELL_URL"
          >恢复默认</span>
          <div
            v-show="setting.settingPage.rtcCallBellUrl"
            class="flex-row-c-c cursor-pointer text-sm"
            :class="audioRaw ? 'text-[var(--el-color-danger)] hover:text-[var(--el-color-danger)]' : 'hover:text-[var(--el-color-info)] text-small'"
            @click="togglePlayRtcCallBell(setting.settingPage.rtcCallBellUrl)"
          >
            <i
              class="mr-2 p-2 text-0.8rem tracking-0.1em"
              :class="audioRaw ? 'i-solar:pause-bold' : 'i-solar:play-bold'"
            />
            {{ setting.isDefaultRtcCallBell ? '默认铃声' : '自定义铃声' }}
          </div>
          <span class="cursor-pointer text-0.8rem tracking-0.1em btn-warning" @click="toggleRtcCallBell()">
            {{ setting.settingPage.rtcCallBellUrl ? '更改' : '添加' }}
          </span>
          <!-- 关闭 -->
          <span
            v-if="setting.settingPage.rtcCallBellUrl"
            class="cursor-pointer text-0.8rem tracking-0.1em btn-warning" @click="setting.settingPage.rtcCallBellUrl = ''"
          >
            关闭
          </span>
        </div>
      </div>
      <!-- 下载路径 -->
      <div v-if="!setting.isWeb" id="download" class="group h-8 flex-row-bt-c">
        下载
        <div class="ml-a flex items-center gap-3" :title="setting.appDataDownloadDirUrl">
          <small class="mr-2 max-w-50vw flex-1 truncate op-60">{{ setting.appDataDownloadDirUrl }}</small>
          <span class="cursor-pointer text-0.8rem tracking-0.1em !btn-warning" @click="setting.changeDownloadDir()">更改</span>
          <span class="cursor-pointer text-0.8rem tracking-0.1em !btn-info" @click="openFileFolder()">打开目录</span>
        </div>
      </div>
    </section>
    <div class="btns mt-a flex flex-col items-center gap-4 sm:flex-row">
      <BtnElButton
        class="h-10 w-full rounded-4rem shadow sm:(ml-a h-fit w-fit)" icon-class="i-solar:trash-bin-trash-outline" :transition-icon="true"

        @click="setting.reset()"
      >
        重置
      </BtnElButton>
      <BtnElButton
        class="h-10 w-full rounded-4rem shadow sm:(ml-a h-fit w-fit)" icon-class="i-solar:logout-3-outline" type="danger" :transition-icon="true"
        style="margin-left: 0;"
        @click="user.exitLogin()"
      >
        退出登录
      </BtnElButton>
    </div>
    <el-dialog
      v-model="showNotice"
      center
      width="fit-content"
    >
      <template #header>
        <h3>&emsp;版本公告 🔔</h3>
      </template>
      <div class="max-h-60vh min-h-30vh w-90vw overflow-y-auto sm:w-500px">
        <MdPreview
          language="zh-CN"
          editor-id="notice-toast"
          show-code-row-number
          :theme="colorMode.value === 'dark' ? 'dark' : 'light'"
          preview-theme="smart-blue"
          :code-foldable="false"
          code-theme="a11y"
          class="mt-2 px-4 text-1em !bg-transparent"
          :model-value="notice"
        />
      </div>
      <div class="mt-2 mt-4 flex-row-c-c">
        <el-button type="primary" @click="showNotice = false">
          &emsp;我知道了 🎉
        </el-button>
      </div>
    </el-dialog>
    <!-- 版本的时间线 -->
    <el-dialog
      v-model="showUpateNoticeLine"
      center
      width="fit-content"
    >
      <template #header>
        <h3>&emsp;更新日志 </h3>
      </template>
      <div class="max-h-40vh min-h-30vh w-88vw animate-[blur-in_.6s] overflow-y-auto pl-4 sm:max-h-60vh sm:w-400px">
        <el-timeline style="max-width: 100%;">
          <el-timeline-item
            v-for="(item, i) in noticeList.sort((a, b) => dayjs(b.createTime).diff(dayjs(a.createTime)))"
            :key="item.notice"
            :color="i === 0 ? 'var(--el-color-primary)' : ''"
          >
            <div class="text-xl font-bold">
              v{{ item.version }}
              <small v-if="item.version === setting.appUploader.version" class="!text-color-info text-mini">当前</small>
              <div class="mt-2 text-mini">
                {{ item.createTime }}
              </div>
            </div>
            <div v-if="item.notice" class="relative max-h-20em truncate">
              <MdPreview
                language="zh-CN"
                editor-id="notice-toast"
                show-code-row-number
                :theme="colorMode.value === 'dark' ? 'dark' : 'light'"
                :code-foldable="false"
                code-theme="a11y"
                style="font-size: 12px;padding:0;"
                class="text-overflow-2 mt-2 op-60 transition-opacity !bg-transparent hover:op-100"
                :model-value="item.notice"
              />
              <div
                class="linear-bt absolute bottom-0 left-0 w-full cursor-pointer py-2 text-center hover:text-color-info text-small"
                @click="showVersionNotice(item.version)"
              >
                查看更多
              </div>
            </div>
            <div v-else class="text-small">
              暂无更新日志
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
      <div class="mt-2 mt-4 flex-row-c-c">
        <BtnElButton class="w-6rem" @click="showUpateNoticeLine = false">
          关&nbsp;闭
        </BtnElButton>
        <BtnElButton
          class="w-6rem"
          type="primary"
          :loading="setting.appUploader.isCheckUpdatateLoad || setting.appUploader.isUpdating"
          @click="setting.checkUpdates(true, {
            handleOnUpload: () => {
              showUpateNoticeLine = false
            },
          })"
        >
          {{ setting.appUploader.isUpdating ? '正在更新' : '检查更新' }}
        </BtnElButton>
      </div>
    </el-dialog>
  </main>
</template>

<style scoped lang="scss">
.inputs {
  --btn-nums: 3;
  --at-apply: "transition-200  select-none";
  --el-border-radius-base: 2em !important;
}

:deep(.el-radio-group.inputs) {
  border-radius: 1rem;
  width: 13rem;
  display: flex;

  .el-radio-button__inner {
    border: none;
    border-radius: 1rem;
    width: 100%;
  }

  .el-radio-button__inner {
    padding: 0.5em 0;
  }
}

:deep(.el-select) {
  position: relative;
  z-index: 99;

  .el-input__wrapper {
    border-radius: 1rem;
  }

  .el-popper.el-select__popper {
    border-radius: 1rem;
    overflow: hidden;
  }

  .el-input__inner {
    padding-left: 0.5rem;
  }
}
:deep(.md-editor-preview-wrapper) {
  padding: 0;
  h1 {
    font-size: 1.6em;
  }
}
:deep(.notice-toast-preview-wrapper) {
  .task-list-item-checkbox[type="checkbox"] {
    display: none !important;
  }
}

.linear-bt {
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.8) 50%, rgba(255, 255, 255, 1) 100%);
}
.dark .linear-bt {
  background: linear-gradient(to bottom, rgba(20, 20, 20, 0) 0%, rgba(20, 20, 20, 0.8) 50%, rgba(20, 20, 20, 1) 100%);
}

:deep(.el-timeline-item){
  .el-timeline-item__tail {
    left: 5px;
    top:0.3em;
  }
  .el-timeline-item__node--normal {
    left: 0;
    top: 0.3em;
  }
}
</style>
