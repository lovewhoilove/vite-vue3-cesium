<template>
  <CesiumMap />
  <el-select
    class="select"
    v-model="value"
    placeholder="空"
    @change="handleSelectChange">
    <el-option
      v-for="item in options"
      :key="item.value"
      :label="item.label"
      :value="item.value" />
  </el-select>
  <el-button class="complete" @click="completeFlight">完成飞行</el-button>
  <el-button class="cancel" @click="cancelFlight">取消飞行</el-button>
</template>

<script setup>
import useCSViewerStore from "@/stores/csViewer.js";
import {
  SceneMode,
  Transforms,
  Cartesian3,
  Matrix4,
  Math,
  EasingFunction,
  Rectangle,
  Color,
  JulianDate,
  defined,
} from "cesium";

const cvs = useCSViewerStore();

let viewer, scene, clock;
let referenceFramePrimitive;

onMounted(() => {
  viewer = cvs.viewer;
  scene = viewer.scene;
  clock = viewer.clock;
});

onBeforeUnmount(() => {});

const value = ref();

const options = [
  {
    value: "1",
    label: "在一个城市中飞行",
  },
  {
    value: "2",
    label: "飞往圣地亚哥",
  },
  {
    value: "3",
    label: "飞往某个位置(with heading,pitch和roll)",
  },
  {
    value: "4",
    label: "飞往我的位置",
  },
  {
    value: "5",
    label: "飞往一个矩形区域",
  },
  {
    value: "6",
    label: "查看一个矩形",
  },
  {
    value: "7",
    label: "设置参考系",
  },
  {
    value: "8",
    label: "设置相机的heading,pitch,roll",
  },
  {
    value: "9",
    label: "实现ICRF视角的动态更新",
  },
  {
    value: "10",
    label: "Camera移动事件",
  },
  {
    value: "11",
    label: "Camera的changed事件",
  },
  {
    value: "12",
    label: "从洛杉矶途径欧洲飞往东京",
  },
  {
    value: "13",
    label: "从洛杉矶途径欧洲飞往东京——带有俯仰角",
  },
];

function handleSelectChange(value) {
  reset();
  switch (value) {
    case "1":
      flyInACity();
      break;
    case "2":
      flyToSanDiego();
      break;
    case "3":
      flyToHeadingPitchRoll();
      break;
    case "4":
      flyToLocation();
      break;
    case "5":
      flyToRectangle();
      break;
    case "6":
      viewRectangle();
      break;
    case "7":
      setReferenceFrame();
      break;
    case "8":
      setHeadingPitchRoll();
      break;
    case "9":
      viewInICRF();
      break;
    case "10":
      cameraMoveEvents();
      break;
    case "11":
      cameraChanges();
      break;
    case "12":
      flyOverLongitude();
      break;
    case "13":
      //带有俯仰角使得相机在超过某个高度值时，调整俯仰角向下看，使得视图范围能一直看到地球。
      flyOverLongitudeWithPitch();
      break;
    default:
      break;
  }
}

function flyInACity() {
  const camera = scene.camera;
  camera.flyTo({
    destination: Cartesian3.fromDegrees(
      -73.98580932617188,
      40.74843406689482,
      363.34038727246224
    ),
    complete: () => {
      setTimeout(() => {
        camera.flyTo({
          destination: Cartesian3.fromDegrees(
            -73.98585975679403,
            40.75759944127251,
            186.50838555841779
          ),
          orientation: {
            heading: Math.toRadians(200.0),
            pitch: Math.toRadians(-50.0),
          },
          easingFunction: EasingFunction.LINEAR_NONE,
        });
      }, 1000);
    },
  });
}

function flyToSanDiego() {
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(-117.16, 32.71, 15000.0),
  });
}

function flyToHeadingPitchRoll() {
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(-122.22, 46.12, 5000.0),
    orientation: {
      heading: Math.toRadians(20.0),
      pitch: Math.toRadians(-35.0),
      roll: 0.0,
    },
  });
}

function flyToLocation() {
  navigator.geolocation.getCurrentPosition((pos) => {
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        pos.coords.longitude,
        pos.coords.latitude,
        1000.0
      ),
    });
  });
}

function flyToRectangle() {
  const west = -90.0;
  const south = 38.0;
  const east = -87.0;
  const north = 40.0;
  const rectangle = Rectangle.fromDegrees(west, south, east, north);

  viewer.camera.flyTo({
    destination: rectangle,
  });

  //这里是为了展示方便，所以绘制了一个矩形
  viewer.entities.add({
    rectangle: {
      coordinates: rectangle,
      fill: false,
      outline: true,
      outlineColor: Color.WHITE,
    },
  });
}

function viewRectangle() {
  const west = -77.0;
  const south = 38.0;
  const east = -72.0;
  const north = 42.0;

  const rectangle = Cesium.Rectangle.fromDegrees(west, south, east, north);
  viewer.camera.setView({
    destination: rectangle,
  });

  viewer.entities.add({
    rectangle: {
      coordinates: rectangle,
      fill: false,
      outline: true,
      outlineColor: Color.WHITE,
    },
  });
}

function setReferenceFrame() {
  //局部坐标系（ENU）原点的坐标
  const center = Cartesian3.fromDegrees(-75.59777, 40.03883);
  /**
   * 计算从ENU坐标系转换为全球通用坐标系的转换矩阵
   * ENU，全称为：East north up coordinate，即东北天坐标系，参考：
   * 1. https://en.wikipedia.org/wiki/Local_tangent_plane_coordinates#Local_east,_north,_up_(ENU)_coordinates
   * 2. https://zlthinker.github.io/%E5%9C%B0%E7%90%86%E4%BF%A1%E6%81%AF%E7%B3%BB%E7%BB%9F%E4%B8%AD%E7%9A%84%E5%B8%B8%E7%94%A8%E5%9D%90%E6%A0%87%E7%B3%BB
   * 3. https://baike.baidu.com/item/%E7%AB%99%E5%BF%83%E5%9D%90%E6%A0%87%E7%B3%BB/4542391
   */
  const transform = Transforms.eastNorthUpToFixedFrame(center);

  const camera = viewer.camera;
  camera.constrainedAxis = Cartesian3.UNIT_Z;
  //使用目标和变换矩阵设置摄像机位置和方向
  camera.lookAtTransform(
    transform,
    new Cartesian3(-120000.0, -120000.0, 120000.0)
  );
}

function setHeadingPitchRoll() {
  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(-75.5847, 40.0397, 1000.0),
    orientation: {
      heading: -Math.PI_OVER_TWO,
      pitch: -Math.PI_OVER_FOUR,
      roll: 0.0,
    },
  });
}

function viewInICRF() {
  //摄像机飞往默认的主视图（即Camera#.DEFAULT_VIEW_RECTANGLE），参数为持续时间，这里设置为0秒
  viewer.camera.flyHome(0);
  //multiplier默认值为1.0，获取或设置调用 Clock#tick 时前进的时间量，由于单位为秒，因此这里设置每次时间的前进时长为3小时
  clock.multiplier = 3 * 60 * 60;
  //添加在更新场景后和渲染场景之前执行的事件监听器。
  //事件的订阅者接收 Scene 实例作为第一个参数，将当前时间作为第二个参数。
  scene.postUpdate.addEventListener(icrf);
  scene.globe.enableLighting = true; //启用使用场景的光源照亮地球。
}

//监听器
function icrf(scene, time) {
  console.log("time参数类型为JulianDate： ", time instanceof JulianDate);
  if (scene.mode !== SceneMode.SCENE3D) {
    return;
  }

  //计算旋转矩阵，以在给定时间将点或矢量从国际天体参考系 （GCRF/ICRF） 惯性系轴变换为地球固定系轴 （ITRF）。如果尚未加载执行转换所需的数据，则此函数可能会返回 undefined。
  const icrfToFixed = Transforms.computeIcrfToFixedMatrix(time);
  if (Cesium.defined(icrfToFixed)) {
    const camera = viewer.camera;
    const offset = Cartesian3.clone(camera.position);
    //从表示旋转的 Matrix3 和表示平移的 Cartesian3 计算 Matrix4 实例。这里只指定了第一个旋转参数，第二个平移参数默认值为：Cartesian3.ZERO
    const transform = Matrix4.fromRotationTranslation(icrfToFixed);
    //使用目标和变换矩阵设置摄像机位置和方向。
    camera.lookAtTransform(transform, offset);
  }
}

let removeStart;
let removeEnd;

function cameraMoveEvents() {
  const camera = viewer.camera;
  removeStart = camera.moveStart.addEventListener(() => {
    ElMessage({
      message: "Camera开始移动",
      duration: 500,
    });
  });
  removeEnd = camera.moveStart.addEventListener(() => {
    ElMessage({
      message: "Camera停止移动",
      duration: 500,
    });
  });
}

let removeChanged;
function cameraChanges() {
  /**
    percentage表示的是相机变换过程中的一个进度值，这个值通常介于0和1之间，具体含义如下：
    当percentage为0时，表示相机变换的开始；当percentage为1时，表示相机变换的结束；如果percentage在0和1之间，则表示相机变换当前所处的进度阶段。
    这个百分比参数可以用来做以下事情：
      1. 动画进度反馈：可以用来显示相机动画的当前进度，为用户提供视觉反馈。
      2. 任务调度：在相机变换过程中，可以根据进度来调度一些任务，例如在变换到一半时开始加载新的数据。
      3. 条件判断：可以用来判断相机变换是否已经完成，或者是否达到了某个特定的进度点，以执行某些特定的操作。
   */
  removeChanged = viewer.camera.changed.addEventListener((percentage) => {
    console.log("Camera变换进度值：", percentage);
  });
}

function flyOverLongitude() {
  losAngelesToTokyo();
}

function flyOverLongitudeWithPitch() {
  losAngelesToTokyo(true);
}

function losAngelesToTokyo(adjustPitch) {
  const camera = scene.camera;

  const tokyoOptions = {
    destination: Cesium.Cartesian3.fromDegrees(139.8148, 35.7142, 20000.0),
    orientation: {
      heading: Cesium.Math.toRadians(15.0),
      pitch: Cesium.Math.toRadians(-60),
      roll: 0.0,
    },
    duration: 20,
    //地球上的两点之间总是存在两条路径。此选项强制相​​机选择飞行方向以飞越该经度。
    flyOverLongitude: Cesium.Math.toRadians(60.0),
  };

  const laOptions = {
    destination: Cesium.Cartesian3.fromDegrees(-117.729, 34.457, 10000.0),
    duration: 5,
    orientation: {
      heading: Cesium.Math.toRadians(-15.0),
      pitch: -Cesium.Math.PI_OVER_FOUR,
      roll: 0.0,
    },
    complete: () => {
      setTimeout(() => {
        camera.flyTo(tokyoOptions);
      }, 1000);
    },
  };

  if (adjustPitch) {
    //pitchAdjustHeight属性表示:如果相机飞得比该值高，在飞行过程中调整俯仰角向下看，使得视图范围能一直看到地球。
    tokyoOptions.pitchAdjustHeight = 1000;
    laOptions.pitchAdjustHeight = 1000;
  }

  camera.flyTo(laOptions);
}

function reset() {
  //立即完成当前动作(活动)的过渡
  scene.completeMorph();
  viewer.entities.removeAll();
  scene.primitives.remove(referenceFramePrimitive);
  // flyTo方法会将生成的补间动画添加至scene.tweens集合中
  //参考源码：https://github.com/CesiumGS/cesium/blob/1.124/packages/engine/Source/Scene/Camera.js#L3453
  scene.tweens.removeAll(); //停止所有(正在进行的)补间动画

  if (defined(removeStart)) {
    removeStart();
    removeEnd();

    removeStart = undefined;
    removeEnd = undefined;
  }

  if (defined(removeChanged)) {
    removeChanged();
    removeChanged = undefined;
  }

  /**
   * 上述lookAtTransform或lookAt方法都会锁定目标，即不能通过鼠标来平移场景(Scene)，若要解除则需执行lookAtTransform(Matrix4.IDENTITY)，
   * 然后Camera变为自由模式，即默认状态，这个默认状态的意思如下：
   * > 1. 在默认状态下，摄像机的运动、旋转和缩放是基于世界坐标系的。
   * > 2. 调用 lookAtTransform(Matrix4.IDENTITY) 后，摄像机将以地球为中心，自由地观察或飞行。
   */
  viewer.camera.lookAtTransform(Matrix4.IDENTITY);

  clock.multiplier = 1.0; //设置Clock.tick()方法为前进多少时间，单位是秒，这里设置为默认值1.0
  scene.postUpdate.removeEventListener(icrf);
  if (scene.globe.enableLighting) scene.globe.enableLighting = false;
}

/**
 * 完成当前相机飞行，并立即将相机移动至目的地。
 * 如果没有正在进行的飞行，则此函数不执行任何操作。
 */
function completeFlight() {
  scene.camera.completeFlight();
}

/**
 * 取消当前相机飞行，并将相机保留在其当前位置。
 * 如果没有正在进行的飞行，则此函数不执行任何操作。
 */
function cancelFlight() {
  scene.camera.cancelFlight();
}
</script>

<style lang="scss" scoped>
.select,
.complete,
.cancel {
  position: absolute;
  top: 20px;
}

.select {
  left: 120px;
  width: 200px;
}

.complete {
  left: 340px;
}

.cancel {
  left: 440px;
}
</style>
