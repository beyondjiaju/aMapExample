/** 把时间字符串拆成展示用的日期时间字段，缺省为当前时间 */
export const getTimeFromDateString = timeData => {
  const newDate = timeData ? new Date(timeData) : new Date();
  const result = {
    time: newDate.getTime(),
    year: newDate.getFullYear(),
    month: newDate.getMonth() + 1,
    date: newDate.getDate(),
    hours: newDate.getHours(),
    minutes: newDate.getMinutes(),
    seconds: newDate.getSeconds(),
    dateTime: "",
    hmsTime: "",
    hmTime: "",
    ymdDate: ""
  };
  ["month", "date", "hours", "minutes", "seconds"].forEach(key => {
    if (result[key] < 10) result[key] = "0" + result[key];
  });
  result.hmsTime = `${result.hours}:${result.minutes}:${result.seconds}`;
  result.hmTime = `${result.hours}:${result.minutes}`;
  result.ymdDate = `${result.year}-${result.month}-${result.date}`;
  result.dateTime = `${result.ymdDate} ${result.hmsTime}`;
  return result;
};
