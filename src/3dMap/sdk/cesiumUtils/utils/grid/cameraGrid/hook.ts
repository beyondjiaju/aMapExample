import * as Cesium from "@/3dMap/sdk/cesium";
import { Double_Precision_CompareValue } from "./config";
const cartesian3ToLonLat = cartesian3 => {
  // 将 Cartesian3 坐标转换为 Cartographic 坐标
  let cartographic = Cesium.Cartographic.fromCartesian(cartesian3);
  // 获取经度、纬度和高度
  let longitude = Cesium.Math.toDegrees(cartographic.longitude);
  let latitude = Cesium.Math.toDegrees(cartographic.latitude);
  let height = cartographic.height;
  return [longitude, latitude, height];
};
const Longitude_Normalize = X => {
  while (X > 180.0) {
    X -= 360.0;
  }
  while (X < -180.0) {
    X += 360.0;
  }
  return X;
};
const gainCameraRelativeHeightRefValue = (
  m_fLatitude,
  fLongHalfSpan,
  fLatHalfSpan,
  fCameraRelativeHeight
) => {
  if (fCameraRelativeHeight < 600000.0) {
    fCameraRelativeHeight *=
      1.0 +
      (fLongHalfSpan / fLatHalfSpan) *
        Math.pow(Math.abs(m_fLatitude) / 90.0, 3.0);

    if (fCameraRelativeHeight > 1200000.0) {
      fCameraRelativeHeight = 1200000.0;
    }
  }
  return fCameraRelativeHeight;
};
const convertQuadrantCode = (fLongitude, fLatitude) => {
  // Normalize longitude
  fLongitude = Longitude_Normalize(fLongitude);

  // Adjust longitude
  fLongitude += 180.0;
  if (Math.abs(fLongitude - 360.0) <= Double_Precision_CompareValue) {
    fLongitude = 0.0;
  }

  // Clamp latitude
  fLatitude = Math.max(-90, Math.min(90, fLatitude));

  // Adjust latitude
  fLatitude += 90.0;

  // Calculate quadrant
  let nLongBand = Math.floor(fLongitude * 4.0) % 2;
  let nLatBand = Math.floor(fLatitude * 4.0) % 2;

  // Return quadrant code
  if (nLongBand === 0 && nLatBand === 1) {
    return "1";
  } else if (nLongBand === 1 && nLatBand === 0) {
    return "4";
  } else if (nLongBand === 1 && nLatBand === 1) {
    return "2";
  }

  return "3";
};
const convertLatitudeBandCode = fLatitude => {
  const szLetterArray = "ABCDEFGHJKLMNPQRSTUVWXYZ";

  // Clamp latitude to -90 to 90
  fLatitude = Math.max(-90, Math.min(90, fLatitude));

  // Invert latitude if defined
  fLatitude = 90.0 - fLatitude; // 是否网格逆编码
  // fLatitude += 90.0;

  // Calculate latitude band
  let nLatBand = Math.floor(fLatitude * 2.0);

  // Calculate first and second offsets
  let nFirstOffest = Math.floor(nLatBand / 24);
  let nSecondOffest = nLatBand % 24;

  // Convert to string
  let Outs = szLetterArray[nFirstOffest] + szLetterArray[nSecondOffest];

  return Outs;
};
const convertLongitudeBandCode = fLongitude => {
  // Normalize longitude
  fLongitude = Longitude_Normalize(fLongitude);

  // Add 180 to longitude
  fLongitude += 180.0;

  // Check if longitude is close to 360
  if (Math.abs(fLongitude - 360.0) <= Double_Precision_CompareValue) {
    fLongitude = 0.0;
  }

  // Calculate longitude band
  let fLongBand = Math.floor(fLongitude * 2.0);
  let nLongBand = Math.floor(fLongBand) + 1;

  // Convert to string with leading zeros
  let Outs = nLongBand.toString().padStart(3, "0");

  return Outs;
};
const convertOneMinCode = (fLongitude, fLatitude) => {
  // Normalize longitude
  fLongitude = Longitude_Normalize(fLongitude);

  // Adjust longitude
  fLongitude += 180.0;
  if (Math.abs(fLongitude - 360.0) <= Double_Precision_CompareValue) {
    fLongitude = 0.0;
  }

  // Clamp latitude
  fLatitude = Math.max(-90, Math.min(90, fLatitude));

  // Adjust latitude
  fLatitude += 90.0;

  // Calculate minutes
  let fLongMin = fLongitude * 60.0;
  let fLatMin = fLatitude * 60.0;

  // Calculate 30-minute index
  let nHorizIndex30 = Math.floor(fLongMin / 30.0);
  let nVertIndex30 = Math.floor(fLatMin / 30.0);

  // Calculate remainder
  let fLongRemainder = fLongMin - nHorizIndex30 * 30.0;
  let fLatRemainder = fLatMin - nVertIndex30 * 30.0;

  // Calculate 15-minute index
  let nHorizIndex15 = Math.floor(fLongRemainder / 15.0);
  let nVertIndex15 = Math.floor(fLatRemainder / 15.0);

  // Calculate remainder
  fLongRemainder = fLongRemainder - nHorizIndex15 * 15.0;
  fLatRemainder = fLatRemainder - nVertIndex15 * 15.0;

  // Calculate 5-minute index
  let nHorizIndex5 = Math.floor(fLongRemainder / 5.0);
  let nVertIndex5 = Math.floor(fLatRemainder / 5.0);

  // Calculate remainder
  fLongRemainder = fLongRemainder - nHorizIndex5 * 5.0;
  fLatRemainder = fLatRemainder - nVertIndex5 * 5.0;

  // Calculate 1-minute index
  let nHorizIndex1 = Math.floor(fLongRemainder);
  let nVertIndex1 = Math.floor(fLatRemainder);

  // Define 1-minute code array
  let arr1MinCode = [
    ["21", "16", "11", "06", "01"],
    ["22", "17", "12", "07", "02"],
    ["23", "18", "13", "08", "03"],
    ["24", "19", "14", "09", "04"],
    ["25", "20", "15", "10", "05"]
  ];

  // Return 1-minute code
  return arr1MinCode[nHorizIndex1][nVertIndex1];
};
const convertKeyPadCode = (fLongitude, fLatitude) => {
  // Normalize longitude
  fLongitude = Longitude_Normalize(fLongitude);

  // Adjust longitude
  fLongitude += 180.0;
  if (Math.abs(fLongitude - 360.0) <= Double_Precision_CompareValue) {
    fLongitude = 0.0;
  }

  // Clamp latitude
  fLatitude = Math.max(-90, Math.min(90, fLatitude));

  // Adjust latitude
  fLatitude += 90.0;

  // Calculate minutes
  let fLongMin = fLongitude * 60.0;
  let fLatMin = fLatitude * 60.0;

  // Calculate 30-minute index
  let nHorizIndex30 = Math.floor(fLongMin / 30.0);
  let nVertIndex30 = Math.floor(fLatMin / 30.0);

  // Calculate remainder
  let fLongRemainder = fLongMin - nHorizIndex30 * 30.0;
  let fLatRemainder = fLatMin - nVertIndex30 * 30.0;

  // Calculate 15-minute index
  let nHorizIndex15 = Math.floor(fLongRemainder / 15.0);
  let nVertIndex15 = Math.floor(fLatRemainder / 15.0);

  // Calculate remainder
  fLongRemainder = fLongRemainder - nHorizIndex15 * 15.0;
  fLatRemainder = fLatRemainder - nVertIndex15 * 15.0;

  // Calculate 5-minute index
  let nHorizIndex5 = Math.floor(fLongRemainder / 5.0);
  let nVertIndex5 = Math.floor(fLatRemainder / 5.0);

  // Define keypad code array
  let arr5MinCode = [
    ["7", "4", "1"],
    ["8", "5", "2"],
    ["9", "6", "3"]
  ];

  // Return keypad code
  return arr5MinCode[nHorizIndex5][nVertIndex5];
};
const convertGARSCodeToTheodoliteCoord = (
  szGARSCode,
  fLongitude,
  fLatitude
) => {
  // Get code length
  let nCodeLength = szGARSCode.length;
  if (nCodeLength < 5 || nCodeLength === 8 || nCodeLength > 9) {
    return false;
  }

  // Get longitude band code
  let szLongitudeBandCode = szGARSCode.substring(0, 3);

  for (let i = 0; i < 3; ++i) {
    if (!/\d/.test(szLongitudeBandCode[i])) {
      return false;
    }
  }

  // Get latitude band code
  let szLatitudeBandCode = szGARSCode.substring(3, 5);

  for (let i = 0; i < 2; ++i) {
    if (!/[A-Z]/.test(szLatitudeBandCode[i])) {
      return false;
    }

    if (szLatitudeBandCode[i] === "I" || szLatitudeBandCode[i] === "O") {
      return false;
    }
  }

  // Get quadrant code
  let nQuadrantCode = 0;
  if (nCodeLength >= 6) {
    if (szGARSCode[5] < "1" || szGARSCode[5] > "4") {
      return false;
    }
    nQuadrantCode = parseInt(szGARSCode.substring(5, 6));
  }

  // Get keypad code
  let nKeyPadCode = 0;
  if (nCodeLength >= 7) {
    if (szGARSCode[6] < "1" || szGARSCode[6] > "9") {
      return false;
    }
    nKeyPadCode = parseInt(szGARSCode.substring(6, 7));
  }

  // Get 1-minute code
  let nOneMinCode = 0;
  if (nCodeLength === 9) {
    if (!/\d/.test(szGARSCode[7]) || !/\d/.test(szGARSCode[8])) {
      return false;
    }
    nOneMinCode = parseInt(szGARSCode.substring(7, 9));
    if (nOneMinCode < 1 || nOneMinCode > 25) {
      return false;
    }
  }

  // Get longitude index
  let nLongIndex = parseInt(szLongitudeBandCode) - 1;
  let nLetterAOffset = 65;
  let nLetterI = 8;
  let nLetterO = 14;

  // Get latitude index
  let nLatFirstIndex = szLatitudeBandCode.charCodeAt(0) - nLetterAOffset;
  let nLatSecondIndex = szLatitudeBandCode.charCodeAt(1) - nLetterAOffset;

  if (nLatFirstIndex >= nLetterO) {
    --nLatFirstIndex;
  }

  if (nLatFirstIndex >= nLetterI) {
    --nLatFirstIndex;
  }

  if (nLatSecondIndex >= nLetterO) {
    --nLatSecondIndex;
  }

  if (nLatSecondIndex >= nLetterI) {
    --nLatSecondIndex;
  }

  // Calculate longitude and latitude
  fLongitude = nLongIndex / 2.0 - 180.0;

  fLatitude = 89.5 - (nLatFirstIndex * 12.0 + nLatSecondIndex / 2.0);
  // fLatitude = (nLatFirstIndex * 12.0) + (nLatSecondIndex / 2.0) - 90.0;

  let fLongMin = 0.0;
  let fLatMin = 0.0;

  if (nQuadrantCode > 0) {
    --nQuadrantCode;
    fLatMin += (1 - Math.floor(nQuadrantCode / 2)) * 15.0;
    fLongMin += (nQuadrantCode % 2) * 15.0;
  }

  if (nKeyPadCode > 0) {
    --nKeyPadCode;
    fLatMin += (2 - Math.floor(nKeyPadCode / 3)) * 5.0;
    fLongMin += (nKeyPadCode % 3) * 5.0;
  }

  if (nOneMinCode > 0) {
    --nOneMinCode;
    fLatMin += (4 - Math.floor(nOneMinCode / 5)) * 1.0;
    fLongMin += (nOneMinCode % 5) * 1.0;
  }

  fLongitude += fLongMin / 60.0;
  fLatitude += fLatMin / 60.0;

  fLongitude = Math.max(-180, Math.min(180, fLongitude));
  fLatitude = Math.max(-90, Math.min(90, fLatitude));

  return true;
};
const setTheodoliteCoordAndLevel = (fLongitude, fLatitude, eLevelType) => {
  if (eLevelType === 4) return "";

  let szGARSCode = convertLongitudeBandCode(fLongitude);
  szGARSCode += convertLatitudeBandCode(fLatitude);

  if (eLevelType === 1) {
    szGARSCode += convertQuadrantCode(fLongitude, fLatitude);
  } else if (eLevelType === 2) {
    szGARSCode += convertQuadrantCode(fLongitude, fLatitude);
    szGARSCode += convertKeyPadCode(fLongitude, fLatitude);
  } else if (eLevelType === 3) {
    szGARSCode += convertQuadrantCode(fLongitude, fLatitude);
    szGARSCode += convertKeyPadCode(fLongitude, fLatitude);
    szGARSCode += convertOneMinCode(fLongitude, fLatitude);
  }

  let isSZ = convertGARSCodeToTheodoliteCoord(
    szGARSCode,
    fLongitude,
    fLatitude
  );
  return isSZ ? szGARSCode : false;
};
export {
  cartesian3ToLonLat,
  Longitude_Normalize,
  gainCameraRelativeHeightRefValue,
  setTheodoliteCoordAndLevel
};
