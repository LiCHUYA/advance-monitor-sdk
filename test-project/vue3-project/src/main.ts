import { createApp } from "vue";
import App from "./App.vue";
import { initFrameworkErrorCapture } from "../../../sdk/src/monitor/index.js";
const app = createApp(App);
initFrameworkErrorCapture({
  vue3App: app,
});
app.mount("#app");
