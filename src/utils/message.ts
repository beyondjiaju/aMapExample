export interface MessageParams {
  type?: "info" | "success" | "warning" | "error";
  duration?: number;
}

/**
 * SDK 绘制工具依赖的消息函数。
 * 保持 `@/utils/message` 的调用方式，不把 element-plus 带进示例工程。
 */
const message = (content: unknown, params?: MessageParams) => {
  const el = document.createElement("div");
  el.className = `sdk-message is-${params?.type || "info"}`;
  el.textContent = typeof content === "string" ? content : String(content ?? "");
  document.body.appendChild(el);
  const timer = window.setTimeout(() => el.remove(), params?.duration ?? 2000);
  return {
    close() {
      window.clearTimeout(timer);
      el.remove();
    }
  };
};

const closeAllMessage = () => {
  document.querySelectorAll(".sdk-message").forEach(node => node.remove());
};

export { message, closeAllMessage };
