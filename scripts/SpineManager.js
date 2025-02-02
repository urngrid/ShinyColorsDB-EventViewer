class SpineManager {
  constructor() {
    this._container = new PIXI.Container();
    this._loader = PIXI.Loader.shared;
    this._spineMap = new Map();
    this._keepsLipAnimation = false;
    this._replacingLipTrack = null;
    this._timeoutToClear = null;
    this.LOOP_EVENT_NAME = "loop_start";
    this.RELAY_EVENT_NAME = "relay";
    this.LIP_EVENT_NAME = "lip";
    this.ANIMATION_MIX = 0.3;

    this.spineAlias = {
      stand_fix: "stand",
      stand_costume_fix: "stand_costume",

      stand_flex: "stand",
      stand_costume_flex: "stand_costume",

      stand: "stand",
      stand_costume: "stand_costume",

      stand_jersey: "stand_jersey",
      stand_silhouette: "stand_silhouette",
    };

    this._currSpine = {};


    //修改标记 添加角色人数标记
    this._charaSpineCount = 0;
    this._spineVisibilityMap = new Map(); // 存储 char_uid -> visible 映射
    //挡腿块
    this._coverblock = null;
    //fg滤镜
    this._pendingFilters = new Map(); // 存储fg的颜色遮罩 处理spine超出fg边界的部分

  }

  get stageObj() {
    return this._container;
  }

  reset(clear = true) {
    this._container.removeChildren(0, this._container.children.length);
    this._currSpine = {};
    if (clear) {
      this._spineMap.clear();

      //修改标记 同步clear
      this._spineVisibilityMap.clear();
    }
  }

  processSpineByInput(
    charLabel,
    charId,
    charCategory,
    charPosition,
    charScale,
    charAnim1,
    charAnim2,
    charAnim3,
    charAnim4,
    charAnim5,
    charAnim1Loop,
    charAnim2Loop,
    charAnim3Loop,
    charAnim4Loop,
    charAnim5Loop,
    charLipAnim,
    lipAnimDuration,
    charEffect,
    isFastForward
  ) {

    if (!charLabel) {
      return;
    }
    if (charId) {
      this._currSpine[charLabel] = {
        currCharId: charId,
        currCharCategory: this.spineAlias[charCategory] ?? "stand",
      };
    }
    let { currCharId, currCharCategory } = this._currSpine[charLabel];
    let char_uid = `${charLabel}_${currCharId}_${currCharCategory}`;




    if (!this._spineMap.has(char_uid)) {
      this._spineMap.set(
        char_uid,
        new PIXI.spine.Spine(this._loader.resources[char_uid].spineData)


      );
      this._spineMap.get(char_uid).alpha = 1;

      //修改标记 储存spine可见性标记
      this._spineVisibilityMap.set(char_uid, true); 
      ///



    }



 
    this._container.addChild(this._spineMap.get(char_uid));

    charAnim1Loop = charAnim1Loop === undefined ? true : charAnim1Loop;
    charAnim2Loop = charAnim2Loop === undefined ? true : charAnim2Loop;
    charAnim3Loop = charAnim3Loop === undefined ? true : charAnim3Loop;
    charAnim4Loop = charAnim4Loop === undefined ? true : charAnim4Loop;
    charAnim5Loop = charAnim5Loop === undefined ? true : charAnim5Loop;
    charLipAnim = charLipAnim === undefined ? false : charLipAnim;

    let thisSpine = this._spineMap.get(char_uid);

    try {
      thisSpine.skeleton.setSkinByName("normal");
    } catch {
      thisSpine.skeleton.setSkinByName("default");
    }

    if (charPosition) {

      thisSpine.position.set(charPosition.x, charPosition.y);

      this._container.setChildIndex(
        thisSpine,
        this._container.children.length <= charPosition.order
          ? this._container.children.length - 1
          : charPosition.order
      );
    }

    if (charScale) {
      thisSpine.scale = charScale;
    } else { thisSpine.scale.x=1;thisSpine.scale.y=1}

    if (charEffect) {
      if (charEffect.type == "from") {
        thisSpine.alpha = 1;
      }
      if (charEffect?.x) {
        charEffect.x += thisSpine.x;
      }
      if (charEffect?.y) {
        charEffect.y += thisSpine.y;
      }
      if (isFastForward) {
        charEffect.time = 50;
      }
      Utilities.fadingEffect(thisSpine, charEffect, isFastForward);

      //修改标记 根据effect改变角色人数记录 早期脚本不规范有spine出现时不渐变的情况
      
      if (charEffect.type == "from" && charEffect.alpha == 0) {
        this._spineVisibilityMap.set(char_uid, true); 
      }
      if (charEffect.type == "to" && charEffect.alpha == 1) {
        this._spineVisibilityMap.set(char_uid, true); 

      }
      if (charEffect.type == "to" && charEffect.alpha == 0) {
        this._spineVisibilityMap.set(char_uid, false); 
      }
      if (charEffect.type == "from" && charEffect.alpha == 1) {
        this._spineVisibilityMap.set(char_uid, false); 
      }
      
      
      const getCharaSpineCount = (spineVisibilityMap) =>
          Array.from(spineVisibilityMap.values()).filter(Boolean).length;


      this._charaSpineCount = getCharaSpineCount(this._spineVisibilityMap);
      


      //////
    }

    //修改标记 spine出现时不渐变的情况的补漏

    if (!charEffect && charId){
      this._spineVisibilityMap.set(char_uid, true); 
      const getCharaSpineCount = (spineVisibilityMap) =>
        Array.from(spineVisibilityMap.values()).filter(Boolean).length;


      this._charaSpineCount = getCharaSpineCount(this._spineVisibilityMap);
    }

      
    ////修改标记完


    if (charAnim1) {
      this._setCharacterAnimation(charAnim1, charAnim1Loop, 0, thisSpine);
    }

    if (charAnim2) {
      this._setCharacterAnimation(charAnim2, charAnim2Loop, 1, thisSpine);
    }

    if (charAnim3) {
      this._setCharacterAnimation(charAnim3, charAnim3Loop, 2, thisSpine);
    }

    if (charAnim4) {
      this._setCharacterAnimation(charAnim4, charAnim4Loop, 3, thisSpine);
    }

    if (charAnim5) {
      this._setCharacterAnimation(charAnim5, charAnim5Loop, 4, thisSpine);
    }

    if (charLipAnim && !isFastForward) {
      const trackEntry = this._setCharacterAnimation(
        charLipAnim,
        true,
        5,
        thisSpine
      );
      if (lipAnimDuration) {
        this._timeoutToClear = setTimeout(() => {
          if (trackEntry.trackIndex === 5) {

            trackEntry.time = 0;
            trackEntry.timeScale = 0;
          }
          if (
            this._replacingLipTrack &&
            this._replacingLipTrack.trackIndex === 5
          ) {
            //TRACK_INDEXES.LIP_ANIM
            this._replacingLipTrack.time = 0;
            this._replacingLipTrack.timeScale = 0;
          }

          this._keepsLipAnimation = false;
        }, lipAnimDuration * 1000);
      }

      const isReplacingLipAnimation =
        !lipAnimDuration && this._keepsLipAnimation;
      if (isReplacingLipAnimation) {
        this._replacingLipTrack = trackEntry;
      } else {
        this._lipTrack = trackEntry;
      }
    }

    thisSpine.skeleton.setToSetupPose();
    thisSpine.update(0);
    thisSpine.autoUpdate = true;
  }

  stopLipAnimation(charLabel) {
    if (!this._currSpine[charLabel]) {
      return;
    }
    let { currCharId, currCharCategory } = this._currSpine[charLabel];
    let char_uid = `${charLabel}_${currCharId}_${currCharCategory}`;
    if (
      !this._spineMap.has(char_uid) ||
      !this._spineMap.get(char_uid).state.tracks[5]
    ) {
      return;
    }
    if (this._lipTrack && this._lipTrack.trackIndex === 5) {
      this._lipTrack.time = 0;
      this._lipTrack.timeScale = 0;
    }

    if (this._replacingLipTrack && this._replacingLipTrack.trackIndex === 5) {
      this._replacingLipTrack.time = 0;
      this._replacingLipTrack.timeScale = 0;
    }
  }

  _setCharacterAnimation(charAnim, charAnimLoop, trackNo, thisSpine) {
    if (!charAnim || !this._getAnimation(charAnim, thisSpine)) {
      return;
    }
    let trackEntry = undefined,
      relayAnim = undefined;

    const animation = this._getAnimation(charAnim, thisSpine);

    const eventTimeline = animation.timelines.find(function (timeline) {
      return timeline.events;
    });

    let loopStartTime = null,
      _this = this;
    if (eventTimeline) {
      eventTimeline.events.forEach(function (event) {
        switch (event.data.name) {
          case _this.LOOP_EVENT_NAME:
            loopStartTime = event.time;
            break;
          case _this.LIP_EVENT_NAME:
            _this._lipAnim = event.stringValue;
            break;
          default:
            break;
        }
      });
    }

    if (loopStartTime) {
      charAnimLoop = false;
    }

    const before = thisSpine.state.getCurrent(trackNo);
    const beforeAnim = before ? before.animation.name : null;

    if (beforeAnim) {
      const beforeEventTimeline = this._getAnimation(
        beforeAnim,
        thisSpine
      ).timelines.find(function (timeline) {
        return timeline.events;
      });
      if (beforeEventTimeline) {
        const relayAnimEvent = beforeEventTimeline.events.find(function (
          event
        ) {
          return event.data.name === _this.RELAY_EVENT_NAME;
        });
        if (relayAnimEvent) {
          relayAnim = relayAnimEvent.stringValue;
        }
      }
    }

    if (relayAnim) {
      if (beforeAnim) {
        thisSpine.stateData.setMix(beforeAnim, relayAnim, this.ANIMATION_MIX);
      }
      thisSpine.stateData.setMix(relayAnim, charAnim, this.ANIMATION_MIX);
      thisSpine.state.setAnimation(trackNo, relayAnim, false);
      trackEntry = thisSpine.state.addAnimation(
        trackNo,
        charAnim,
        charAnimLoop
      );
    } else {
      if (beforeAnim) {
        thisSpine.stateData.setMix(beforeAnim, charAnim, this.ANIMATION_MIX);
      }
      trackEntry = thisSpine.state.setAnimation(
        trackNo,
        charAnim,
        charAnimLoop
      );
    }

    const listener = {
      complete: function complete() {
        const currentAnim = thisSpine.state.getCurrent(trackNo);
        const currentAnimName = currentAnim ? currentAnim.animation.name : null;
        if (!loopStartTime || charAnim !== currentAnimName) {
          return;
        }
        let trackEntry = thisSpine.state.setAnimation(trackNo, charAnim);
        trackEntry.listener = listener;
        
            trackEntry.time = loopStartTime;
            

      },
    };

    trackEntry.listener = listener;
    return trackEntry;
  }

  _getAnimation(charAnim, thisSpine) {
    const animation = thisSpine.spineData.animations.find(
      (a) => a.name === charAnim
    );
    if (!animation) {
      console.error(`${charAnim} is not found in spineData`);
    }
    return animation;
  }

  ////修改标记 调整角色位置和缩放 挡住腿部的参差部分 由trackmanager调用
  adjustSpine(charaCount, charScale) {
    const positionMapArray = [
        [1, 568, 568, 1, 240], //[人数, 原始x, 修正x, 缩放比例, y修正]
        [2, 310, 340, 1, 240], // 二人左修正二人对话特有的不对称 中心是568，缩放系数1
        [2, 796, 796, 1, 240], // 二人右
        [3, 568, 568, 1, 240],  // 3人中
        [3, 200, 260, 1, 240], // 3人左
        [3, 936, 876, 1, 240], // 3人右
        [4, 150, 234, 0.8, 140], // 4人，缩放系数0.8
        [4, 420, 457, 0.8, 140],
        [4, 686, 679, 0.8, 140],
        [4, 986, 902, 0.8, 140],
        [5, 100, 194, 0.8, 140],  // 5人，缩放系数0.8
        [5, 302, 381, 0.8, 140],
        [5, 568, 568, 0.8, 140],
        [5, 836, 755, 0.8, 140],
        [5, 1036, 942, 0.8, 140]
    ];

        // 创建遮挡块
        if (!this._coverBlock) {
          this._coverBlock = new PIXI.Graphics();
          this._coverBlock.beginFill(0x000000, 1); // 黑色遮挡腿部部件透明度设置
          this._coverBlock.drawRect(0, 0, 1136, 800); // 设置初始长宽
          this._coverBlock.endFill();
          this._container.addChild(this._coverBlock); // 添加到容器
      }

      let highestBottomY = Infinity; // 初始化为无限大
      let hasVisibleSpine = false;  // 标记是否有可见的 Spine

    for (let [uid, spine] of this._spineMap) {
        const charPosition = spine.position;
        const match = positionMapArray.find(([count, originalX, _, __, ___]) => {
            return count === charaCount && originalX === charPosition.x;
        });
        if (match) {
            const [_, __, newX, scaleFactor, newYOffset] = match;
            const newScale = charScale ? scaleFactor * charScale : scaleFactor 
            spine.position.set(newX, 640 + newYOffset);
            spine.scale.set(newScale, newScale);
        } else {
          // 匹配失败(说明是非标准角色位置)：只根据人数调整 y 坐标和缩放比例
          const fallbackMatch = positionMapArray.find(([count]) => count === charaCount);
          if (fallbackMatch) {
              const [_, __, ___, scaleFactor, newYOffset] = fallbackMatch;
              const newScale = charScale ? scaleFactor * charScale : scaleFactor;
              spine.position.set(charPosition.x, 640 + newYOffset); // 保持 x 坐标不变
              spine.scale.set(newScale, newScale);
          }
        }

        // 如果当前角色在显示列表中
        if (this._spineVisibilityMap.get(uid)) {
          hasVisibleSpine = true; // 至少有一个角色可见
          // 获取角色的全局边界
          const bounds = spine.getBounds();
          const bottomY = bounds.y + bounds.height; // 获取最下方坐标

          // 更新最高的底部坐标（即最小的 bottomY）
          if (bottomY < highestBottomY) {
              highestBottomY = bottomY;
          }

        }

        //修改标记 为spine应用fg颜色遮罩
        // ✅ 检查是否有待应用的滤镜
        if (this._pendingFilters.has("FgFilter")) {
          if(!this._spineMap.get(uid).filters){
            console.log("检测到待应用滤镜，正在应用至:", uid);
            this._spineMap.get(uid).filters = [this._pendingFilters.get("FgFilter")];
          }
        }


    }

    // 如果有可见的角色
    if (hasVisibleSpine) {
      this._coverBlock.visible = true; // 显示遮挡块
      if (highestBottomY !== Infinity) {
          this._coverBlock.position.y = highestBottomY; // 将遮挡块移动到最高的底部坐标
      }
      // 确保遮挡块在容器的最上方显示
      this._container.setChildIndex(this._coverBlock, this._container.children.length - 1);
    } else {
        this._coverBlock.visible = false; // 隐藏遮挡块
    }



  }
  ////修改标记 //

          

  applyColorOverlayFilter(overlayColor, fgRect) {

    // console.log(overlayColor, fgRect)

    // 用来基于fg为spine添加颜色遮罩 
    // getBounds().y 是 从上往下 计算的，而 gl_FragCoord.y 是 从下往上 计算的
    // 因为 getBounds() 返回的坐标是 PixiJS 全局坐标（左上角为 (0,0)），而 gl_FragCoord 是 WebGL 画布坐标（左下角为 (0,0)）
    

    const colorOverlayFragment = `
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform vec4 overlayColor;
      uniform vec4 fgRect;  // 矩形区域 (x, y, width, height)
  
      void main(void) {
          vec4 original = texture2D(uSampler, vTextureCoord);
          
          float xMin = fgRect.x;
          float xMax = fgRect.x + fgRect.z; // x + width
          float yMin = 1281.0 - (fgRect.y + fgRect.w); //弥补fg的下方裁去的黑边1像素 所以是1281 如果没有裁边会有1像素重叠 暂时搁置没有处理
          float yMax = 1280.0 - fgRect.y ; // y + height 
          bool inRect = (gl_FragCoord.x >= xMin && gl_FragCoord.x <= xMax &&
                         gl_FragCoord.y >= yMin && gl_FragCoord.y <= yMax); 
          
          if (!inRect && original.a > 0.0) { //对不在fg内部的spine像素作用滤镜
              vec3 blendedColor = mix(original.rgb, overlayColor.rgb, overlayColor.a * original.a); //overlayColor.a * original.a 相比overlayColor.a可以防止边界二值化导致锯齿形成
              gl_FragColor = vec4(blendedColor, original.a);
          } else {
              gl_FragColor = original;
          }
      }
    `;
  
    const filter = new PIXI.Filter(null, colorOverlayFragment, {
      overlayColor: new Float32Array([overlayColor.r / 255, overlayColor.g / 255, overlayColor.b / 255, overlayColor.a]),
      fgRect: new Float32Array([fgRect.x, fgRect.y, fgRect.width, fgRect.height])
    });
  

    this._spineMap.forEach(spine => {
      spine.filters = [filter];
    });

    this._pendingFilters.set("FgFilter", filter); //多数情况fg比spine先显示 所以需要储存filter
    console.log("滤镜已设置")

  }
  
  resetColorOverlayFilter() {
    this._spineMap.forEach(spine => {
      spine.filters = null;
    });
    this._pendingFilters.clear();
    console.log("滤镜已重置");
  }
  


}
