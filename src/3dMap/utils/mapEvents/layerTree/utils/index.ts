/**
 * 拾取工具只用到航线属性整理。
 * 原模块还挂着整棵图层树，这里只保留这一段，避免把图层加载一起迁过来。
 */
export const getAirlineUseData = properties => {
  if (!properties) return {};
  let useId = properties.id;
  let useCode = properties.code;
  let useName = properties.name;
  if (properties.airDataUseType === "line_use_entire") {
    useId = properties.lineEntireId;
    useCode = properties.lineEntireCode;
    useName = properties.lineEntireName;
  }
  const { id, ...other } = properties;
  return {
    ...other,
    id: useId,
    code: useCode,
    name: useName
  };
};
