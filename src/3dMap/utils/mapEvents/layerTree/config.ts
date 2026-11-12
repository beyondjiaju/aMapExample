/** 高亮电子围栏时 SDK 读取的图标。用矢量数据地址，避免改 SDK 还要搬图片资源 */
const icon = (color: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="8" fill="${color}" stroke="#fff" stroke-width="2"/></svg>`
  )}`;

export const treeImage = {
  default: icon("#40a9ff"),
  dzwlPointImg: icon("#ff4d4f"),
  dzwlLineImg: icon("#faad14"),
  AP_CIVIL: icon("#69c0ff"),
  AP_GENERAL: icon("#95de64"),
  AP_UA: icon("#b37feb"),
  BS: icon("#ffc53d")
};
