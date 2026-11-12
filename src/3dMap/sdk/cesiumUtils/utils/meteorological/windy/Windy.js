import * as Cesium from "@/3dMap/sdk/cesium";
import Particle from "./Particle";
import WindField from "./WindField";
let SPEED_RATE = 0.15;
let PARTICLES_NUMBER = 2000; //默认2000
let MAX_AGE = 10;
let BRIGHTEN = 1.5;
class Windy {
  constructor(json, viewer) {
    this.viewer = viewer;
    this.windData = json;
    this.windField = null;
    this.particles = [];
    this.lines = null;
    this.timeInterval = null;
    this.init();
  }
  init() {
    // 创建风场网格
    this.windField = this.createField();
    // 创建风场粒子
    for (let i = 0; i < PARTICLES_NUMBER; i++) {
      this.particles.push(this.randomParticle(new Particle()));
    }
  }
  createField() {
    let data = this._parseWindJson();
    return new WindField(data);
  }
  play(interval) {
    const that = this;
    const time = interval || 200;
    this.stop();
    this.timeInterval = setInterval(function () {
      that.animate();
    }, time);
  }
  stop() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
      this.timeInterval = null;
    }
  }
  animate() {
    const that = this;
    let field = this.windField,
      particles = this.particles;
    let instances = [],
      nextX = null,
      nextY = null,
      xy = null,
      uv = null;
    particles.forEach(function (particle) {
      if (particle.age <= 0) {
        that.randomParticle(particle);
      }
      if (particle.age > 0) {
        let x = particle.x,
          y = particle.y;

        if (!field.isInBound(x, y)) {
          particle.age = 0;
        } else {
          uv = field.getIn(x, y);
          nextX = x + SPEED_RATE * uv[0];
          nextY = y + SPEED_RATE * uv[1];
          particle.path.push(nextX, nextY);
          particle.x = nextX;
          particle.y = nextY;
          instances.push(
            that._createLineInstance(
              that._map(particle.path),
              particle.age / particle.birthAge
            )
          );
          particle.age--;
        }
      }
    });
    if (instances.length <= 0) this.removeLines();
    this._drawLines(instances);
  }
  _parseWindJson() {
    let uComponent = null,
      vComponent = null,
      header = null;
    this.windData.forEach(function (record) {
      let type =
        record.header.parameterCategory + "," + record.header.parameterNumber;
      switch (type) {
        case "2,2":
          uComponent = record["data"];
          header = record["header"];
          break;
        case "2,3":
          vComponent = record["data"];
          break;
        default:
          break;
      }
    });
    return {
      header: header,
      uComponent: uComponent,
      vComponent: vComponent
    };
  }
  removeLines() {
    if (this.lines) {
      // this.lines.destroy();
      this.viewer.scene.primitives.remove(this.lines);
    }
  }
  //求路径上点
  _map(arr) {
    let length = arr.length,
      field = this.windField,
      dx = field.dx,
      dy = field.dy,
      west = field.west,
      south = field.north,
      newArr = [];
    for (let i = 0; i <= length - 2; i += 2) {
      newArr.push(west + arr[i] * dx, south - arr[i + 1] * dy);
    }
    return newArr;
  }
  _createLineInstance(positions, ageRate) {
    let colors = [],
      length = positions.length,
      count = length / 2;
    for (let i = 0; i < length; i++) {
      colors.push(
        Cesium.Color.WHITE.withAlpha((i / count) * ageRate * BRIGHTEN)
      );
    }
    return new Cesium.GeometryInstance({
      geometry: new Cesium.PolylineGeometry({
        positions: Cesium.Cartesian3.fromDegreesArray(positions),
        colors: colors,
        width: 1.5,
        colorsPerVertex: true
      })
    });
  }
  _drawLines(lineInstances) {
    this.removeLines();
    let linePrimitive = new Cesium.Primitive({
      appearance: new Cesium.PolylineColorAppearance({
        translucent: true
      }),
      geometryInstances: lineInstances,
      asynchronous: false
    });
    this.lines = this.viewer.scene.primitives.add(linePrimitive);
  }
  randomParticle(particle) {
    let safe = 30,
      x,
      y;

    do {
      x = Math.floor(Math.random() * (this.windField.cols - 2));
      y = Math.floor(Math.random() * (this.windField.rows - 2));
    } while (this.windField.getIn(x, y)[2] <= 0 && safe++ < 30);

    particle.x = x;
    particle.y = y;
    particle.age = Math.round(Math.random() * MAX_AGE); //每一次生成都不一样
    particle.birthAge = particle.age;
    particle.path = [x, y];
    return particle;
  }
  destroy() {
    this.stop();
    this.removeLines();
  }
}
export { Windy };
