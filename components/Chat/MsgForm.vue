<script lang="ts" setup>
import ContextMenu from "@imengyu/vue3-context-menu";
import { FILE_MAX_SIZE, FILE_TYPE_ICON_DEFAULT, FILE_TYPE_ICON_MAP, formatFileSize } from "~/composables/api/res/file";
import { checkAtUserWhole, useAtUsers, useLoadAtUserList, useRecording } from "~/composables/hooks/useChat";


const emit = defineEmits<{
  (e: "submit", newMsg: ChatMessageVO): void
}>();
const user = useUserStore();
const chat = useChatStore();
const setting = useSettingStore();

// hooks
const {
  isChating,
  second, // 获取录音时间
  theAudioFile,
  speechRecognition,
  audioTransfromText,
  isPalyAudio,
  toggle: toggleChating, // 开始/停止录音
  reset: resetAudio,
  handlePlayAudio, // 播放录音
} = useRecording();
const pressHandleRef = ref<HTMLElement>();
onLongPress(
  pressHandleRef,
  toggleChating,
  {
    delay: 300,
    onMouseUp: toggleChating,
    distanceThreshold: 12,
    modifiers: {
      stop: true,
    },
  },
);

// 表单
const inputAllRef = ref(); // 输入框
const formRef = ref();
const isSending = ref(false);
const isDisabledFile = computed(() => !user?.isLogin || chat.theContact.selfExist === 0);
const isNotExistOrNorFriend = computed(() => chat.theContact.selfExist === 0); // 自己不存在 或 不是好友
const isLord = computed(() => chat.theContact.type === RoomType.GROUP && chat.theContact.member?.role === ChatRoomRoleEnum.OWNER); // 群主
const isSelfRoom = computed(() => chat.theContact.type === RoomType.SELFT); // 私聊
// 读取@用户列表 hook
const { userOptions, userOpenOptions, loadUser } = useLoadAtUserList();
watch(() => chat.atUidListTemp, (val) => {
  if (val.length) {
    chat.msgForm.content += val.map((uid) => {
      const user = userOptions.value.find(u => u.userId === uid);
      return user ? `@${user.nickName}(#${user.username}) ` : "";
    }).join("");
    inputAllRef.value?.input?.focus(); // 聚焦
    chat.atUidListTemp.splice(0);
  }
}, { deep: true });

const SelfExistTextMap = {
  [RoomType.SELFT]: "已经不是好友",
  [RoomType.GROUP]: "已经不是群成员",
  [RoomType.AICHAT]: "已经被AI拉黑",
};
// 右键菜单
const colorMode = useColorMode();

// 文件上传（图片）回调
const inputOssImgUploadRef = ref();
const imgList = ref<OssFile[]>([]);
function onSubmitImg(key: string, pathList: string[], fileList: OssFile[]) {
  const file = imgList.value.find(f => f.key === key);
  if (key && file?.file) {
    const url = window.URL || window.webkitURL;
    let width = 0;
    let height = 0;
    const img = new Image(); // 手动创建一个Image对象
    img.src = url.createObjectURL(file?.file);// 创建Image的对象的url
    img.onload = function () {
      width = img.width || 0;
      height = img.height || 0;
    };
    chat.msgForm = {
      roomId: chat.theContact.roomId,
      msgType: MessageType.IMG, // 图片
      content: chat.msgForm.content,
      body: {
        url: key,
        width,
        height,
        size: file?.file?.size,
      },
    };
  }
}
// 文件上传（文件）回调
const inputOssFileUploadRef = ref();
const fileList = ref<OssFile[]>([]);
function onSubmitFile(key: string, pathList: string[]) {
  const file = fileList.value.find(f => f.key === key);
  if (key && file?.file) {
    chat.msgForm = {
      roomId: chat.theContact.roomId,
      msgType: MessageType.FILE, // 文件
      content: chat.msgForm.content,
      body: {
        atUidList: chat.msgForm.body.atUidList,

        url: key,
        fileName: file?.file?.name,
        size: file?.file?.size,
      },
    };
  }
}
// 语音
onMounted(() => {
  // 监听快捷键
  window.addEventListener("keydown", startChating);
  inputAllRef.value?.input?.focus(); // 聚焦
});
onUnmounted(() => {
  window.removeEventListener("keydown", startChating);
});
// 开始录音
async function startChating(e: KeyboardEvent) {
  if (e.key === "t" && e.ctrlKey && !isChating.value) {
    e.preventDefault();
    isChating.value = true;
    chat.msgForm.msgType = MessageType.SOUND; // 语音
  }
  else if (e.key === "c" && e.ctrlKey && isChating.value) {
    e.preventDefault();
    isChating.value = false;
    chat.msgForm.msgType = MessageType.SOUND; // 语音
  }
}

const isUploadImg = computed(() => chat.msgForm.msgType === MessageType.IMG && !!imgList?.value?.filter(f => f.status === "")?.length);
const isUploadFile = computed(() => chat.msgForm.msgType === MessageType.FILE && !!fileList?.value?.filter(f => f.status === "")?.length);
/**
 * 粘贴上传
 * @param e 事件对象
 */
async function onPaste(e: ClipboardEvent) {
  // 判断粘贴上传
  if (!e.clipboardData?.items?.length)
    return;
  // 拿到粘贴板上的 image file 对象
  const fileArr = Array.from(e.clipboardData.items);
  const file = fileArr.find(v => FILE_TYPE_ICON_MAP[v.type])?.getAsFile();
  const img = fileArr.find(v => v.type.includes("image"))?.getAsFile();
  if ((!img && !file) || !inputOssImgUploadRef.value)
    return;
  if (file) {
    if (isUploadFile.value) {
      ElMessage.warning("文件正在上传中，请稍后再试！");
      return;
    }
    inputOssImgUploadRef.value?.resetInput?.();
    inputOssFileUploadRef.value?.resetInput?.();
    fileList.value = [];
    await inputOssFileUploadRef.value?.onUpload({
      id: URL.createObjectURL(file),
      key: undefined,
      status: "",
      percent: 0,
      file,
    });
    chat.msgForm.msgType = MessageType.FILE; // 文件
  }
  if (img) {
    // if (isUploadImg.value) { // 单图片上传
    //   ElMessage.warning("图片正在上传中，请稍后再试！");
    //   return;
    // }
    // imgList.value = [];
    inputOssImgUploadRef.value?.resetInput?.();
    inputOssFileUploadRef.value?.resetInput?.();
    await inputOssImgUploadRef.value?.onUpload({
      id: URL.createObjectURL(img),
      key: undefined,
      status: "",
      percent: 0,
      file: img,
    });
    chat.msgForm.msgType = MessageType.IMG; // 图片
  }
}

/**
 * 发送消息
 */
async function onSubmit(e?: KeyboardEvent) {
  if (e) {
    // 上下键
    if (!chat.msgForm.content?.trim() && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      chat.onDownUpChangeRoom(e.key === "ArrowDown" ? "down" : "up");
      return;
    }
    if (e?.shiftKey && e?.key === "Enter")
      return;
    if (e?.key !== "Enter")
      return;
    e.preventDefault && e.preventDefault();
    e.stopPropagation && e.stopPropagation();
  }
  if (isSending.value)
    return;
  formRef.value?.validate(async (action: boolean) => {
    if (!action)
      return;
    if (chat.msgForm.msgType === MessageType.TEXT && (!chat.msgForm.content || chat.msgForm.content?.trim().length > 500))
      return;

    // 处理 @用户
    if (chat.theContact.type === RoomType.GROUP && chat.msgForm.content?.includes("@")) {
      const { uidList, atUidList } = useAtUsers(chat.msgForm.content, userOptions.value);
      chat.atUserList = [...atUidList];
      chat.msgForm.body.atUidList = [...new Set(uidList)];
      if (document.querySelector(".at-select")) // enter冲突at选择框
        return;
    }
    else {
      chat.msgForm.body.atUidList = [];
    }
    // 图片
    if (chat.msgForm.msgType === MessageType.IMG) {
      if (isUploadImg.value) {
        ElMessage.warning("图片正在上传中，请稍后再试！");
        return;
      }
      if (imgList.value.length > 1) {
        await multiSubmitImg();
        return;
      }
    }
    // 文件
    if (chat.msgForm.msgType === MessageType.FILE && isUploadFile.value) {
      ElMessage.warning("文件正在上传中，请稍后再试！");
      return;
    }
    // 开始提交
    isSending.value = true;
    // 语音消息 二次处理
    if (chat.msgForm.msgType === MessageType.SOUND) {
      await onSubmitSound((key) => {
        chat.msgForm.body.url = key;
        chat.msgForm.body.translation = audioTransfromText.value;
        chat.msgForm.body.second = second.value;
        submit(chat.msgForm);
      });
      return;
    }
    // 普通消息
    submit(chat.msgForm);
  });
}

/**
 * 发送消息
 */
async function submit(formData: ChatMessageDTO = chat.msgForm, callback?: (msg: ChatMessageVO) => void) {
  const res = await addChatMessage({
    ...formData,
    roomId: chat.theContact.roomId,
  }, user.getToken);
  isSending.value = false;
  if (res.code === StatusCode.SUCCESS) {
    emit("submit", res.data);
    // 消息阅读上报
    res.data.message.roomId && chat.setReadList(res.data.message.roomId);
    typeof callback === "function" && callback(res.data); // 执行回调
  }
  else if (res.message === "您和对方已不是好友！") {
    return;
  }
  resetForm();
}

/**
 * 批量发送图片消息
 */
async function multiSubmitImg() {
  isSending.value = true;
  const formTemp = JSON.parse(JSON.stringify(chat.msgForm));
  // 批量发送图片消息
  const uploadedFiles = new Set(); // 用来跟踪已经上传的文件
  for (const file of imgList.value) {
    chat.msgForm = {
      roomId: chat.theContact.roomId,
      msgType: MessageType.IMG, // 默认
      content: "",
      body: {
        url: file.key,
        size: file?.file?.size || 0,
      },
    };
    await submit(chat.msgForm); // 等待提交完成
    uploadedFiles.add(file.key); // 标记文件为已上传
  }
  // 一次性移除所有已上传的文件
  imgList.value = imgList.value.filter(file => !uploadedFiles.has(file.key));

  // 发送文本消息
  if (formTemp.content) {
    formTemp.body.url = undefined;
    formTemp.body.size = undefined;
    formTemp.msgType = MessageType.TEXT; // 默认
    chat.msgForm = {
      ...formTemp,
      roomId: chat.theContact.roomId,
      msgType: MessageType.TEXT, // 默认
    };
    await submit(chat.msgForm);
  }
  isSending.value = false;
}


/**
 * 发送群广播消息
 */
const showLordMsg = ref(false);
function onSubmitLordMsg(formData: ChatMessageDTO) {
  if (!isLord.value) {
    ElMessage.error("仅群主可发送广播消息！");
    return;
  }
  chat.msgForm = {
    roomId: chat.theContact.roomId,
    msgType: MessageType.SYSTEM, // 默认
    content: "",
    body: {
    },
  };
  submit({
    roomId: chat.theContact.roomId,
    msgType: MessageType.SYSTEM, // 默认
    content: formData.content,
    body: {
    },
  });
}


// 房间号变化
let timer: any = 0;
watch(() => chat.theContact.roomId, () => {
  resetForm();
  if (inputAllRef.value?.input)
    inputAllRef.value?.input?.focus(); // 聚焦
});
onUnmounted(() => {
  clearTimeout(timer);
  clearInterval(timer);
  timer = null;
});

// 回复消息
watch(() => chat.replyMsg?.message?.id, (val) => {
  chat.msgForm.body.replyMsgId = val;
  nextTick(() => {
    if (inputAllRef.value?.input)
      inputAllRef.value?.input?.focus(); // 聚焦
  });
});

// 到底部并消费消息
function setReadAndScrollBottom() {
  if (chat.theContact.roomId) {
    chat.setReadList(chat.theContact.roomId);
    chat.scrollBottom();
  }
}

/**
 * 右键菜单
 * @param e 事件对象
 * @param key key
 * @param index 索引
 */
function onContextMenu(e: MouseEvent, key?: string, index: number = 0, type: OssFileType = OssFileType.IMAGE) {
  e.preventDefault();
  const textMap = {
    [OssFileType.IMAGE]: "图片",
    [OssFileType.FILE]: "文件",
    [OssFileType.SOUND]: "语音",
  } as Record<OssFileType, string>;
  const opt = {
    x: e.x,
    y: e.y,
    theme: colorMode.preference === "dark" ? "mac dark" : "wind10",
    items: [
      {
        customClass: "group",
        icon: "i-solar:trash-bin-minimalistic-outline group-btn-danger",
        label: `删除${textMap[type]}`,
        onClick: async () => {
          if (!key)
            return;
          const item = fileList.value.find(f => f.key === key);
          if (item)
            item.subscribe.unsubscribe();
          await deleteOssFile(key, user.getToken);
          ElMessage.closeAll("error");
          if (type === OssFileType.IMAGE) {
            imgList.value.splice(
              index,
              1,
            );
            inputOssImgUploadRef?.value?.resetInput?.();
          }
          if (type === OssFileType.FILE) {
            fileList.value.splice(
              index,
              1,
            );
            inputOssFileUploadRef?.value?.resetInput?.();
          }
        },
      },
    ],
  };
  ContextMenu.showContextMenu(opt);
}

// 重置表单
function resetForm() {
  chat.msgForm = {
    roomId: chat.theContact.roomId,
    msgType: MessageType.TEXT, // 默认
    content: "",
    body: {
      atUidList: [],
    },
  };
  imgList.value = [];
  fileList.value = [];
  // store
  chat.atUserList.splice(0);

  // 重置上传
  inputOssImgUploadRef.value?.resetInput?.();
  inputOssFileUploadRef.value?.resetInput?.();
  chat.setReplyMsg({});
  resetAudio();
}

/**
 * 发送语音
 * @param callback 上传成功回调
 */
async function onSubmitSound(callback: (key: string) => void) {
  if (!theAudioFile.value || !theAudioFile.value.id)
    return ElMessage.error("请先录制语音");
  await useOssUpload(OssFileType.SOUND, theAudioFile.value, user.getToken, {
    callback(event, data, file) {
      if (event === "error")
        ElMessage.error("发送语音失败，请稍后再试！");
      else if (event === "success")
        callback(data);
    },
  });
}
watch(() => chat.theContact.roomId, () => {
  resetForm();
  loadUser();
});
</script>

<template>
  <el-form
    ref="formRef"
    :model="chat.msgForm"
    v-bind="$attrs"
    :disabled="isDisabledFile"
    class="w-full"
    style="position: relative;"
  >
    <div class="top absolute w-full p-2 -transform-translate-y-full" @click.prevent="() => {}">
      <!-- 新消息 -->
      <div
        v-show="chat.theContact.unreadCount"
        class="w-full cursor-pointer"
        style="padding: 0 0.5rem;margin:0;margin-bottom:0.4rem;display: flex;justify-content: right;"
        @click="setReadAndScrollBottom"
      >
        <el-tag type="warning" effect="light" round class="ml-a">
          有 {{ chat.theContact.unreadCount }} 条新消息
        </el-tag>
      </div>
      <!-- 图片 -->
      <div
        v-if="imgList.length > 0"
        class="w-full flex flex-wrap cursor-pointer justify-end gap-2"
        style="padding: 0 0.5rem;margin:0;margin-bottom:0.4rem;"
      >
        <div
          v-for="(img, i) in imgList" :key="i" class="relative flex-row-c-c p-2 shadow-sm transition-shadow border-default card-default bg-color hover:shadow-lg"
          @contextmenu="onContextMenu($event, img.key, i, OssFileType.IMAGE)"
        >
          <CardElImage
            preview-teleported
            loading="lazy"
            :preview-src-list="[img.id || BaseUrlImg + img.key]"
            :src="img.id || BaseUrlImg + img.key"
            class="rounded"
            :class="imgList.length > 1 ? 'w-4rem h-4rem sm:(w-6rem h-6rem)' : 'h-9rem max-w-16rem'"
            title="左键放大 | 右键删除"
          />
          <small
            v-if="img.status !== 'success'"
            class="absolute right-0 top-0 h-full w-full flex-row-c-c p-4 backdrop-blur-4px"
          >
            {{ img.status === '' ? '上传中...' : '上传失败' }}
          </small>
        </div>
      </div>
      <!-- 文件 -->
      <div
        v-if="fileList.length > 0"
        class="w-full cursor-pointer"
        style="padding: 0 0.5rem;margin:0;margin-bottom:0.4rem;display: flex;width:fit-content;justify-content: center;gap: 0.5rem;grid-gap:4;margin-left: auto;"
      >
        <div
          v-for="(file, i) in fileList"
          :key="i" class="flex-row-c-c p-3 shadow-sm transition-all border-default card-default bg-color hover:shadow-lg"
          @contextmenu="onContextMenu($event, file.key, i, OssFileType.FILE)"
        >
          <img :src="file?.file?.type ? FILE_TYPE_ICON_MAP[file?.file?.type] : FILE_TYPE_ICON_DEFAULT" class="h-8 w-8">
          <div class="mx-2 max-w-16vw min-w-8rem">
            <p class="truncate text-sm">
              {{ file?.file?.name || file.key }}
            </p>
            <el-progress
              striped
              :striped-flow="file.status !== 'success'"
              :duration="10"
              class="mt-2"
              :percentage="file.percent" :stroke-width="4" :status="file?.status as any || ''"
            >
              {{ formatFileSize(file?.file?.size || 0) }}
            </el-progress>
          </div>
        </div>
      </div>
      <!-- 回复 -->
      <div
        v-if="chat.replyMsg?.fromUser"
        prop="body.replyMsgId"
        class="w-full text-sm"
      >
        <div class="w-full flex animate-[300ms_fade-in] items-center p-2 shadow card-default-br border-default-hover">
          <el-tag effect="dark" size="small" class="mr-2 shrink-0">
            回复
          </el-tag>
          <ChatMsgContentCard class="max-w-4/5 truncate" :data="chat.replyMsg" />
          <div class="i-solar:close-circle-bold ml-a h-5 w-5 text-dark op-80 transition-200 transition-color btn-default dark:text-light hover:text-[var(--el-color-danger)]" @click="chat.setReplyMsg({})" />
        </div>
      </div>
    </div>
    <div class="flex flex-col justify-center border-0 border-t-1px p-2 shadow border-default bg-color">
      <!-- 工具栏 -->
      <div
        class="relative flex items-center gap-2 px-2 sm:(gap-4)"
      >
        <el-tooltip popper-style="padding: 0.2em 0.5em;" :content="chat.msgForm.msgType !== MessageType.SOUND ? (setting.isMobileSize ? '语音' : '语音 Ctrl+T') : '键盘'" placement="top">
          <i
            :class="chat.msgForm.msgType !== MessageType.SOUND ? 'i-solar:microphone-3-broken hover:animate-pulse' : 'i-solar:keyboard-broken'"
            class="h-6 w-6 cursor-pointer btn-primary"
            @click="chat.msgForm.msgType = chat.msgForm.msgType === MessageType.TEXT ? MessageType.SOUND : MessageType.TEXT"
          />
        </el-tooltip>
        <!-- 语音 -->
        <div v-show="chat.msgForm.msgType === MessageType.SOUND && !theAudioFile?.id" class="absolute-center-x">
          <BtnElButton
            ref="pressHandleRef"
            type="primary" class="group tracking-0.1em hover:shadow-lg"
            :class="{ 'is-chating': isChating }" style="padding: 0.8rem 3rem;" round
            size="small"
          >
            <i i-solar:soundwave-line-duotone class="icon" p-2.5 />
            <div class="text w-5rem truncate text-center transition-width group-hover:(w-6rem sm:w-9rem) sm:w-8rem">
              <span class="chating-hidden">{{ isChating ? `正在输入 ${second}s` : (setting.isMobileSize ? '语音' : '语音 Ctrl+T') }}</span>
              <span hidden class="chating-show">停止录音 {{ second ? `${second}s` : '' }}</span>
            </div>
          </BtnElButton>
        </div>
        <div v-show="chat.msgForm.msgType === MessageType.SOUND && theAudioFile?.id" class="absolute-center-x">
          <i p-2.4 />
          <BtnElButton
            type="primary"
            class="group tracking-0.1em op-60 hover:op-100" :class="{ 'is-chating !op-100': isPalyAudio }"
            style="padding: 0.8rem 3rem;" round size="small"
            @click="handlePlayAudio(isPalyAudio ? 'stop' : 'play', theAudioFile?.id)"
          >
            {{ second ? `${second}s` : '' }}
            <i :class="isPalyAudio ? 'i-solar:stop-bold' : 'i-solar:play-bold'" class="icon" ml-2 p-1 />
          </BtnElButton>
          <i
            i-solar:trash-bin-minimalistic-broken ml-3 p-2.4 btn-danger
            @click="handlePlayAudio('del')"
          />
        </div>
        <!-- 图片 -->
        <div v-show="chat.msgForm.msgType !== MessageType.SOUND" class="flex items-center gap-2 sm:gap-4">
          <InputOssFileUpload
            ref="inputOssImgUploadRef"
            v-model="imgList"
            :multiple="true"
            :preview="false"
            :size="IMG_MAX_SIZE"
            :min-size="1024"
            :limit="9"
            :disable="isDisabledFile"
            class="i-solar:album-line-duotone h-5 w-5 cursor-pointer btn-primary"
            pre-class="hidden"
            :upload-type="OssFileType.IMAGE"
            input-class="op-0 h-5 w-5 cursor-pointer "
            :upload-quality="0.5"
            @error-msg="(msg:string) => {
              ElMessage.error(msg)
            }"
            @submit="onSubmitImg"
          />
          <!-- 文件 -->
          <InputOssFileUpload
            ref="inputOssFileUploadRef"
            v-model="fileList"
            :multiple="false"
            :size="FILE_MAX_SIZE"
            :min-size="1024"
            :preview="false"
            :limit="1"
            :disable="isDisabledFile"
            class="i-solar-folder-with-files-line-duotone h-5 w-5 cursor-pointer btn-primary"
            pre-class="hidden"
            :upload-type="OssFileType.FILE"
            input-class="op-0 h-5 w-5 cursor-pointer "
            :accept="FILE_UPLOAD_ACCEPT"
            @error-msg="(msg:string) => {
              ElMessage.error(msg)
            }"
            @submit="onSubmitFile"
          />
        </div>
        <i ml-a block w-0 />
        <template v-if="chat.msgForm.msgType !== MessageType.SOUND">
          <!-- 群广播消息 -->
          <div
            v-if="isLord"
            title="群广播消息"
            class="i-solar-confetti-minimalistic-line-duotone inline-block p-2.8 transition-200 btn-primary"
            @click="showLordMsg = true"
          />
          <!-- 语音通话 -->
          <div
            v-if="isSelfRoom"
            title="语音通话"
            class="i-solar:phone-calling-outline p-2.8 transition-200 btn-primary"
            @click="chat.openRtcCall(chat.theContact.roomId, CallTypeEnum.AUDIO)"
          />
          <!-- 视频通话 -->
          <div
            v-if="isSelfRoom"
            title="视频通话"
            class="i-solar:videocamera-record-line-duotone p-2.8 transition-200 btn-primary"
            @click="chat.openRtcCall(chat.theContact.roomId, CallTypeEnum.VIDEO)"
          />
        </template>
        <!-- 滚动底部 -->
        <div
          class="i-solar:double-alt-arrow-down-line-duotone inline-block p-2.8 transition-200 btn-primary"
          @click="setReadAndScrollBottom"
        />
      </div>
      <!-- 内容 -->
      <el-form-item
        v-if="chat.msgForm.msgType !== MessageType.SOUND"
        prop="content"
        style="padding: 0;margin: 0;"
        class="input relative h-fit w-full"
        :rules="[
          { min: 1, max: 500, message: '长度在 1 到 500 个字符', trigger: `change` },
        ]"
      >
        <el-mention
          ref="inputAllRef"
          v-model.lazy="chat.msgForm.content"
          :options="userOpenOptions"
          :prefix="['@']"
          popper-class="at-select"
          :check-is-whole="(pattern: string, value: string) => checkAtUserWhole(chat.msgForm.content, pattern, value)"
          :rows="setting.isMobileSize ? 4 : 6"
          :maxlength="500"
          :autosize="false"
          type="textarea"
          resize="none"
          :class="{
            focused: chat.msgForm.content,
          }"
          style="height: 100%;"
          placement="top"
          autofocus
          show-word-limit
          whole
          :offset="10"
          :popper-options="{
            placement: 'top-start',
          }"
          @paste.stop="onPaste"
          @keydown="(e: KeyboardEvent) => onSubmit(e)"
        >
          <template #label="{ item }">
            <div class="h-full flex items-center pr-1">
              <CardElImage class="h-6 w-6 rounded-full" :src="BaseUrlImg + item.avatar" />
              <span class="ml-2 inline-block max-w-10em truncate">{{ item.label }}</span>
            </div>
          </template>
          <template #header>
            <span ml-2 op-70>
              群成员
            </span>
          </template>
          <!-- <template #footer>
            <span my-2 op-70 />
          </template> -->
        </el-mention>
      </el-form-item>
      <!-- 录音 -->
      <p
        v-if="chat.msgForm.msgType === MessageType.SOUND"
        class="relative h-40 w-full flex-row-c-c overflow-y-auto p-8 text-wrap op-90"
      >
        {{ (isChating && speechRecognition.isSupported || theAudioFile?.id) ? (audioTransfromText || '...') : `识别你的声音 🎧${speechRecognition.isSupported ? '' : '（不支持）'}` }}
      </p>
      <div class="flex p-1 pt-0">
        <BtnElButton
          :disabled="!user.isLogin || isSending || isNotExistOrNorFriend"
          class="group ml-a overflow-hidden shadow"
          type="primary"
          round
          size="small"
          :loading="isSending || isUploadImg || isUploadFile || isPalyAudio"
          style="padding: 0.8rem;width: 6rem;"
          @click="onSubmit()"
        >
          发送&nbsp;
        </BtnElButton>
      </div>
    </div>
    <div
      v-show="isNotExistOrNorFriend"
      class="absolute left-0 top-0 h-full w-full flex-row-c-c border-0 border-t-1px tracking-2px shadow backdrop-blur-4px border-default"
    >
      <span op-80>
        <i i-solar:adhesive-plaster-bold-duotone mr-3 p-2.4 />
        {{ SelfExistTextMap[chat.theContact.type] }}
      </span>
    </div>
  </el-form>
  <ChatGroupNoticeMsgDialog v-model:show="showLordMsg" @submit="onSubmitLordMsg" />
</template>

<style lang="scss" scoped>
.at-select {
  :deep(.el-select__wrapper),
  :deep(.el-select-v2__input-wrapper),
  :deep(.el-input__wrapper) {
    box-shadow: none !important;
    background-color: transparent;
    padding: 0;
  }
  :deep(.el-form-item__error) {
    padding-left: 1rem;
  }
}
:deep(.el-mention-popper) {
  .el-mention-dropdown__header {
    padding: 0.2rem;
  }
  .el-mention-dropdown__item {
    padding: 0 0.4rem;
  }
}
:deep(.el-form-item__content) {
    padding: 0;
  }
.input {
  :deep(.el-input__count) {
    left: 0.8em;
    bottom: -2.5em;
    width: fit-content;
    background-color: transparent;
    transition: opacity 0.2s;
    opacity: 0;
  }
  :deep(.el-textarea__inner) {
    resize:none;
    box-shadow: none !important;
    background-color: transparent;
    caret-color: var(--el-color-primary);
    font-size: 1rem;
    &:hover + .el-input__count  {
      opacity: 1;
    }
  }
}

// 语音
.is-chating {
  --at-apply: "shadow-lg ";
  --shadow-color: var(--el-color-primary);
  --shadow-color2: var(--el-color-primary-light-3);
  outline: none !important;
  background-size: 400% 400%;
  transition: all 0.2s;
  animation: aniamte-poppup-pluse 1s linear infinite;
  background-image: linear-gradient(to right, var(--shadow-color2) 0%, var(--shadow-color) 50%,var(--shadow-color2) 100%);
  background-color: var(--shadow-color);
  border-color: var(--shadow-color);
  &:deep(.el-button) {
    outline: none !important;
  }
  &:hover .chating-hidden {
    --at-apply: "hidden";
  }
  &:hover .chating-show {
    --at-apply: "inline-block";
  }
  .icon {
    --at-apply: "animate-pulse";
  }
  .text {
    --at-apply: "!w-8rem";
  }
  &:hover {
    --at-apply: "shadow-md";
    --shadow-color: var(--el-color-danger);
    --shadow-color2: var(--el-color-danger-light-3);
    box-shadow: 0 0 0.8rem var(--shadow-color);
    animation-play-state: paused;
    background-color: var(-shadow-color);
    border-color: var(-shadow-color);
  }
}

@keyframes aniamte-poppup-pluse {
  0% {
    box-shadow: 0 0 0.5rem var(--shadow-color);
    background-position: 0% 50%;
  }
  50% {
    box-shadow: 0 0 1.2rem var(--shadow-color);
    background-position: 100% 50%;
  }
  100% {
    box-shadow: 0 0 0.5rem var(--shadow-color);
    background-position: 0% 50%;
  }
}
</style>
