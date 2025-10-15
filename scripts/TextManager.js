class TextManager {
    constructor() {
        this._container = new PIXI.Container();
        this._loader = PIXI.Loader.shared;
        this._txtFrameMap = new Map();
        this._thisWaitTime = 0;
        this._typingEffect = null;
        //translate
        this._languageType = 0; // 0:jp 1:zh 2:jp+zh
        this._currentText = { jp: "", zh: "" };

        //修改标记
        this._currentSpeaker = { jp: "", zh: "" };
        this.textObj = null;
        this.speakerObj = null; // 用于存储 PIXI.Text 对象
        this.textZhJpObj = null; //this._languageType == 2
        this.speakerZhJpObj = null;
        this._typingEffect_ZhJp = null;
        this._fontSizeJp = 36;
        this._fontSizeZh = 39;
        this._fontSizeJp_Speaker = 28;
        this._fontSizeZh_Speaker = 35;
        //
    }

    set languageType(type) {
        this._languageType = type;
    }

    get stageObj() {
        return this._container;
    }

    get textWaitTime() {
        return this._thisWaitTime;
    }

    get typingEffect() {
        return this._typingEffect;
    }

    // 修改标记
    // reset(clear = true) {
    reset(clear = true, nextJson) {
        this._container.removeChildren(0, this._container.children.length);
        if (clear) {
            this._txtFrameMap.clear();

            //修改标记
            // this._endNotification();

            //增加剧情结尾的sclogo

            const sc_logo = new PIXI.Sprite(this._loader.resources["sc_logo"].texture);
            this._container.addChildAt(sc_logo, 0);
            sc_logo.anchor.set(1, 1);
            sc_logo.scale.set(1, 1);
            sc_logo.position.set(global_XOffset + global_ViewerWidth - 70 , global_YOffset + global_YOffset_MainContents + 600);
            sc_logo.alpha = 0;
            const timeline = new TimelineMax();

            timeline.to(sc_logo, 0.4, {
                alpha: 1,
                ease: Quad.easeOut,
            });
            timeline.to(sc_logo, 0.8, {
                alpha: 0,
                ease: Quad.easeOut,
                delay: 1,
                onComplete: () => {
                    this._endNotification(nextJson);
                },
            });
        }
    }

    processTextFrameByInput(textFrame, speaker, text, translated_text, speaker_trans, isFastForward, textCtrl) {
        //修改标记 移动量定义
        const YOffset = global_YOffset - 840;
        const XOffset = global_XOffset - 220;

        const YOffset_Speaker = 450 + YOffset;

        text = text == null ? "" : text;

        //修改标记 控制用值保护
        speaker = speaker == "off" ? "" : speaker;

        //译文缺失时用原文替代
        translated_text = translated_text == "" ? text : translated_text;

        this._thisWaitTime = 0;
        // let managerSound = this._loader.resources['managerSound'].sound;

        if (!textFrame || (textFrame == "off" && !this._container.children.length)) {
            return;
        }

        if (this._container.children.length) {
            this._container.removeChildren(0, this._container.children.length);
            if (textFrame == "off") {
                return;
            }
        }

        // this._thisWaitTime = isFastForward ? 50 : text.length * 300 + 500;

        //修改标记 无语音台词停顿偏长
        // this._thisWaitTime = isFastForward ? 50 : text ? text.length * 300 + 500 : 50;
        // this._thisWaitTime = isFastForward ? 50 : text ? text.length * 150 + 1200 : 50; //常态
        this._thisWaitTime = (isFastForward ? 50 : text ? text.length * 150 + 1200 : 50) * 0.666; //速读用

        if (!this._txtFrameMap.has(textFrame)) {
            this._txtFrameMap.set(textFrame, new PIXI.Sprite(this._loader.resources[`textFrame${textFrame}`].texture));
        }

        let thisTextFrame = this._txtFrameMap.get(textFrame);

        // 修改标记 原始文本框背景图隐藏
        thisTextFrame.visible = false;
        //

        this._container.addChildAt(thisTextFrame, 0);

        //speaker处理
        let noSpeaker = true;
        if (speaker !== "off") {
            speaker = speaker || "";
            speaker_trans = speaker === "" ? "" : speaker_trans || speaker + "(缺翻译)";

            //修改标记
            this._currentSpeaker.jp = speaker; // 存储日文名
            this._currentSpeaker.zh = speaker_trans; // 存储中文翻译

            const speakerText = this._languageType === 0 ? this._currentSpeaker.jp : this._currentSpeaker.zh;
            const fontFamily = this._languageType === 0 ? usedFont : zhcnFont;

            noSpeaker = false;

            if (this.speakerObj) {
                this._container.removeChild(this.speakerObj); // 移除旧的 speakerObj
                this.speakerObj.destroy(); // 销毁旧对象
            }
            this.speakerObj = new PIXI.Text(speakerText, {
                fontFamily: fontFamily,
                fontSize: this._languageType === 0 ? this._fontSizeJp_Speaker : this._fontSizeZh_Speaker,
                fill: 0xf0f0f0,
                align: "center",
                padding: 3,
                letterSpacing: this._languageType === 0 ? 0 : 1,
            });

            this._container.addChildAt(this.speakerObj, 1);
            this.speakerObj.position.set(260 + XOffset, YOffset_Speaker);
            this.speakerObj.visible = this._languageType != 2 ? true : false;

            //无论显示模式 先将双语obj建立起来再隐藏
            if (this.speakerZhJpObj) {
                this._container.removeChild(this.speakerZhJpObj); // 移除旧的 speakerObj双语版
                this.speakerZhJpObj.destroy(); // 销毁旧对象
            }

            const speakerZhJp_styles = {
                default: {
                    align: "left",
                    fontFamily: usedFont,
                    fontSize: 24,
                    fill: 0xf0f0f0,
                    fontWeight: "normal",
                    letterSpacing: 3,
                },
                chinese: {
                    align: "left",
                    fontFamily: zhcnFont,
                    fontSize: this._fontSizeZh_Speaker - 2,
                    fill: 0xf0f0f0,
                    fontWeight: "normal",
                    letterSpacing: 1,
                },
                japanese: {
                    align: "left",
                    // fontStyle: 'italic',
                    fontFamily: usedFont,
                    fontSize: this._fontSizeJp_Speaker - 6,
                    fill: 0xcccccc,
                    fontWeight: "normal",
                    letterSpacing: 0,
                },
            };
            let speakerZhJp;
            if (speaker_trans) {
                speakerZhJp = `<chinese>${speaker_trans}</chinese>⧸<japanese>${speaker}</japanese>`;
            } else {
                speakerZhJp = `<chinese></chinese><japanese>${speaker}</japanese>`;
            }

            this.speakerZhJpObj = new TaggedText(speakerZhJp, speakerZhJp_styles);
            this.speakerZhJpObj.position.set(260 + XOffset, YOffset_Speaker);
            this.speakerZhJpObj.visible = this._languageType == 2 ? true : false;
            this._container.addChildAt(this.speakerObj, 2);
            //

            // if(this._languageType = 0){

            //     noSpeaker = false;
            //     let speakerObj = new PIXI.Text(speaker, {
            //         fontFamily: usedFont,
            //         //修改标记 修改人名字体效果
            //         // fontSize: 24,
            //         fontSize: 22,
            //         // fill: 0x000000,
            //         fill: 0xffffff,
            //         align: "center",
            //         padding: 3,
            //     });
            //     this._container.addChildAt(speakerObj, 1);
            //     //修改标记 人名移动
            //     // speakerObj.position.set(260, 462);
            //     speakerObj.position.set(260 + XOffset, 462 + YOffset);
            // } else {

            //     if(speaker_trans){

            //         noSpeaker = false;
            //         let speakerObj = new PIXI.Text(speaker_trans, {
            //             fontFamily: zhcnFont,
            //             //修改标记 修改人名字体效果
            //             // fontSize: 24,
            //             fontSize: 22,
            //             // fill: 0x000000,
            //             fill: 0xffffff,
            //             align: "center",
            //             padding: 3,
            //         });
            //         this._container.addChildAt(speakerObj, 1);
            //         //修改标记 人名移动
            //         // speakerObj.position.set(260, 462);
            //         speakerObj.position.set(260 + XOffset, 462 + YOffset);
            //     }
            // }
        }

        //修改标记 新增textctrl=r处理 上一次的文本后续追加
        // this.textObj = new PIXI.Text('', textStyle);
        // let text_AlreadyDisplayed = "";

        if (textCtrl == "rightafter_r") {
            //自定义标记代表本行为textCtrl=r的后一行
            // 分割 text
            let [textPart1, textPart2] = (text || "").split("{rightafter_r}");

            // 分割 translated_text
            let [translatedTextPart1, translatedTextPart2] = (translated_text || "").split("{rightafter_r}");

            // 将 textPart1 和 textPart2 用换行符连接
            let combinedText = [textPart1, textPart2].filter(Boolean).join("\r\n");

            // 将 translatedTextPart1 和 translatedTextPart2 用换行符连接
            let combinedTranslatedText = [translatedTextPart1, translatedTextPart2].filter(Boolean).join("\r\n");

            if (translated_text) {
                this._currentText.jp = combinedText;
                this._currentText.zh = combinedTranslatedText;
                text = this._languageType === 1 ? combinedTranslatedText : combinedText;
                //text_AlreadyDisplayed = this._languageType === 1 ? translatedTextPart1 : textPart1;
            }

            // let family = translated_text && this._languageType === 1 ? zhcnFont : usedFont;
            // const textStyle = new PIXI.TextStyle({
            //     //修改标记 字体效果
            //     align: "left",
            //     fontFamily: family,
            //     // fontSize: 24,
            //     fontSize: 28,
            //     fill: 0xffffff,
            //     padding: 3,
            // });
            const textStyle = this._fontProcess();

            if (this.textObj) {
                this._container.removeChild(this.textObj); // 正确地从容器中移除对象。
                this.textObj.destroy(); // 销毁引用。
            }

            // this.textObj = new PIXI.Text(text_AlreadyDisplayed, textStyle);
            this.textObj = new PIXI.Text("", textStyle);
        } else {
            if (translated_text) {
                this._currentText.jp = text;
                this._currentText.zh = translated_text;
                text = this._languageType === 1 ? translated_text : text;
            }

            // let family = translated_text && this._languageType === 1 ? zhcnFont : usedFont;
            // const textStyle = new PIXI.TextStyle({
            //     //修改标记 字体效果
            //     align: "left",
            //     fontFamily: family,
            //     // fontSize: 24,
            //     fontSize: 28,
            //     fill: 0xffffff,
            //     padding: 3,
            // });
            const textStyle = this._fontProcess();
            ////

            if (this.textObj) {
                this._container.removeChild(this.textObj); // 正确地从容器中移除对象。
                this.textObj.destroy(); // 销毁引用。
            }
            this.textObj = new PIXI.Text("", textStyle);

            //修改标记
        }

        //调整中文显示的宽度
        this.textObj.scale.x = this._languageType == 0 ? 1 : 1.05;
        //
        this._container.addChildAt(this.textObj, noSpeaker ? 1 : 2);

        //修改标记 文本下移
        // this.textObj.position.set(240, 510);
        this.textObj.position.set(300 + XOffset, 510 + YOffset - 10);
        //可见性
        this.textObj.visible = this._languageType != 2 ? true : false;

        let word_index = 0;
        // let word_index = text?.length || ""; //速读用ban打字机效果
        //修改标记 index在处理textCtrl=r时应当从第二部分开始
        // let word_index = textCtrl == "rightafter_r" ? text_AlreadyDisplayed.length : 0;

        //修改标记完

        if (this._typingEffect != null) {
            clearInterval(this._typingEffect);
        }

        if (isFastForward) {
            this.textObj.text = text;
        } else {
            this._typingEffect = setInterval(() => {
                if (word_index === text.length) {
                    clearInterval(this._typingEffect);
                    // managerSound.stop()
                    this._typingEffect = null;
                }

                // if(!noSpeaker && speaker == 'プロデューサー'){
                //     managerSound.play()
                // }
                // 修改标记
                // this.textObj.text += text.charAt(word_index);
                //
                this.textObj.text = text.substring(0, word_index + 1);

                word_index += 1;
                // }, 65);
            }, 12); //速读用但保留打字机效果(单语)
        }

        //独立的双语显示obj
        if (this.textZhJpObj) {
            this._container.removeChild(this.textZhJpObj); // 正确地从容器中移除对象。
            this.textZhJpObj.destroy(); // 销毁引用。
        }
        const textZhJp_styles = {
            default: {
                wordWrap: false, //taggedText的默认值是true 和Pixi.text不同
                fontFamily: usedFont,
                fontSize: 24,
                fill: 0xf0f0f0,
                fontWeight: "normal",
                letterSpacing: 1,
                breakLines: false,
                lineHeight: 1,
            },
            chinese: {
                wordWrap: false,
                fontFamily: zhcnFont2,
                fontSize: this._fontSizeZh - 2,
                fill: 0xf0f0f0,
                fontWeight: "normal",
                letterSpacing: 2,
                fontScaleWidth: 1,
                lineHeight: 1,
            },
            japanese: {
                wordWrap: false,
                fontFamily: usedFont,
                // fontStyle: 'italic',
                fontSize: this._fontSizeJp - 12,
                fill: 0xcccccc,
                fontWeight: "normal",
                letterSpacing: 0,
                lineHeight: 1,
            },
        };

        this.textZhJpObj = new TaggedText("", textZhJp_styles);
        this.textZhJpObj.position.set(300 + XOffset, 510 + YOffset);
        this.textZhJpObj.visible = this._languageType == 2 ? true : false;

        let text_ZhJp = this._formatBilingualText(this._currentText.zh, this._currentText.jp);

        ////
        //// 在其他obj都添加完毕后在执行双语obj添加 代码尽量放最后

        this._container.addChildAt(this.textZhJpObj, this._container.children.length);
        this._container.addChildAt(this.speakerZhJpObj, this._container.children.length);

        //打字效果部分完全copy
        let word_index_ZhJp = 0;
        // let word_index_ZhJp = Math.max(this._currentText.jp.length, this._currentText.zh.length); //速度用ban打字机效果

        if (this._typingEffect_ZhJp != null) {
            clearInterval(this._typingEffect_ZhJp);
        }

        if (isFastForward) {
            this.textZhJpObj.text = text_ZhJp;
        } else {
            this._typingEffect_ZhJp = setInterval(() => {
                if (word_index_ZhJp === Math.max(this._currentText.jp.length, this._currentText.zh.length)) {
                    clearInterval(this._typingEffect_ZhJp);
                    // managerSound.stop()
                    this._typingEffect_ZhJp = null;
                }

                function customSlice(text, position) {
                    let sliced = text.slice(0, position);
                    let remaining = text.slice(position);
                    let newLineCount = (remaining.match(/\r\n/g) || []).length;
                    return sliced + "\r\n".repeat(newLineCount);
                }

                // 获取当前索引的部分文本 并保留行数不变 避免多语言平行打字机效果时行数出现不同步
                const jpPart = customSlice(this._currentText.jp, word_index_ZhJp);
                const zhPart = customSlice(this._currentText.zh, word_index_ZhJp);

                // 格式化双语文本
                const formattedText = this._formatBilingualText(zhPart, jpPart);

                // 更新 MultiStyleText 对象内容
                this.textZhJpObj.text = formattedText;

                // 增加索引
                word_index_ZhJp += 1;
                // }, 65);
            }, 12); // 速度但保留打字机效果(双语)
        }

        ////
    }

    toggleLanguage(type) {
        this.languageType = type;

        //修改各object可见性 短路逻辑避免抛出错误
        this.textObj && (this.textObj.visible = this._languageType != 2 ? true : false);
        this.speakerObj && (this.speakerObj.visible = this._languageType != 2 ? true : false);
        this.textZhJpObj && (this.textZhJpObj.visible = this._languageType == 2 ? true : false);
        this.speakerZhJpObj && (this.speakerZhJpObj.visible = this._languageType == 2 ? true : false);
        //

        if (this._typingEffect) {
            clearInterval(this._typingEffect);
            this._typingEffect = null;
        }

        if (this.textObj) {
            let text;
            if (this._languageType === 0) {
                text = this._currentText.jp;
                //
                const textStyle = this._fontProcess();
                this.textObj.style = textStyle;
                this.textObj.scale.x = this._languageType == 0 ? 1 : 1.05;
                //
                // this.textObj.style.fontFamily = usedFont;
            } else if (this._languageType === 1) {
                text = this._currentText.zh;
                //
                const textStyle = this._fontProcess();
                this.textObj.style = textStyle;
                this.textObj.scale.x = this._languageType == 0 ? 1 : 1.05;
                //
                // this.textObj.style.fontFamily = zhcnFont;
            }
            this.textObj.text = text ?? "";
        }

        //修改标记 speaker切换
        if (this.speakerObj) {
            const speakerText = this._languageType === 0 ? this._currentSpeaker.jp : this._currentSpeaker.zh;
            const fontFamily = this._languageType === 0 ? usedFont : zhcnFont;
            const fontSize = this._languageType === 0 ? this._fontSizeJp_Speaker : this._fontSizeZh_Speaker;
            const letterSpacing = this._languageType === 0 ? 0 : 1;
            this.speakerObj.text = speakerText;
            this.speakerObj.style.fontFamily = fontFamily;
            this.speakerObj.style.fontSize = fontSize;
            this.speakerObj.style.letterSpacing = letterSpacing;
        }
        ////
    }

    // _endNotification() {
    _endNotification(nextJson) {
        // 修改标记
        // let owariObj = new PIXI.Text("End", {
        //     fontFamily: usedFont,
        //     fontSize: 40,
        //     fill: 0xffffff,
        //     align: "center",
        // });
        // this._container.addChildAt(owariObj, 0);
        // owariObj.anchor.set(0.5);
        // owariObj.position.set(568, 320);

        this._ProcessReplayNext(nextJson);
    }

    ///修改标记
    _fontProcess() {
        return this._languageType === 0
            ? new PIXI.TextStyle({
                  align: "left",
                  fontFamily: usedFont,
                  fontSize: this._fontSizeJp,
                  fill: 0xf0f0f0,
                  fontWeight: "normal",
                  letterSpacing: 0,
              })
            : new PIXI.TextStyle({
                  align: "left",
                  fontFamily: zhcnFont,
                  fontSize: this._fontSizeZh,
                  fill: 0xf0f0f0,
                  fontWeight: "bold",
                  letterSpacing: 2,
              });
    }

    //多语显示用格式化函数
    _formatBilingualText(chineseText, japaneseText) {
        // 将文本按行分割

        chineseText == "" ? "　" : chineseText;
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

        // 合并中日文本行，交替排列
        let formattedText = "";
        for (let i = 0; i < maxLines; i++) {
            formattedText += `<japanese>${japaneseLines[i]}</japanese>\r\n`;
            formattedText += `<chinese>${chineseLines[i]}</chinese>\r\n`;
        }

        return formattedText;
    }

    _ProcessReplayNext(nextJson) {
        const style = new PIXI.TextStyle({
            fontFamily: zhcnFont2,
            fontSize: this._fontSizeZh,
            fill: "#ffffff",
            fontWeight: "bold",
        });

        function createButton(container, text, x, y, onClick) {
            const button = new PIXI.Text(text, style);

            button.x = x;
            button.y = y;
            button.interactive = true;
            button.buttonMode = true;
            button.on("pointertap", onClick);
            container.addChildAt(button, 0);
            // owariObj.anchor.set(0.5);
            // owariObj.position.set(568, 320);
        }

        function reloadPage() {
            location.reload();
        }

        function goToNextEvent() {
            if (nextJson) {
                const eventId = nextJson.split("/")[1].split(".")[0];
                const eventType = nextJson.split("/")[0];
                const url = new URL(window.location.href);
                url.searchParams.set("eventId", eventId);
                url.searchParams.set("eventType", eventType);
                window.location.href = url.toString();
            }
        }

        createButton(this._container, "重播", 380, 480, reloadPage);
        createButton(this._container, "下一个", 700, 480, goToNextEvent);
    }
}
