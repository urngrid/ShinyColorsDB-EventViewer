class FgManager {
    constructor() {

        this._container = new PIXI.Container();
        this._fgMap = new Map();
        this._loader = PIXI.Loader.shared;
        this._currentFg = null;

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
        }
        else if (fg == "off") {
            if (this._container.children.length) {


                this._container.removeChildren(0, this._container.children.length);

            }
        }
        else if (isFastForward) {
            this._changeFg(fg, 0, 1);
        }
        else if (fg == "fade_out") {
            this._fadeOutFg();
        }
        else if (fg && fgEffect) {
            if (isFastForward) {
                this._changeFg(fg, 0, 1);
            }
            else {
                this._changeFgByEffect(fg, fgEffect, fgEffectTime);
            }
        }
        else if (fg && !fgEffect) {
            this._changeFg(fg, 0, 1);
        }

    }

    _changeFg(fgName, order, alphaValue) {
        if (!this._fgMap.has(fgName)) {
            this._fgMap.set(fgName, new PIXI.Sprite(this._loader.resources[`fg${fgName}`].texture));

            //修改标记
            this._adjustFg(fgName);
            ////
        }
        this._currentFg = this._fgMap.get(fgName);
        this._currentFg.alpha = alphaValue;



        if (this._container.children.length != 0 && order == 0) {
            this._container.removeChildAt(order);
        }


        this._container.addChildAt(this._fgMap.get(fgName), order > this._container.children.length ? this._container.children.length : order);




    }

    _changeFgByEffect(fgName, fgEffect, fgEffectTime) {

        
        switch (fgEffect) {
            case "fade":
            case "switch_fade":
                this._changeFg(fgName, 1, 0);
                let newOrder = this._container.children.length == 1 ? 0 : 1;
                
                let origFg = this._container.getChildAt(0), newFg = this._container.getChildAt(newOrder);
                let k = setInterval(() => {
                    if (newOrder) {
                        origFg.alpha -= 0.01;
                    }
                    newFg.alpha += 0.01;
                }, 10);
                setTimeout(() => {
                    clearInterval(k);
                    if (newOrder) {
                        origFg.alpha = 0;
                    }
                    newFg.alpha = 1;

                    //修改标记
                    if(origFg !== newFg){
                        this._container.removeChildAt(0);
                    }
                    ///

                }, fgEffectTime ? fgEffectTime : 1000);



                // this._container.removeChildAt(0);
                //修改标记 旧背景的移除应当在timeout内部

                /////

                break;
            case "mask":

                //todo:实际并没有mask字段的fgEffect, 除了fade之外另外还需要处理的是
                // fade_out(目前全剧本只有4处 且fg都处于关闭状态下被调用 没发现可见效果 似乎可以无视)和
                // switch_fade(解决 fade的代码本身就是对应的switchfade 但有bug已修正) 
                // 见jschunk\app-e068da2c7784d39c21c6.js line:10540
                break;

            
        }
    }


    _fadeOutFg() {
        Utilities.fadingEffect(this._currentFg, { alpha: 0, time: 1000, type: 'to' });
    }


    //修改标记
    //背景下移并缩放 添加代码 根据fg图片名字指定Y缩放比例//
    //

    _adjustFg(fgName){

        const fgNameToYZoomRateMap = {
            "001922": 0.75,      // 灰色回忆
            "001923": 0.75,      // 土色回忆
            "002341": 0.75,     // 电影风宽屏化黑边
            "004521": 0.75,      // 白色回忆
            "000481": 1,        // 中巴椅背
            "002681": 0.833,    // 电视直播
            "002921": 0.75,     // 老电影
            "003861": 0.95,    // Zoom聊天
            "007631": 0.75,     // 花边边框

        };

        const fgNameToYOffsetMap = {
            "001922": 0,
            "001923": 0,
            "004521": 0,
            "002341": 0,
            "000481": 0,
            "002681": 2,
            "003861": -69,
      
        };

        const fgNamesToBeCovered = ["002681","000481","003861"]; // 需要绘制下方遮挡块的组


        const YZoomRate = fgNameToYZoomRateMap[fgName] || 0.75;
        const YOffset = fgNameToYOffsetMap[fgName] ? fgNameToYOffsetMap[fgName] + 320 : 320;
        const XOffset = 142;
        const XZoomRate = 0.75;
        const currentX = this._fgMap.get(fgName).position.x;
        const currentY = this._fgMap.get(fgName).position.y;
        const fgSprite = this._fgMap.get(fgName);

        fgSprite.position.set(currentX + XOffset, currentY + YOffset);
        // 获取原始宽度和高度
        const bounds = fgSprite.getBounds();
        const originalWidth = bounds.width;
        const originalHeight = bounds.height;
        const rectHeight = (1280 - YOffset) / YZoomRate - originalHeight;
        // 设置位置和缩放比例
        fgSprite.scale.set(XZoomRate, YZoomRate);


        if (fgNamesToBeCovered.includes(fgName)) {
            const rect = new PIXI.Graphics();
            rect.beginFill(0x000000, 1);

            // console.log(this._container.height, fgSprite.height, rectHeight)

            // console.log(`Drawing rect: x=${0}, y=${originalHeight}, width=${originalWidth}, height=${rectHeight}`);

            rect.drawRect(0, originalHeight, originalWidth, rectHeight);
            rect.endFill();
            fgSprite.addChild(rect);
        }

        const fgNamesToBeCut = ["001921","001923","004521",]; //一些fg最下方会有黑边 需要裁掉一像素和滤镜效果连接 避免黑线穿过角色



        if(fgNamesToBeCut.includes(fgName)){
            const mask = new PIXI.Graphics();
            mask.beginFill(0x000000); // 填充颜色是黑色的（遮罩本身不会显示）
            mask.drawRect(fgSprite.position.x, fgSprite.position.y, fgSprite.width, fgSprite.height - 1);  // 高度减去 1 像素
            mask.endFill();
    
            // 将遮罩应用到 sprite 上
            fgSprite.mask = mask;
            this._container.addChild(mask);
        } 


       
    }
    ////
    
    ////
    // 完成 对外开放的方法 向上级(trackmanager)返回当前fg的人物覆盖色和当前fg的矩形范围绝对坐标
    // 完成 in spinemanager 对trackmanager开放的方法 用上面的方法的返回值由trackmanager传给spinemanager 为所有spine角色添加filter 当角色像素落在fg矩形范围外时用filter添加含透明度的颜色覆盖
    ////

    getFgOverlayData(fgName) {
        // 🔹 预设 FG 颜色遮罩信息 (RGB + Alpha)
        const fgColorMap = {
            "001921": { r: 178, g: 132, b: 96, a: 0.83 },  // 土色回忆(渐变)
            "001922": { r: 156, g: 89, b: 40, a: 0.45 },  // 土色回忆
            "001923": { r: 138, g: 138, b: 138, a: 0.72 },   // 灰色回忆
            "004521": { r: 248, g: 248, b: 248, a: 0.74 }, // 白色回忆
            "002921": { r: 100, g: 80, b: 90, a: 0.6 },   // 老电影

        };

           
        // 🔹 仅处理 `fgColorMap` 里存在的 FG
        if (!(fgName in fgColorMap)) {
            return null;
        }
    
        // 🔹 获取前景 FG 的 Sprite
        const fgSprite = this._fgMap.get(fgName);
        if (!fgSprite) {
            
            return null;
        }
    
        // 🔹 获取 FG 在屏幕上的绝对坐标
        const bounds = fgSprite.getBounds();
    
        // 🔹 返回 FG 颜色 & 绝对坐标范围
        return {
            overlayColor: fgColorMap[fgName], // 直接取字典数据
            bounds: {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height
            }
        };
    }
        
       
    

}
