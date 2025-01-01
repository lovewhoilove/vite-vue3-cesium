import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      // name: "Cesium一张图-测试弹窗",
      // component: () => import("../views/OneMap.vue"),
      // name: "可视化笛卡尔坐标系",
      // component: () => import("../views/TestCartesian.vue"),
      // name: "Cesium中的Camera(1)",
      // component: () => import("../views/TestCamera.vue"),
      name: "Cesium中的Camera(2)",
      component: () => import("../views/TestCamera2.vue"),
    },
  ],
});

export default router;
