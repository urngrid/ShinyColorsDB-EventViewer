class StillManager {
    constructor() {
        this._container = new PIXI.Container();
        this._stMap = new Map();
        this._loader = PIXI.Loader.shared;

        //修改标记
        this._textMap = new Map(); // 新增一个 Map 来存储文本对象
        //添加静态翻译用语言标识
        this._languageType = 0; // 0:jp 1:zh 2:jp+zh
    }

    get stageObj() {
        return this._container;
    }

    reset(clear = true) {
        this._container.removeChildren(0, this._container.children.length);
        if (clear) {
            this._stMap.clear();
            //修改标记
            this._textMap.clear(); // 同步清除文本对象
        }


    }

    processStillByInput(still, stillType, stillId, stillCtrl, isFastForward, still_trans) {
        if (stillType && stillId) {
            this._changeStillByType(stillType, stillId);
        }

        if (still) {
            this._changeStill(still);
        }

        if (stillCtrl) {
            this._control(stillCtrl);
        }
        //修改标记 处理翻译
        if (still_trans) {
            this._processStillTranslate(stillId, still_trans);
            console.log(`still trans:${still_trans}`);
        }
    }

    _changeStill(stillName) {
        if (!stillName) { return; }
        if (stillName == "off") {
            this._control(stillName);
            return;
        }

        this._removeStill();

        if (!this._stMap.has(stillName)) {
            this._stMap.set(stillName, new PIXI.Sprite(this._loader.resources[`still${stillName}`].texture));
        }

        const thisStill = this._stMap.get(stillName);

 
        //修改标记
        this._resizeAndMoveStill();

        this._container.addChild(thisStill);
    }

    _changeStillByType(stillType, stillId) {
        if (!stillType || !stillId) { return; }

        this._removeStill();

        if (!this._stMap.has(`${stillType}${stillId}`)) {
            this._stMap.set(`${stillType}${stillId}`, new PIXI.Sprite(this._loader.resources[`still${stillType}${stillId}`].texture));
        }

        const thisStill = this._stMap.get(`${stillType}${stillId}`);


        //修改标记
        this._resizeAndMoveStill();


        this._container.addChild(thisStill);
    }

    _control(stillCtrl) {
        if (!stillCtrl) { return; }

        switch (stillCtrl) {
            case "off":
                this._removeStill();
                break;
            case "on":
                break;
        }
    }

    _removeStill() {
        if (this._container.children.length) {

            // this._container.removeChildAt(0);

            // 修改标记 移除翻译文本对象
            // 使用 removeChildren 一次性移除所有子对象
            this._container.removeChildren(0, this._container.children.length);

        }

    }

    //修改标记
    //背景下移并缩放 

    _resizeAndMoveStill(){

        const XOffset = global_XOffset;
        const YOffset = global_YOffset + global_YOffset_MainContents;

        const XZoomRate = 1;
        const YZoomRate = 1;

        this._container.position.set(XOffset,YOffset);
        this._container.scale.set(XZoomRate,YZoomRate);
    
    
    }
    //翻译文本处理
    _processStillTranslate(stillId, still_trans) {

        //1136的中点
        const TEXT_X_OFFSET = 568 , TEXT_Y_OFFSET = global_YOffset  + global_YOffset_MainContents + 380;
    
        // 创建文本样式
        const textStyle = new PIXI.TextStyle({
            align: "center",
            fontFamily: zhcnFont,
            fontSize: 32,
            fill: 0xffffff,
            padding: 3,
            letterSpacing: 1,
        });
    
        // 创建文本对象
        const text = new PIXI.Text(still_trans, textStyle);
        // 设置锚点到中心
        text.anchor.set(0.5); // 水平和垂直居中
        text.position.set(TEXT_X_OFFSET, TEXT_Y_OFFSET); // 设置文本的位置
    
        // 如果之前已经存在该文本对象，先移除
        if (this._textMap.has(stillId)) {
            const oldText = this._textMap.get(stillId);
            if (this._container.children.includes(oldText)) {
                this._container.removeChild(oldText);
            }
        }
    
        // 保存新的文本对象到 _textMap
        this._textMap.set(stillId, text);
    
        // 将新的文本对象添加到容器中
        this._container.addChild(text);
    }
    
    ////
    toggleLanguage(type) {
        this._languageType = type;
    
        this._textMap.forEach((textObj) => {
            if (this._languageType === 1 || this._languageType === 2) {
                // 显示中文翻译文本
                textObj.visible = true;
            } else {
                // 隐藏文本
                textObj.visible = false;
            }
        });
    }


}
