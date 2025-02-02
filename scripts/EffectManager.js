class EffectManager {
    constructor() {
        this._container = new PIXI.Container();
        this._effectMap = new Map();
        this._loader = PIXI.Loader.shared;
        this._container_plate = new PIXI.Container;
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


    processEffectByInput(effectLabel, effectTarget, effectValue, isFastForward ) {




        if (!effectLabel) { return; }

        //修改标记 缩放下移  闪白或闪黑时范围为全屏
        let YOffset,XOffset,XZoomRate,YZoomRate;
        if (effectLabel.includes("white") || effectLabel.includes("black")) {
            YOffset=0
            XOffset=0
            XZoomRate=1
            YZoomRate=3 
        } else {
            YOffset=320
            XOffset=142
            XZoomRate=0.75
            YZoomRate=2 
              
        }
        // 修改标记完


        if (!this._effectMap.has(effectLabel)) {
            let thisEffect = null;
            switch (effectTarget.type) {
                case "rect":
                    thisEffect = new PIXI.Graphics();
                    thisEffect.beginFill(`0x${effectTarget.color}`);
                    thisEffect.drawRect(0, 0, effectTarget.width, effectTarget.height);

                    thisEffect.endFill();
                    break;

            }
            this._effectMap.set(effectLabel, thisEffect);
        }

        let thisEffect = this._effectMap.get(effectLabel);


        //修改标记 缩放下移
        
        thisEffect.position.set(XOffset,YOffset);
        thisEffect.scale.set(XZoomRate,YZoomRate);

        ////
        this._container.addChild(thisEffect);
        //修改标记 确保plate在最上层
        if (this._container_plate) {
            this._container.setChildIndex(this._container_plate, this._container.children.length - 1);
        }
        //

        Utilities.fadingEffect(thisEffect, effectValue);
    }

    //增加剧情牌子功能
    async showEventPlate(eventTitle, eventTitleTrans, eventType, eventIcon, cardNamePic , eventIndexName) {

        // 参数检查与默认值设置
        if (!eventTitle) {
            eventTitle = '默认标题';
        }
        if (!eventTitleTrans) {
            eventTitleTrans = '默认翻译';
        }
        if (!eventType) {
            eventType = 'default';
        }
        if (!eventIndexName) {
            eventIndexName = '';
        }
        if (!this._loader.resources["pop_white"] && this._loader.resources["black_dots"] && !this._loader.resources[eventIcon] && !this._loader.resources[cardNamePic]) {
            console.error('资源未找到');
            return;
        }

        // 设置背景图案
        const texture = this._loader.resources["pop_white"].texture;

        // 创建九宫格平面（九宫格边距需根据实际纹理内容调整）
        const plateBackground = new PIXI.NineSlicePlane(
            texture,
            20, // 左边距
            20, // 上边距
            20, // 右边距
            20  // 下边距
        );

        const validScenarioEventTypes = ["wing", "fan_meeting", "3rd_produce_area", "4th_produce_area", "5th_produce_area"];

        let plateLayoutType ;
        if(eventType === "produce_marathon"){
            plateLayoutType = "scenario_event";
        } else if(eventType === "common"){
            plateLayoutType = "common"; // morning commu
        } else if(validScenarioEventTypes.includes(eventType)){
            plateLayoutType = "produce_event"; // produce event
        } else {
            plateLayoutType = "default"; // default
        }


        // 设置背景的宽高，根据事件类型动态调整
        const backgroundSizeMap = {
            "scenario_event": { width: 568, height: 160 },
            "common": { width: 300, height: 128 },
            "produce_event": { width: 390, height: 220 },
            "default": { width: 390, height: 220 }
        };
        
        const backgroundSize = backgroundSizeMap[plateLayoutType] || backgroundSizeMap["default"];
        plateBackground.width = backgroundSize.width;
        plateBackground.height = backgroundSize.height;

        // 设置背景位置
        plateBackground.position.set(0, 0); // 左上角

        // 创建一个与 plateBackground 区域大小类似的 Graphics 作为遮罩
        const backgroundMask = new PIXI.Graphics();
        backgroundMask.beginFill(0xFFFFFF); // 使用任意颜色，遮罩只关注形状，不涉及颜色
        backgroundMask.drawRect(
            plateBackground.x + 10, // 遮罩的 x 坐标
            plateBackground.y + 10, // 遮罩的 y 坐标
            plateBackground.width - 20, // 遮罩的宽度
            plateBackground.height - 20 // 遮罩的高度
        );
        backgroundMask.endFill();

        // 根据文字长度调整背景长 15是初始最大字数 24是字号


        const titlelength = Math.max(eventTitle.length,eventTitleTrans.length);

        if (titlelength > 15 || (plateLayoutType === "scenario_event" && titlelength > 12)) {
            const extraLength = titlelength - (plateLayoutType === "scenario_event" ? 12 : 15);
            plateBackground.width += extraLength * 24;
            backgroundMask.width += extraLength * 24;
            console.log(`plateBackground.width: ${plateBackground.width}`);
        }
        

        // 添加图标
        // const icon = new PIXI.Sprite(this._loader.resources[eventIcon].texture);
        const icon = new PIXI.Sprite(this._loader.resources[eventIcon].texture);
        icon.width = eventType == "produce_marathon" ? 201 : 96;  // 图标的宽度
        icon.height = eventType == "produce_marathon" ? 108 : 96;  // 图标的高度
        icon.position.set(12, 12); // 图标在背景上的位置
        
        // 添加卡名图    
        let picCardName;
        let picCardNameShadow;
        const scaleRatio_ProduceScenario = 0.9;
        const scaleRatio_Normal = 0.6;


        if (this._loader.resources[cardNamePic]){
            picCardName = new PIXI.Sprite(this._loader.resources[cardNamePic].texture);
            
            picCardName.anchor.set(0.5,0);
            
            if (validScenarioEventTypes.includes(eventType)) {
                // 卡名图是育成剧本按钮图
                // 添加圆角矩形蒙版
                picCardName.position.set( ( plateBackground.width - icon.width ) /2 + plateBackground.x + icon.width + 12/2, icon.y - 28 );
                picCardName.scale.set(scaleRatio_ProduceScenario, scaleRatio_ProduceScenario);

                const mask = new PIXI.Graphics();
                mask.beginFill(0xFF0000);
                mask.drawRoundedRect(0, 0, 284, 88, 10);
                mask.endFill();
                mask.position.set(
                    picCardName.x - picCardName.width / 2 + 10 * picCardName.scale.x,
                    picCardName.y + 42 * picCardName.scale.y
                );
                mask.scale.set(scaleRatio_ProduceScenario, scaleRatio_ProduceScenario);
                picCardName.mask = mask;

                this._container_plate.addChild(mask);

                const shadowOffsetX = 3; // 阴影 X 偏移
                const shadowOffsetY = 3; // 阴影 Y 偏移
                const shadowAlpha = 0.2; // 阴影透明度

                // 创建一个 Graphics 对象作为阴影
                picCardNameShadow = new PIXI.Graphics();
                picCardNameShadow.beginFill(0x000000, shadowAlpha); // 黑色阴影
                picCardNameShadow.drawRoundedRect(0, 0, mask.width, mask.height, 10); // 与 mask 的尺寸一致
                picCardNameShadow.endFill();

                // 设置阴影位置（偏移）
                picCardNameShadow.position.set(
                    mask.x + shadowOffsetX,
                    mask.y + shadowOffsetY
                );

            } else {
                // 正常卡名图
                picCardName.scale.set(scaleRatio_Normal,scaleRatio_Normal);
                picCardName.position.set(plateBackground.x + 12 + icon.width + (plateBackground.width - icon.width -12)/2 - 20 , 0);              

            }
            
        }



        // 添加文字 (eventTitle)
        const titleStyle = new PIXI.TextStyle({
            fontFamily: usedFont,
            // fontalign: plateLayoutType === "scenario_event" ? "left" : "center",
            fontalign: "left",
            fontSize: 24,
            fill: "#555555", 
            fontWeight: "bold",
            letterSpacing: 0,
        });

        const title = new PIXI.Text(eventTitle, titleStyle);
        // title.anchor.set(plateLayoutType === "scenario_event" ? 0 : 0.5, plateLayoutType === "scenario_event" ? 0 : 0.5);
        const titlePositionMap = {
            "scenario_event": { x: icon.x + icon.width + 34, y: 54 },
            "common": { x: icon.x + icon.width + 20, y: 48 },
            "produce_event": { x: plateBackground.x + plateBackground.width/2 - title.width/2  , y: icon.y + icon.height + 30 },
            // 添加其他 plateLayoutType 的映射
            "default": { x: plateBackground.x + plateBackground.width/2 - title.width/2  , y: icon.y + icon.height + 30 }
        };
        
        const titlePosition = titlePositionMap[plateLayoutType] || titlePositionMap["default"];
        title.position.set(titlePosition.x, titlePosition.y);

        // 添加文字 (eventIndexName)
        const indexStyle = new PIXI.TextStyle({
            fontFamily: plateLayoutType === "scenario_event" ? usedFont : usedFont,
            fontalign: "left" ,
            fontSize: plateLayoutType === "scenario_event" ? 18 : plateLayoutType == "produce_event" ? 18 : 18,
            // fontStyle: "oblique",
            padding: 3,
            fill: "#888888", 
            letterSpacing: 0,
            // dropShadow: true,
            // dropShadowColor : "#888888",
            // dropShadowDistance : 2,
        });
        const indexName = new PIXI.Text(`${eventIndexName}`, indexStyle);
        // indexName.anchor.set(plateLayoutType === "scenario_event" ? 0 : 0.5, plateLayoutType === "scenario_event" ? 0 : 0.5);

        // indexName.scale.set( indexName.text.length > 6 ? 1 / (indexName.text.length / 6) : 1 , 1); // 根据文字长度调整缩放
        const positionMap_eventIndexName = {
            "scenario_event": { x: title.position.x - 32, y: title.position.y - 30 },
            "produce_event": picCardName 
            ? 
                { x: plateBackground.x + plateBackground.width/2 - indexName.width/2 , y: icon.y + icon.height - indexName.height + 30 } 
            :
                { x: icon.x + icon.width / 2 - indexName.width / 2, y: title.y } ,
            "default": picCardName 
            ? 
                { x: plateBackground.x + plateBackground.width/2 - indexName.width/2 , y: icon.y + icon.height - indexName.height + 30 } 
            :
                { x: icon.x + icon.width / 2 - indexName.width / 2, y: title.y } ,
        };
        
        const position = positionMap_eventIndexName[plateLayoutType] || positionMap_eventIndexName["default"];
        indexName.position.set(position.x, position.y);        


        if(!eventIndexName){
            indexName.visible = false;
        }

        // 添加点线
        const dotline = new PIXI.Sprite(this._loader.resources["black_dots"].texture);
        dotline.width = plateLayoutType === "scenario_event" ? 580 : 452;  // 可根据需求调整宽度
        dotline.height =  plateLayoutType === "scenario_event" ? 140 : 128; // 可根据需求调整高度
        dotline.alpha = 0.6;
        dotline.mask = backgroundMask;        // 设置 dotline 的遮罩为 backgroundMask
        
        const positionMap_dotline = {
            "scenario_event": { x: icon.width + 20, y: title.position.y - 30 },
            "produce_event": { x: 0, y: 110 },
            "default": { x: 0, y: 110 }
        };
        
        const dotlinePosition = positionMap_dotline[plateLayoutType] || positionMap_dotline["default"];
        dotline.position.set(dotlinePosition.x, dotlinePosition.y);        if (plateLayoutType === "common"){dotline.visible = false;}

        // 添加文字 (eventTitleTrans)
        const transStyle = new PIXI.TextStyle({
            fontFamily: zhcnFont2,
            fontSize: 18,
            fontalign: plateLayoutType ==="left",
            fill: "#666666", // 灰色文字
        });
        const titleTrans = new PIXI.Text(eventTitleTrans, transStyle);
        // titleTrans.anchor.set(plateLayoutType === "scenario_event" ? 0 : 0.5, plateLayoutType === "scenario_event" ? 0 : 0.5);
        const titleTransPositionMap = {
            "scenario_event": { x: title.position.x, y: dotline.position.y + dotline.height / 2 + 12 },
            "produce_event": { x: plateBackground.x + plateBackground.width/2 - titleTrans.width/2  , y: title.y + title.height + 12 },
            "default": { x: plateBackground.x + plateBackground.width/2 - titleTrans.width/2 , y: title.y + title.height + 12 }
        };
        
        const titleTransPosition = titleTransPositionMap[plateLayoutType] || titleTransPositionMap["default"];
        titleTrans.position.set(titleTransPosition.x, titleTransPosition.y);

        if (plateLayoutType === "common"){titleTrans.visible = false;}


        this._container_plate.addChild(plateBackground);
        this._container_plate.addChild(dotline);
        this._container_plate.addChild(backgroundMask);
        this._container_plate.addChild(icon);

        if(picCardName && !picCardName.mask){picCardName.mask = backgroundMask;}

        if (picCardName){
            // 将阴影添加到容器，并确保在 picCardName 下面
            if(picCardNameShadow){
                this._container_plate.addChild(picCardNameShadow);
            }
            this._container_plate.addChild(picCardName);    
        }

        this._container_plate.addChild(indexName);
        this._container_plate.addChild(title);
        this._container_plate.addChild(titleTrans);   

        this._container_plate.x = -400;
        this._container_plate.y = 340;
        this._container_plate.scale.set(0.75,0.75);


        if(!this._container.getChildAt(this._container_plate)){
            this._container.addChild(this._container_plate);
            
        }


        // plate移动动画
        this._container_plate.alpha = 0;
        const timeline = new TimelineMax();

        // 确保 x 坐标在每帧更新时为整数 减轻动画撕裂感
        const roundXPosition = () => {
            if (this._container_plate) {
                this._container_plate.x = Math.round(this._container_plate.x);
            }
        };

        // 在 0.5 秒时，瞬间将透明度从 0 变为 1 躲开载入掉帧
        timeline.to(this._container_plate, 0, {
            alpha: 1,   // 透明度从 0 立刻变为 1
            delay: 0.5, // 
            ease: Power0.easeNone,
        });

        // 高速移动阶段（前 0.2 秒）
        timeline.to(this._container_plate, 0.4, {
            x: 120, // 高速阶段的目标位置
            ease: Power0.easeNone,
            onUpdate: roundXPosition, // 每帧更新时将 x 坐标取整
        });

        // 低速移动阶段（后 2.2 秒）
        timeline.to(this._container_plate, 2.2, {
            x: 180, // 最终目标位置
            ease: Power4.easeOut,
            onUpdate: roundXPosition, // 每帧更新时将 x 坐标取整
        });

        // 淡出与右移动画（0.25秒内，起始于动画结束的地方）
        timeline.to(this._container_plate, 0.25, {
            alpha: 0,   // 透明度变为 0
            x: 300,     // 向右移动
            ease: Quad.easeInOut,
            onUpdate: roundXPosition, // 每帧更新时将 x 坐标取整
            onComplete: () => {
                if (this._container_plate) {
                    this._container.removeChild(this._container_plate);
                    this._container_plate.destroy({ children: true, texture: false, baseTexture: false });
                    this._container_plate = null;
                }
            }
        });
    }
 
}
