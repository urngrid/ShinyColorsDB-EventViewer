/**
 * ScriptReader.js
 * 纯净版 vFinal-5
 * - 集成远程翻译
 * - 智能头像显示
 * - 同Speaker行距压缩
 * - 行号右下角角标对齐
 * - 标题多级合成逻辑
 * - 退出返回选择器
 * - zh-only 模式下缺失翻译时回退显示原文
 * - [New] 点击行号播放语音
 */

(function () {
    // ---------- 全局常量 ----------
    const TRANSLATE_MASTER_LIST_URL = window.translate_master_list || "https://raw.githubusercontent.com/biuuu/ShinyColors/gh-pages/story.json";
    const TRANSLATE_CSV_TEMPLATE = window.translate_CSV_url || "https://raw.githubusercontent.com/biuuu/ShinyColors/gh-pages/data/story/{uid}.csv";

    // ---------- 配置区域 ----------
    const COMMUNOTE_CSV_PATH = "./assets/data/CommuNote.csv";
    const TRANSLATED_TITLE_CSV = "./assets/data/translated_title_data.csv";
    const COMMU_BASE = "./assets/data";
    const LOCAL_TRANSLATE_BASE = "./assets/translateData_local/csv/";

    // Speaker Mapping
    window.ScriptReaderSpeakerMapping = window.ScriptReaderSpeakerMapping || {
        真乃: "001",
        灯織: "002",
        めぐる: "003",
        恋鐘: "004",
        摩美々: "005",
        咲耶: "006",
        結華: "007",
        霧子: "008",
        果穂: "009",
        智代子: "010",
        樹里: "011",
        凛世: "012",
        夏葉: "013",
        甘奈: "014",
        甜花: "015",
        千雪: "016",
        あさひ: "017",
        冬優子: "018",
        愛依: "019",
        透: "020",
        円香: "021",
        小糸: "022",
        雛菜: "023",
        にちか: "024",
        美琴: "025",
        ルカ: "026",
        羽那: "027",
        はるき: "028",
        はづき: "091",
        ルビィ: "801",
        かな: "802",
        MEMちょ: "803",
        あかね: "804",
    };

    // ---------- 小工具 ----------
    function el(tag, cls, html) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html !== undefined) e.innerHTML = html;
        return e;
    }

    function $(sel, root = document) {
        return root.querySelector(sel);
    }

    function safeFetchText(path) {
        return fetch(path).then((r) => (r.ok ? r.text() : Promise.reject(`fetch ${path} ${r.status}`)));
    }

    function parseCSVToArray(text) {
        return text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .map((line) => line.split(",").map((c) => c.trim()));
    }

    // ---------- AdvPlayerShim (翻译加载核心) ----------
    class AdvPlayerShim {
        constructor() {
            this._isTranslate = false;
            this._tm = { setTranslateJson: null };
            if (!window._ScriptReader_MasterListCache) {
                window._ScriptReader_MasterListCache = null;
            }
        }

        CSVToJSON(text) {
            if (!text) return {};
            const map = {};
            const lines = text.split(/\r?\n/);

            let startIndex = 0;
            if (lines.length > 0 && lines[0].includes("id") && lines[0].includes("name")) {
                startIndex = 1;
            }

            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const cols = this._parseCSVLine(line);

                if (cols.length >= 4) {
                    let original = cols[2];
                    let translation = cols[3];

                    if (original) original = original.replace(/\\n/g, "\r\n");
                    if (translation) translation = translation.replace(/\\n/g, "\r\n");

                    if (original) {
                        map[original] = translation;
                    }
                }
            }
            return map;
        }

        _parseCSVLine(line) {
            const res = [];
            let current = "";
            let inQuote = false;
            for (let i = 0; i < line.length; i++) {
                const c = line[i];
                if (c === '"') {
                    inQuote = !inQuote;
                } else if (c === "," && !inQuote) {
                    res.push(current.trim());
                    current = "";
                } else {
                    current += c;
                }
            }
            res.push(current.trim());
            return res;
        }

        async _getCSVLocal(jsonPath) {
            const csvName = jsonPath.replace(/\.json$/i, ".csv");
            const filePath = `${LOCAL_TRANSLATE_BASE}${csvName}`;
            try {
                const response = await fetch(filePath, { method: "HEAD" });
                if (response.ok) return filePath;
            } catch {}
            return null;
        }

        _getCSVUrl(masterlist, jsonPath) {
            let translateUrl = null;
            const found = masterlist.find((item) => item[0] === jsonPath);
            if (found) {
                const hash = found[1];
                translateUrl = TRANSLATE_CSV_TEMPLATE.replace("{uid}", hash);
            }
            return translateUrl;
        }

        async _searchFromMasterList(jsonPath) {
            if (window._ScriptReader_MasterListCache) {
                return this._getCSVUrl(window._ScriptReader_MasterListCache, jsonPath);
            }
            try {
                console.log("[ScriptReader] Fetching remote master list...");
                const response = await fetch(TRANSLATE_MASTER_LIST_URL);
                if (!response.ok) throw new Error("Network error");
                const json = await response.json();
                window._ScriptReader_MasterListCache = json;
                return this._getCSVUrl(json, jsonPath);
            } catch (e) {
                console.warn("[ScriptReader] Failed to load master list:", e);
                return null;
            }
        }

        async getAndLoadTranslateScript(jsonPath) {
            this._isTranslate = false;
            this._tm.setTranslateJson = null;

            // 1. 本地
            const localPath = await this._getCSVLocal(jsonPath);
            if (localPath) {
                try {
                    const response = await fetch(localPath);
                    if (response.ok) {
                        const txt = await response.text();
                        const j = this.CSVToJSON(txt);
                        if (Object.keys(j).length > 0) {
                            this._isTranslate = true;
                            this._tm.setTranslateJson = j;
                            console.log(`[ScriptReader] Loaded local translation: ${localPath}`);
                            return j;
                        }
                    }
                } catch (e) {
                    console.error(`[ScriptReader] Local load error: ${e}`);
                }
            }

            // 2. 远程
            const remoteUrl = await this._searchFromMasterList(jsonPath);
            if (remoteUrl) {
                try {
                    console.log(`[ScriptReader] Fetching remote: ${remoteUrl}`);
                    const response = await fetch(remoteUrl);
                    if (response.ok) {
                        const txt = await response.text();
                        const j = this.CSVToJSON(txt);
                        if (Object.keys(j).length > 0) {
                            this._isTranslate = true;
                            this._tm.setTranslateJson = j;
                            return j;
                        }
                    }
                } catch (e) {
                    console.error(`[ScriptReader] Remote load error: ${e}`);
                }
            }
            return null;
        }
    }

    // ---------- CommuNoteLoader ----------
    class CommuNoteLoader {
        constructor() {
            this.data = {};
        }
        _parse(text) {
            const out = {};
            const arr = parseCSVToArray(text);
            for (const row of arr) {
                if (row.length < 3) continue;
                const key = row[0];
                const value = row[1];
                const note = row.slice(2).join(",");
                if (!out[key]) out[key] = {};
                out[key][value] = note;
            }
            return out;
        }
        async load(path) {
            try {
                const txt = await safeFetchText(path);
                this.data = this._parse(txt);
                return this.data;
            } catch (e) {
                return {};
            }
        }
    }

    // ---------- EventMeta loader ----------
    async function loadEventMeta(jsonPath) {
        const eventId = jsonPath.split("/")[1].split(".")[0];
        let transMap = new Map();
        try {
            const txt = await safeFetchText(TRANSLATED_TITLE_CSV);
            const lines = txt
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean);
            if (lines.length > 0) {
                const headers = lines[0].split(",").map((h) => h.trim());
                const idIdx = headers.indexOf("eventId");
                const keyIdx = headers.indexOf("key");
                const transIdx = headers.indexOf("trans");
                if (idIdx !== -1 && keyIdx !== -1 && transIdx !== -1) {
                    for (let i = 1; i < lines.length; i++) {
                        const cols = lines[i].split(",").map((c) => c.trim());
                        const eid = cols[idIdx];
                        const key = cols[keyIdx];
                        const tr = cols[transIdx] || "";
                        if (!transMap.has(eid)) transMap.set(eid, new Map());
                        transMap.get(eid).set(key, tr);
                    }
                }
            }
        } catch (e) {}

        let playlist = [];
        try {
            const ptxt = await safeFetchText(`${COMMU_BASE}/CommuList_playlist.json`);
            const pjson = JSON.parse(ptxt);
            const matches = pjson.filter((arr) => arr.includes(jsonPath));
            if (matches.length === 1) playlist = matches[0];
            else if (matches.length > 1) playlist = matches.sort((a, b) => b.length - a.length)[0];
        } catch (e) {}

        const jsonFiles = [
            { name: "card", path: `${COMMU_BASE}/CommuList_card.json` },
            { name: "idol", path: `${COMMU_BASE}/CommuList_idol.json` },
            { name: "events", path: `${COMMU_BASE}/CommuList_events.json` },
        ];

        for (const jf of jsonFiles) {
            try {
                const txt = await safeFetchText(jf.path);
                const arr = JSON.parse(txt);
                const found = arr.find((item) => String(item.eventId) === String(eventId));
                if (found) {
                    const src = found.eventSourceData || {};
                    src.from = jf.name;
                    src.eventPath = jsonPath.split("/")[0];
                    const tid = String(found.eventId);
                    const tmap = transMap.get(tid);
                    ["eventTitle", "cardName", "eventAlbumName"].forEach((field) => {
                        if (src[field]) src[`${field}_trans`] = tmap ? tmap.get(field) || src[field] : src[field] || "";
                    });
                    const last2 = eventId.toString().slice(-2);
                    const indexMap = { "01": "Idol Event ✦1", "02": "Idol Event ✦2", "03": "Idol Event ✦3", "04": "Idol Event ✦4", 11: "✦True End✦" };
                    src.eventIndexName = src.eventIndexName || indexMap[last2] || "";

                    // === 标题合成逻辑 ===
                    let displayTitle = src.eventTitle || "";

                    // 1. 卡片剧情
                    if (src.cardName) {
                        displayTitle = `${src.cardName} : ${src.eventTitle}`;
                    }
                    // 2. 活动剧情
                    else if (src.eventAlbumName) {
                        const idx = src.eventIndexName ? ` ${src.eventIndexName}` : "";
                        displayTitle = `${src.eventAlbumName}${idx} : ${src.eventTitle}`;
                    }
                    // 3. 偶像/育成剧情
                    else if (src.communicationCategory === "character_event" || src.idolId) {
                        const SCENARIO_MAP = {
                            wing: "W.I.N.G",
                            fan_meeting: "ファン感謝祭",
                            "3rd_produce_area": "G.R.A.D.",
                            "4th_produce_area": "Landing Point",
                            "5th_produce_area": "S.T.E.P.",
                            "6th_produce_area": "Say Halo",
                        };
                        const scenario = SCENARIO_MAP[src.eventType] || src.eventType || "";
                        const name = src.name || "";
                        const prefix = [name, scenario].filter(Boolean).join(" ");
                        if (prefix) {
                            displayTitle = `${prefix} : ${src.eventTitle}`;
                        }
                    }

                    return {
                        eventId: String(found.eventId),
                        eventPath: src.eventPath,
                        from: src.from,
                        playlist,
                        title: displayTitle,
                        title_trans: src.eventTitle_trans || "",
                        cardName: src.cardName || "",
                        cardName_trans: src.cardName_trans || "",
                        eventIndexName: src.eventIndexName || "",
                        raw: src,
                    };
                }
            } catch (e) {}
        }
        return null;
    }

    // ---------- UI 样式 ----------
    const STYLE = `
    /* ScriptReader 样式 - Night Mode */
    #scriptReaderRoot { 
        position: fixed; inset: 0; 
        background: #202124; 
        z-index: 999999; 
        display: flex; flex-direction: column; 
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Hiragino Kaku Gothic ProN", "Noto Sans JP", "PingFang SC"; 
        color: #e8eaed; 
    }
    
    #srHeader { 
        padding: 10px 12px; 
        background: #2f3033; 
        border-bottom: 1px solid #3c4043; 
        display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; 
    }

    .srHeaderTop { display: flex; align-items: center; justify-content: space-between; }
    .srMeta { display: flex; flex-direction: column; line-height: 1.2; }
    .srMeta .title { font-size: 16px; font-weight: 700; color: #fff; }
    .srMeta .sub { font-size: 12px; color: #9aa0a6; }

    .srHeaderControls { display: flex; gap: 8px; align-items: center; width: 100%; }
    
    .srPathInput {
        flex: 1;
        background: #3c4043; 
        color: #e8eaed; 
        border: 1px solid #5f6368; 
        border-radius: 4px; 
        padding: 6px; 
        font-size: 13px;
        font-family: monospace;
    }

    .srContent { 
        overflow-y: auto; 
        padding: 12px; 
        flex: 1; 
        -webkit-overflow-scrolling: touch; 
    }

    /* 基础行样式：垂直居中 */
    .srLine { 
        display: flex; gap: 10px; align-items: center; 
        padding: 16px 6px; border-radius: 8px; position: relative; 
    }
    .srLine:hover { background: rgba(255,255,255,0.02); } 

    /* 相同说话人：基础压缩 */
    .srLine.same-speaker { 
        padding-top: 2px; 
        padding-bottom: 2px; 
    }

    /* 第一行重复（普通行 -> 相同行）: 负margin修正视觉间距 */
    .srLine:not(.same-speaker) + .srLine.same-speaker {
        margin-top: -16px; 
    }
    /* 后续重复（相同行 -> 相同行）: 紧贴 */
    .srLine.same-speaker + .srLine.same-speaker {
        margin-top: -2px;
    }

    .srLeft { width: 56px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; }

    /* [修改] 右下角行号样式 */
    .srLineNum { 
        font-size: 10px; 
        color: #80868b; 
        line-height: 1; 
        flex-shrink: 0;
        user-select: none;
        padding-bottom: 2px; /* 微调对齐 */
        transition: color 0.2s;
    }
    /* 行号悬停高亮（仅当可点击时生效，这里设为全局提示） */
    .srLineNum:hover { color: #8ab4f8; }

    .srAvatar { 
        width: 48px; height: 48px; 
        border-radius: 50%; 
        background: transparent; 
        overflow: hidden; display: flex; align-items: center; justify-content: center; 
    }

    .srBody { flex: 1 1 auto; }
    
    .srSpeaker { font-size: 13px; color: #bdc1c6; margin-bottom: 6px; display: flex; gap: 6px; align-items: center; }

    /* [新增] 气泡行容器：底部对齐 */
    .srBubbleRow {
        display: flex; 
        align-items: flex-end; /* 底部对齐 */
        gap: 6px; 
    }

    .srBubble { 
        display: inline-block; 
        padding: 10px 12px; 
        border-radius: 14px; 
        background: #ffffff; 
        color: #111111; 
        box-shadow: 0 1px 2px rgba(0,0,0,0.3); 
        max-width: 76vw; 
        word-break: break-word; 
        font-size: 15px; 
        line-height: 1.5; 
    }

    .srControlsSmall { display: flex; gap: 6px; align-items: center; }
    .srIconBtn { 
        border: none; background: #3c4043; color: #e8eaed; 
        font-size: 13px; cursor: pointer; border-radius: 4px; padding: 4px 8px; 
    }
    .srIconBtn:hover { background: #5f6368; }
    .srIconBtn.ghost { background: transparent; padding: 0; font-size: 16px; color: #9aa0a6; }
    
    .srNoteIcon { 
        font-size: 14px; padding: 4px; border-radius: 6px; 
        background: #3c4043; cursor: pointer; color: #8ab4f8; margin-left: 6px; border:none;
    }

    #srFooter { 
        padding: 8px 12px; 
        border-top: 1px solid #3c4043; 
        background: #2f3033; 
        display: flex; gap: 8px; align-items: center; flex-shrink: 0;
    }

    #srModal { position: fixed; left: 0; right: 0; top: 0; bottom: 0; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); z-index: 1000000; }
    #srModal .box { background: #2f3033; color: #e8eaed; padding: 12px; border-radius: 8px; max-width: 92%; max-height: 80%; overflow: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
    #srModal .title { color: #fff; font-weight: bold; }
    
    select { background: #3c4043; color: #fff; border: 1px solid #5f6368; border-radius: 4px; padding: 4px; }
    
    @media (min-width: 900px) {
        .srBubble { max-width: 720px; }
    }
    `;

    // ---------- ScriptReader 主体 ----------
    const ScriptReader = {
        state: {
            currentPath: "",
            script: [],
            translateMap: {},
            commuNote: {},
            meta: null,
            container: null,
            mode: "inline",
            speakerMap: window.ScriptReaderSpeakerMapping || {},
            currentAudio: null, // [New] 追踪当前播放的音频
        },

        async init(startPath) {
            if (document.getElementById("scriptReaderRoot")) return;
            this.injectStyle();

            let path = startPath;
            if (!path) {
                let defaultPath = localStorage.getItem("CommuSelector_LastPath");
                defaultPath = defaultPath ? defaultPath : "produce_events/102300304.json";
                path = prompt("输入脚本路径：", defaultPath);
            }
            if (!path) return;

            const root = el("div");
            root.id = "scriptReaderRoot";
            document.body.appendChild(root);
            this.state.container = root;

            await this.loadContent(path);
        },

        async loadContent(path) {
            this.state.currentPath = path;
            const root = this.state.container;

            if (root) {
                root.innerHTML = '<div style="display:flex;height:100%;align-items:center;justify-content:center;color:#888;">Loading...</div>';
            }

            try {
                this.state.script = [];
                this.state.translateMap = {};
                this.state.meta = null;
                // 切换内容时，停止正在播放的语音
                if (this.state.currentAudio) {
                    this.state.currentAudio.pause();
                    this.state.currentAudio = null;
                }

                await this.loadScript(assetUrl + `/json/` + path);
                const adv = new AdvPlayerShim();
                const tmap = await adv.getAndLoadTranslateScript(path);
                if (tmap) this.state.translateMap = tmap;
                const cn = new CommuNoteLoader();
                this.state.commuNote = await cn.load(COMMUNOTE_CSV_PATH);
                this.state.meta = await loadEventMeta(path);

                this.render();
            } catch (e) {
                alert("加载脚本失败：" + e);
                console.error(e);
                this.render();
            }
        },

        injectStyle() {
            if (document.getElementById("scriptReaderStyle")) return;
            const s = el("style");
            s.id = "scriptReaderStyle";
            s.innerHTML = STYLE;
            document.head.appendChild(s);
        },

        destroy() {
            // 销毁时停止音频
            if (this.state.currentAudio) {
                this.state.currentAudio.pause();
                this.state.currentAudio = null;
            }
            const root = this.state.container;
            if (root) root.remove();
            this.state.container = null;
        },

        async loadScript(fullUrl) {
            const txt = await safeFetchText(fullUrl);
            const j = JSON.parse(txt);

            // 1. 预处理：将 JSON 转换为标准化的行对象列表
            //    恢复了 (hasText || hasVoice) 的宽松条件，允许无文本行通过
            const rawLines = [];
            j.forEach((item) => {
                if (!item) return;
                const rawText = (item.text || "").trim();
                const rawVoice = (item.voice || "").trim();

                if (rawText.length > 0 || rawVoice.length > 0) {
                    rawLines.push({
                        _raw: item,
                        // index: 暂不分配，过滤后统一分配
                        id: item.id || item.lineId || null,
                        speaker: (item.speaker || "").trim(),
                        text: rawText,
                        textCtrl: item.textCtrl || null,
                        textFrame: item.textFrame || null,
                        voice: rawVoice,
                    });
                }
            });

            // 2. 识别需要保留的 Voice 行 (去重逻辑)
            //    规则：Voice 必须唯一。
            //    冲突解决：优先保留有文本的行；如果都有/都无文本，保留第一个出现的。
            const voiceGroups = new Map(); // Map<voiceId, Array<lineObj>>

            rawLines.forEach((line) => {
                if (line.voice) {
                    if (!voiceGroups.has(line.voice)) {
                        voiceGroups.set(line.voice, []);
                    }
                    voiceGroups.get(line.voice).push(line);
                }
            });

            const voiceLinesToKeep = new Set();

            for (const [voiceId, group] of voiceGroups) {
                if (group.length === 1) {
                    voiceLinesToKeep.add(group[0]);
                } else {
                    // 发现重复 Voice，执行优选逻辑
                    // 尝试找到第一个有文本的行
                    const withText = group.find((l) => l.text.length > 0);
                    if (withText) {
                        // 如果有带文本的行，保留它（丢弃其他的无文本行）
                        voiceLinesToKeep.add(withText);
                    } else {
                        // 如果全是无文本行，保留第一个
                        voiceLinesToKeep.add(group[0]);
                    }
                }
            }

            // 3. 构建最终列表（保持原始顺序）
            const finalLines = [];
            let validIndex = 0;

            rawLines.forEach((line) => {
                // 情况A: 纯文本行 (无 voice)，直接保留
                if (!line.voice) {
                    validIndex++;
                    line.index = validIndex;
                    finalLines.push(line);
                }
                // 情况B: 有 voice 的行，检查是否是“优胜者”
                else if (voiceLinesToKeep.has(line)) {
                    validIndex++;
                    line.index = validIndex;
                    finalLines.push(line);
                }
                // 情况C: 是多余的重复 voice 行，跳过不处理
            });

            this.state.script = finalLines;
        },

        extractVoiceId(voicePath) {
            if (!voicePath) return null;
            const parts = voicePath.split("/");
            return parts[parts.length - 1];
        },

        getSpeakerDisplay(speakerRaw) {
            if (!speakerRaw) return "";
            const commuSpeaker = (this.state.commuNote.speaker && this.state.commuNote.speaker[speakerRaw]) || null;
            if (commuSpeaker) return `${speakerRaw} / ${commuSpeaker}`;
            return speakerRaw;
        },

        getLineMainText(line) {
            if (line.text && line.text.trim() !== "") return line.text;
            const vid = this.extractVoiceId(line.voice);
            if (vid && this.state.commuNote.voice && this.state.commuNote.voice[vid]) {
                return this.state.commuNote.voice[vid];
            }
            return " ";
        },

        getAllNotesForLine(line) {
            const notes = [];
            if (line.speaker && this.state.commuNote.speaker && this.state.commuNote.speaker[line.speaker]) {
                notes.push({ type: "speaker", text: this.state.commuNote.speaker[line.speaker] });
            }
            const vid = this.extractVoiceId(line.voice);
            if (vid && this.state.commuNote.voice && this.state.commuNote.voice[vid]) {
                notes.push({ type: "voice", text: this.state.commuNote.voice[vid] });
            }
            if (line._raw && line._raw.still && this.state.commuNote.still && this.state.commuNote.still[line._raw.still]) {
                notes.push({ type: "still", text: this.state.commuNote.still[line._raw.still] });
            }
            return notes;
        },

        getTranslationFor(original) {
            if (!original) return "";
            return this.state.translateMap[original] || "";
        },

        getAvatarUrlBySpeaker(speakerText) {
            const map = this.state.speakerMap || {};
            let key = (speakerText || "").trim();
            if (!Object.prototype.hasOwnProperty.call(map, key)) {
                return null;
            }
            let id = map[key];
            id = String(id).padStart(3, "0");
            const base = (assetUrl || "").replace(/\/$/, "");
            return `${base}/images/content/characters/icon_circle_l/${id}.png`;
        },

        // [New] 播放语音方法
        playVoice(voicePath) {
            if (!voicePath) return;

            // 1. 停止之前的播放
            if (this.state.currentAudio) {
                this.state.currentAudio.pause();
                this.state.currentAudio = null;
            }

            // 2. 构建路径
            // 规则: ${assetUrl}/sounds/voice/events/${voice}.m4a
            // voice 字符串通常包含 "category/id/fileid"
            const base = (assetUrl || "").replace(/\/$/, "");
            const url = `${base}/sounds/voice/events/${voicePath}.m4a`;

            // 3. 播放
            const audio = new Audio(url);
            audio.volume = 1.0;
            audio.play().catch((e) => console.warn("[ScriptReader] Audio play failed", e));

            this.state.currentAudio = audio;
        },

        render() {
            const root = this.state.container;
            if (!root) return;
            root.innerHTML = "";

            // --- Header ---
            const header = el("div", "srHeader");
            header.id = "srHeader";

            const topRow = el("div", "srHeaderTop");
            const infoWrap = el("div", "srMeta");
            const title = el("div", "title", this.state.meta ? this.state.meta.title || "" : this.state.script.length > 0 ? "Script Loaded" : "No Script");
            const sub = el("div", "sub", this.state.meta ? this.state.meta.title_trans || "" : "");
            infoWrap.appendChild(title);
            infoWrap.appendChild(sub);

            const exitBtn = el("button", "srIconBtn ghost", "✕");
            exitBtn.title = "退出并返回";
            exitBtn.style.fontSize = "20px";
            exitBtn.onclick = () => {
                // ✅ 新增：退出前保存当前路径到本地存储
                // Key 必须与 CommuSelector 中定义的 STORAGE_KEY 保持一致
                if (this.state.currentPath) {
                    localStorage.setItem("CommuSelector_LastPath", this.state.currentPath);
                }

                this.destroy();
                // 返回 CommuSelector
                if (window.CommuSelector && typeof window.CommuSelector.init === "function") {
                    window.CommuSelector.init();
                }
            };

            topRow.appendChild(infoWrap);
            topRow.appendChild(exitBtn);
            header.appendChild(topRow);

            const ctrlRow = el("div", "srHeaderControls");

            const sel = el("select");
            ["inline", "side-by-side", "jp-only", "zh-only"].forEach((v) => {
                const o = el("option");
                o.value = v;
                o.textContent = v;
                if (v === this.state.mode) o.selected = true;
                sel.appendChild(o);
            });
            sel.onchange = (e) => {
                this.state.mode = e.target.value;
                this.render();
            };
            ctrlRow.appendChild(sel);

            const pathInput = el("input", "srPathInput");
            pathInput.type = "text";
            pathInput.value = this.state.currentPath || "";
            pathInput.placeholder = "produce_events/xxxx.json";
            ctrlRow.appendChild(pathInput);

            const loadBtn = el("button", "srIconBtn", "跳转");
            loadBtn.onclick = () => {
                const val = pathInput.value.trim();
                if (val) this.loadContent(val);
            };
            ctrlRow.appendChild(loadBtn);

            header.appendChild(ctrlRow);
            root.appendChild(header);

            // --- Content ---
            const content = el("div", "srContent");

            let lastSpeaker = null;

            for (const line of this.state.script) {
                const showSpeakerInfo = line.speaker !== lastSpeaker;
                lastSpeaker = line.speaker;

                const row = el("div", "srLine");
                if (!showSpeakerInfo) {
                    row.classList.add("same-speaker");
                }

                const left = el("div", "srLeft");
                // 左侧不再显示行号，只负责头像

                const avatarWrap = el("div", "srAvatar");
                if (line.speaker && showSpeakerInfo) {
                    const avatarUrl = this.getAvatarUrlBySpeaker(line.speaker);
                    if (avatarUrl) {
                        const avatarImg = new Image();
                        avatarImg.style.width = "100%";
                        avatarImg.style.height = "100%";
                        avatarImg.style.objectFit = "cover";
                        avatarImg.alt = line.speaker;
                        avatarImg.src = avatarUrl;
                        avatarImg.onerror = () => {
                            avatarImg.style.display = "none";
                        };
                        avatarWrap.appendChild(avatarImg);
                    }
                }

                left.appendChild(avatarWrap);
                row.appendChild(left);

                const body = el("div", "srBody");

                if (showSpeakerInfo) {
                    const speakerRow = el("div", "srSpeaker");
                    const speakerName = el("div", null, this.getSpeakerDisplay(line.speaker));
                    speakerRow.appendChild(speakerName);

                    const smallC = el("div", "srControlsSmall");

                    let notes = this.getAllNotesForLine(line);
                    notes = notes.filter((n) => n.type !== "speaker");
                    const shouldShowNoteBtn = false;

                    if (shouldShowNoteBtn && notes.length > 0) {
                        const noteI = el("button", "srNoteIcon", "ⓘ");
                        noteI.title = "查看注释";
                        noteI.onclick = (e) => {
                            e.stopPropagation();
                            this.showNotesModal(notes, line);
                        };
                        smallC.appendChild(noteI);
                    }

                    speakerRow.appendChild(smallC);
                    body.appendChild(speakerRow);
                }

                // 创建气泡行容器 (Bubble Row)
                const bubbleRow = el("div", "srBubbleRow");

                const bubble = el("div", "srBubble", "");
                const mainText = this.getLineMainText(line);

                if (this.state.mode === "jp-only") {
                    bubble.textContent = mainText;
                } else if (this.state.mode === "zh-only") {
                    // 没有翻译时回退显示原文
                    bubble.textContent = this.getTranslationFor(mainText) || mainText;
                } else if (this.state.mode === "side-by-side") {
                    const jpBlock = el("div", null, mainText);
                    jpBlock.style.marginBottom = "6px";
                    const zhBlock = el("div", null, this.getTranslationFor(mainText) || "（未翻译）");
                    zhBlock.style.color = "#666";
                    bubble.appendChild(jpBlock);
                    bubble.appendChild(zhBlock);
                } else {
                    bubble.textContent = mainText;
                    const zh = this.getTranslationFor(mainText);
                    if (zh) {
                        const zhDiv = el("div", null, zh);
                        zhDiv.style.marginTop = "6px";
                        zhDiv.style.fontSize = "13px";
                        zhDiv.style.color = "#666";
                        bubble.appendChild(zhDiv);
                    }
                }

                // 将气泡放入容器
                bubbleRow.appendChild(bubble);

                // [修改] 行号逻辑：如果有语音，添加点击播放功能
                const ln = el("div", "srLineNum", String(line.index).padStart(3, "0"));

                if (line.voice) {
                    ln.style.cursor = "pointer";
                    ln.title = "点击播放语音";
                    ln.onclick = (e) => {
                        e.stopPropagation();
                        this.playVoice(line.voice);
                    };
                }

                bubbleRow.appendChild(ln);

                body.appendChild(bubbleRow);
                row.appendChild(body);
                content.appendChild(row);
            }

            root.appendChild(content);

            // --- Footer ---
            const footer = el("div", "srFooter");
            footer.id = "srFooter";
            const prevBtn = el("button", "srIconBtn", "Prev");
            const nextBtn = el("button", "srIconBtn", "Next");
            prevBtn.onclick = () => this.gotoAdjacent(-1);
            nextBtn.onclick = () => this.gotoAdjacent(1);
            footer.appendChild(prevBtn);
            footer.appendChild(nextBtn);

            const jumpAll = el("div", null, `共 ${this.state.script.length} 行`);
            footer.appendChild(jumpAll);

            root.appendChild(footer);

            // --- Modal ---
            const modal = el("div");
            modal.id = "srModal";
            const box = el("div", "box");
            modal.appendChild(box);
            root.appendChild(modal);
        },

        showNotesModal(notes, line) {
            const modal = $("#srModal");
            modal.style.display = "flex";
            const box = modal.querySelector(".box");
            box.innerHTML = "";
            const title = el("div", "title", `注释 - 行 ${line.index}`);
            title.style.marginBottom = "8px";
            box.appendChild(title);
            for (const it of notes) {
                const t = el("div", null, `<strong>[${it.type}]</strong> ${it.text}`);
                t.style.marginBottom = "8px";
                box.appendChild(t);
            }
            const close = el("button", "srIconBtn", "关闭");
            close.onclick = () => (modal.style.display = "none");
            box.appendChild(close);
        },

        gotoAdjacent(offset) {
            if (!this.state.meta || !this.state.meta.playlist || this.state.meta.playlist.length === 0) {
                alert("无可用播放序列");
                return;
            }
            let idx = this.state.meta.playlist.indexOf(this.state.currentPath);
            if (idx === -1) {
                idx = this.state.meta.playlist.findIndex((p) => p.includes(this.state.currentPath) || this.state.currentPath.includes(p));
            }

            if (idx === -1) {
                alert("当前条目未在播放序列中");
                return;
            }
            const targetIdx = idx + offset;
            if (targetIdx < 0 || targetIdx >= this.state.meta.playlist.length) {
                alert("没有更多章节");
                return;
            }
            const targetPath = this.state.meta.playlist[targetIdx];
            this.loadContent(targetPath);
        },
    };

    window.ScriptReader = ScriptReader;
})();
