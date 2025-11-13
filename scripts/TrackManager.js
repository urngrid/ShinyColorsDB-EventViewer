class TrackManager {
    constructor(app) {
        this._tracks = [];
        this._current = 0;
        this._nextLabel = null;
        this._stopTrackIndex = -1;
        this._app = app;
        this._loader = PIXI.Loader.shared;
        this._bgManager = new BgManager();
        //修改标记
        // this._fgManager = new FgManager();
        // 添加middleFg对应
        this._middleFgManager = new FgManager();
        //

        //添加app传入
        // this._spineManager = new SpineManager();
        this._spineManager = new SpineManager(app);
        //

        // this._fgManager = new FgManager();
        this._fgManager = new FgManager(app);
        //

        this._textManager = new TextManager();
        this._selectManager = new SelectManager();
        this._soundManager = new SoundManager();
        this._effectManager = new EffectManager();
        this._movieManager = new MovieManager();
        this._stillManager = new StillManager();
        this._timeoutToClear = null;
        this._textTypingEffect = null;

        //修改标记
        this._autoPlayEnabled = true;
        // this._autoPlayEnabled = false;

        this._stopped = false;
        //translate
        this._translateJson = null;
        //修改标记
        this._translateLang = 0; // 0:jp 1:zh 2:jp+zh

        this._selecting = false;

        this._fastForwardMode = false;

        //修改标记
        //
        this._JsonPath = null;
        //储存来源信息
        this._eventData = null;
        //用于处理voicekeep的文本连缀用标记位
        this._prevTextCtrl = null;
        //用于传入静态图翻译文本的json
        this._stillTranslateJson = null;
        //用于传入speaker翻译文本的json
        this._speakerTranslateJson = null;
        //用于传入voice翻译文本的json
        this._voiceTranslateJson = null;
        //用于记录当前显示的角色人数(稳定态)
        this._charaSpineCount_Stable = 0;

        ///
        this._titlePopupShowed = false;
        ///播放序列
        this._playlist = [];

        //用来储存charLabel对应的charScale值和position值，因为需要在没有新操作的脚本内获知之前的状态 现阶段effect.scale的可能值只出现过1.1放大(表现角色靠近动作)和1还原
        this._charBaseTransformMap = new Map();
        //修改标记完
    }

    set setTrack(tracks) {
        this._tracks = tracks;
    }

    set setTranslateJson(json) {
        this._translateJson = json;
        // this._translateTable = json['table']
    }

    get currentTrack() {
        return this._tracks[this._current];
    }

    get nextTrack() {
        return this._tracks[this._current + 1];
    }

    //修改标记 增加前一track回溯
    get prevTrack() {
        return this._tracks[this._current > 1 ? this._current - 1 : null];
    }

    get reachesStopTrack() {
        return this._stopTrackIndex !== -1 && this._current === this._stopTrackIndex;
    }

    get autoplay() {
        return this._autoPlayEnabled;
    }

    set nextLabel(v) {
        this._nextLabel = v;
    }

    set fastForward(f) {
        this._fastForwardMode = f;
    }

    set stopTrack(s) {
        this._stopTrackIndex = s;
    }

    destroy() {
        this._tracks = [];
        this._current = 0;
        this._nextLabel = null;
        this._stopTrackIndex = -1;
    }

    forward() {
        if (this._nextLabel) {
            this._jumpTo(this._nextLabel);
        } else {
            this._current++;
        }
        return this.currentTrack;
    }

    setBeforeSelectTrackToStopTrack() {
        const index = this._tracks.findIndex((track) => track.select);
        this._stopTrackIndex = index !== -1 && index !== 0 ? index - 1 : index;
    }

    resetStopTrack() {
        this._stopTrackIndex = -1;
    }

    addToStage() {
        this._app.stage.addChild(
            this._bgManager.stageObj,
            //修改标记 middleFg对应(位于角色层下方的fg层)
            this._middleFgManager.stageObj,
            //
            this._spineManager.stageObj,
            this._fgManager.stageObj,
            this._stillManager.stageObj,
            this._textManager.stageObj,
            this._selectManager.stageObj,
            this._effectManager.stageObj,
            this._movieManager.stageObj,
            //修改标记添加soundmanager的对象用于显示翻译文本
            this._soundManager.stageObj
        );
    }

    loadAssetsByTrack() {
        if (this.currentTrack?.label == "end") {
            this._current = 0;
            this._selectManager.frameReset();
            // this._loader.add("managerSound", './assets/002.m4a')
            this._loader.load(() => {
                //修改标记
                // loadAssetsByTrack遍历全部track加载完成
                this._getEventJsonDataLoadResource()
                    //将_renderTrack包裹在.then内部
                    // 等待eventdata加载完成后 显示剧情牌 进行第一次renderTrack
                    .then((a) => {
                        console.log(`eventData`, a);
                        this._eventData = a;

                        if (this._eventData?.eventSourceData) {
                            this._effectManager.showEventTitlePopup(
                                this._eventData.eventSourceData.eventTitle,
                                this._eventData.eventSourceData.eventTitle_trans || "", //|| "待翻译", //todo  eventTitle_Trans尚未处理
                                this._eventData.eventSourceData.eventType,
                                this._eventData.eventSourceData.eventIcon,
                                this._eventData.eventSourceData.cardNamePic,
                                this._eventData.eventSourceData.eventIndexName,
                                this._eventData.eventSourceData.eventAlbumName
                            );
                        } else {
                            this._effectManager.showEventTitlePopup("clear");
                        }
                        //修改标记 载入自定义spine
                        this._checkModifiedSpineAssets(() => {
                            this._renderTrack();
                        });
                        //
                        // this._renderTrack();
                    })
                    .catch((error) => {
                        console.error("Error loading event JSON title:", error);

                        //修改标记 载入自定义spine
                        this._checkModifiedSpineAssets(() => {
                            this._renderTrack();
                        });
                        //

                        // this._renderTrack();
                    });
                ////
                // this._renderTrack();

                //

                //
            });
            ////////
            return;
        }
        const {
            speaker,
            text,
            select,
            nextLabel,
            textFrame,
            bg,
            fg,
            se,
            voice,
            bgm,
            movie,
            charId,
            charType,
            charLabel,
            charCategory,
            stillType,
            stillId,
            stillCtrl,
            still,
            //修改标记 middleFg对应
            middleFg,
            //
        } = this.currentTrack;

        //修改标记 载入sclogo动画
        if (!this._loader.resources[`sc_logo`]) {
            this._loader.add("sc_logo", "./assets/title.png");
        }
        //修改标记 获取标题牌图片
        if (!this._loader.resources[`pop_white`]) {
            this._loader.add("pop_white", "./assets/pop_white.png");
        }
        if (!this._loader.resources[`black_dots`]) {
            this._loader.add("black_dots", "./assets/black_dots.png");
        }

        // if (speaker && text && this._translateJson) {
        // 原代码过剩过滤 存在无speaker字段的text和翻译比如 game_event_communications/400100906.json
        if (text && this._translateJson) {
            // this.currentTrack.translated_text = this._translateJson.table.find((data) => data.name == speaker && data.text == text)["trans"];
            try {
                this.currentTrack.translated_text = this._translateJson.table.find((data) => data.text.replace(/\\n/g, "\r\n") == text)["trans"];
            } catch (error) {
                console.error(`Error occurred while translating text: ${text}`, error);
                console.log(this._translateJson, text);
            }
            //修改标记
            if (this._speakerTranslateJson) {
                // 检索 speaker 的翻译
                const speakerTranslationEntry = this._speakerTranslateJson.find((data) => data.value === speaker);

                if (speakerTranslationEntry) {
                    this.currentTrack.speaker_trans = speakerTranslationEntry["note"];
                }
            }
            ////
        }

        if (textFrame && textFrame != "off" && !this._loader.resources[`textFrame${textFrame}`]) {
            this._loader.add(`textFrame${textFrame}`, `${assetUrl}/images/event/text_frame/${textFrame}.png`);
        }
        if (bg && !this._loader.resources[`bg${bg}`] && bg != "fade_out") {
            this._loader.add(`bg${bg}`, `${assetUrl}/images/event/bg/${bg}.jpg`);

            //修改标记

            //
        }
        if (fg && !this._loader.resources[`fg${fg}`] && fg != "off" && fg != "fade_out") {
            this._loader.add(`fg${fg}`, `${assetUrl}/images/event/fg/${fg}.png`);
        }
        //修改标记 middleFg对应
        if (middleFg && !this._loader.resources[`fg${middleFg}`] && middleFg != "off" && middleFg != "fade_out") {
            this._loader.add(`fg${middleFg}`, `${assetUrl}/images/event/fg/${middleFg}.png`);
        }
        //
        if (se && !this._loader.resources[`se${se}`]) {
            this._loader.add(`se${se}`, `${assetUrl}/sounds/se/event/${se}.m4a`);
        }
        if (voice && !this._loader.resources[`voice${voice}`]) {
            this._loader.add(`voice${voice}`, `${assetUrl}/sounds/voice/events/${voice}.m4a`);
            //修改标记 增加voice对应翻译的传入
            if (this._voiceTranslateJson) {
                const voiceTranslation = this._voiceTranslateJson.find((data) => data.value == voice);
                if (voiceTranslation) {
                    this.currentTrack.voice_trans = voiceTranslation.note;
                }
            }
            //修改标记完
        }
        // if (bgm && !this._loader.resources[`bgm${bgm}`] && bgm != "fade_out" && bgm != "off") {
        if (bgm && !this._loader.resources[`bgm${bgm}`] && bgm != "fade_out" && bgm != "off" && bgm != "pause" && bgm != "resume") {
            //修改标记 补充
            this._loader.add(`bgm${bgm}`, `${assetUrl}/sounds/bgm/${bgm}.m4a`);
        }
        if (movie && !this._loader.resources[`movie${movie}`]) {
            this._loader.add(`movie${movie}`, `${assetUrl}/movies/idols/card/${movie}.mp4`);
        }
        if (charLabel && charId) {
            const thisCharCategory = charCategory ? this._spineManager.spineAlias[charCategory] : "stand";

            if (!this._loader.resources[`${charLabel}_${charId}_${thisCharCategory}`]) {
                this._loader.add(`${charLabel}_${charId}_${thisCharCategory}`, `${assetUrl}/spine/${charType}/${thisCharCategory}/${charId}/data.json`);
            }
        }

        if (select && !this._loader.resources[`selectFrame${this._selectManager.neededFrame}`]) {
            this._loader.add(`selectFrame${this._selectManager.neededFrame}`, `${assetUrl}/images/event/select_frame/00${this._selectManager.neededFrame}.png`);
            if (this._translateJson) {
                this.currentTrack.translated_text = this._translateJson.table.find((data) => data.id == "select" && data.text == select)["trans"];
            }
            this._selectManager.frameForward();
        }
        if (still && !this._loader.resources[`still${still}`] && still != "off") {
            this._loader.add(`still${still}`, `${assetUrl}/images/event/still/${still}.jpg`);
            this.currentTrack.still_trans = `default`;
            //修改标记 增加still对应翻译的传入
            if (this._stillTranslateJson) {
                const stillTranslation = this._stillTranslateJson.find((data) => data.value == still);
                if (stillTranslation) {
                    this.currentTrack.still_trans = stillTranslation.note;
                }
            }
            //修改标记完
        }
        if (stillType && stillId && !this._loader.resources[`still${stillType}${stillId}`]) {
            this._loader.add(`still${stillType}${stillId}`, `${assetUrl}/images/content/${stillType}/card/${stillId}.jpg`);
        }

        this.forward();
        this.loadAssetsByTrack();
    }

    _renderTrack() {
        if (this._stopped || this._selecting) {
            return;
        }
        console.log(`${this._current}/${this._tracks.length - 1}`, this.currentTrack);

        if (this.currentTrack.label == "end") {
            this.endOfEvent();
            return;
        }

        const {
            speaker,
            text,
            textCtrl,
            textWait,
            textFrame,
            bg,
            bgEffect,
            bgEffectTime,
            fg,
            fgEffect,
            fgEffectTime,
            bgm,
            se,
            voice,
            voiceKeep,
            lip,
            select,
            nextLabel,
            stillId,
            stillCtrl,
            still,
            stillType,
            movie,
            charSpine,
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
            effectLabel,
            effectTarget,
            effectValue,
            waitType,
            waitTime,
            translated_text,
            //修改标记
            //新增still_trans用来向stillmanager传入still翻译
            still_trans,
            //新增speaker_trans用来向textmanager传入speaker翻译
            speaker_trans,
            //新增voice_trans用来向soundmanager传入voice翻译
            voice_trans,
            //新增middleFg传入
            middleFg,
            middleFgEffect,
            middleFgEffectTime,
            //新增bgmFadeTime传入
            bgmFadeTime,
            //修改标记完
        } = this.currentTrack;

        //////////////////////////////
        // 修改标记 需要添加charLabel到charScale和charPosition的原始值的映射储存 charScale并不直接存在于脚本内而是在charEffect.scale中(但为了实现渐变动画正常运作需要用charEffect.pixi.scaleX/Y来应用值
        // 并且必须删除原传入charEffect的.scale) 需要在缩放生效后在后续没有scale值的脚本track内维持有效的缩放系数
        /////////////////////////////

        let charBaseTransform = {}; //用于给adjustspine传递脚本原始scale和position的变量

        if (charLabel) {
            let base = this._charBaseTransformMap.get(charLabel); //.get返回的结果是个映射修改结果即更新map map.set会覆盖整个结构而不是只添加属性对象

            if (!base) {
                base = {};
                this._charBaseTransformMap.set(charLabel, base);
            }

            if (charPosition) {
                base.position = { x: charPosition.x, y: charPosition.y };
            }

            // 如果存在 position，才进行偏移
            if (base.position) {
                if (typeof charEffect?.x === "number") {
                    base.position.x += charEffect.x;
                }
                if (typeof charEffect?.y === "number") {
                    base.position.y += charEffect.y;
                }
            }

            // 如果 position 存在，赋值到 charBaseTransform
            if (base.position) {
                charBaseTransform.position = base.position;
            }

            // 处理 scale，未定义就默认设为 1.0
            if (typeof charEffect?.scale === "number") {
                base.scale = charEffect.scale;
            } else if (typeof base.scale !== "number") {
                base.scale = 1.0;
            }

            charBaseTransform.scale = base.scale;

            this._charBaseTransformMap.set(charLabel, base);
        }

        // this._charBaseTransformMap储存有脚本设定的纯净的scale和position adjustspine基于这个值而不是spine当前值来判断处理
        ///////////////
        ///////////////
        ///////////////

        this._bgManager.processBgByInput(bg, bgEffect, bgEffectTime, this._fastForwardMode);

        //修改标记 middleFg对应
        this._middleFgManager.processFgByInput(middleFg, middleFgEffect, middleFgEffectTime, this._fastForwardMode);
        //
        this._fgManager.processFgByInput(fg, fgEffect, fgEffectTime, this._fastForwardMode);
        this._movieManager.processMovieByInput(movie, this._renderTrack.bind(this), this._fastForwardMode);

        // this._textManager.processTextFrameByInput(textFrame, speaker, text, translated_text, this._fastForwardMode);
        // 似乎只显示链接后的文本 ban掉前一行的单独显示比较简洁
        //修改标记 增加textctrl=r即锁定文本框不换页的处理 _prevTextCtrl用来跳过重复的文本显示(因为合并在前一行了)

        if (textCtrl !== `r` && this._prevTextCtrl != "r") {
            // this._textManager.processTextFrameByInput(textFrame, speaker, text, translated_text, this._fastForwardMode, textCtrl);
            // 修改标记speaker翻译传入
            this._textManager.processTextFrameByInput(textFrame, speaker, text, translated_text, speaker_trans, this._fastForwardMode, textCtrl);
            //
        } else {
            if (this._prevTextCtrl == "r") {
                this._prevTextCtrl = "";
                //清除标记 跳过后续文本显示
            } else {
                // this._textManager.processTextFrameByInput(textFrame, speaker, text, translated_text, this._fastForwardMode, textCtrl);
                const text_next = this.nextTrack.text;
                const translated_text_next = this.nextTrack.translated_text;
                this._textManager.processTextFrameByInput(
                    textFrame,
                    speaker,
                    (text ?? "") + "{rightafter_r}" + (text_next ?? ""),
                    (translated_text ?? "") + "{rightafter_r}" + (translated_text_next ?? ""),
                    speaker_trans,
                    this._fastForwardMode,
                    "rightafter_r"
                ); //将前后两行文本连接传入 由textmanager进行分割处理
                this._prevTextCtrl = "r";
            }
        }

        //
        this._selectManager.processSelectByInput(
            select,
            nextLabel,
            this._jumpTo.bind(this),
            this._afterSelection.bind(this),
            translated_text,
            this._fastForwardMode
        );

        //修改标记 添加翻译文本的传入
        // this._stillManager.processStillByInput(still, stillType, stillId, stillCtrl, this._fastForwardMode);
        this._stillManager.processStillByInput(still, stillType, stillId, stillCtrl, this._fastForwardMode, still_trans);
        //修改标记 添加翻译文本的传入 添加waitTime传入
        // this._soundManager.processSoundByInput(bgm, se, voice, charLabel, this._spineManager.stopLipAnimation.bind(this._spineManager), this._fastForwardMode);
        this._soundManager.processSoundByInput(
            bgm,
            se,
            voice,
            charLabel,
            this._spineManager.stopLipAnimation.bind(this._spineManager),
            this._fastForwardMode,
            voice_trans,
            waitTime,
            bgmFadeTime
        );

        //修改标记 spmanager调用前处理
        ///////

        // 角色的位移缩放tween动画处理
        ///////
        //现阶段需要在调用fadingEffect之前处理的就是缩放 需要访问spmanager返回当前的spine的scale
        let charEffectParams = null;
        if ((charEffect?.x || charEffect?.y || charEffect?.scale) && charEffect.time && charLabel) {
            console.log(`transform tween:`, charLabel, charEffect, ` this._charaSpineCount_Stable`, this._charaSpineCount_Stable);
            charEffectParams = {
                scale: true,
                charaCount: this._charaSpineCount_Stable,
                fgCoveringSpine: this._fgManager.fgCoveringSpine,
                charBaseTransformMap: this._charBaseTransformMap,
            }; // charEffect.scale需要修改
        }

        /////
        /////
        //

        this._spineManager.processSpineByInput(
            charLabel,
            charId,
            charCategory,
            charPosition,
            // charScale, 此参数在脚本内不存在
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
            this._fastForwardMode,
            //修改标记 传入修改后的charEffectParams 告知函数应当调整charEffect的对应值
            charEffectParams
            //
        );

        //排除非稳定态的track 更新显示人数标记 只在角色人数稳定时进行角色坐标和缩放的调整

        if (charAnim1) {
            if ((textFrame === "off" && waitTime !== undefined) || textFrame !== "off" || waitTime !== undefined) {
                this._charaSpineCount_Stable = this._spineManager._charaSpineCount;
                this._spineManager.adjustSpine(
                    this._charaSpineCount_Stable,
                    this._charBaseTransformMap,
                    this._fgManager.fgCoveringSpine,
                    charEffect,
                    charLabel
                );
            }
        } else {
            this._charaSpineCount_Stable = this._spineManager._charaSpineCount;
            this._spineManager.adjustSpine(this._charaSpineCount_Stable, this._charBaseTransformMap, this._fgManager.fgCoveringSpine, charEffect, charLabel);
        }
        // console.log(`当前显示人数:`, this._charaSpineCount_Stable);

        ////修改标记 增加spine和fg的联动
        if (fg) {
            if (fg === "fade_out" || fg === "off") {
                this._spineManager.resetColorOverlayFilter();
            } else {
                const { overlayColor: fgOverlayColor = null, sprite: fgSprite = null } = this._fgManager.getFgOverlayData(fg) || {};

                if (fgOverlayColor != null && fgSprite != null) {
                    //需要传入实时的分辨率 使用窗口缩放
                    const resolution = {
                        width: this._app.renderer.width,
                        height: this._app.renderer.height,
                    };
                    this._spineManager.applyColorOverlayFilter(fgOverlayColor, fgSprite); //对fg矩形范围外的spine应用颜色叠加滤镜
                }
            }
        }
        ///////

        this._effectManager.processEffectByInput(effectLabel, effectTarget, effectValue, this._fastForwardMode);

        if (nextLabel == "end") {
            // will be handled at forward();
            this._nextLabel = "end";
        }

        this.forward();

        if (this._current - 1 == this._stopTrackIndex) {
            // do nothing and wait
            return;
        }
        // else if (select && !textCtrl) { // turn app.stage interactive off, in case selection is appeared on stage
        else if (select && !textCtrl) {
            // turn app.stage interactive off, in case selection is appeared on stage
            this._app.stage.interactive = false;
            this._renderTrack();
        } else if (select && textCtrl == "cm") {
            // do nothing, waiting for selection
            this._app.stage.interactive = false;
            this._selecting = true;
        } else if (text && this.autoplay && !waitType) {
            this._textTypingEffect = this._textManager.typingEffect;
            // this._loader.resources['managerSound'].sound.stop()
            if (voice) {
                // here to add autoplay for both text and voice condition

                //修改标记 添加voicekeep处理
                if (voiceKeep) {
                    this._voiceKeepProcess();
                } else {
                    //////修改标记完 下方为原代码

                    const voiceTimeout = this._soundManager.voiceDuration;
                    this._timeoutToClear = setTimeout(() => {
                        if (!this.autoplay) {
                            return;
                        }
                        clearTimeout(this._timeoutToClear);
                        this._timeoutToClear = null;
                        this._renderTrack();
                    }, voiceTimeout);

                    //////修改标记 上方为原代码
                }
                //////修改标记完 和之前else配对在原代码外包裹
            } else {
                // here to add autoplay for only text condition
                const textTimeout = this._textManager.textWaitTime;
                this._timeoutToClear = setTimeout(() => {
                    if (!this.autoplay) {
                        return;
                    }
                    clearTimeout(this._timeoutToClear);
                    this._timeoutToClear = null;
                    this._renderTrack();
                }, textTimeout);
            }
        } else if (text && !this.autoplay && !waitType) {
            //修改标记 添加voicekeep处理 需要注意voicekeep后的track如果textframe缺失可能会导致失效，多数脚本都有，个别缺失，有脚本不严谨的可能
            if (voiceKeep) {
                this._voiceKeepProcess();
            }
            //修改标记完
            else return;
        } else if (movie) {
            if (this._fastForwardMode) {
                this._renderTrack();
                return;
            } else {
                return;
            }
        } else if (waitType == "time") {
            // should be modified, add touch event to progress, not always timeout
            if (this._fastForwardMode) {
                this._renderTrack();
            } else {
                this._timeoutToClear = setTimeout(
                    () => {
                        clearTimeout(this._timeoutToClear);
                        this._timeoutToClear = null;
                        this._renderTrack();
                        // }, waitTime);
                    },
                    bgEffectTime || fgEffectTime || middleFgEffectTime || se ? waitTime : waitTime * 0.666
                ); //修改标记 速读用
            }
        } else if (waitType == "effect") {
            if (this._fastForwardMode) {
                this._renderTrack();
            } else {
                this._timeoutToClear = setTimeout(() => {
                    clearTimeout(this._timeoutToClear);
                    this._timeoutToClear = null;
                    this._renderTrack();

                    //修改标记 防止undefined报错
                    //  }, effectValue.time);
                }, effectValue?.time || 1000);
            }
        } else {
            this._renderTrack();
        }
    }

    endOfEvent(clear = true) {
        //修改标记
        const jsonPath = this._JsonPath;
        const currentIndex = this._playlist.indexOf(jsonPath);
        let nextJson = null;
        if (currentIndex !== -1 && currentIndex < this._playlist.length - 1) {
            nextJson = this._playlist[currentIndex + 1];
        }
        //

        this._bgManager.reset(clear);
        this._fgManager.reset(clear);
        this._spineManager.reset(clear);

        // 修改标记
        // this._textManager.reset(clear);
        this._textManager.reset(clear, nextJson);
        //
        this._selectManager.reset(clear);
        this._soundManager.reset();
        this._effectManager.reset(clear);
        this._movieManager.reset();
        this._stillManager.reset(clear);
        this._stopped = clear;
        this._current = 0;
        this._nextLabel = null;
        this._app.stage.interactive = true;
        this._selecting = false;
        this.resetStopTrack();
    }

    toggleAutoplay() {
        this._autoPlayEnabled = !this._autoPlayEnabled;
    }

    toggleLangDisplay() {
        // 修改标记
        // this._translateLang = (this._translateLang + 1) % 2;
        this._translateLang = (this._translateLang + 1) % 3;
        //修改标记完
        this._textManager.toggleLanguage(this._translateLang);
        this._selectManager.toggleLanguage(this._translateLang);

        //修改标记
        this._stillManager.toggleLanguage(this._translateLang);
        this._soundManager.toggleLanguage(this._translateLang);
    }

    _jumpTo(nextLabel) {
        const length = this._tracks.length;
        for (let i = 0; i < length; i++) {
            if (this._tracks[i].label !== nextLabel) {
                continue;
            }
            this._current = i;
            this._nextLabel = null;
            return;
        }
        throw new Error(`label ${nextLabel} is not found.`);
    }

    _jumpToFrame(frame) {
        this._current = frame;
    }

    _afterSelection() {
        this._app.stage.interactive = true;
        this._selecting = false;
        this._renderTrack();
    }

    ///修改标记 添加 voicekeep处理
    _voiceKeepProcess() {
        console.log(`voiceKeep applied`);

        const textBefore = this.prevTrack.text;
        const textAfter = this.currentTrack.text;
        const voiceDuration = this._soundManager.voiceDuration;
        const fastForwardMode = this._fastForwardMode;

        const timeOut1 = fastForwardMode ? 50 : (voiceDuration * textBefore.length) / (textBefore.length + textAfter.length);
        const timeOut2 = fastForwardMode ? 50 : voiceDuration - timeOut1;

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                clearTimeout(this._timeoutToClear);
                this._timeoutToClear = null;
                this._renderTrack();
                resolve();
            }, timeOut1);
        }).then(() => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve();
                }, timeOut2);
            });
        });
    }

    //修改标记
    // 添加 Json设置 方法
    set setStillTranslateJson(json) {
        this._stillTranslateJson = json;
    }

    set setSpeakerTranslateJson(json) {
        this._speakerTranslateJson = json;
    }
    set setVoiceTranslateJson(json) {
        this._voiceTranslateJson = json;
    }
    ////获取json对应标题和图标
    set setJsonPath(jsonpath) {
        this._JsonPath = jsonpath;
    }

    ////

    _getEventJsonDataLoadResource() {
        const jsonPath = this._JsonPath;
        const eventId = jsonPath.split("/")[1].split(".")[0];
        const eventPath = jsonPath.split("/")[0];

        // 定义三个 JSON 文件的路径
        const jsonFiles = [
            { name: "card", path: `${commu_info_data_path}/CommuList_card.json` },
            { name: "idol", path: `${commu_info_data_path}/CommuList_idol.json` },
            { name: "events", path: `${commu_info_data_path}/CommuList_events.json` },
        ];

        // 加载翻译CSV数据并转换为映射表
        const loadTranslations = async () => {
            try {
                const response = await fetch("assets/data/translated_title_data.csv");
                if (!response.ok) {
                    console.warn("翻译文件不存在或加载失败，将使用原始文本");
                    return new Map();
                }

                const csvText = await response.text();
                const lines = csvText
                    .split("\n")
                    .map((line) => line.trim())
                    .filter((line) => line);
                if (lines.length === 0) return new Map();

                // 解析CSV表头
                const headers = lines[0].split(",").map((h) => h.trim());
                const idIndex = headers.indexOf("eventId");
                const keyIndex = headers.indexOf("key");
                const transIndex = headers.indexOf("trans");

                // 验证必要列是否存在
                if (idIndex === -1 || keyIndex === -1 || transIndex === -1) {
                    console.error("翻译CSV格式不正确，缺少必要列");
                    return new Map();
                }

                // 创建翻译映射: Map<eventId, Map<key, translation>>
                const transMap = new Map();
                for (let i = 1; i < lines.length; i++) {
                    const parts = lines[i].split(",");
                    const eventId = parts[idIndex]?.trim();
                    const key = parts[keyIndex]?.trim();
                    const trans = parts[transIndex]?.trim() || "";

                    if (eventId && key) {
                        if (!transMap.has(eventId)) {
                            transMap.set(eventId, new Map());
                        }
                        transMap.get(eventId).set(key, trans);
                    }
                }
                return transMap;
            } catch (error) {
                console.error("加载翻译数据失败:", error);
                return new Map();
            }
        };

        // 定义一个内部异步函数来处理逻辑
        const fetchAndMatchEvent = async () => {
            try {
                // 先加载翻译数据
                const transMap = await loadTranslations();

                const response = await fetch(`${commu_info_data_path}/CommuList_playlist.json`);
                const playlistData = await response.json();

                let matchingArrays = [];

                // 查找包含 jsonPath 的数组
                for (let i = 0; i < playlistData.length; i++) {
                    if (playlistData[i].includes(jsonPath)) {
                        matchingArrays.push(playlistData[i]);
                    }
                }
                if (matchingArrays.length === 0) {
                    console.log(`未找到包含 jsonPath ${jsonPath} 的播放序列`);
                } else if (matchingArrays.length === 1) {
                    this._playlist = matchingArrays[0];
                    console.log(`找到包含 jsonPath ${jsonPath} 的播放序列：`, this._playlist);
                } else {
                    // 匹配结果不唯一，选择成员最多的数组
                    let maxLength = 0;
                    let selectedArray = null;
                    for (let i = 0; i < matchingArrays.length; i++) {
                        if (matchingArrays[i].length > maxLength) {
                            maxLength = matchingArrays[i].length;
                            selectedArray = matchingArrays[i];
                        }
                    }
                    this._playlist = selectedArray;
                    console.log(`找到多个包含 jsonPath ${jsonPath} 的播放序列，选择成员最多的：`, this._playlist);
                    console.log(
                        `其他匹配的数组：`,
                        matchingArrays.filter((arr) => arr !== selectedArray)
                    );
                }

                // 遍历三个 JSON 文件
                for (const { name, path } of jsonFiles) {
                    // 加载 JSON 文件
                    const response = await fetch(path);
                    if (!response.ok) {
                        console.error(`Failed to load ${path}: ${response.statusText}`);
                        continue; // 如果加载失败，跳过当前文件
                    }

                    const data = await response.json();

                    // 查找匹配的 eventId
                    const eventData = data.find((item) => item.eventId === parseInt(eventId, 10));
                    if (eventData) {
                        // 向 eventSourceData 中注入 "from" 字段
                        eventData.eventSourceData.from = name;
                        eventData.eventSourceData.eventPath = eventPath;

                        // 注入翻译字段
                        const currentEventId = eventData.eventId.toString();
                        if (transMap.has(currentEventId)) {
                            const keyTransMap = transMap.get(currentEventId);
                            // 处理三个待翻译字段
                            const fields = ["eventTitle", "cardName", "eventAlbumName"];
                            fields.forEach((field) => {
                                if (eventData.eventSourceData[field]) {
                                    // 添加翻译字段（原字段名 + _trans）
                                    eventData.eventSourceData[`${field}_trans`] = keyTransMap.get(field) || eventData.eventSourceData[field];
                                }
                            });
                        } else {
                            // 没有翻译数据时，翻译字段使用原始值
                            ["eventTitle", "cardName", "eventAlbumName"].forEach((field) => {
                                if (eventData.eventSourceData[field]) {
                                    eventData.eventSourceData[`${field}_trans`] = "待翻译";
                                }
                            });
                        }

                        if (name == "card") {
                            const iconId = eventData.eventSourceData.enzaId;
                            let idolType;
                            if (iconId.startsWith("10")) {
                                idolType = "idols";
                            } else if (iconId.startsWith("20")) {
                                idolType = "support_idols";
                            }

                            //(name字段已合并到title 应该不需要这部分了)
                            // if (eventData.eventSourceData.eventTitle == null){
                            //     eventData.eventSourceData.eventTitle = eventData.eventSourceData.eventName;
                            // }

                            if (iconId && !this._loader.resources[`icon${iconId}`]) {
                                this._loader.add(`icon${iconId}`, `${assetUrl}/images/content/${idolType}/icon/${iconId}.png`);
                                eventData.eventSourceData.eventIcon = `icon${iconId}`;
                            }
                            // 添加卡牌名字图片
                            if (iconId && !this._loader.resources[`cardnamepic${iconId}`]) {
                                this._loader.add(`cardnamepic${iconId}`, `${assetUrl}/images/content/${idolType}/name/${iconId}.png`);
                                eventData.eventSourceData.cardNamePic = `cardnamepic${iconId}`;
                            }
                            const IDtoIndexMap = {
                                "01": idolType == "idols" ? "Idol Event ✦1" : idolType == "support_idols" ? "Support Event ✦1" : "Undefined Event 1",
                                "02": idolType == "idols" ? "Idol Event ✦2" : idolType == "support_idols" ? "Support Event ✦2" : "Undefined Event 2",
                                "03": idolType == "idols" ? "Idol Event ✦3" : idolType == "support_idols" ? "Support Event ✦3" : "Undefined Event 3",
                                "04": idolType == "idols" ? "Idol Event ✦4" : idolType == "support_idols" ? "Support Event ✦4" : "Undefined Event 4",
                                11: "✦True End✦",
                            };
                            eventData.eventSourceData.eventIndexName = IDtoIndexMap[eventId.toString().slice(-2)] || "";
                        } else if (name == "events") {
                            if (eventData.eventSourceData.eventType == "produce_marathon" && eventData.eventSourceData.albumId) {
                                const iconId = String(eventData.eventSourceData.albumId).padStart(5, "0");
                                if (iconId && !this._loader.resources[`icon${iconId}`]) {
                                    this._loader.add(`icon${iconId}`, `${assetUrl}/images/content/produce_marathons/logo/${iconId}.png`);
                                    eventData.eventSourceData.eventIcon = `icon${iconId}`;
                                }
                                eventData.eventSourceData.eventIndexName =
                                    eventData.eventSourceData.eventIndexName === "オープニング"
                                        ? "✦Opening✦"
                                        : eventData.eventSourceData.eventIndexName === "エンディング"
                                        ? "✦Ending✦"
                                        : eventData.eventSourceData.eventIndexName;
                            }
                        } else if (name == "idol") {
                            const charaId = eventId.toString().slice(1, 4); //slice 1,4是 第2到第4的三位
                            let iconId;
                            if (eventId.toString().slice(0, 1) === "5") {
                                iconId = `unit_${charaId}`; //5开头的基于组合单位的主线剧本剧情(感谢祭/sayhalo)
                                if (iconId && !this._loader.resources[`icon${iconId}`]) {
                                    this._loader.add(`icon${iconId}`, `${assetUrl}/images/content/unit/scenario_icon/${charaId}.png`);
                                    eventData.eventSourceData.eventIcon = `icon${iconId}`;
                                }
                            } else {
                                if (charaId === "801" || charaId === "802" || charaId === "803") {
                                    //B小町三人的wing剧本对应头像是ssr因为没有r卡
                                    iconId = `104${charaId}0010`;
                                } else {
                                    iconId = `102${charaId}0010`;
                                }
                                if (iconId && !this._loader.resources[`icon${iconId}`]) {
                                    this._loader.add(`icon${iconId}`, `${assetUrl}/images/content/idols/icon/${iconId}.png`);
                                    eventData.eventSourceData.eventIcon = `icon${iconId}`;
                                }
                            }

                            //育成剧本图片
                            if (eventData.eventSourceData.eventType && !this._loader.resources[`cardnamepic${iconId}`]) {
                                const eventTypeToAreaPicMap = {
                                    produce_marathon: null,
                                    wing: "wing",
                                    fan_meeting: "fan_meeting",
                                    "3rd_produce_area": "grad",
                                    "4th_produce_area": "landing_point",
                                    "5th_produce_area": "step",
                                    "6th_produce_area": "halo",
                                };
                                const areaName = eventTypeToAreaPicMap[eventData.eventSourceData.eventType] || null;
                                if (areaName) {
                                    this._loader.add(`cardnamepic${iconId}`, `./assets/p_desk_${areaName}_button.png`);
                                    eventData.eventSourceData.cardNamePic = `cardnamepic${iconId}`;
                                }
                            }
                            //育成章节名
                            const validEventTypes = ["wing", "fan_meeting", "3rd_produce_area", "4th_produce_area", "5th_produce_area"];
                            if (validEventTypes.includes(eventData.eventSourceData.eventType)) {
                                if (eventData.eventSourceData.eventType == "wing") {
                                    if (eventId.toString().charAt(0) == "6") {
                                        eventData.eventSourceData.eventIndexName =
                                            eventId.toString().slice(-2) == "07" ? "Normal End" : eventId.toString().slice(-2) == "09" ? "Good End" : "Unknown";
                                    } else {
                                        if (eventId.toString().charAt(0) == "1") {
                                            eventData.eventSourceData.eventIndexName =
                                                eventId.toString().slice(-2) == "01"
                                                    ? "Produce Event ✦Opening✦"
                                                    : "Produce Event ✦" + (parseInt(eventId.toString().slice(-1), 10) - 1).toString();
                                        }
                                    }
                                } else if (eventData.eventSourceData.eventType == "fan_meeting") {
                                    if (eventId.toString().charAt(0) == "1") {
                                        eventData.eventSourceData.eventIndexName =
                                            eventId.toString().slice(-2) == "01"
                                                ? "Produce Event ✦Idol Opening✦"
                                                : eventId.toString().slice(-2) == "02"
                                                ? "Produce Event ✦Idol Ending✦"
                                                : "Unknown";
                                    } else if (eventId.toString().charAt(0) == "5") {
                                        eventData.eventSourceData.eventIndexName =
                                            eventId.toString().slice(-2) == "01"
                                                ? "Produce Event ✦Unit Opening✦"
                                                : eventId.toString().slice(-2) == "09"
                                                ? "Produce Event ✦Unit Ending✦"
                                                : "Produce Event ✦" + (parseInt(eventId.toString().slice(-1), 10) - 1).toString();
                                    }
                                } else if (eventData.eventSourceData.eventType == "3rd_produce_area") {
                                    eventData.eventSourceData.eventIndexName =
                                        eventId.toString().slice(-2) == "01"
                                            ? "Produce Event ✦Opening✦"
                                            : eventId.toString().slice(-2) == "09"
                                            ? "Produce Event ✦Ending✦"
                                            : "Produce Event ✦" + (parseInt(eventId.toString().slice(-1), 10) - 1).toString();
                                } else if (
                                    eventData.eventSourceData.eventType == "4th_produce_area" ||
                                    eventData.eventSourceData.eventType == "5th_produce_area"
                                ) {
                                    eventData.eventSourceData.eventIndexName =
                                        eventId.toString().slice(-2) == "01"
                                            ? "Produce Event ✦Opening✦"
                                            : eventId.toString().slice(-2) == "06"
                                            ? "Produce Event ✦Ending✦"
                                            : "Produce Event ✦" + (parseInt(eventId.toString().slice(-1), 10) - 1).toString();
                                }
                            }
                        }

                        return new Promise((resolve) => {
                            this._loader.load(() => {
                                resolve(eventData); // 确保所有资源加载完成后返回
                            });
                        });
                    }
                }

                // 如果遍历完所有文件仍未找到匹配项
                console.log(`Event with ID ${eventId} not found in any JSON file.`);
            } catch (error) {
                console.error("Error loading or parsing JSON:", error);
            }
        };

        // 调用内部异步函数
        return fetchAndMatchEvent();
    }

    // 检查并加载修改版 Spine，加载完成后执行 callback
    _checkModifiedSpineAssets(callback) {
        const promises = [];

        Object.keys(this._loader.resources).forEach((key) => {
            const res = this._loader.resources[key];
            if (!res) return;

            // 只处理 spine JSON
            if (res.spineData) {
                const spineKey = key;
                const modifiedJsonUrl = res.url.replace(/.*\/spine\//, "./assets/spine_modified/");

                const p = fetch(modifiedJsonUrl, { method: "HEAD" })
                    .then((response) => {
                        if (!response.ok) return;

                        console.log(`✅ 发现修改版 Spine JSON: ${modifiedJsonUrl}`);

                        // 找到所有关联 key
                        const relatedKeys = Object.keys(this._loader.resources).filter((k) => k.includes(spineKey));

                        // 直接删除资源，不手动破坏属性
                        relatedKeys.forEach((k) => {
                            delete this._loader.resources[k];
                            console.log(`🗑 删除旧资源: ${k}`);
                        });

                        // 添加修改版 JSON（Pixi Loader 会自动加载 atlas/png）
                        return new Promise((resolve) => {
                            this._loader.add(spineKey, modifiedJsonUrl).load(() => {
                                console.log(`🔄 修改版 Spine 完整加载完成: ${spineKey}`);
                                resolve();
                            });
                        });
                    })
                    .catch(() => {}); // 修改版不存在则忽略

                promises.push(p);
            }
        });

        Promise.all(promises).then(() => {
            if (callback) callback();
        });
    }
}
