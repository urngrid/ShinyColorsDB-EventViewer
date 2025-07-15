class SoundManager {
    constructor() {
        this._loader = PIXI.Loader.shared;
        this._currentBgm = null;
        this._currentVoice = null;
        this._currentSe = null;
        this._onVoiceEnd = null;
        this._voiceDuration = 0;

        PIXI.sound.volumeAll = 0.1;

        //修改标记
        this._container = new PIXI.Container();
        this._textObj = null; // 新增存储文本对象
        this._typingFlag = false;
        //添加语音翻译用语言标识
        this._languageType = 0; // 0:jp 1:zh 2:jp+zh
    }

    /////修改标记

    get stageObj() {
        return this._container;
    }

    /////

    get voiceDuration() {
        return this._voiceDuration;
    }

    reset() {
        if (this._currentVoice) {
            this._currentVoice.stop();
            this._currentVoice = null;
        }
        if (this._currentBgm) {
            this._currentBgm.stop();
            this._currentBgm = null;
        }
        if (this._currentSe) {
            this._currentSe.stop();
            this._currentSe = null;
        }

        //修改标记
        if (this._textObj) {
            this._textObj.clear();
            this._textObj = null;
        } // 同步清除文本对象
    }

    // processSoundByInput(bgm, se, voice, charLabel, onVoiceEnd, isFastForward) {
    processSoundByInput(bgm, se, voice, charLabel, onVoiceEnd, isFastForward, voice_trans, waitTime, bgmFadeTime) {
        if (isFastForward) {
            return;
        }
        if (bgm) {
            this._playBgm(bgm, bgmFadeTime);
        }

        if (se) {
            if (!voice) this._playSe(se, waitTime);
            else this._playSe(se);
        }

        if (voice) {
            // this._playVoice(voice, charLabel, onVoiceEnd);
            this._playVoice(voice, charLabel, onVoiceEnd, voice_trans);
        }
    }

    // 修改标记 添加fadeTime pause
    // _playBgm(bgmName) {
    _playBgm(bgmName, fadeTime = 3000) {
        if (bgmName == "fade_out") {
            //修改标记
            // TweenMax.to(this._currentBgm, 0, { volume: 0 });
            TweenMax.to(this._currentBgm, fadeTime / 1000, {
                volume: 0,
                ease: Power1.easeInOut,
            });
            console.log("bgm fade out");
            //
            return;
        }

        // 修改标记 移除
        // if (this._currentBgm) {
        //     this._currentBgm.stop();
        // }
        //

        if (bgmName == "off") {
            //修改标记 添加
            if (this._currentBgm) {
                this._currentBgm.stop(); // 只有在明确关闭时才停止
                this._currentBgm = null; // 清除引用
            }
            //
            return;
        }

        //修改标记 添加pause处理
        if (bgmName == "pause") {
            if (this._currentBgm) {
                // 检查是否有当前BGM正在播放
                this._currentBgm.pause(); // 暂停当前BGM
                console.log("bgm paused");
            }
            return;
        }
        //

        // 修改标记 添加resume处理
        if (bgmName == "resume") {
            if (this._currentBgm) {
                // 如果 BGM 已经暂停，则恢复播放
                if (this._currentBgm.paused) {
                    // 假设 PIXI Sound 提供了 paused 属性
                    this._currentBgm.play({
                        loop: true, // 恢复时通常保持原有的循环设置
                        singleInstance: true,
                    });
                    console.log("bgm resumed");
                } else {
                    console.log("bgm is not paused, no need to resume.");
                }
            } else {
                console.log("No current BGM to resume.");
            }
            return;
        }
        //

        // 如果是播放新的 BGM，则停止旧的（如果存在）
        if (this._currentBgm) {
            this._currentBgm.stop();
        }
        
        this._currentBgm = this._loader.resources[`bgm${bgmName}`].sound;
        this._currentBgm.autoPlay = true;
        this._currentBgm.play({
            loop: true,
            singleInstance: true,
        });
        this._currentBgm.volume = 0.3;
    }

    _playSe(seName, waitTime = null) {
        this._currentSe = this._loader.resources[`se${seName}`].sound.play({
            loop: false,
        });

        //修改标记
        // 在 waitTime 毫秒后停止播放 waitTime不传入说明同行脚本有台词
        if (waitTime > 0) {
            setTimeout(() => {
                if (this._currentSe) {
                    this._currentSe.stop();
                }
            }, waitTime);
        }
    }

    // _playVoice(voiceName, charLabel, onVoiceEnd) {
    async _playVoice(voiceName, charLabel, onVoiceEnd, voice_trans) {
        this._voiceDuration = 0;
        if (this._currentVoice) {
            this._currentVoice.stop();
            this._onVoiceEnd();
        }

        this._currentVoice = this._loader.resources[`voice${voiceName}`].sound.play({
            loop: false,
        });

        // this._voiceDuration = (this._currentVoice._duration) * 1000 + 1000;
        this._voiceDuration = this._currentVoice._duration * 1000 + 100; //速读

        this._onVoiceEnd = () => {
            onVoiceEnd(charLabel);
        };
        this._currentVoice.on("end", () => {
            this._onVoiceEnd();
        });

        ////修改标记

        if (voice_trans) {
            await this._processVoiceTranslate(voice_trans, this._currentVoice._duration);
            console.log(`voice_trans:${voice_trans}`);
            if (!this._typingFlag) {
                // 如果 _typingFlag 为 false，表示打字完成
                if (this._textObj) {
                    // 使用 TweenMax 添加淡出效果
                    TweenMax.to(this._textObj, 0.3, {
                        // 0.3 秒淡出动画
                        pixi: { alpha: 0, x: "+=15" },
                        onComplete: () => {
                            // 在淡出完成后移除并销毁
                            if (this._textObj) {
                                this._container.removeChild(this._textObj);
                                this._textObj.destroy();
                                this._textObj = null;
                            }
                        },
                    });
                }
            }
        }
        /////
    }

    ////修改标记处理
    //翻译文本处理
    _processVoiceTranslate(voice_trans, voiceDuration) {
        const TEXT_X_OFFSET = 960,
            TEXT_Y_OFFSET = global_YOffset - 80; // 固定右端的坐标

        // 创建文本样式
        const textStyle = new PIXI.TextStyle({
            align: "left", // 左对齐
            fontFamily: zhcnFont,
            fontSize: 24,
            fill: 0xcccccc,
            padding: 3,
            fontStyle: "italic",
            letterSpacing: 1,
        });

        // 提取括号包裹的内容
        const bracketMatch = voice_trans.match(/^（.*?）/); // 匹配头部括号部分
        const initialText = bracketMatch ? bracketMatch[0] : ""; // 如果匹配到，显示括号内容
        const remainingText = bracketMatch ? voice_trans.replace(initialText, "") : voice_trans; // 剩余部分逐字显现

        // 创建临时文本对象以计算总宽度
        const tempText = new PIXI.Text(voice_trans, textStyle); // 创建完整文本
        const totalWidth = tempText.width; // 获取完整文本的总宽度
        tempText.destroy(); // 销毁临时对象

        // 创建文本对象
        const text = new PIXI.Text(initialText, textStyle); // 初始文本显示括号内容（如有）

        // 移除旧的文本对象
        if (this._textObj) {
            this._container.removeChildren();
            this._textObj.destroy();
        }

        this._textObj = text;

        // 设置锚点到左上角（默认值）
        this._textObj.anchor.set(0, 0.5); // 基于左上角对齐
        this._textObj.position.set(TEXT_X_OFFSET - totalWidth, TEXT_Y_OFFSET); // 计算并设置起始位置

        // 将新的文本对象添加到容器中
        this._container.addChild(this._textObj);

        // 打字效果实现
        const totalCharacters = remainingText.length; // 剩余文本总字符数
        const typingInterval = (voiceDuration / totalCharacters > 0.2 ? 0.2 : voiceDuration / totalCharacters) * 0.4; // 每个字符显现所需时间

        let currentIndex = 0;

        console.log("voiceDuration", voiceDuration, "typingInterval", typingInterval);

        this._typingFlag = true;

        return new Promise((resolve) => {
            const typingEffect = setInterval(() => {
                if (this._textObj && currentIndex <= totalCharacters) {
                    const visibleText = remainingText.slice(0, currentIndex); // 当前显示的字符
                    const invisibleText = "\u3000".repeat(totalCharacters - currentIndex); // 填充未显示部分
                    this._textObj.text = initialText + visibleText + invisibleText; // 拼接完整内容

                    currentIndex++;
                } else {
                    // 动画结束后清除定时器
                    clearInterval(typingEffect);
                    this._typingFlag = false;
                    resolve();
                }
            }, typingInterval * 1000);
        }).then(() => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(); // 延时完成后 resolve
                }, 800 + voiceDuration * 650);
            });
        });
    }

    ////
    toggleLanguage(type) {
        this._languageType = type;

        if (this._textObj) {
            if (this._languageType === 1 || this._languageType === 2) {
                // 显示中文翻译文本
                this._textObj.visible = true;
            } else {
                // 隐藏文本
                this._textObj.visible = false;
            }
        }
    }
}
