class SelectManager {
    constructor() {
        this._container = new PIXI.Container();
        this._loader = PIXI.Loader.shared;
        this._stMap = new Map();
        this._neededFrame = 1;
        //translate
        this._languageType = 0; // 0:jp 1:zh 2:jp+zh

        //修改标记
        //下移并缩放 添加代码//
        const YOffset=320
        const XOffset=142
        const XZoomRate=0.75
        const YZoomRate=0.75
        this._container.position.set(XOffset,YOffset);
        this._container.scale.set(XZoomRate,YZoomRate);


        this._maskSprite = null;
        ////

    }

    get stageObj() {
        return this._container;
    }

    get neededFrame() {
        return this._neededFrame;
    }

    reset(clear = true) {
        this._container.removeChildren(0, this._container.children.length);
        this._neededFrame = 1;
        if (clear) {
            this._stMap.clear();
        }
    }

    processSelectByInput(selectDesc, nextLabel, onClick, afterSelection, translated_text, isFastForward) {

        if (!selectDesc) { return; }

        ////修改标记 暗转
        if (!this._maskSprite) {
            
            // 创建一个新的 PIXI 图形对象
            this._maskSprite = new PIXI.Graphics();
        
            // 获取容器的尺寸
        
            // 用半透明的黑色填充尺寸相同的矩形
            this._maskSprite.beginFill(0x000000, 0.5); // 黑色，50% 透明度
            this._maskSprite.drawRect(0, 0, 1136, 1280);
            this._maskSprite.endFill();

            // 添加到容器中
            this._container.addChild(this._maskSprite);
            this._maskSprite.alpha = 0;
            //淡入
            TweenMax.to(this._maskSprite, 0.2, { pixi: { alpha: 1 }});
        }
        
        /////

        if (!this._stMap.has(`selectFrame${this.neededFrame}`)) {
            let thisSelectContainer = new PIXI.Container();
            thisSelectContainer.addChild(new PIXI.Sprite(this._loader.resources[`selectFrame${this.neededFrame}`].texture));
            let currentText = { jp: '', zh: '' };
            this._stMap.set(`selectFrame${this.neededFrame}`, { thisSelectContainer: thisSelectContainer, currentText: currentText });
        }

        let { thisSelectContainer, currentText } = this._stMap.get(`selectFrame${this.neededFrame}`);
        thisSelectContainer.interactive = true;
        const localBound = thisSelectContainer.getLocalBounds();
        thisSelectContainer.pivot.set(localBound.width / 2, localBound.height / 2);

        // thisSelectContainer.on('click', () => { 只响应鼠标点击 移动端无效
        thisSelectContainer.on('pointerdown', () => {
            this._disableInteractive();

            //修改标记 屏幕暗转层淡出
            TweenMax.to(this._maskSprite, 0.5, { pixi: { alpha: 0 }});
            //
            TweenMax.to(thisSelectContainer, 0.1, { pixi: { scaleX: 1.2, scaleY: 1.2 } });

            setTimeout(() => {
                onClick(nextLabel);
                afterSelection();

                this._fadeOutOption();

                ////修改标记
                // 屏幕暗转层从容器中移除
                if (this._maskSprite && this._container) {
                    this._container.removeChild(this._maskSprite);
                }
        
                // 销毁对象以释放内存
                if (this._maskSprite) {
                    this._maskSprite.destroy({ children: true, texture: true, baseTexture: true });
                }
        
                // 重置引用
                this._maskSprite = null;
                /////

            }, 800);

        }, { once: true });

        if (translated_text) {
            currentText.jp = selectDesc;
            currentText.zh = translated_text;
            selectDesc = this._languageType === 1 ? translated_text : selectDesc;
        }

        let family = translated_text && this._languageType === 1 ? zhcnFont : usedFont;
        let textObj = new PIXI.Text(selectDesc, {
            fontFamily: family,
            fontSize: this._languageType === 1 ? 40 : 24,
            fill: 0x555555,
            align: 'center',
            padding: 3
        });
        thisSelectContainer.addChild(textObj);

        //
        textObj.visible = this._languageType == 2 ? false : true;


        //修改标记 选项双语化 目前没有考虑超过两行的文本
        let isSingleLine;
        if (currentText.zh.includes("\n") || currentText.jp.includes("\n")) {
            isSingleLine = false;
        } else {
            isSingleLine = true;
        }
        const selectDescZhJp = this._formatBilingualText(currentText.zh,currentText.jp)
        const selectDescZhJp_styles = {
            default: {
                wordWrap: true, //TaggedText的默认值是true 和Pixi.text不同
                wordWrapWidth:1,
                fontFamily: usedFont,
                align: "center",
                fontSize: 28,
                fill: 0x555555,
                fontWeight: "normal",
                letterSpacing: 1,
                breakLines: false,
                lineHeight: 1.2,
            },
            chinese: {
                
                fontFamily: zhcnFont2,
                fontSize: isSingleLine ? 28 : 27,
                fill: 0x555555,
                fontWeight: "normal",
                letterSpacing: isSingleLine ? 2 : 1,

            },
            japanese: {
                fontFamily: usedFont,
                fontSize: isSingleLine ? 20 : 17,
                fill: 0x888888,
                // fontStyle: "italic",
                fontWeight: "normal",
                letterSpacing: 0,

            }

        };
        let textObjZhJp = new TaggedText(selectDescZhJp,selectDescZhJp_styles);

        
        textObjZhJp.scale.set(1, isSingleLine ? 1 : 0.95);
        // textObjZhJp.width = 318;
        // textObjZhJp.height = 172;
        // taggedtext举动不甚正常 不能将wordWrap设为false wordWrapWidth:1会影响宽度 坐标位置不能统一 只能看着调
        textObjZhJp.anchor.set(0.5);

        textObjZhJp.position.set(159, isSingleLine ? 40 : 4);//根据单行还是两行确定y坐标
        textObjZhJp.visible = this._languageType == 2 ? true : false;
        thisSelectContainer.addChild(textObjZhJp);
    
        ///


        this._container.addChild(thisSelectContainer);

        // for selectFrame size is 318x172
        textObj.anchor.set(0.5);
        textObj.position.set(159, 86);

        switch (this.neededFrame) {
            case 1:
                thisSelectContainer.position.set(568, 125);
                break;
            case 2:
                thisSelectContainer.position.set(200, 240);
                break;
            case 3:
                thisSelectContainer.position.set(936, 240);
                break;
        }

        const tl = new TimelineMax({ repeat: -1, yoyo: true, repeatDelay: 0 });
        const yLocation = thisSelectContainer.y;
        tl.to(thisSelectContainer, 1, { pixi: { y: yLocation - 10 }, ease: Power1.easeInOut });
        tl.to(thisSelectContainer, 1, { pixi: { y: yLocation }, ease: Power1.easeInOut });
        this.frameForward();
    }

    frameForward() {
        this._neededFrame++;
    }

    frameReset() {
        this._neededFrame = 1;
    }

    toggleLanguage(type) {
        this._languageType = type;
        this._stMap.forEach((value, key) => {
            let { thisSelectContainer, currentText } = value;
            let textObj = thisSelectContainer.getChildAt(1);
            //
            let textObjZhJp = thisSelectContainer.getChildAt(2);

            if (this._languageType === 0) {
                textObj.style.fontFamily = usedFont;
                textObj.text = currentText.jp;
                textObj.style.fontSize = 24; 
                textObjZhJp.visible = false;
                textObj.visible = true;
            }
            else if (this._languageType === 1) {
                textObj.style.fontFamily = zhcnFont2;
                textObj.text = currentText.zh;
                textObj.style.fontSize = 28; 
                textObjZhJp.visible = false;
                textObj.visible = true;
            } 
            else if (this._languageType === 2) {
                textObjZhJp.visible = true;
                textObj.visible = false;
            }
            console.log(textObj.fontSize)
        });
    }

    _disableInteractive() {
        this._stMap.forEach(st => {
            st.interactive = false;
        });
    }

    _fadeOutOption() {
        this._stMap.forEach(st => {
            TweenMax.to(st, 1, { alpha: 0, ease: Power3.easeOut });
        });
        setTimeout(() => {
            this._container.removeChildren(0, this._container.children.length);
        }, 500);
    }

    //多语显示用格式化函数
    _formatBilingualText(chineseText, japaneseText) {
        // 将文本按行分割

        chineseText == "" ? " " : chineseText;
        const chineseLines = chineseText.split("\r\n");
        const japaneseLines = japaneseText.split("\r\n");
        
        //给空行添加一个空格 因为没有字符的空行行高会小一丢丢 如果第3行为空第4行非空 等第3行有字符后第4行的高度会小位移
        for (let i = 0; i < chineseLines.length; i++) {
            if (chineseLines[i] === "") {
                chineseLines[i] = "　";
            }
        }
        
        for (let i = 0; i < japaneseLines.length; i++) {
            if (japaneseLines[i] === "") {
                japaneseLines[i] = "　";
            }
        }


        // 获取最大行数
        const maxLines = Math.max(chineseLines.length, japaneseLines.length);
    
        // 填充空行使两种语言的行数相等
        while (chineseLines.length < maxLines) {
            chineseLines.push(""); // 插入空行
        }
        while (japaneseLines.length < maxLines) {
            japaneseLines.push(""); // 插入空行
        }
    
        // 合并中日文本行，不交替排列
        let formattedText = "";
        for (let i = 0; i < maxLines; i++) {

            formattedText += `<japanese>${japaneseLines[i]}</japanese>\n`;
        }
        for (let i = 0; i < maxLines; i++) {

            formattedText += `<chinese>${chineseLines[i]}</chinese>\n`;
        }
        
        
        return formattedText.trimEnd();;
    }
}
