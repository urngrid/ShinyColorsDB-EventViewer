"use strict";

async function init() {
    let eventId = getQueryVariable("eventId");
    let eventType = getQueryVariable("eventType", "produce_events");
    let isIframeMode = getQueryVariable("iframeMode", null) === "1";

    // 修改标记
    // let isTranslate = getQueryVariable("isTranslate", null) === "1";
    let queryValue_isTranslate = getQueryVariable("isTranslate", null);
    const mapping_queryValue_isTranslate = {
        false: false,
        0: false,
        null: true,
        true: true,
        1: true,
    };
    let isTranslate = mapping_queryValue_isTranslate[queryValue_isTranslate];
    ///修改标记完

    let jsonPath;

    const advPlayer = new AdvPlayer();
    await advPlayer.LoadFont(usedFont); //load Font

    async function eventHandler(e) {
        if (!e.data.messageType || !e.origin) {
            console.log("Invalid message");
            return;
        }
        switch (e.data.messageType) {
            case "iframeJson":
                console.log("Received iframeJson");
                advPlayer.loadTrackScript(e.data.iframeJson);

                if (e.data.csvText) {
                    const translateJson = advPlayer.CSVToJSON(e.data.csvText);
                    if (translateJson) {
                        await advPlayer.LoadFont(zhcnFont);

                        // 修改标记
                        await advPlayer.LoadFont(zhcnFont2);
                        //

                        advPlayer.loadTranslateScript(translateJson);
                    }
                }
                advPlayer.start();
                break;
            case "fastForward":
                console.log("Received fastForward");
                advPlayer.reset();
                advPlayer.fastForward(e.data.fastForward);
                break;
        }
    }

    if (isIframeMode) {
        window.addEventListener("message", eventHandler, false);
        window.parent.postMessage(
            {
                eventViewerIframeLoaded: true,
            },
            "*"
        );
    } else {
        if (eventId) {
            jsonPath = `${eventType}/${eventId}.json`;
        } else {
            //修改标记
            //jsonPath = prompt("input json path: ", "produce_events/202100711.json");
            jsonPath = prompt("input json path: ", "commu_selector") || "produce_events/380400103.json"; //produce_events/380400103.json

            // eventId = jsonPath.split("/")[1].split(".")[0];
            // eventType = jsonPath.split("/")[0];

            //修改标记 reacation viwer入口
            // 例：检测特殊关键词“reaction_viewer”
            // 请放在调用剧情加载逻辑之前
            if (jsonPath === "reaction_viewer") {
                ReactionViewer.init();
                return; // 阻止剧情逻辑继续执行
            }

            //修改标记剧情选择页面入口
            // 例：检测特殊关键词“commu_selector”
            // 请放在调用剧情加载逻辑之前
            if (jsonPath === "commu_selector") {
                CommuSelector.init();
                return;
            }

            //修改标记 剧本文本阅读器入口
            if (jsonPath === "script_reader") {
                ScriptReader.init();
                return;
            }

            //修改标记 自动使用斜杠种类
            const parts = jsonPath.split(/[\/\\]/);

            eventId = parts[1].split(".")[0];
            eventType = parts[0];
            //

            window.location.search = `eventType=${eventType}&eventId=${eventId}&isTranslate=${isTranslate}`;
        }

        // await advPlayer.loadTrackScript(jsonPath);
        //修改标记
        try {
            const result = await advPlayer.loadTrackScript(jsonPath);
            if (!result) {
                alert("No such event.");

                window.location.href = window.location.origin + window.location.pathname;

                return;
            }
        } catch (error) {
            console.error("Error loading track script:", error);
            alert("No such event.");

            window.location.href = window.location.origin + window.location.pathname;

            return;
        }
        ////

        if (isTranslate) {
            // advPlayer.isTranslate = true
            await advPlayer.LoadFont(zhcnFont); //load Font

            // 修改标记
            await advPlayer.LoadFont(zhcnFont2);
            //

            //修改标记 获取翻译文件失败转为无翻译
            // await advPlayer.getAndLoadTranslateScript(jsonPath);
            await advPlayer.getAndLoadTranslateScript(jsonPath).catch(() => {
                isTranslate = false;
                window.location.search = `eventType=${eventType}&eventId=${eventId}&isTranslate=${isTranslate}`;
            });
            // // 在翻译加载完成后，载入整合注释文件
            try {
                await advPlayer.getAndLoadCommuNoteData();
            } catch (error) {
                console.error("communote加载失败：", error);
            }
            ////
        }

        advPlayer.start();
    }
}

function getQueryVariable(name, defRet = null) {
    const reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    const result = window.location.search.substring(1).match(reg);
    if (result != null) {
        return decodeURI(result[2]);
    } else {
        return defRet;
    }
}

class AdvPlayer {
    _interestedEvents = ["click", "touchstart"];
    _Menu = {
        touchToStart: null,
        autoBtn: null,
        switchLangBtn: null,
    };
    _autoBtn_texture = {
        autoOn: null,
        autoOff: null,
    };
    _switchLangBtn_texture = [];
    _isTranslate = false;
    _tm = undefined;
    _app = undefined;

    constructor() {
        this.createApp();
        this.createPlayer();
        this._Hello();
    }

    set isTranslate(boolean) {
        this._isTranslate = boolean;
    }

    reset() {
        this._tm.endOfEvent(false);
    }

    createApp() {
        if (document.getElementById("ShinyColors")) {
            document.getElementById("ShinyColors").remove();
        }

        PIXI.utils.skipHello();

        this._app = new PIXI.Application({
            //修改标记
            width: global_ViewerWidth,
            //height: 640,
            height: global_ViewerHeight,
            //
            // backgroundColor: 0x0000ff, // 调试用改色bb
            // backgroundColor: 0x000000,
            backgroundColor: parseInt(global_theme_color, 16),
            //
            // antialias: true,       // 启用抗锯齿
            antialias: false, // 修改标记 取消抗锯齿 避免背景切换时的黑线
            resolution: window.devicePixelRatio || 2, // 提高分辨率
            autoDensity: true, // 让 PIXI 适应高 DPI 屏幕
            //修改标记完
        });

        this._app.view.setAttribute("id", "ShinyColors");

        document.body.appendChild(this._app.view);

        this._resize();
        window.onresize = () => this._resize();
    }

    createPlayer() {
        if (!this._app) {
            console.error("PIXI app has not been initialized");
            return;
        }
        this._tm = new TrackManager(this._app);
        this._tm.addToStage();
    }

    fastForward(forwardJson) {
        this._tm.fastForward = forwardJson.forward;
        if (forwardJson.forward) {
            this._tm.stopTrack = forwardJson.target;
        } else {
            this._tm.stopTrack = -1;
        }
        this._removeTouchToStart();
        this._tm.loadAssetsByTrack();
    }

    async loadTrackScript(Track) {
        if (!this._app || !this._tm) {
            return Promise.reject();
        }

        if (typeof Track === "string") {
            return new Promise((res, rej) => {
                this._app.loader.add("eventJson", `${assetUrl}/json/${Track}`).load((_, resources) => {
                    if (resources.eventJson.error) {
                        alert("No such event.");
                        return;
                    }
                    this._tm.setTrack = resources.eventJson.data;

                    //修改标记 添加jsonpath传入用来获取标题和图标
                    this._tm.setJsonPath = Track;
                    //

                    res(Track);
                });
            });
        } else if (typeof Track === "object") {
            this._tm.setTrack = Track;
            return Promise.resolve(Track);
        }
    }

    async getAndLoadTranslateScript(jsonPath) {
        if (!this._app || !this._tm) {
            return Promise.reject();
        }

        //修改标记 添加从本地获取csv处理

        const localTranslatePath = await this._getCSVLocal(jsonPath);
        if (localTranslatePath) {
            try {
                const response = await fetch(localTranslatePath); // 加载文件内容
                if (response.ok) {
                    const localData = await response.text();
                    return new Promise((res, rej) => {
                        const translateJson = this.CSVToJSON(localData); // 转换为 JSON
                        if (translateJson) {
                            this._isTranslate = true;
                            this._tm.setTranslateJson = translateJson;

                            console.log(`使用本地翻译文件：${localTranslatePath}`);
                            console.log(translateJson);
                        }
                        res(translateJson);
                    });
                } else {
                    console.error(`无法加载本地翻译文件，响应状态：${response.status}`);
                    return Promise.reject(`加载本地翻译文件失败`);
                }
            } catch (error) {
                console.error(`加载本地翻译文件失败: ${error.message}`);
                return Promise.reject(error);
            }
        } else {
            // 修改标记完

            let TranslateUrl = await this._searchFromMasterList(jsonPath);

            if (!TranslateUrl) {
                return Promise.reject();
            }

            return new Promise((res, rej) => {
                this._app.loader.add("TranslateUrl", TranslateUrl).load((_, resources) => {
                    let translateJson = this.CSVToJSON(resources.TranslateUrl.data);
                    if (translateJson) {
                        this._isTranslate = true;
                        this._tm.setTranslateJson = translateJson;
                    }
                    res(translateJson);
                });
            });

            //修改标记
        }
        // 修改标记完
    }

    loadTranslateScript(Script) {
        if (!this._app || !this._tm) {
            return;
        }

        if (typeof Script === "object") {
            this._isTranslate = true;
            this._tm.setTranslateJson = Script;
        }
    }

    _searchFromMasterList(jsonPath) {
        return new Promise((res, rej) => {
            this._app.loader.add("TranslateMasterList", translate_master_list).load((_, resources) => {
                let translateUrl = this._getCSVUrl(resources.TranslateMasterList.data, jsonPath);
                res(translateUrl);
            });
        });
    }

    async LoadFont(FontName) {
        const font = new FontFaceObserver(FontName);
        return await font.load(null, fontTimeout);
    }

    //修改标记 增加 本地翻译文件检索

    _getCSVLocal = async (jsonPath) => {
        // 替换 .json 为 .csv
        const filePath = `${local_translate_CSV_path}${jsonPath.replace(/\.json$/, ".csv")}`;

        try {
            const response = await fetch(filePath, { method: "HEAD" }); // 仅检查文件是否存在
            if (response.ok) {
                return filePath; // 文件存在，返回路径
            } else {
                console.warn(`本地翻译文件不存在: ${filePath}, status: ${response.status}`);
            }
        } catch (error) {
            console.warn(`本地文件检查失败: ${error}`);
        }
        return null; // 本地文件不存在
    };
    //修改标记完

    _getCSVUrl = (masterlist, jsonPath) => {
        let translateUrl;
        masterlist.forEach(([key, hash]) => {
            if (key === jsonPath) {
                translateUrl = translate_CSV_url.replace("{uid}", hash);
                return translateUrl;
            }
        });

        return translateUrl;
    };

    CSVToJSON = (text) => {
        if (text === "") {
            return;
        }
        const json = {
            translater: "",
            url: "",
            table: [],
        };
        // 修改标记 兼容换行
        // const table = text.split(/\r\n/).slice(1);
        const table = text.split(/\r?\n/).slice(1);

        table.forEach((row) => {
            const columns = row.split(",");
            if (columns[0] === "info") {
                json["url"] = columns[1];
            } else if (columns[0] === "译者") {
                json["translater"] = columns[1];
            } else if (columns[0] != "") {
                json["table"].push({
                    id: columns[0],
                    name: columns[1],
                    // text: columns[2].replace("\\n", "\r\n"),
                    // trans: columns[3].replace("\\n", "\r\n"),
                    //修改标记 旧代码只能处理第一个换行符 无法应对两个换行符的三行文本
                    text: columns[2].replace(/\\n/g, "\r\n"),
                    trans: columns[3].replace(/\\n/g, "\r\n"),
                });
            }
        });
        return json;
    };

    _resize() {
        let height = document.documentElement.clientHeight;
        let width = document.documentElement.clientWidth;

        //修改标记
        //let ratio = Math.min(width / 1136, height / 640);
        let ratio = Math.min(width / global_ViewerWidth, height / global_ViewerHeight);

        let resizedX = global_ViewerWidth * ratio;
        // let resizedY = 640 * ratio;
        let resizedY = global_ViewerHeight * ratio;

        this._app.view.style.position = `absolute`;
        this._app.view.style.top = `50%`;
        this._app.view.style.left = `50%`;
        this._app.view.style.transform = `translate(-50%,-50%)`;

        this._app.view.style.width = resizedX + "px";
        this._app.view.style.height = resizedY + "px";

        this._app.renderer.resize(resizedX, resizedY);
        this._app.stage.scale.set(ratio, ratio);
        console.log(
            window.devicePixelRatio,
            this._app.renderer.width,
            this._app.renderer.height,
            this._app.view.style.width,
            this._app.view.style.height,
            resizedX,
            resizedY
        );
    }

    start() {
        this._app.loader
            .add("touchToStart", "./assets/touchToStart.png")
            .add("autoOn", "./assets/autoOn.png")
            .add("autoOff", "./assets/autoOff.png")
            .add("jpON", "./assets/jpOn.png")
            .add("zhJPOn", "./assets/zhJPOn.png")
            .add("zhOn", "./assets/zhOn.png")
            .load((_, resources) => this._ready(resources));
    }

    _ready = (resources) => {
        this._Menu.touchToStart = new PIXI.Sprite(resources.touchToStart.texture);

        this._Menu.autoBtn = new PIXI.Sprite(resources.autoOn.texture);

        this._autoBtn_texture.autoOn = resources.autoOn.texture;
        this._autoBtn_texture.autoOff = resources.autoOff.texture;

        // 修改标记
        // if (this._isTranslate) {
        this._Menu.switchLangBtn = new PIXI.Sprite(resources.jpON.texture);
        this._switchLangBtn_texture = [resources.jpON.texture, resources.zhOn.texture, resources.zhJPOn.texture];
        // }

        // this._app.stage.interactive = true;
        let touchToStart = this._Menu.touchToStart;
        touchToStart.anchor.set(0.5);
        // 修改标记
        // touchToStart.position.set(568, 500);
        touchToStart.position.set(global_ViewerWidth * 0.5, global_ViewerHeight * 0.4);
        this._app.stage.addChild(touchToStart);

        this._interestedEvents.forEach((e) => {
            this._app.view.addEventListener(e, this._afterTouch);
        });
    };

    _removeTouchToStart() {
        this._app.stage.interactive = false;
        this._app.stage.removeChild(this._Menu.touchToStart);
        this._interestedEvents.forEach((e) => {
            this._app.view.removeEventListener(e, this._afterTouch);
        });
        this._interestedEvents.forEach((e) => {
            this._app.stage.on(e, this._nextTrack);
        });
    }

    _afterTouch = async () => {
        let { autoBtn, switchLangBtn } = this._Menu;

        this._removeTouchToStart();

        //this._app.stage.removeChild(touchToStart);

        this._tm.loadAssetsByTrack();

        //auto Btn
        autoBtn.anchor.set(0.5);
        autoBtn.position.set(1075, 50);

        autoBtn.interactive = true;
        this._app.stage.addChild(autoBtn);

        this._interestedEvents.forEach((e) => {
            // autoplay is initialized to false
            autoBtn.on(e, () => {
                this._tm.toggleAutoplay();
                this._toggleAutoplay();
            });
        });

        //Trans
        //修改标记 无论是否存在翻译档都显示语言切换钮 因为默认语言变成中日双语了
        // if (this._isTranslate) {
        switchLangBtn.anchor.set(0.5);

        switchLangBtn.position.set(1075, 130);

        switchLangBtn.interactive = true;
        this._app.stage.addChild(switchLangBtn);

        this._interestedEvents.forEach((e) => {
            // autoplay is initialized to false
            switchLangBtn.on(e, () => {
                this._tm.toggleLangDisplay();
                this._toggleLangDisplay();
            });
        });
        // }

        //修改标记 修改自动播放状态和语言
        // console.log(`autoplay`,this._tm.autoplay);
        // console.log(`lang`,this._tm._translateLang);
        this._tm.toggleAutoplay();
        this._toggleAutoplay();

        if (this._isTranslate) {
            this._tm.toggleLangDisplay();
            this._toggleLangDisplay();
            this._tm.toggleLangDisplay();
            this._toggleLangDisplay();
        }

        //

        //修改标记 初始化透明化按钮 长按背景临时显示
        this._addButtonVisibilityControl();
    };

    _toggleAutoplay() {
        let { autoBtn } = this._Menu;
        let { autoOn, autoOff } = this._autoBtn_texture;

        if (this._tm.autoplay) {
            // toggle on
            if (!this._tm._timeoutToClear) {
                this._tm._renderTrack();
            }

            autoBtn.texture = autoOn;
            this._app.stage.interactive = false;
        } else {
            // toggle off
            if (this._tm._timeoutToClear) {
                clearTimeout(this._tm._timeoutToClear);
                this._tm._timeoutToClear = null;
            }

            autoBtn.texture = autoOff;
            this._app.stage.interactive = true;
        }
    }

    _toggleLangDisplay() {
        let { switchLangBtn } = this._Menu;
        let next = this._tm._translateLang;
        switchLangBtn.texture = this._switchLangBtn_texture[next];
    }

    _nextTrack = (ev) => {
        if (ev.target !== this._app.stage) {
            return;
        }
        if (this._tm.autoplay) {
            return;
        }
        if (this._tm._timeoutToClear) {
            clearTimeout(this._tm._timeoutToClear);
        }
        if (this._tm._textTypingEffect) {
            clearInterval(this._tm._textTypingEffect);
        }

        this._tm._renderTrack();
    };

    _Hello() {
        const log = [
            `\n\n %c  %c   ShinyColors Event Viewer   %c  %c  https://github.com/ShinyColorsDB/ShinyColorsDB-EventViewer  %c \n\n`,
            "background: #28de10; padding:5px 0;",
            "color: #28de10; background: #030307; padding:5px 0;",
            "background: #28de10; padding:5px 0;",
            "background: #5eff84; padding:5px 0;",
            "background: #28de10; padding:5px 0;",
        ];

        console.log(...log);
    }

    //修改标记 以下为新增代码
    //用于新的整合注释文件的加载和解析
    _parseCSVToJSON = (text) => {
        if (!text) {
            return {};
        }

        // Split lines and extract header
        const lines = text.split(/\r?\n/);
        const header = lines[0].split(",").map((key) => key.trim());

        // Ensure required headers are present
        if (!header.includes("key") || !header.includes("value") || !header.includes("note")) {
            console.error("Invalid CSV structure: missing required columns 'key', 'value', or 'note'.");
            return {};
        }

        const keyIndex = header.indexOf("key");
        const valueIndex = header.indexOf("value");
        const noteIndex = header.indexOf("note");

        // Initialize categorized result object
        const categorizedData = {};

        for (let i = 1; i < lines.length; i++) {
            const columns = lines[i].split(",").map((col) => col.trim());

            if (columns.length < header.length) {
                continue; // Skip incomplete lines
            }

            const key = columns[keyIndex];
            let value = columns[valueIndex];
            let note = columns[noteIndex];

            // 反转义处理：将 \\r 和 \\n 还原为 \r 和 \n
            note = note.replace(/\\r/g, "\r").replace(/\\n/g, "\n");

            if (!categorizedData[key]) {
                categorizedData[key] = [];
            }

            categorizedData[key].push({ value, note });
        }

        return categorizedData;
    };

    async getAndLoadCommuNoteData() {
        return new Promise((res, rej) => {
            this._app.loader
                .add("commuNoteData", commuNote_CSV_path) // 加载整合后的 CSV 文件
                .load((_, resources) => {
                    const csvData = resources.commuNoteData.data;
                    const commuNoteData = this._parseCSVToJSON(csvData); // 解析 CSV 数据

                    if (commuNoteData) {
                        // 将解析后的数据分类传递给 this._tm
                        if (commuNoteData["still"]) {
                            this._tm.setStillTranslateJson = commuNoteData["still"];
                            console.log(`still note data loaded`, commuNoteData["still"]);
                        }
                        if (commuNoteData["speaker"]) {
                            this._tm.setSpeakerTranslateJson = commuNoteData["speaker"];
                            console.log(`speaker note data loaded`, commuNoteData["speaker"]);
                        }
                        if (commuNoteData["voice"]) {
                            this._tm.setVoiceTranslateJson = commuNoteData["voice"];
                            console.log(`voice note data loaded`, commuNoteData["voice"]);
                        }
                    }

                    res(commuNoteData);
                });
        });
    }

    ///////////////
    //修改标记 按钮透明化

    // 在AdvPlayer类中添加以下方法
    _addButtonVisibilityControl() {
        // 1. 初始设置 - 按钮全透明但可交互
        this._Menu.autoBtn.alpha = 0;
        this._Menu.autoBtn.visible = true; // 保持visible为true确保可交互
        if (this._Menu.switchLangBtn) {
            this._Menu.switchLangBtn.alpha = 0;
            this._Menu.switchLangBtn.visible = true;
        }

        // 2. 长按黑色背景区域显示按钮
        let longPressTimer;
        const handlePointerDown = (e) => {
            // 检查是否点击在黑色背景区域（非按钮、非舞台内容）
            if (e.target === this._app.view) {
                longPressTimer = setTimeout(() => {
                    this._setButtonsAlpha(1); // 完全不透明
                }, 800);
            }
        };

        const handlePointerUp = () => clearTimeout(longPressTimer);

        // 3. 点击按钮区域外隐藏按钮
        const handleBackgroundClick = (e) => {
            if (e.target === this._app.view) {
                this._setButtonsAlpha(0); // 完全透明
            }
        };

        // 添加事件监听
        this._app.view.addEventListener("pointerdown", handlePointerDown);
        this._app.view.addEventListener("pointerup", handlePointerUp);
        this._app.view.addEventListener("pointerleave", handlePointerUp);
        this._app.view.addEventListener("click", handleBackgroundClick);

        // 清理方法
        this._cleanButtonVisibilityControl = () => {
            this._app.view.removeEventListener("pointerdown", handlePointerDown);
            this._app.view.removeEventListener("pointerup", handlePointerUp);
            this._app.view.removeEventListener("pointerleave", handlePointerUp);
            this._app.view.removeEventListener("click", handleBackgroundClick);
        };
    }

    // 设置按钮透明度（保持visible为true）
    _setButtonsAlpha(alpha) {
        this._Menu.autoBtn.alpha = alpha;
        if (this._Menu.switchLangBtn) {
            this._Menu.switchLangBtn.alpha = alpha;
        }
    }
    ////////////////////
}
// todo 连续播放 和易用剧情选择ui
