class EffectManager {
    constructor() {
        this._container = new PIXI.Container();
        this._effectMap = new Map();
        this._loader = PIXI.Loader.shared;
        this._container_titlePopup = new PIXI.Container();
    }

    get stageObj() {
        return this._container;
    }

    reset(clear = true) {
        this._container.removeChildren(0, this._container.children.length);
        if (clear) {
            this._effectMap.clear();
        }
    }

    processEffectByInput(effectLabel, effectTarget, effectValue, isFastForward) {
        if (!effectLabel) {
            return;
        }

        //修改标记  未适配effectLabel为数字的情况 此时通常effectTarget为null 例如produce_events/102300304.json 雏菜grad s3 会报错
        //作用不明 没看出对演出的影响
        //添加effect target缺失时防报错代码
        //

        const unknownEffectLabelList = ["0351", "0280", "2144"];
        if (unknownEffectLabelList.includes(effectLabel.toString())) {
            // Use .toString() to handle potential number types
            console.warn(`Skipping unknown effectLabel: ${effectLabel}`);
            return;
        }

        ///

        //修改标记 缩放下移  闪白或闪黑时范围为全屏
        //->暂时恢复为和背景大小一致
        let YOffset, XOffset, XZoomRate, YZoomRate;

        YOffset = global_YOffset + global_YOffset_MainContents; //
        XOffset = global_XOffset;
        XZoomRate = 1;
        YZoomRate = 1; // YZoomRate = 3; 改变逻辑 不再用缩放的方式来遮挡角色超出背景区域的部分而是绘制矩形时扩大范围

        // 修改标记完

        if (!this._effectMap.has(effectLabel)) {
            let thisEffect = null;

            switch (effectTarget.type) {
                case "rect":
                    thisEffect = new PIXI.Graphics();

                    //修改标记 当特效为黑屏或白屏时 额外绘制更大的黑色矩形底用来确保角色spine被遮挡，再绘制正常大小的effect矩形
                    if (effectLabel.includes("white") || effectLabel.includes("black")) {
                        thisEffect.beginFill(`0x000000`);

                        thisEffect.drawRect(0, -60, effectTarget.width, global_ViewerHeight - YOffset + 60); // -60代表 前景的人物spine有时会略微超出背景顶端(呆毛等) 需要略微向上扩展 的范围

                        thisEffect.endFill();
                    }
                    //

                    if (effectLabel.includes("black") && effectValue.x !== undefined) {
                        break; //黑屏的侧方卷入淡入特效只需要上面的一个矩形黑色底即可满足，不再需要绘制第二个矩形(因为透明度渐变 重叠在一起会暴露是两个矩形)，这类特效包含effectvalue.x的值存在
                    }
                    thisEffect.beginFill(`0x${effectTarget.color}`);

                    thisEffect.drawRect(0, 0, effectTarget.width, effectTarget.height);

                    thisEffect.endFill();
                    break;
            }
            this._effectMap.set(effectLabel, thisEffect);
            ///////
        }

        let thisEffect = this._effectMap.get(effectLabel);

        //修改标记 缩放下移

        thisEffect?.position.set(XOffset, YOffset);
        thisEffect?.scale.set(XZoomRate, YZoomRate);

        ////
        this._container.addChild(thisEffect);

        //修改标记 确保titlePopup在最上层
        if (this._container_titlePopup) {
            this._container.setChildIndex(this._container_titlePopup, this._container.children.length - 1);
        }
        //

        Utilities.fadingEffect(thisEffect, effectValue);
    }

    //增加剧情牌子功能
    async showEventTitlePopup(eventTitle, eventTitleTrans, eventType, eventIcon, cardNamePic, eventIndexName, eventAlbumName) {
        // 参数检查与默认值设置
        if (eventTitle === "clear") {
            this._container_titlePopup.destroy();
            this._container_titlePopup = null;
            return;
        }
        if (!eventTitle) {
            eventTitle = "默认标题";
        }
        if (!eventTitleTrans) {
            eventTitleTrans = "";
        }
        if (!eventType) {
            eventType = "default";
        }
        if (!eventIndexName) {
            eventIndexName = "";
        }
        if (
            !this._loader.resources["pop_white"] &&
            this._loader.resources["black_dots"] &&
            !this._loader.resources[eventIcon] &&
            !this._loader.resources[cardNamePic]
        ) {
            console.error("资源未找到");
            return;
        }

        // 设置背景图案
        const texture = this._loader.resources["pop_white"].texture;

        // 创建九宫格平面（九宫格边距需根据实际纹理内容调整）
        const titlePopupBackground = new PIXI.NineSlicePlane(
            texture,
            20, // 左边距
            20, // 上边距
            20, // 右边距
            20 // 下边距
        );

        const validScenarioEventTypes = ["wing", "fan_meeting", "3rd_produce_area", "4th_produce_area", "5th_produce_area", "6th_produce_area"];

        let titlePopupLayoutType;
        if (eventType === "produce_marathon") {
            titlePopupLayoutType = "scenario_event";
        } else if (eventType === "common") {
            titlePopupLayoutType = "common"; // morning commu
        } else if (validScenarioEventTypes.includes(eventType)) {
            titlePopupLayoutType = "produce_event"; // produce event
        } else if (eventType === "specialEvents") {
            titlePopupLayoutType = "specialEvents"; // specialEvents
        } else {
            titlePopupLayoutType = "default"; // default
        }

        // 设置背景的宽高，根据事件类型动态调整
        const backgroundSizeMap = {
            scenario_event: { width: 568, height: eventTitleTrans !== "" ? 160 : 128 },
            common: { width: 300, height: 128 },
            produce_event: { width: 390, height: 220 },
            specialEvents: { width: 390, height: eventTitleTrans !== "" ? 160 : 128 },
            default: { width: 390, height: 220 },
        };

        const backgroundSize = backgroundSizeMap[titlePopupLayoutType] || backgroundSizeMap["default"];
        titlePopupBackground.width = backgroundSize.width;
        titlePopupBackground.height = backgroundSize.height;

        // 设置背景位置
        titlePopupBackground.position.set(0, 0); // 左上角

        // 创建一个与 titlePopupBackground 区域大小类似的 Graphics 作为遮罩
        const backgroundMask = new PIXI.Graphics();
        backgroundMask.beginFill(0xffffff); // 使用任意颜色，遮罩只关注形状，不涉及颜色
        backgroundMask.drawRect(
            titlePopupBackground.x + 10, // 遮罩的 x 坐标
            titlePopupBackground.y + 10, // 遮罩的 y 坐标
            titlePopupBackground.width - 20, // 遮罩的宽度
            titlePopupBackground.height - 20 // 遮罩的高度
        );
        backgroundMask.endFill();

        // 根据文字长度调整背景长 15是初始最大字数 24是字号

        const titlelength = Math.max(eventTitle.length + eventIndexName.length * 0.66, eventTitleTrans.length, eventAlbumName?.length * 0.66);

        if (titlelength > 15 || (titlePopupLayoutType === "scenario_event" && titlelength > 12)) {
            const extraLength = titlelength - (titlePopupLayoutType === "scenario_event" ? 12 : 15);
            titlePopupBackground.width += extraLength * 24;
            backgroundMask.width += extraLength * 24;
        }

        // 添加图标
        // const icon = new PIXI.Sprite(this._loader.resources[eventIcon].texture);
        const icon = new PIXI.Sprite(this._loader.resources[eventIcon]?.texture);

        //当eventicon字符串包含unit时说明图标为组合logo

        if (eventIcon?.includes("unit")) {
            icon.width = 96; // 图标的宽度
            icon.height = 96;
        } else {
            icon.width = eventType == "produce_marathon" ? 201 : 96; // 图标的宽度
            icon.height = eventType == "produce_marathon" ? 108 : 96; // 图标的高度
        }
        icon.position.set(12, 12); // 图标在背景上的位置

        // 添加卡名图
        let picCardName;
        let picCardNameShadow;
        const scaleRatio_ProduceScenario = 0.9;
        const scaleRatio_Normal = 0.6;

        if (this._loader.resources[cardNamePic]) {
            picCardName = new PIXI.Sprite(this._loader.resources[cardNamePic].texture);

            picCardName.anchor.set(0.5, 0);

            if (validScenarioEventTypes.includes(eventType)) {
                // 卡名图是育成剧本按钮图
                // 添加圆角矩形蒙版
                picCardName.position.set((titlePopupBackground.width - icon.width) / 2 + titlePopupBackground.x + icon.width + 12 / 2, icon.y - 28);
                picCardName.scale.set(scaleRatio_ProduceScenario, scaleRatio_ProduceScenario);

                const mask = new PIXI.Graphics();
                mask.beginFill(0xff0000);
                mask.drawRoundedRect(0, 0, 284, 88, 10);
                mask.endFill();
                mask.position.set(picCardName.x - picCardName.width / 2 + 10 * picCardName.scale.x, picCardName.y + 42 * picCardName.scale.y);
                mask.scale.set(scaleRatio_ProduceScenario, scaleRatio_ProduceScenario);
                picCardName.mask = mask;

                this._container_titlePopup.addChild(mask);

                const shadowOffsetX = 3; // 阴影 X 偏移
                const shadowOffsetY = 3; // 阴影 Y 偏移
                const shadowAlpha = 0.2; // 阴影透明度

                // 创建一个 Graphics 对象作为阴影
                picCardNameShadow = new PIXI.Graphics();
                picCardNameShadow.beginFill(0x000000, shadowAlpha); // 黑色阴影
                picCardNameShadow.drawRoundedRect(0, 0, mask.width, mask.height, 10); // 与 mask 的尺寸一致
                picCardNameShadow.endFill();

                // 设置阴影位置（偏移）
                picCardNameShadow.position.set(mask.x + shadowOffsetX, mask.y + shadowOffsetY);
            } else {
                // 正常卡名图
                picCardName.scale.set(scaleRatio_Normal, scaleRatio_Normal);
                picCardName.position.set(titlePopupBackground.x + 12 + icon.width + (titlePopupBackground.width - icon.width - 12) / 2 - 20, 0);
            }
        }

        // 添加文字 (eventTitle)
        const titleStyle = new PIXI.TextStyle({
            fontFamily: usedFont,
            // fontalign: titlePopupLayoutType === "scenario_event" ? "left" : "center",
            fontalign: "left",
            fontSize: 24,
            fill: "#555555",
            fontWeight: "bold",
            letterSpacing: 0,
        });

        const title = new PIXI.Text(eventTitle, titleStyle);
        // title.anchor.set(titlePopupLayoutType === "scenario_event" ? 0 : 0.5, titlePopupLayoutType === "scenario_event" ? 0 : 0.5);

        // 添加文字 (eventIndexName)
        const indexStyle = new PIXI.TextStyle({
            fontFamily: titlePopupLayoutType === "scenario_event" ? usedFont : usedFont,
            fontalign: "left",
            fontSize: titlePopupLayoutType === "scenario_event" ? 18 : titlePopupLayoutType == "produce_event" ? 18 : 18,
            // fontStyle: "oblique",
            padding: 3,
            fill: "#888888",
            letterSpacing: 0,
            // dropShadow: true,
            // dropShadowColor : "#888888",
            // dropShadowDistance : 2,
        });

        const indexName = new PIXI.Text(`${eventIndexName}`, indexStyle);
        // indexName.anchor.set(titlePopupLayoutType === "scenario_event" ? 0 : 0.5, titlePopupLayoutType === "scenario_event" ? 0 : 0.5);
        // indexName.scale.set( indexName.text.length > 6 ? 1 / (indexName.text.length / 6) : 1 , 1); // 根据文字长度调整缩放

        const titlePositionMap = {
            scenario_event: { x: icon.x + icon.width + 34, y: 54 },
            common: { x: icon.x + icon.width + 20, y: 48 },
            produce_event: { x: titlePopupBackground.x + titlePopupBackground.width / 2 - title.width / 2, y: icon.y + icon.height + 30 }, // 添加其他 titlePopupLayoutType 的映射
            specialEvents: {
                x: titlePopupBackground.x + 32 + indexName.width + 48, //32是indexname左边距 是indexname和title 基础边距
                y: 60,
            },
            default: { x: titlePopupBackground.x + titlePopupBackground.width / 2 - title.width / 2, y: icon.y + icon.height + 30 },
        };

        const titlePosition = titlePositionMap[titlePopupLayoutType] || titlePositionMap["default"];
        title.position.set(titlePosition.x, titlePosition.y);
        console.log(titlePosition);

        const positionMap_eventIndexName = {
            scenario_event: { x: title.position.x - 32, y: title.position.y - 30 },
            produce_event: picCardName
                ? { x: titlePopupBackground.x + titlePopupBackground.width / 2 - indexName.width / 2, y: icon.y + icon.height - indexName.height + 30 }
                : { x: icon.x + icon.width / 2 - indexName.width / 2, y: title.y },
            specialEvents: { x: 32, y: title.y + (title.height - indexName.height) / 2 },
            default: picCardName
                ? { x: titlePopupBackground.x + titlePopupBackground.width / 2 - indexName.width / 2, y: icon.y + icon.height - indexName.height + 30 }
                : { x: icon.x + icon.width / 2 - indexName.width / 2, y: title.y },
        };

        const position_eventIndexName = positionMap_eventIndexName[titlePopupLayoutType] || positionMap_eventIndexName["default"];
        indexName.position.set(position_eventIndexName.x, position_eventIndexName.y);

        if (!eventIndexName) {
            indexName.visible = false;
        }

        // 添加点线
        const dotline = new PIXI.Sprite(this._loader.resources["black_dots"].texture);
        dotline.width = titlePopupLayoutType === "scenario_event" ? 580 : 452; // 可根据需求调整宽度
        dotline.height = titlePopupLayoutType === "scenario_event" ? 140 : 128; // 可根据需求调整高度
        dotline.alpha = 0.6;
        dotline.mask = backgroundMask; // 设置 dotline 的遮罩为 backgroundMask

        const positionMap_dotline = {
            scenario_event: { x: icon.width + 20, y: title.position.y - 30 },
            produce_event: { x: 0, y: 110 },
            default: { x: 0, y: 110 },
        };

        const dotlinePosition = positionMap_dotline[titlePopupLayoutType] || positionMap_dotline["default"];
        dotline.position.set(dotlinePosition.x, dotlinePosition.y);
        if (titlePopupLayoutType === "common") {
            dotline.visible = false;
        }

        // 添加文字 (eventTitleTrans)
        const transStyle = new PIXI.TextStyle({
            fontFamily: zhcnFont2,
            fontSize: 18,
            fontalign: titlePopupLayoutType === "left",
            fill: "#666666", // 灰色文字
        });
        const titleTrans = new PIXI.Text(eventTitleTrans, transStyle);
        // titleTrans.anchor.set(titlePopupLayoutType === "scenario_event" ? 0 : 0.5, titlePopupLayoutType === "scenario_event" ? 0 : 0.5);
        const titleTransPositionMap = {
            scenario_event: { x: title.position.x, y: dotline.position.y + dotline.height / 2 + 12 },
            produce_event: { x: titlePopupBackground.x + titlePopupBackground.width / 2 - titleTrans.width / 2, y: title.y + title.height + 12 },
            default: { x: titlePopupBackground.x + titlePopupBackground.width / 2 - titleTrans.width / 2, y: title.y + title.height + 12 },
        };

        const titleTransPosition = titleTransPositionMap[titlePopupLayoutType] || titleTransPositionMap["default"];
        titleTrans.position.set(titleTransPosition.x, titleTransPosition.y);

        if (titlePopupLayoutType === "common") {
            titleTrans.visible = false;
        }

        // 添加文字 (eventAlbumName)见于specialEvents 和 game_event_communications(但有logo不需要显示 仅处理前者)

        let albumName = null;
        if (eventAlbumName !== "" && titlePopupLayoutType !== "scenario_event") {
            const albumNameStyle = new PIXI.TextStyle({
                fontFamily: usedFont,
                // fontalign: titlePopupLayoutType === "scenario_event" ? "left" : "center",
                fontalign: "left",
                fontSize: 18,
                fill: "#555555",
                fontWeight: "bold",
                letterSpacing: 0,
            });

            albumName = new PIXI.Text(eventAlbumName, albumNameStyle);
            const albumNamePositionMap = {
                specialEvents: { x: titlePopupBackground.x + titlePopupBackground.width / 2 - albumName.width / 2, y: 10 },
                default: { x: titlePopupBackground.x + titlePopupBackground.width / 2 - titleTrans.width / 2, y: title.y + title.height + 12 },
            };
            const albumNamePosition = albumNamePositionMap[titlePopupLayoutType] || albumNamePositionMap["default"];
            albumName.position.set(albumNamePosition.x, albumNamePosition.y);
        }

        this._container_titlePopup.addChild(titlePopupBackground);
        this._container_titlePopup.addChild(dotline);
        this._container_titlePopup.addChild(backgroundMask);
        this._container_titlePopup.addChild(icon);

        if (picCardName && !picCardName.mask) {
            picCardName.mask = backgroundMask;
        }

        if (picCardName) {
            // 将阴影添加到容器，并确保在 picCardName 下面
            if (picCardNameShadow) {
                this._container_titlePopup.addChild(picCardNameShadow);
            }
            this._container_titlePopup.addChild(picCardName);
        }

        this._container_titlePopup.addChild(indexName);
        if (albumName) this._container_titlePopup.addChild(albumName);
        this._container_titlePopup.addChild(title);
        this._container_titlePopup.addChild(titleTrans);

        this._container_titlePopup.x = global_XOffset - 400; //牌子位置
        this._container_titlePopup.y = global_YOffset - 400;
        this._container_titlePopup.scale.set(0.94, 0.94); //缩放

        if (!this._container.getChildAt(this._container_titlePopup)) {
            this._container.addChild(this._container_titlePopup);
        }

        // titlePopup移动动画
        this._container_titlePopup.alpha = 0;
        const timeline = new TimelineMax();

        // 确保 x 坐标在每帧更新时为整数 减轻动画撕裂感
        const roundXPosition = () => {
            if (this._container_titlePopup) {
                this._container_titlePopup.x = Math.round(this._container_titlePopup.x);
            }
        };

        // 在 0.5 秒时，瞬间将透明度从 0 变为 1 躲开载入掉帧
        timeline.to(this._container_titlePopup, 0, {
            alpha: 1, // 透明度从 0 立刻变为 1
            delay: 0.5, //
            ease: Power0.easeNone,
        });

        // 高速移动阶段（前 0.2 秒）
        timeline.to(this._container_titlePopup, 0.4, {
            x: 20, // 高速阶段的目标位置
            ease: Power0.easeNone,
            onUpdate: roundXPosition, // 每帧更新时将 x 坐标取整
        });

        // 低速移动阶段（后 2.2 秒）
        timeline.to(this._container_titlePopup, 1.2, { //改为1.2秒避免遮挡文字 比起还原原作演出时长优先可视效果
            x: 80, // 最终目标位置
            ease: Power4.easeOut,
            onUpdate: roundXPosition, // 每帧更新时将 x 坐标取整
        });

        // 淡出与右移动画（0.25秒内，起始于动画结束的地方）
        timeline.to(this._container_titlePopup, 0.25, {
            alpha: 0, // 透明度变为 0
            x: 200, // 向右移动
            ease: Quad.easeInOut,
            onUpdate: roundXPosition, // 每帧更新时将 x 坐标取整
            onComplete: () => {
                if (this._container_titlePopup) {
                    this._container.removeChild(this._container_titlePopup);
                    this._container_titlePopup.destroy({ children: true, texture: false, baseTexture: false });
                    this._container_titlePopup = null;
                }
            },
        });
    }
}
