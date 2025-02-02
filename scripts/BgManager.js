class BgManager {
  constructor() {
    this._container = new PIXI.Container();
    this._bgMap = new Map();
    this._loader = PIXI.Loader.shared;
    //修改标记
    ///
  }

  get stageObj() {
    return this._container;
  }

  reset(clear = true) {
    this._container.removeChildren(0, this._container.children.length);
    if (clear) {
      this._bgMap.clear();
    }
  }

  processBgByInput(bg, bgEffect, bgEffectTime, isFastForward) {
    if (bg && bgEffect) {
      if (isFastForward) {
        this._insertNewBg(bg, 1, true);
      } else {
        this._changeBgByEffect(bg, bgEffect, bgEffectTime);
      }
    } else if (bg && !bgEffect) {
      this._insertNewBg(bg, 1, true);
    }
  }

  _insertNewBg(bgName, alphaValue, removeOld = false) {
    if (!this._bgMap.has(bgName)) {
      this._bgMap.set(
        bgName,
        new PIXI.Sprite(this._loader.resources[`bg${bgName}`].texture)
      );
    }
    this._bgMap.get(bgName).alpha = alphaValue;
    //修改标记
    this._resizeAndMoveBg();
    
    if (removeOld && this._container.children.length != 0) {
      this._container.removeChildAt(0);
    }

    let order = this._container.children.length;
    this._container.addChildAt(this._bgMap.get(bgName), order);

  }

  _changeBgByEffect(bgName, effectName, bgEffectTime) {
    
    //修改标记 调整位置大小
    this._resizeAndMoveBg();
    
    //修改标记 变量声明移动到switch外部
    let origBg, newBg;
    
    
    switch (effectName) {

      case "fade":
        this._insertNewBg(bgName, 0);
        // let origBg, newBg;
        if (this._container.children.length == 1) {
          newBg = this._container.getChildAt(0);
        } else {
          origBg = this._container.getChildAt(0);
          newBg = this._container.getChildAt(1);
        }

        if (this._container.children.length != 1) {
          //修改标记 单位有误
          // Utilities.fadingEffect(origBg, { alpha: 0, time: bgEffectTime ? bgEffectTime / 1000 : 1, ease: 'none', type: "to" });
          Utilities.fadingEffect(origBg, {
            alpha: 0,
            time: bgEffectTime ? bgEffectTime : 1000,
            ease: "none",
            type: "to",
          });
          setTimeout(
            () => {
              if (this._container.children.length) {
                this._container.removeChildAt(0);
              }
            },
            bgEffectTime ? bgEffectTime : 1000
          );
        }
        // Utilities.fadingEffect(newBg, { alpha: 1, time: bgEffectTime ? bgEffectTime : 1, ease: 'none', type: "to" });
        Utilities.fadingEffect(newBg, {
          alpha: 1,
          time: bgEffectTime ? bgEffectTime : 1000,
          ease: "none",
          type: "to",
        });

        break;
      case "mask":
        // 修改标记 滑入背景特效补充 以下代码均为添加内容
        // break;

        this._insertNewBg(bgName, 1, false); // 插入新背景，但不移除旧背景

        if (this._container.children.length === 1) {
          newBg = this._container.getChildAt(0);
        } else {
          origBg = this._container.getChildAt(0);
          newBg = this._container.getChildAt(1);
        }

        // 遮罩动画所需参数
        const containerWidth = 1136; // 容器原始宽度
        const containerHeight = 640; // 容器原始高度
        
        const startTime = Date.now(); // 动画开始时间

        // 创建遮罩对象
        const maskRect = new PIXI.Graphics();
        maskRect.beginFill(0xffffff);
        maskRect.drawRect(0, 0, 0, containerHeight); // 初始宽度为 0
        maskRect.endFill();

        // 将遮罩应用到新背景
        newBg.mask = maskRect;

        // 将遮罩添加到容器（不是显示元素，仅用于遮罩逻辑）
        this._container.addChild(maskRect);

        // 动画逻辑
        const updateMask = () => {
          const duration = bgEffectTime ? bgEffectTime : 1000;
          const elapsedTime = Date.now() - startTime; // 计算已用时间
          const progress = Math.min(elapsedTime / duration, 1); // 进度百分比（0 到 1）
          const currentWidth = progress * containerWidth; // 当前遮罩宽度

          // 更新遮罩绘制
          maskRect.clear();
          maskRect.beginFill(0xffffff);
          maskRect.drawRect(0, 0, currentWidth, containerHeight);
          maskRect.endFill();

          if (progress < 1) {
            // 如果动画未完成，继续下一帧
            requestAnimationFrame(updateMask);
          } else {
            // 动画完成后清理旧背景和遮罩
            if (origBg) {
              this._container.removeChild(origBg);
            }
            newBg.mask = null; // 清除遮罩
            this._container.removeChild(maskRect);
          }
        };

        // 启动动画
        requestAnimationFrame(updateMask);
        break;

      // 修改标记 以下全部为添加 增加对于背景的blur特效处理 测试用 game_event_communications/400100906.json
      case "blur":
        this._insertNewBg(bgName, 0);
        if (this._container.children.length == 1) {
          newBg = this._container.getChildAt(0);
        } else {
          origBg = this._container.getChildAt(0);
          newBg = this._container.getChildAt(1);
        }

        if (this._container.children.length != 1) {
          Utilities.fadingEffect(origBg, {
            alpha: 0,
            time: bgEffectTime ? bgEffectTime : 1000,
            ease: "none",
            type: "to",
          });
          setTimeout(
            () => {
              if (this._container.children.length) {
                this._container.removeChild(0);
              }
            },
            bgEffectTime ? bgEffectTime : 1000
          );
        }

        Utilities.fadingEffect(newBg, {
          alpha: 1,
          time: bgEffectTime ? bgEffectTime : 1000,
          ease: "none",
          type: "to",
        });

        const blurFilter = new PIXI.filters.BlurFilter();
        blurFilter.blur = 0;
        newBg.filters = [blurFilter]; // 明确 BlurFilter 作用于新插入的背景对象 newBg

        const duration = bgEffectTime ? bgEffectTime : 1000;
        const halfDuration = duration / 2;

        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;

          if (progress <= halfDuration) {
            blurFilter.blur = 24 * (progress / halfDuration);
          } else if (progress <= duration) {
            blurFilter.blur =
              24 - 24 * ((progress - halfDuration) / halfDuration);
          } else {
            clearInterval(interval);
            newBg.filters = [];
            newBg.alpha = 1;
            if (origBg) {
              this._container.removeChild(origBg);
            }
          }
        }, 10);

        break;
    }
  }

  //修改标记
  //背景下移并缩放 添加代码 根据fg图片名字指定Y缩放比例//

  _resizeAndMoveBg(){

      const YZoomRate = 0.75;
      const YOffset=320
      const XOffset=142
      const XZoomRate = 0.75

      this._container.position.set(XOffset,YOffset);
      this._container.scale.set(XZoomRate,YZoomRate);
      
     
  }
  ////

}
