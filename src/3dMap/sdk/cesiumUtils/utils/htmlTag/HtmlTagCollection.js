/**创建HtmlTagCollection标签集合对象
 */
class HtmlTagCollection {
  constructor(viewer, option) {
    const defaultOption = {
      visible: true,
      collision: false
    };
    const newOption = Object.assign(defaultOption, option);
    this.viewer = viewer;
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
              if (HtmlTag.dragLine) HtmlTag.dragLine.polyline.show = true;
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
                  if (val.dragLine) val.dragLine.polyline.show = false;
                }
              });
            }
          });
        }
      };
      // 开启并添加相机监听
      that.listener();
      that.hisCollision = true;
      that.viewer.scene.postRender.addEventListener(that.listener);
    } else if (!that.collision && that.hisCollision) {
      // 恢复并移除监听
      that.collection.forEach(HtmlTag => {
        HtmlTag.isDrag = true;
        HtmlTag.zIndex = 10;
        HtmlTag.dom.style.opacity = 1;
        if (HtmlTag.dragLine) HtmlTag.dragLine.polyline.show = true;
      });
      that.hisCollision = false;
      that.viewer.scene.postRender.removeEventListener(that.listener);
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
      this.viewer?.camera.changed.removeEventListener(this.listener);
      this.listener = null;
    }
    this.viewer = null;
  }
}
export { HtmlTagCollection };
