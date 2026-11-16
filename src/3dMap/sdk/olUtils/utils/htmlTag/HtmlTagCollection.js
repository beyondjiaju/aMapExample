/**创建HtmlTagCollection标签集合对象
 */
class HtmlTagCollection {
  constructor(olMap, option) {
    const defaultOption = {
      visible: true,
      collision: false
    };
    const newOption = Object.assign(defaultOption, option);
    this.olMap = olMap;
    this.collection = [];
    this.hisCollision = false;
    this.visible = newOption.visible || true;
    this.collision = newOption.collision || false;
    this.setCollision(this.collision);
  }
  /**添加HtmlTag
   * @param {Object} HtmlTag
   */
  add(HtmlTag) {
    this.collection.push(HtmlTag);
  }
  /**设置集合显示状态
   * @param {Boolean} state
   */
  setVisible(state) {
    this.visible = state;
    this.collection.forEach(HtmlTag => {
      HtmlTag.show = state;
    });
  }
  /**根据id设置显示状态
   * @param {Boolean} state
   */
  setVisibleById(id, state) {
    const HtmlTag = this.getById(id);
    HtmlTag.show = state;
  }
  /**设置集合内tag是否可拖动
   * @param {Boolean} state
   */
  setDrag(state) {
    this.collection.forEach(HtmlTag => {
      HtmlTag.isDrag = state;
      if (state && HtmlTag.noEvent) HtmlTag.noEvent = false;
    });
  }
  /**设置集合内tag拖动线
   * @param {Object} option
   */
  setDragLine(option) {
    this.collection.forEach(HtmlTag => {
      if(option.color)HtmlTag.dragLineColor = option.color;
      if(option.width)HtmlTag.dragLineWidth = option.width;
      // 线样式在创建时写入 feature，已有线要改 stroke 才会变
      const feature = HtmlTag.dragLine?.feature;
      const stroke = feature?.getStyle?.()?.getStroke?.();
      if (!stroke) return;
      if (option.color) stroke.setColor(option.color);
      if (option.width) stroke.setWidth(option.width);
      feature.changed();
    });
  }
  /**根据索引获取集合内HtmlTag
   * @param {Number} index 索引值
   */
  get(index) {
    return this.collection[index];
  }
  /**根据id获取集合内HtmlTag
   * @param {String} id
   */
  getById(id) {
    let returnHtml;
    this.collection.forEach(HtmlTag => {
      const htmlId = HtmlTag.dom.id;
      if (htmlId && htmlId == id) {
        returnHtml = HtmlTag;
      }
    });
    return returnHtml;
  }
  /**获取全部 */
  getAll() {
    return this.collection;
  }
  /**删除HtmlTag
   * @param {Object} HtmlTag
   * @param {Boolean} isDestroy 是否在集合中删除的同时注销HtmlTag标签
   */
  remove(HtmlTag, isDestroy) {
    const index = this.collection.indexOf(HtmlTag);
    this.collection.splice(index, 1);
    if (isDestroy) {
      HtmlTag.destroy();
    }
  }
  /**根据id删除集合内HtmlTag
   * @param {String} id
   * @param {Boolean} isDestroy 是否在集合中删除的同时注销HtmlTag标签
   */
  removeById(id, isDestroy) {
    this.collection.forEach(HtmlTag => {
      const htmlId = HtmlTag.dom.id;
      if (htmlId && htmlId == id) {
        this.remove(HtmlTag, isDestroy);
      }
    });
  }
  /**删除全部
   * @param {Boolean} isDestroy 是否在集合中删除的同时注销HtmlTag标签
   */
  removeAll(isDestroy) {
    if (isDestroy) {
      this.collection.forEach(HtmlTag => {
        HtmlTag.destroy();
      });
    }
    this.collection = [];
  }
  /**设置聚合 */
  setCollision(state) {
    const that = this;
    that.collision = state;
    if (!that.collision && !that.hisCollision) return;
    if (that.collision && !that.hisCollision) {
      that.listener = () => {
        if (that.visible) {
          // 恢复
          that.collection.forEach(HtmlTag => {
            if (HtmlTag.dom.style.opacity == 0) {
              HtmlTag.isDrag = true;
              HtmlTag.zIndex = 10;
              HtmlTag.dom.style.opacity = 1;
              if (HtmlTag.dragLine instanceof Object) {
                const featureData = HtmlTag.dragLine.feature.get("featureData");
                HtmlTag.dragLine.feature.setStyle(featureData.style);
                HtmlTag.dragLine.feature.setGeometry(featureData.geometry);
              }
            }
          });
          // 筛选控制
          that.collection.forEach((HtmlTag, index) => {
            if (HtmlTag.dom.style.opacity == 1) {
              const filterDom = that.collection.filter(item => {
                const isCrash = that.isCrash(HtmlTag.dom, item.dom);
                if (isCrash) {
                  return item;
                }
              });
              filterDom.forEach(val => {
                if (val.dom.id != HtmlTag.dom.id) {
                  val.isDrag = false;
                  val.zIndex = 0;
                  val.dom.style.opacity = 0;
                  if (HtmlTag.dragLine instanceof Object) {
                    HtmlTag.dragLine.feature.setStyle(null);
                    HtmlTag.dragLine.feature.setGeometry(null);
                  }
                }
              });
            }
          });
        }
      };
      // 开启并添加相机监听
      that.listener();
      that.hisCollision = true;
      this.olMap.addEventListener("moveend", that.listener);
    } else if (!that.collision && that.hisCollision) {
      // 恢复并移除监听
      that.collection.forEach(HtmlTag => {
        HtmlTag.isDrag = true;
        HtmlTag.zIndex = 10;
        HtmlTag.dom.style.opacity = 1;
        if (HtmlTag.dragLine instanceof Object) {
          const featureData = HtmlTag.dragLine.feature.get(featureData);
          HtmlTag.dragLine.feature.setStyle(featureData.style);
          HtmlTag.dragLine.feature.setGeometry(featureData.geometry);
        }
      });
      that.hisCollision = false;
      that.olMap.removeEventListener("moveend", that.listener);
      that.listener = null;
    }
  }
  isCrash(a, b) {
    const l1 = a.offsetLeft,
      t1 = a.offsetTop,
      r1 = l1 + a.offsetWidth,
      b1 = t1 + a.offsetHeight,
      l2 = b.offsetLeft,
      t2 = b.offsetTop,
      r2 = l2 + b.offsetWidth,
      b2 = t2 + b.offsetHeight;
    if (r2 < l1 || r1 < l2 || b2 < t1 || b1 < t2) {
      return false;
    } else {
      return true;
    }
  }
  /**注销 */
  destroy() {
    this.removeAll(true);
    this.collection = null;
    this.visible = null;
    this.collision = null;
    this.hisCollision = null;
    if (this.listener) {
      this.olMap?.removeEventListener("moveend", this.listener);
      this.listener = null;
    }
    this.olMap = null;
  }
}
export { HtmlTagCollection };
