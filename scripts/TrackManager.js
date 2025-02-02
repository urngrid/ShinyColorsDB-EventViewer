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
        this._spineManager = new SpineManager();

        this._fgManager = new FgManager();
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
        this._plateShowed = false;

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
                    console.log(`eventData`,a);
                    this._eventData = a;
                    
                    if(this._eventData.eventSourceData){
                        this._effectManager.showEventPlate(
                            this._eventData.eventSourceData.eventTitle,
                            this._eventData.eventSourceData.eventTitle_Trans || "待翻译",
                            this._eventData.eventSourceData.eventType, 
                            this._eventData.eventSourceData.eventIcon,
                            this._eventData.eventSourceData.cardNamePic,
                            this._eventData.eventSourceData.eventIndexName
                        );
                    }
                    this._renderTrack();
                })
                .catch((error) => {
                    console.error("Error loading event JSON title:", error);
                    this._renderTrack();
                });
                ////
                // this._renderTrack();
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




        //修改标记 获取标题牌图片
        if(!this._loader.resources[`pop_white`]){
            this._loader.add("pop_white", "./assets/pop_white.png");
        }
        if(!this._loader.resources[`black_dots`]){
            this._loader.add("black_dots", "./assets/black_dots.png");
        }   

        //

        // if (speaker && text && this._translateJson) {
        // 原代码过剩过滤 存在无speaker字段的text和翻译比如 game_event_communications/400100906.json
        if (text && this._translateJson) {
           
            // this.currentTrack.translated_text = this._translateJson.table.find((data) => data.name == speaker && data.text == text)["trans"];
            try {
                this.currentTrack.translated_text = this._translateJson.table.find((data) => data.text.replace(/\\n/g, '\r\n') == text)["trans"];
            } catch (error) {
                console.error(`Error occurred while translating text: ${text}`, error);
                console.log( this._translateJson,text);
            }
            //修改标记
            if(this._speakerTranslateJson){
        
                // 检索 speaker 的翻译
                const speakerTranslationEntry = this._speakerTranslateJson.find(
                    (data) => data.value === speaker
                );
            
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
        if (bgm && !this._loader.resources[`bgm${bgm}`] && bgm != "fade_out" && bgm != "off") {
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
            //修改标记完
        } = this.currentTrack;



        this._bgManager.processBgByInput(bg, bgEffect, bgEffectTime, this._fastForwardMode);
    
        //修改标记 middleFg对应
        this._middleFgManager.processFgByInput(middleFg, middleFgEffect, middleFgEffectTime, this._fastForwardMode);
        //
        this._fgManager.processFgByInput(fg, fgEffect, fgEffectTime, this._fastForwardMode);
        this._movieManager.processMovieByInput(movie, this._renderTrack.bind(this), this._fastForwardMode);

        // this._textManager.processTextFrameByInput(textFrame, speaker, text, translated_text, this._fastForwardMode);
        // 似乎只显示链接后的文本 ban掉前一行的单独显示比较简洁
        //修改标记 增加textctrl=r即锁定文本框不换页的处理 _prevTextCtrl用来跳过重复的文本显示(因为合并在前一行了)

        if (textCtrl !== `r` && this._prevTextCtrl != "r" ) {

            // this._textManager.processTextFrameByInput(textFrame, speaker, text, translated_text, this._fastForwardMode, textCtrl);
            // 修改标记speaker翻译传入
            this._textManager.processTextFrameByInput(textFrame, speaker, text, translated_text, speaker_trans, this._fastForwardMode, textCtrl);
            //

        } else {

            if( this._prevTextCtrl == "r"){
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
            );//将前后两行文本连接传入 由textmanager进行分割处理
            this._prevTextCtrl = "r" ;
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
        //修改标记 添加翻译文本的传入
        // this._soundManager.processSoundByInput(bgm, se, voice, charLabel, this._spineManager.stopLipAnimation.bind(this._spineManager), this._fastForwardMode);
        this._soundManager.processSoundByInput(bgm, se, voice, charLabel, this._spineManager.stopLipAnimation.bind(this._spineManager), this._fastForwardMode, voice_trans);


        this._spineManager.processSpineByInput(
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
            this._fastForwardMode
        );

        //排除非稳定态的track 更新显示人数标记 只在角色人数稳定时进行角色坐标和缩放的调整
        if(charAnim1){
            if( textFrame !== "off" || waitTime  !== undefined ){
                this._charaSpineCount_Stable = this._spineManager._charaSpineCount;
                this._spineManager.adjustSpine(this._charaSpineCount_Stable, charScale);
            }
        } else {
            this._charaSpineCount_Stable = this._spineManager._charaSpineCount;
            this._spineManager.adjustSpine(this._charaSpineCount_Stable, charScale);
        }
        // console.log(`当前显示人数:`, this._charaSpineCount_Stable);

        
        ////修改标记 增加spine和fg的联动
        if(fg){
            if( fg === "fade_out" || fg === "off"){
                this._spineManager.resetColorOverlayFilter();
            } else {
                const { overlayColor: fgOverlayColor = null, bounds: fgRect = null} = this._fgManager.getFgOverlayData(fg) || {};

                if(fgOverlayColor != null && fgRect != null){
                    this._spineManager.applyColorOverlayFilter(fgOverlayColor, fgRect) //对fg矩形范围外的spine应用颜色叠加滤镜
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
                this._timeoutToClear = setTimeout(() => {
                    clearTimeout(this._timeoutToClear);
                    this._timeoutToClear = null;
                    this._renderTrack();
                }, waitTime);
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
                }, effectValue?.time || 0);
            }
        } else {
            this._renderTrack();
        }
    }

    endOfEvent(clear = true) {
        this._bgManager.reset(clear);
        this._fgManager.reset(clear);
        this._spineManager.reset(clear);
        this._textManager.reset(clear);
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


        //修改标记 结束后双击回到json询问
        document.addEventListener('dblclick', function() {
            window.location.href = window.location.origin + window.location.pathname;
        }, { once: true });
        //修改标记完

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
            { name: 'card', path: `${commu_info_data_path}/CommuList_card.json` },
            { name: 'idol', path: `${commu_info_data_path}/CommuList_idol.json` },
            { name: 'events', path: `${commu_info_data_path}/CommuList_events.json` }
        ];

        // 定义一个内部异步函数来处理逻辑
        const fetchAndMatchEvent = async () => {
            try {
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
                    const eventData = data.find(item => item.eventId === parseInt(eventId, 10));
                    if (eventData) {
                        // 向 eventSourceData 中注入 "from" 字段
                        eventData.eventSourceData.from = name;
                        eventData.eventSourceData.eventPath = eventPath;
                        
                        if (name == "card"){
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

                            if (iconId && !this._loader.resources[`icon${iconId}`]){
                                this._loader.add(`icon${iconId}`, `${assetUrl}/images/content/${idolType}/icon/${iconId}.png`);
                                eventData.eventSourceData.eventIcon = `icon${iconId}`;
                            }
                            // 添加卡牌名字图片
                            if (iconId && !this._loader.resources[`cardnamepic${iconId}`]){
                                this._loader.add(`cardnamepic${iconId}`, `${assetUrl}/images/content/${idolType}/name/${iconId}.png`);
                                eventData.eventSourceData.cardNamePic = `cardnamepic${iconId}`;
                            }
                            const IDtoIndexMap ={
                                "01": idolType == "idols" ? "Idol Event ✦1" : idolType == "support_idols" ? "Support Event ✦1" : "Undefined Event 1",
                                "02": idolType == "idols" ? "Idol Event ✦2" : idolType == "support_idols" ? "Support Event ✦2" : "Undefined Event 2",
                                "03": idolType == "idols" ? "Idol Event ✦3" : idolType == "support_idols" ? "Support Event ✦3" : "Undefined Event 3",
                                "04": idolType == "idols" ? "Idol Event ✦4" : idolType == "support_idols" ? "Support Event ✦4" : "Undefined Event 4",
                                "11": "✦True End✦"};
                            eventData.eventSourceData.eventIndexName = IDtoIndexMap[eventId.toString().slice(-2)] || "";


                        } else if(name == "events") {
                            if(eventData.eventSourceData.eventType == "produce_marathon" && eventData.eventSourceData.albumId){
                                const iconId = String(eventData.eventSourceData.albumId).padStart(5, '0');
                                if (iconId && !this._loader.resources[`icon${iconId}`]){
                                    this._loader.add(`icon${iconId}`, `${assetUrl}/images/content/produce_marathons/logo/${iconId}.png`);
                                    eventData.eventSourceData.eventIcon = `icon${iconId}`;
                                }
                                eventData.eventSourceData.eventIndexName = eventData.eventSourceData.eventIndexName === "オープニング" ? "✦Opening✦" : eventData.eventSourceData.eventIndexName === "エンディング" ? "✦Ending✦" : eventData.eventSourceData.eventIndexName;
                            }
                        } else if(name == "idol"){
                            const charaId = eventId.toString().slice(1, 4);
                            let iconId;
                            if (charaId === "801" || charaId === "802" || charaId === "803") {
                                //B小町三人的wing剧本对应头像是ssr因为没有r卡
                                iconId = `104${charaId}0010`;                                
                            } else {
                                iconId = `102${charaId}0010`;
                            }
                            if (iconId && !this._loader.resources[`icon${iconId}`]){
                                this._loader.add(`icon${iconId}`, `${assetUrl}/images/content/idols/icon/${iconId}.png`);
                                eventData.eventSourceData.eventIcon = `icon${iconId}`;
                            }
                            //育成剧本图片
                            if (eventData.eventSourceData.eventType && !this._loader.resources[`cardnamepic${iconId}`]){

                                const eventTypeToAreaPicMap = {
                                    "produce_marathon":null,
                                    "wing": "wing",
                                    "fan_meeting": "fan_meeting",
                                    "3rd_produce_area": "grad",
                                    "4th_produce_area": "landing_point",
                                    "5th_produce_area":"step",
                                    // "6th_produce_area":"say_halo" 
                                };
                                const areaName = eventTypeToAreaPicMap[eventData.eventSourceData.eventType] || null;
                                if (areaName){
                                    this._loader.add(`cardnamepic${iconId}`, `./assets/p_desk_${areaName}_button.png`);
                                    eventData.eventSourceData.cardNamePic = `cardnamepic${iconId}`;
                                }

                            }
                            //育成章节名
                            const validEventTypes = ["wing", "fan_meeting", "3rd_produce_area", "4th_produce_area", "5th_produce_area"];
                            if (validEventTypes.includes(eventData.eventSourceData.eventType)) {
                                 if( eventData.eventSourceData.eventType == "wing"){
                                     if (eventId.toString().charAt(0) == "6"){
                                        eventData.eventSourceData.eventIndexName = eventId.toString().slice(-2) == "07" ?
                                         "Normal End" :
                                          eventId.toString().slice(-2) == "09" ?
                                            "Good End" : "Unknown";
                                     } else {
                                        if (eventId.toString().charAt(0) == "1" ){
                                            eventData.eventSourceData.eventIndexName =  eventId.toString().slice(-2) == "01" ? "Produce Event ✦Opening✦" : "Produce Event ✦"+(parseInt(eventId.toString().slice(-1), 10) - 1).toString();
                                        }  
                                     }
                                } else if (eventData.eventSourceData.eventType == "fan_meeting"){
                                    if (eventId.toString().charAt(0) == "1" ){
                                        eventData.eventSourceData.eventIndexName = eventId.toString().slice(-2) == "01" ? "Produce Event ✦Idol Opening✦" : eventId.toString().slice(-2) == "02" ? "Produce Event ✦Idol Ending✦" : "Unknown";
                                    } else if (eventId.toString().charAt(0) == "5" ) {
                                        eventData.eventSourceData.eventIndexName = eventId.toString().slice(-2) == "01" ? "Produce Event ✦Unit Opening✦" : eventId.toString().slice(-2) == "09" ? "Produce Event ✦Unit Ending✦" : "Produce Event ✦" + (parseInt(eventId.toString().slice(-1), 10) - 1).toString();                                      
                                    }
                                } else if (eventData.eventSourceData.eventType == "3rd_produce_area"){
                                    eventData.eventSourceData.eventIndexName =  eventId.toString().slice(-2) == "01" ? "Produce Event ✦Opening✦" : eventId.toString().slice(-2) == "09" ? "Produce Event ✦Ending✦" : "Produce Event ✦"+ (parseInt(eventId.toString().slice(-1), 10) - 1).toString();
                                } else if (eventData.eventSourceData.eventType == "4th_produce_area" || eventData.eventSourceData.eventType == "5th_produce_area" ){
                                    eventData.eventSourceData.eventIndexName =  eventId.toString().slice(-2) == "01" ? "Produce Event ✦Opening✦" : eventId.toString().slice(-2) == "06" ? "Produce Event ✦Ending✦" : "Produce Event ✦"+ (parseInt(eventId.toString().slice(-1), 10) - 1).toString();
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
                console.error(`Event with ID ${eventId} not found in any JSON file.`);
            } catch (error) {
                console.error('Error loading or parsing JSON:', error);
            }
        };

        // 调用内部异步函数
        return fetchAndMatchEvent();
    }


}
