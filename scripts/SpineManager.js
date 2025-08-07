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
        //头身修正标记位
        this._needsHeadBodyRatioModify = true;
        // 补偿角色头部缩小后以原始比例显示时显小的 补偿全身放大系数
        this._spineScaleRatioWhenFgCovering = 1.066;

        this._headScale_CONFIG_MAP = {
            default: { scale: 1, translate: { x: 0, y: 0 } },

            mano: { scale: 0.91, translate: { x: 0, y: 0 } },
            hiori: { scale: 0.92, translate: { x: 0, y: 0 } },
            meguru: { scale: 0.91, translate: { x: 0, y: 0 } },

            kogane: { scale: 0.89, translate: { x: 0, y: 0 } },
            mamimi: { scale: 0.91, translate: { x: 0, y: 0 } },
            sakuya: { scale: 0.89, translate: { x: 0, y: 0 } },
            yuika: { scale: 0.89, translate: { x: 0, y: 0 } },
            kiriko: { scale: 0.91, translate: { x: 0, y: 0 } },

            kaho: { scale: 0.91, translate: { x: 0, y: 0 } },
            chiyoko: { scale: 0.89, translate: { x: 0, y: 0 } },
            juri: { scale: 0.91, translate: { x: 0, y: 0 } },
            rinze: { scale: 0.92, translate: { x: 0, y: 0 } },
            natsuha: { scale: 0.89, translate: { x: 0, y: 0 } },

            amana: { scale: 0.88, translate: { x: 0, y: 0 } },
            tenka: { scale: 0.88, translate: { x: 0, y: 0 } },
            chiyuki: { scale: 0.88, translate: { x: 0, y: 0 } },

            asahi: { scale: 0.89, translate: { x: 0, y: 0 } },
            fuyuko: { scale: 0.9, translate: { x: 0, y: 0 } },
            mei: { scale: 0.91, translate: { x: 0, y: 0 } },

            toru: { scale: 0.92, translate: { x: 0, y: 0 } },
            madoka: { scale: 0.92, translate: { x: 0, y: 0 } },
            koito: { scale: 0.92, translate: { x: 0, y: 0 } },
            hinana: { scale: 0.91, translate: { x: 0, y: 0 } },

            nichika: { scale: 0.92, translate: { x: 0, y: 0 } },
            mikoto: { scale: 0.91, translate: { x: 0, y: 0 } },

            luca: { scale: 0.92, translate: { x: 0, y: 0 } },
            hana: { scale: 0.93, translate: { x: 0, y: 0 } },
            haruki: { scale: 0.91, translate: { x: 0, y: 0 } },

            hazuki: { scale: 0.89, translate: { x: 0, y: 0 } },

            ruby: { scale: 0.93 , translate: { x: 0, y: 0 } },
            kana: { scale: 0.91, translate: { x: 0, y: 0 } },
            mem: { scale: 0.92, translate: { x: 0, y: 0 } },

            akane: { scale: 0.91, translate: { x: 0, y: 0 } },
        };

        this._positionMapArray = [
            //[0, 568, 568, 1.4, 100], //捕捉角色隐藏后进行操作的脚本 很可能引入问题 需要观察具体脚本处理
            //  不同人数位置下 如果出现复数角色演出中先隐藏角色再位移缩放的话会很难捕捉正确的人数坐标，此项只是对于单人演出的最简单情况进行特例处理
            //角色淡出时会触发这个比例导致缩放闪烁，先注释掉

            [1, 568, 568, 1.4, 100], //[人数, 原始x, 修正x, 缩放比例, y修正(负值向上 正值向下)]

            [1, 310, 310, 1.26, 40], //1人站2人位左
            [1, 796, 826, 1.26, 40], //1人站2人位右

            [1, 200, 200, 1.26, 40], // 1人站三人位左(另外2人暂时不在)
            [1, 936, 936, 1.26, 40], // 1人站三人位右

            [2, 310, 310, 1.26, 40], // 二人左
            [2, 796, 826, 1.26, 40], // 二人右修正二人对话特有的不对称 中心是568，

            [2, 568, 568, 1.26, 40], // 2人站3人位 中
            [2, 200, 200, 1.26, 40], // 左
            [2, 936, 936, 1.26, 40], // 右

            [3, 568, 568, 1.26, 40], // 3人中
            [3, 200, 200, 1.26, 40], // 3人左
            [3, 936, 936, 1.26, 40], // 3人右

            [4, 150, 150, 1.2, -20], // 4人
            [4, 420, 420, 1.2, -20],
            [4, 686, 686, 1.2, -20],
            [4, 986, 986, 1.2, -20],

            [5, 100, 100, 1, -80], // 5人
            [5, 302, 334, 1, -80],
            [5, 568, 568, 1, -80],
            [5, 836, 802, 1, -80],
            [5, 1036, 1036, 1, -80],
        ];
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
        isFastForward,
        //修改标记
        charEffectParams
        //
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
            this._spineMap.set(char_uid, new PIXI.spine.Spine(this._loader.resources[char_uid].spineData));

            this._spineMap.get(char_uid).alpha = 1;

            //修改标记 储存spine可见性标记
            this._spineVisibilityMap.set(char_uid, true);

            // 对新创建的spine的头比例进行缩放 根据 charLabel 获取配置，如果找不到则使用 'default' 配置

            const baseCharName = charLabel.replace(/(\d+)$/, ""); //覆盖rinze2等一个commu中有不同服装的spine的场合 去除末尾的1个数字

            if (this._needsHeadBodyRatioModify) {
                const config = this._headScale_CONFIG_MAP[baseCharName] || this._headScale_CONFIG_MAP.default;
                const neckBone = this._spineMap.get(char_uid).skeleton.findBone("neck");
                neckBone.data.scaleX = config.scale;
                neckBone.data.scaleY = config.scale;
                neckBone.setToSetupPose;
            }
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
                this._container.children.length <= charPosition.order ? this._container.children.length - 1 : charPosition.order
            );
        }

        //修改标记  charScale在脚本中不存在 注释掉下列内容
        // if (charScale) {
        //     thisSpine.scale = charScale;
        // }
        //修改标记完

        //修改标记 避免对charEffect直接修改 保护脚本的原参数在控制台输出的原始性
        // if (charEffect) {

        //     if (charEffect.type == "from") {
        //         thisSpine.alpha = 1;
        //     }
        //     if (charEffect?.x) {
        //         charEffect.x += thisSpine.x;
        //     }
        //     if (charEffect?.y) {
        //         // 修改标记 角色y坐标未应用offset时应当应用offset
        //         // charEffect.y += thisSpine.y;
        //         // 脚本中现阶段最大y位移是正负100

        //         charEffect.y += thisSpine.y < 640 + 101 ? thisSpine.y + (global_YOffset + global_YOffset_MainContents) : thisSpine.y; //粗略的防重复处理
        //     }
        //     if (isFastForward) {
        //         charEffect.time = 50;
        //     }
        //修改标记 避免对charEffect直接修改 保护脚本的原参数的原始性，避免多重处理
        if (charEffect) {
            //修改标记 添加
            //////////////
            const charEffectCopy = { ...charEffect };

            if (charEffectParams) {
                if (charEffectParams?.scale) {
                    console.log(`thisSpine.scale`, thisSpine.scale.x, `charEffectCopy.scale`, charEffectCopy.scale);
                    const { position, scale } = this._computeAdjustedTransform(
                        charEffectParams.charaCount,
                        charLabel,
                        charEffectParams.charBaseTransformMap,
                        thisSpine.position,
                        charEffectParams.fgCoveringSpine
                    );

                    console.log(`position, scale `, position, scale);

                    //  _computeAdjustedTransform返回scale=-1代表不应当更改scale
                    if (scale === -1) {
                        charEffectCopy.scale = thisSpine.scale;
                    } else {
                        charEffectCopy.scale = scale;
                    }
                }
            }
            //////////////
            //

            //// 修改标记 修改/////
            // if (charEffect.type == "from") {
            if (charEffect.type == "from" && charEffect.alpha === 0) {
                /////////////////

                thisSpine.alpha = 1;
            }

            //// 修改标记 补遗/////
            if (charEffect.type == "to" && charEffect.alpha === 1) {
                thisSpine.alpha = 0;
            }
            //////////////////////

            if (charEffect?.x) {
                charEffectCopy.x += thisSpine.x;
            }
            if (charEffect?.y) {
                // 修改标记 角色y坐标未应用offset时应当应用offset
                // charEffectCopy.y += thisSpine.y;

                // 脚本中现阶段最大y位移是正负100
                charEffectCopy.y += thisSpine.y < 640 + 101 ? thisSpine.y + (global_YOffset + global_YOffset_MainContents) : thisSpine.y; //粗略的防重复处理
            }
            if (isFastForward) {
                charEffectCopy.time = 50;
            }

            // Utilities.fadingEffect(thisSpine, charEffect, isFastForward);

            Utilities.fadingEffect(thisSpine, charEffectCopy, isFastForward);
            // console.log("fadingEffect_charEffectCopy", charEffectCopy);

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

            const getCharaSpineCount = (spineVisibilityMap) => Array.from(spineVisibilityMap.values()).filter(Boolean).length;

            this._charaSpineCount = getCharaSpineCount(this._spineVisibilityMap);

            //////
        }

        //修改标记 spine出现时不渐变的情况的补漏 见于早期脚本

        if (!charEffect && charId) {
            this._spineVisibilityMap.set(char_uid, true);
            const getCharaSpineCount = (spineVisibilityMap) => Array.from(spineVisibilityMap.values()).filter(Boolean).length;

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
            const trackEntry = this._setCharacterAnimation(charLipAnim, true, 5, thisSpine);
            if (lipAnimDuration) {
                this._timeoutToClear = setTimeout(() => {
                    if (trackEntry.trackIndex === 5) {
                        trackEntry.time = 0;
                        trackEntry.timeScale = 0;
                    }
                    if (this._replacingLipTrack && this._replacingLipTrack.trackIndex === 5) {
                        //TRACK_INDEXES.LIP_ANIM
                        this._replacingLipTrack.time = 0;
                        this._replacingLipTrack.timeScale = 0;
                    }

                    this._keepsLipAnimation = false;
                }, lipAnimDuration * 1000);
            }

            const isReplacingLipAnimation = !lipAnimDuration && this._keepsLipAnimation;
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
        if (!this._spineMap.has(char_uid) || !this._spineMap.get(char_uid).state.tracks[5]) {
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
            const beforeEventTimeline = this._getAnimation(beforeAnim, thisSpine).timelines.find(function (timeline) {
                return timeline.events;
            });
            if (beforeEventTimeline) {
                const relayAnimEvent = beforeEventTimeline.events.find(function (event) {
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

            ///////

            ////修改标记 原写法遗漏了delay参数导致队列动画被吞
            // trackEntry = thisSpine.state.addAnimation(trackNo, charAnim, charAnimLoop);
            trackEntry = thisSpine.state.addAnimation(trackNo, charAnim, charAnimLoop, 0);
        } else {
            if (beforeAnim) {
                thisSpine.stateData.setMix(beforeAnim, charAnim, this.ANIMATION_MIX);
            }

            trackEntry = thisSpine.state.setAnimation(trackNo, charAnim, charAnimLoop);
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
        const animation = thisSpine.spineData.animations.find((a) => a.name === charAnim);
        if (!animation) {
            console.error(`${charAnim} is not found in spineData`);
        }

        return animation;
    }

    ////修改标记 调整角色位置和缩放 挡住腿部的参差部分 由trackmanager调用
    adjustSpine(charaCount, charBaseTransformMap, fgCoveringSpine, currentTrackCharEffect, currentTrackcharLabel) {
        // 创建遮挡块
        if (!this._coverBlock) {
            this._coverBlock = new PIXI.Graphics();
            // this._coverBlock.beginFill(0x000000, 1); // 黑色遮挡腿部部件透明度设置
            this._coverBlock.beginFill(parseInt(global_theme_color, 16), 1);
            // this._coverBlock.beginFill(0xff0000, 1); // 测试用改色
            this._coverBlock.drawRect(0, 0, 1136, 800); // 设置初始长宽
            this._coverBlock.endFill();
            this._container.addChild(this._coverBlock); // 添加到容器
        }

        let highestBottomY = Infinity; // 初始化为无限大
        let hasVisibleSpine = false; // 标记是否有可见的 Spine

        ////////
        /////// 核心 遍历处理所有spine的transform
        ///////

        let tweenFlag = false;
        if ((currentTrackCharEffect?.x || currentTrackCharEffect?.y || currentTrackCharEffect?.scale) && currentTrackCharEffect.time && currentTrackcharLabel) {
            tweenFlag = true;
        }

        //运动服stand_jersey类flag
        let jerseyFlag = false;

        for (let [uid, spine] of this._spineMap) {
            const charLabel = uid.split("_")[0];

            if (uid.endsWith("_jersey") && this._spineVisibilityMap.get(uid) === true) {
                jerseyFlag = true; //如果有可见的运动服类spine
            }

            const { position, scale } = this._computeAdjustedTransform(charaCount, charLabel, charBaseTransformMap, spine.position, fgCoveringSpine);

            if (currentTrackCharEffect?.type !== "to" || currentTrackCharEffect?.alpha !== 0) {
                //淡出时不执行

                spine.position.set(position.x, position.y);

                if (scale !== -1) {
                    //  _computeAdjustedTransform返回scale=-1代表不应当更改scale
                    if (!tweenFlag || charLabel !== currentTrackcharLabel) {
                        spine.scale.set(scale, scale);
                    } else {
                        //如果当前spine正在tweenscale动画中 延时设置缩放
                        setTimeout(() => {
                            spine.scale.set(scale, scale);
                        }, currentTrackCharEffect?.time || 0);
                    }
                }
            }
            // console.log("adjustspine:", charLabel, position, scale);

            ///位移缩放处理完成

            // 如果当前角色在显示列表中
            if (this._spineVisibilityMap.get(uid)) {
                hasVisibleSpine = true; // 至少有一个角色可见
                // 获取角色的全局边界
                const bounds = spine.getBounds();
                const bottomGlobal = new PIXI.Point(bounds.x, bounds.y + bounds.height);
                //将getbounds结果从舞台坐标转换为container内坐标(适配缩放)
                const bottomLocal = this._container.parent.toLocal(bottomGlobal);

                const bottomY = bottomLocal.y; // 获取最下方坐标

                // 更新最高的底部坐标（即最小的 bottomY）
                if (bottomY < highestBottomY) {
                    highestBottomY = bottomY;
                }
            }

            //修改标记 为spine应用fg颜色遮罩
            // ✅ 检查是否有待应用的滤镜
            if (this._pendingFilters.has("FgFilter")) {
                if (!this._spineMap.get(uid).filters) {
                    console.log("检测到待应用滤镜，正在应用至:", uid);
                    this._spineMap.get(uid).filters = [this._pendingFilters.get("FgFilter")];
                }
            }
        }

        // 如果有可见的角色
        if (hasVisibleSpine) {
            this._coverBlock.visible = true; // 显示遮挡块
            if (highestBottomY !== Infinity) {
                //运动服stand_jersey类spine的特殊处理 仅在最早期commu中出现 此类spine没有画腿 遮挡块的高度需要调整
                if (jerseyFlag) {
                    //有运动服spine
                    const distance = 90; //运动服允许超出背景下边缘的量
                    this._coverBlock.position.y = global_YOffset + global_YOffset_MainContents + 640 + distance;
                } else {
                    //正常
                    this._coverBlock.position.y = highestBottomY; // 将遮挡块移动到最高的底部坐标
                }
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
                float yMin = 1921.0 - (fgRect.y + fgRect.w); //弥补fg的下方裁去的黑边1像素 所以是1281 -> 1601 如果没有裁边会有1像素重叠 暂时搁置没有处理
                float yMax = 1920.0 - fgRect.y ; // y + height 
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
            fgRect: new Float32Array([fgRect.x, fgRect.y, fgRect.width, fgRect.height]),
        });

        this._spineMap.forEach((spine) => {
            spine.filters = [filter];
        });

        this._pendingFilters.set("FgFilter", filter); //多数情况fg比spine先显示 所以需要储存filter
        console.log("滤镜已设置");
    }

    resetColorOverlayFilter() {
        this._spineMap.forEach((spine) => {
            spine.filters = null;
        });
        this._pendingFilters.clear();
        console.log("滤镜已重置");
    }

    //根据spine反查角色名
    _getCharLabelBySpine(spine) {
        for (const [char_uid, spineInstance] of this._spineMap.entries()) {
            if (spineInstance === spine) {
                // 找到当前传入的 spine 实例
                const parts = char_uid.split("_");
                if (parts.length > 0) {
                    return parts[0];
                }
            }
        }
        return null;
    }

    // 根据角色名查找uid
    _getUIDByCharLabel(charLabel) {
        for (const uid of this._spineMap.keys()) {
            if (uid.startsWith(`${charLabel}_`)) {
                return uid;
            }
        }
        return null; // 没有找到
    }

    _computeAdjustedTransform(charaCount, charLabel, charBaseTransformMap, spinePosition, fgCoveringSpine) {
        const baseTransform = charBaseTransformMap.get(charLabel);
        const charScale = baseTransform?.scale ?? 1;

        let position = baseTransform?.position;
        let scale = charScale;

        // 在类里用 this._positionMapArray
        const match = this._positionMapArray.find(([count, originalX]) => {
            return count === charaCount && originalX === baseTransform?.position?.x;
        });

        if (match) {
            const [_, originalX, newX, scaleFactor, newYOffset] = match;

            if (!fgCoveringSpine) {
                position = {
                    x: global_XOffset + newX,
                    y: global_YOffset + global_YOffset_MainContents + (baseTransform?.position?.y ?? 0) + newYOffset,
                };
                scale = scaleFactor * charScale;
            } else {
                if (this._needsHeadBodyRatioModify) {
                    scale = charScale * this._spineScaleRatioWhenFgCovering;
                }
                position = {
                    x: originalX === 796 ? global_XOffset + 826 : spinePosition.x,
                    y: global_YOffset + global_YOffset_MainContents + (baseTransform?.position?.y ?? 0),
                };
            }
        } else {
            const fallback = this._positionMapArray.find(([count]) => count === charaCount);
            if (fallback) {
                const [_, originalX, ___, scaleFactor, newYOffset] = fallback;
                if (!fgCoveringSpine) {
                    position = {
                        x: spinePosition.x,
                        y: global_YOffset + global_YOffset_MainContents + (baseTransform?.position?.y ?? 0) + newYOffset,
                    };
                    scale = scaleFactor * charScale;
                } else {
                    if (this._needsHeadBodyRatioModify) {
                        scale = charScale * this._spineScaleRatioWhenFgCovering;
                    }
                    position = {
                        x: originalX === 796 ? global_XOffset + 826 : spinePosition.x,
                        y: global_YOffset + global_YOffset_MainContents + (baseTransform?.position?.y ?? 0),
                    };
                }
            } else {
                position = {
                    x: spinePosition.x,
                    y: spinePosition.y,
                };
                scale = -1; //用特殊值代表scale应当保持当前值
            }
        }

        return { position, scale };
    }
}
