class FgManager {
    // constructor() {
    constructor(app) {
        //修改标记 添加app传入
        this._app = app;

        this._container = new PIXI.Container();
        this._fgMap = new Map();
        this._loader = PIXI.Loader.shared;
        this._currentFg = null;

        //修改标记 增加spine遮盖标记(比如视频通话、电视等人物不适合超出背景时) 由tm传给spinemanager
        this.fgCoveringSpine = false;

        //fg个别处理表

        // 需要作水平缩放的
        this._fgNameToXZoomRateMap = {
            "004731": 1, // VTR扫描纹
        };

        //需要作水平位移
        this._fgNameToXOffsetMap = {
            "004731": 0, // VTR扫描纹
        };
        //需要作垂直缩放
        this._fgNameToYZoomRateMap = {
            "001331": 1.8, // 雨水
            "001922": 1, // 灰色回忆
            "001923": 1, // 土色回忆
            "002341": 1, // 电影风宽屏化黑边
            "004521": 1, // 白色回忆
            "000481": 1.33, // 中巴椅背
            "002681": 0.833, // 电视直播
            "002921": 1, // 老电影
            "003861": 1.025, // Zoom聊天
            "007631": 1, // 花边边框
            "004731": 1, // VTR扫描纹 测试 game_event_communications/400108105.json
        };
        //需要作垂直位移
        this._fgNameToYOffsetMap = {
            "001922": 0,
            "001923": 0,
            "004521": 0,
            "002341": 0,
            "000481": 0,
            "002681": 2,
            "003861": -16,
            "004731": 0,
        };

        //需要挡住角色spine超出背景的部分的
        this._fgNameToBeCovered = [
            "000202", //卡拉ok
            "000221", //家庭餐馆的桌子
            "001741", //REC
            "002341", //电影黑边
            "002681",
            "000481",
            "003861",
            "004731",
            "004741", // 白毛边回忆
            "006361", // 绿色杂斑回忆
            "008331", // 荧幕黑条纹
            "009951", // 荧幕黑条纹
            "011231", // 木纹桌面
        ];
        // 需要绘制下方遮挡块的组

        // 🔹 预设 FG 颜色遮罩信息 (RGB + Alpha)
        this._fgColorMap = {
            "001921": { r: 178, g: 132, b: 96, a: 0.83 }, // 土色回忆(渐变)
            "001922": { r: 156, g: 89, b: 40, a: 0.45 }, // 土色回忆
            "001923": { r: 138, g: 138, b: 138, a: 0.72 }, // 灰色回忆
            "004521": { r: 248, g: 248, b: 248, a: 0.74 }, // 白色回忆
            "002921": { r: 100, g: 80, b: 90, a: 0.6 }, // 老电影
            "007611": { r: 0, g: 0, b: 0, a: 0.84 }, // 黑晕边框
        };

        //一些fg最下方会有黑边 需要裁掉一像素和覆盖spine超出fg部分的滤镜效果连接 避免黑线穿过角色
        this._fgNameToBeCut = [
            "001921",
            "001922", //
            "001923",
            "004521",
        ];

        this._fgNameToBeFiltered = [
            { fgname: "002341", filter: "GlowFilter", options: { distance: 80, innerStrength: 10, outerStrength: 0, color: 0x191919, quality: 0.01 } }, //向内涂抹glow颜色实现覆盖 电影风黑条遮罩 增加涂抹颜色和背景的黑色加以区分
            // { fgname: "002341", filter: "DropShadowFilter", options: { } },
            // { fgname: "002341", filter: "AdjustmentFilter", options: { alpha: 0.5, } },
        ]; //为特定fg添加滤镜
    }

    get stageObj() {
        return this._container;
    }

    reset(clear = true) {
        this._container.removeChildren(0, this._container.children.length);
        if (clear) {
            this._fgMap.clear();
        }
    }

    processFgByInput(fg, fgEffect, fgEffectTime, isFastForward) {
        if (!fg) {
            return;
        } else if (fg == "off") {
            if (this._container.children.length) {
                this._container.removeChildren(0, this._container.children.length);

                //修改标记
                this.fgCoveringSpine = false;

                //调试
                console.log("fgCoveringSpine:", this.fgCoveringSpine);
            }
        } else if (isFastForward) {
            this._changeFg(fg, 0, 1);
        } else if (fg == "fade_out") {
            this._fadeOutFg();
        } else if (fg && fgEffect) {
            if (isFastForward) {
                this._changeFg(fg, 0, 1);
            } else {
                this._changeFgByEffect(fg, fgEffect, fgEffectTime);
            }
        } else if (fg && !fgEffect) {
            this._changeFg(fg, 0, 1);
        }
    }

    _changeFg(fgName, order, alphaValue) {
        if (!this._fgMap.has(fgName)) {
            this._fgMap.set(fgName, new PIXI.Sprite(this._loader.resources[`fg${fgName}`].texture));

            //修改标记
            //仅在第一次创建fg时调用 避免重复
            this._adjustFg(fgName);
            ////
        }

        this._currentFg = this._fgMap.get(fgName);
        this._currentFg.alpha = alphaValue;

        if (this._container.children.length != 0 && order == 0) {
            this._container.removeChildAt(order);
        }

        this._container.addChildAt(this._fgMap.get(fgName), order > this._container.children.length ? this._container.children.length : order);

        //修改标记 遮盖标记位更新
        if (this._fgNameToBeCovered.includes(fgName)) {
            this.fgCoveringSpine = true;
            //调试
            console.log("fgname:", fgName, "fgCoveringSpine:", this.fgCoveringSpine);
        }
        //
    }

    _changeFgByEffect(fgName, fgEffect, fgEffectTime) {
        switch (fgEffect) {
            case "fade":
            //和"switch_fade"逻辑相同
            case "switch_fade":
                this._changeFg(fgName, 1, 0);
                let newOrder = this._container.children.length == 1 ? 0 : 1;

                let origFg = this._container.getChildAt(0),
                    newFg = this._container.getChildAt(newOrder);
                let k = setInterval(() => {
                    if (newOrder) {
                        origFg.alpha -= 0.01;
                    }
                    newFg.alpha += 0.01;
                }, 10);
                setTimeout(
                    () => {
                        clearInterval(k);
                        if (newOrder) {
                            origFg.alpha = 0;
                        }
                        newFg.alpha = 1;

                        //修改标记
                        if (origFg !== newFg) {
                            this._container.removeChildAt(0);
                        }
                        ///
                    },
                    fgEffectTime ? fgEffectTime : 1000
                );

                // this._container.removeChildAt(0);
                //修改标记 旧背景的移除应当在timeout内部

                /////

                break;
            case "mask":
                //todo:实际并没有值为mask的fgEffect, 除了fade之外另外还需要处理的是
                // fade_out(目前全剧本只有4处 且fg都处于关闭状态下被调用 没发现可见效果 似乎可以无视)和
                // switch_fade(解决 fade的代码本身就是对应的switchfade 但有bug已修正)
                // 见jschunk\app-e068da2c7784d39c21c6.js line:10540
                break;
        }
    }

    _fadeOutFg() {
        //修改标记 添加spine覆盖标记位检查
        // 通过 currentFg 查找对应的 fgName
        // 找出所有属于 this._fgNameToBeCovered 的 fgObj
        const defaultFadeTime = 1000;

        const coveredFgObjs = [];
        for (const [fgName, fgObj] of this._fgMap.entries()) {
            if (this._fgNameToBeCovered.includes(fgName)) {
                coveredFgObjs.push(fgObj);
            }
        }

        // 判断是否唯一，且正好是当前 this._currentFg
        const matchCount = coveredFgObjs.filter((obj) => obj === this._currentFg).length;

        //符合条件的话淡出完成后更新遮罩标记
        if (matchCount === 1 && coveredFgObjs.length === 1) {
            this.fgCoveringSpine = false;
            //调试
            console.log("fgCoveringSpine:", this.fgCoveringSpine);
        }
        //修改标记完

        // 修改标记
        // Utilities.fadingEffect(this._currentFg, { alpha: 0, time: 1000, type: 'to' });
        Utilities.fadingEffect(this._currentFg, { alpha: 0, time: defaultFadeTime, type: "to" });
    }

    //修改标记
    //背景下移并缩放 添加代码 根据fg图片名字指定Y缩放比例//
    //

    _adjustFg(fgName) {
        const XOffset_Container = global_XOffset;
        const YOffset_Container = global_YOffset + global_YOffset_MainContents;

        this._container.position.set(XOffset_Container, YOffset_Container);

        const XZoomRate = this._fgNameToXZoomRateMap[fgName] || 1;
        const YZoomRate = this._fgNameToYZoomRateMap[fgName] || 1;

        const XOffset = this._fgNameToXOffsetMap[fgName] ? this._fgNameToXOffsetMap[fgName] : 0;
        const YOffset = this._fgNameToYOffsetMap[fgName] ? this._fgNameToYOffsetMap[fgName] : 0;

        const currentX = this._fgMap.get(fgName).position.x;
        const currentY = this._fgMap.get(fgName).position.y;
        const fgSprite = this._fgMap.get(fgName);

        // // 获取原始宽度和高度
        const bounds = fgSprite.getBounds();

        const originalWidth = bounds.width;
        const originalHeight = bounds.height;
        const rectHeight = (global_ViewerHeight - YOffset) / YZoomRate - originalHeight;

        // // 设置位置和缩放比例
        fgSprite.position.set(currentX + XOffset, currentY + YOffset);
        fgSprite.scale.set(XZoomRate, YZoomRate);

        // 执行spine遮罩
        if (this._fgNameToBeCovered.includes(fgName)) {
            const rect = new PIXI.Graphics();
            rect.beginFill(parseInt(global_theme_color, 16), 1);

            rect.drawRect(0, originalHeight, originalWidth, rectHeight);
            rect.endFill();
            fgSprite.addChild(rect);
        }

        if (this._fgNameToBeCut.includes(fgName)) {
            const mask = new PIXI.Graphics();
            mask.beginFill(0x000000); // 填充颜色是黑色的（遮罩本身不会显示）
            mask.drawRect(0, 0, fgSprite.width, fgSprite.height - 1); // 高度减去 1 像素
            mask.endFill();

            // 将遮罩应用到 sprite 上
            fgSprite.mask = mask;
            fgSprite.addChild(mask);
        }

        // 用于为电影遮罩类fg添加glowfilter
        const filterConfig = this._fgNameToBeFiltered.find((item) => item.fgname === fgName);
        let newFilter;
        if (filterConfig) {
            // 滤镜实现代码
            console.log(`为 ${fgName} 应用 ${filterConfig.filter} 滤镜`);
            const fgSprite_Child = new PIXI.Sprite(fgSprite.texture);

            const FilterClass = PIXI.filters[filterConfig.filter];
            if (FilterClass) {
                newFilter = new FilterClass({ ...filterConfig.options }); //对象展开语法 ...用来传递参数允许你将一个对象的所有可枚举属性复制到另一个对象字面量中
            } else {
                console.warn(`Unknown filter type: ${filterConfig.filter}`);
            }

            if (newFilter) {
                fgSprite_Child.filters = [newFilter];
                fgSprite.addChild(fgSprite_Child);
                fgSprite.texture = PIXI.Texture.EMPTY; // 删除原fgSprite的图片 仅作为容器 由child级别副本来应用滤镜 避免rect遮挡部分被滤镜影响
            }
        }
    }
    ////

    ////
    // 完成 对外开放的方法 向上级(trackmanager)返回当前fg的人物覆盖色和当前fg的矩形范围绝对坐标
    // 完成 in spinemanager 对trackmanager开放的方法 用上面的方法的返回值由trackmanager传给spinemanager 为所有spine角色添加filter 当角色像素落在fg矩形范围外时用filter添加含透明度的颜色覆盖
    ////

    getFgOverlayData(fgName) {
        // 🔹 仅处理 `fgColorMap` 里存在的 FG
        if (!(fgName in this._fgColorMap)) {
            return null;
        }

        // 🔹 获取前景 FG 的 Sprite
        const fgSprite = this._fgMap.get(fgName);
        if (!fgSprite) {
            return null;
        }

        // 🔹 获取 FG 在屏幕上的绝对坐标
        // const bounds = fgSprite.getBounds(); // global

        // 🔹 返回 FG 颜色 & 绝对坐标范围

        //改为直接返回fgSprite的引用
        return {
            overlayColor: this._fgColorMap[fgName], // 直接取字典数据
            // bounds: {
            //     x: bounds.x,
            //     y: bounds.y,
            //     width: bounds.width,
            //     height: bounds.height,
            // },
            sprite: fgSprite,
        };
    }
}
