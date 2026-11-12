const defaultGradient = {
  0: "transparent",
  ".3": "#0b38b6",
  ".65": "#ecb00e",
  ".8": "#e56008"
};
export default (options, minValue, maxValue) => {
  const defaultOptions = {
    radius: 150,
    maxOpacity: 0.5,
    minOpacity: 0
  };
  let ret = Object.assign(defaultOptions, options);
  // values,colors匹配
  if (
    options.values &&
    options.colors &&
    options.values.length == options.colors.length
  ) {
    const values = options.values;
    const colors = options.colors;
    // 取图例匹配数值大于0的平均值（value值在同一区间做色度区分）
    const greaterThanZero = values.filter(number => {
      return number > 0;
    });
    const averageNumber = values[values.length - 1] / greaterThanZero.length;
    const newMinValue = minValue - averageNumber;
    // 根据最大最小数值获取匹配颜色索引
    let colorIndexArr = [];
    values.forEach((number, index) => {
      if (number > newMinValue && number <= maxValue) {
        colorIndexArr.push(index);
      }
    });
    // 截取颜色数组
    const minColorIndex = colorIndexArr[0] - 1 >= 0 ? colorIndexArr[0] - 1 : 0;
    const maxColorIndex = colorIndexArr[colorIndexArr.length - 1];
    const colorArr = colors.slice(minColorIndex, maxColorIndex + 1);
    // 整合gradient
    let gradient = {
      0: "transparent"
    };
    let stemp = 99 / colorArr.length;
    colorArr.forEach((color, index) => {
      const key = (stemp * (index + 1)) / 100;
      const keyToFixed = key.toFixed(2);
      gradient[keyToFixed] = colorArr[index];
    });
    ret.gradient = gradient;
  }
  // gradient
  if (ret.gradient) {
    return ret;
  }
  // 默认
  ret.gradient = defaultGradient;
  return ret;
};
