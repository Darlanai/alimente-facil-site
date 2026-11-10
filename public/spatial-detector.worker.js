import { FilesetResolver, ObjectDetector } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

let detector = null;
let lastTimestamp = 0;

self.onmessage = async (event) => {
  const { type, bitmap, timestamp } = event.data || {};
  try {
    if (type === "init") {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      detector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite",
          delegate: "CPU"
        },
        runningMode: "VIDEO",
        scoreThreshold: 0.42,
        maxResults: 8
      });
      self.postMessage({ type: "ready" });
      return;
    }

    if (type === "frame" && detector && bitmap) {
      const safeTimestamp = Math.max(Number(timestamp) || 0, lastTimestamp + 1);
      lastTimestamp = safeTimestamp;
      const result = detector.detectForVideo(bitmap, safeTimestamp);
      const detections = (result.detections || []).map((item) => {
        const category = item.categories?.[0] || {};
        const box = item.boundingBox || {};
        return {
          label: category.categoryName || "objeto",
          score: category.score || 0,
          x: box.originX || 0,
          y: box.originY || 0,
          width: box.width || 0,
          height: box.height || 0
        };
      });
      bitmap.close?.();
      self.postMessage({ type: "detections", detections, width: bitmap.width, height: bitmap.height });
    }
  } catch (error) {
    bitmap?.close?.();
    self.postMessage({ type: "error", message: error?.message || "Falha ao analisar o vídeo." });
  }
};
