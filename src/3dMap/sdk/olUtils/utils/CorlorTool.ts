const getColorType = colorStr => {
  if (!colorStr || typeof colorStr !== "string") return "unknown";
  const c = colorStr.trim().toLowerCase();
  // 1. rgba
  if (/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/.test(c)) {
    return "rgba";
  }
  // 2. rgb
  if (/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(c)) {
    return "rgb";
  }
  // 3. hsla
  if (/^hsla\(/.test(c)) return "hsla";
  // 4. hsl
  if (/^hsl\(/.test(c)) return "hsl";
  // 5. hex8 带透明 \#RRGGBBAA
  if (/^\#[0-9a-f]{8}$/.test(c)) return "hex8";
  // 6. hex 常规 3位/6位
  if (/^\#[0-9a-f]{3}$|^\#[0-9a-f]{6}$/.test(c)) return "hex";
  // 7. 内置颜色名
  const colorNames = [
    "red",
    "green",
    "blue",
    "black",
    "white",
    "gray",
    "yellow",
    "orange",
    "pink",
    "purple"
  ];
  if (colorNames.includes(c)) return "name";
  return "unknown";
};
/**
 * 6位十六进制颜色 转 带透明度的 rgba
 * @param {string} hex - 6位色值，例如 #ff0000 或 ff0000
 * @param {number} opacity - 透明度 0~1
 * @returns {string} rgba 格式颜色
 */
const hexToRgba = (hex, opacity = 0.3) => {
  // 去掉 # 号
  hex = hex.replace(/^#/, "");
  // 解析 r g b
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // 返回 rgba
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
const getColorAlpha = (color, opacity = 0.3) => {
  const type = getColorType(color);
  if (type === "rgba" || type === "hex8" || type === "hsla") {
    return color; // 已有透明度，直接返回
  }
  if (type === "rgb") {
    return color.replace("rgb", "rgba").replace(/\)$/, `, ${opacity})`);
  }
  if (type === "hex") {
    // 6位hex转rgba简易示例
    return hexToRgba(color, opacity);
  }
  return color;
};
export { getColorAlpha };
