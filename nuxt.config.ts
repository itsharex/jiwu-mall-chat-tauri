// 打包分包插件解决潜在循环依赖
// import { chunkSplitPlugin } from "vite-plugin-chunk-split";
// import { prismjsPlugin } from "vite-plugin-prismjs";
// import { pwa } from "./config/pwa";
import { appDescription, appName } from "./constants/index";

const BASE_URL = process.env.NUXT_PUBLIC_API_BASE_URL;
const isSSR = process.env.NUXT_PUBLIC_SPA;
const mode = process.env.NUXT_PUBLIC_NODE_ENV;
// 打印
console.log(`mode:${mode} api_url:${BASE_URL} SSR:${isSSR}`);
export default defineNuxtConfig({
  ssr: false,
  future: {
    compatibilityVersion: 4,
  },
  runtimeConfig: {
    public: {
      baseUrl: BASE_URL,
      mode,
    },
  },
  build: {
    transpile: ["@popperjs/core", "resize-detector"],
  },
  nuxtLink: {
    prefetch: true,
    prefetchOn: { visibility: true },
  },
  // spa情况下loading状态
  // spaLoadingTemplate: "./app/spa-loading-template.html",
  // pageTransition: { name: "page", mode: "out-in" },
  // layoutTransition: { name: "layout", mode: "out-in" },
  // 模块
  modules: [
    // 工具
    "@vueuse/nuxt",
    "@nuxtjs/color-mode",
    // UI
    "@element-plus/nuxt",
    "@formkit/auto-animate/nuxt",
    "@unocss/nuxt",
    // 基础
    "@pinia/nuxt",
    // "@vite-pwa/nuxt",
    "@pinia-plugin-persistedstate/nuxt",
  ],

  srcDir: "",
  rootDir: "",

  app: {
    head: {
      title: `${appName} - 开启你的购物社区之旅 ✨`,
      viewport: "width=device-width,initial-scale=1",
      // 网站头部信息
      link: [
        { rel: "icon", href: "/logo.png", sizes: "any" },
        { rel: "apple-touch-icon", href: "/logo.png" },
      ],
      // 网站meta
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "description", content: appDescription },
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      ],
    },
  },

  // https://blog.csdn.net/weixin_42553583/article/details/131372309
  experimental: {
    // https://nuxt.com.cn/docs/guide/going-further/experimental-features#inlinerouterules
    inlineRouteRules: true,
    payloadExtraction: false,
    renderJsonPayloads: true, //
    emitRouteChunkError: false, // https://nuxt.com.cn/docs/getting-started/error-handling#js-chunk-%E9%94%99%E8%AF%AF
    viewTransition: true, // 支持View Transition API Chorme111 https://blog.csdn.net/weixin_42553583/article/details/130474259
    crossOriginPrefetch: true, // 使用 Speculation Rules API 启用跨源预取。
  },

  // 自动导入
  imports: {
    dirs: [
      // Scan top-level modules
      "composables",
      "composables/utils/**",
      "composables/store/**",
      "composables/api/*/",
      "types/*/.ts",
      "types/**",
    ],
  },

  // css
  css: [
    "@/assets/styles/init.scss",
    "@/assets/styles/index.scss",
    "@/assets/styles/animate.scss",
  ],

  // alias: {
  //   "~": "/<srcDir>",
  //   "@": "/<srcDir>",
  //   "~~": "/<rootDir>",
  //   "@@": "/<rootDir>",
  //   "assets": "/<srcDir>/assets",
  //   "public": "/<srcDir>/public",
  // },
  // vite
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `
          @use "@/assets/styles/element/index.scss" as element;
          @use "@/assets/styles/element/dark.scss" as dark;
          @use "@/assets/styles/var.scss" as *;
          `,
        },
      },
    },
    plugins: [
    ],
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
          },
        },
        // external: ["workbox-build"],
      },
    },
  },

  colorMode: {
    classSuffix: "",
  },

  // 3、elementPlus
  elementPlus: {
    icon: "ElIcon",
    importStyle: "scss",
    themes: ["dark"],
  },
  // pwa
  // pwa,
  // nuxt开发者工具
  devtools: {
    enabled: false,
  },
  compatibilityDate: "2024-07-05",
});
