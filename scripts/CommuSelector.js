/*
CommuSelector.js - 完整版本整合
- 字体白色，黑色背景
- 垂直布局
- 类别选择器存在，当选择 game_event_communications 时预设ID前四位为4001
- ID支持分位点击/拖拽及直接输入
- game_event_communications类别时ID更新通过 /assets/data/CommuList_events.json 获取信息
- 显示格式为 indexname:title，并显示对应标题图
*/

var CommuSelector = (function () {
    const TYPE_TO_PATH = {
        game_event_communications: "game_event_communications",
        "produce_events (card)": "produce_events",
        "produce_events (idol)": "produce_events",
    };
    const DEFAULT_DIGITS = 9;
    const STORAGE_KEY = "CommuSelector_LastPath";

    const DEFAULT_IDS = {
        game_event_communications: "400100101",
        "produce_events (card)": "200100301",
        "produce_events (idol)": "100100101",
    };

    // 当前会话中用户的编辑值（不会写入缓存）
    const currentEditIds = { ...DEFAULT_IDS };

    function getQueryVariable(name, fallback) {
        const params = new URLSearchParams(window.location.search);
        return params.has(name) ? params.get(name) : fallback;
    }

    function el(tag, cls, inner) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (inner !== undefined) e.innerHTML = inner;
        return e;
    }

    function padId(idStr, digits) {
        idStr = String(idStr || "").replace(/\D/g, "");
        while (idStr.length < digits) idStr = "0" + idStr;
        return idStr.slice(-digits);
    }

    // async function fetchPreviewForGameCommu(id) {
    async function fetchPreview(id, type) {
        let data = [];
        try {
            let url = "";
            if (type === "game_event_communications") {
                url = "/assets/data/CommuList_events.json";
            } else if (type === "produce_events (card)") {
                url = "/assets/data/CommuList_card.json";
            } else {
                console.warn("未处理的类型:", type);
                return null;
            }

            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();

            if (type === "game_event_communications") {
                data = json.filter((item) => item.eventSourceData.eventType === "produce_marathon");
            } else if (type === "produce_events (card)") {
                data = json; // card 类型直接使用全部记录
            }
        } catch (e) {
            console.error(`无法加载 ${type} 对应 JSON`, e);
        }

        return data.find((item) => String(item.eventId) === id);
    }
    function init() {
        const digits = DEFAULT_DIGITS;

        if (document.getElementById("commu-selector-root")) return;

        const root = el("div", "commu-root");
        root.id = "commu-selector-root";
        document.body.appendChild(root);

        const style = el("style");
        style.innerText = `
.commu-root{position:fixed;inset:0;z-index:2147483646;background:linear-gradient(180deg,#0b1220,#0f1724);color:#fff;font-family:Inter,Roboto,Arial,sans-serif;display:flex;flex-direction:column;align-items:center;padding:20px;overflow-y:auto}
.commu-title{font-size:22px;font-weight:700;margin-bottom:12px}
.commu-main{width:100%;max-width:900px;display:flex;flex-direction:column;align-items:center;gap:16px}
.type-select,.input-id,.fav-select{width:80%;max-width:400px;padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:#fff;font-size:15px}
.type-select option,.fav-select option{background:#0f1724;color:#fff}
.digits-wrap{display:flex;gap:8px;align-items:flex-end;justify-content:center;overflow-x:auto;padding-bottom:12px;width:100%}
.digit-col{width:50px;height:200px;background:rgba(255,255,255,0.05);border-radius:10px;display:flex;flex-direction:column;align-items:center;padding:8px;color:#fff}
.digit-display{font-size:30px;font-weight:700;height:46px;line-height:46px}
.btn-small{padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:transparent;cursor:pointer;color:#fff}
.preview-img{width:100%;height:260px;object-fit:contain;border-radius:12px;background:linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))}
.path-display{font-size:14px;opacity:0.9;word-break:break-all}
.open-btn{padding:14px 18px;border-radius:14px;background:linear-gradient(90deg,#2dd4bf,#38bdf8);color:#022;cursor:pointer;border:none;font-weight:700;width:80%;max-width:400px;text-align:center}
.small-muted{font-size:13px;opacity:0.85}
.fetch-error{color:#ffb4b4}
.fav-wrap{display:flex;flex-direction:column;align-items:flex-start;width:80%;max-width:400px;margin-top:8px;gap:4px}
`;

        document.head.appendChild(style);

        const title = el("div", "commu-title", "CommuSelector - 可视化剧情选择器");

        const main = el("div", "commu-main");
        root.appendChild(title);
        root.appendChild(main);

        // 类型选择器（扩展为 card/ idol 标签）
        const typeSelect = document.createElement("select");
        typeSelect.className = "type-select";
        ["game_event_communications", "produce_events (card)", "produce_events (idol)"].forEach((t) => {
            const opt = document.createElement("option");
            opt.value = t;
            opt.textContent = t;
            typeSelect.appendChild(opt);
        });

        let selectedType = typeSelect.value;

        main.appendChild(document.createElement("div")).innerText = "剧情类型";
        main.appendChild(typeSelect);

        const inputId = el("input", "input-id");
        inputId.placeholder = "直接输入ID或使用下方控件";
        main.appendChild(inputId);

        const digitsWrap = el("div", "digits-wrap");
        main.appendChild(digitsWrap);

        const previewImg = el("img", "preview-img");
        previewImg.alt = "预览图";
        const nameDisplay = el("div", "small-muted", "名称：(未加载)");
        const pathDisplay = el("div", "path-display", "");
        const openBtn = el("button", "open-btn", "打开剧情");

        main.appendChild(previewImg);
        main.appendChild(nameDisplay);
        main.appendChild(pathDisplay);
        main.appendChild(openBtn);

        // 添加清除 lastPath 按钮到 main 容器
        const clearBtn = document.createElement("button");
        clearBtn.className = "commu-close";
        clearBtn.innerText = "清除上次路径";
        clearBtn.style.marginTop = "8px";
        clearBtn.onclick = () => {
            localStorage.removeItem(STORAGE_KEY);
            alert("已清除上次访问路径");
        };
        main.appendChild(clearBtn);

        let digitsState = new Array(digits).fill(0);

        digitsState = currentEditIds[selectedType].split("").map((d) => parseInt(d));
        inputId.value = digitsState.join("");

        typeSelect.addEventListener("change", () => {
            // 保存当前类别的编辑状态（仅内存）
            currentEditIds[selectedType] = digitsState.join("");

            // 更新选择
            selectedType = typeSelect.value;

            // 加载目标类别的编辑状态
            const newId = currentEditIds[selectedType] || DEFAULT_IDS[selectedType];
            digitsState = newId.split("").map((d) => parseInt(d));
            inputId.value = digitsState.join("");

            renderDigits();
            updatePathAndPreview();
        });

        // 初始化上次访问状态

        let lastPath = localStorage.getItem(STORAGE_KEY);

        if (lastPath) {
            const parts = lastPath.split("/");
            if (parts.length === 2) {
                const storedType = parts[0]; // 实际路径类型，例如 "produce_events"
                const storedId = parts[1].replace(".json", "");

                // 判断是否属于 produce_events (card)
                let mappedType = storedType;
                if (storedType === "produce_events") {
                    if (["2", "3"].includes(storedId[0])) {
                        mappedType = "produce_events (card)";
                    } else {
                        mappedType = "produce_events (idol)"; // 预留未来类别
                    }
                }

                selectedType = mappedType;
                typeSelect.value = selectedType; // 同步下拉列表显示
                digitsState = storedId.split("").map((d) => parseInt(d));
                inputId.value = digitsState.join("");
            }
        } else {
            // 没有 lastPath 时给每个类别默认值
            const DEFAULTS = {
                game_event_communications: "400100101",
                "produce_events (card)": "200100301",
                "produce_events (idol)": "300100301", // 预留，未来可修改
            };

            // 根据当前 selectedType 设置 digitsState
            const defaultId = DEFAULTS[selectedType] || "000000000";
            digitsState = defaultId.split("").map((d) => parseInt(d));
            inputId.value = digitsState.join("");
        }

        inputId.addEventListener("input", () => {
            const val = padId(inputId.value, digits);
            digitsState = val.split("").map((x) => parseInt(x));
            currentEditIds[selectedType] = val; // 同步内存状态
            renderDigits();
            updatePathAndPreviewDebounced();
        });

        function renderDigits() {
            digitsWrap.innerHTML = "";
            for (let i = 0; i < digits; i++) {
                const col = el("div", "digit-col");
                const up = el("button", "btn-small", "▲");
                const disp = el("div", "digit-display", String(digitsState[i]));
                const down = el("button", "btn-small", "▼");
                up.onclick = () => setDigitWithCarry(i, digitsState[i] + 1);
                down.onclick = () => setDigit(i, (digitsState[i] + 9) % 10);
                col.appendChild(up);
                col.appendChild(disp);
                col.appendChild(down);
                digitsWrap.appendChild(col);
                // 绑定拖动
                addDragControl(col, i);
            }
        }

        function setDigit(index, val) {
            //无进位
            val = (((parseInt(val) || 0) % 10) + 10) % 10;
            digitsState[index] = val;
            const disp = digitsWrap.children[index].querySelector(".digit-display");
            disp.textContent = String(val);
            inputId.value = digitsState.join("");

            // 更新当前类别的编辑状态（仅内存）
            currentEditIds[selectedType] = digitsState.join("");
            updatePathAndPreviewDebounced();
        }

        function setDigitWithCarry(index, val) {
            //进位
            val = parseInt(val) || 0;

            if (val > 9) {
                // 当前位归 0，上一位进1
                digitsState[index] = 0;
                if (index > 0) {
                    setDigitWithCarry(index - 1, digitsState[index - 1] + 1);
                }
            } else {
                digitsState[index] = val % 10;
            }

            const disp = digitsWrap.children[index].querySelector(".digit-display");
            disp.textContent = String(digitsState[index]);
            inputId.value = digitsState.join("");
            // 更新当前类别的编辑状态（仅内存）
            currentEditIds[selectedType] = digitsState.join("");
            updatePathAndPreviewDebounced();
        }
        function getEventIdFromDigits() {
            return digitsState.join("");
        }

        let debounceTimer = null;
        function updatePathAndPreviewDebounced() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(updatePathAndPreview, 150);
        }

        async function updatePathAndPreview() {
            if (selectedType === "game_event_communications") {
                // // 前四位固定为 4001
                // if (digitsState.slice(0, 4).join("") !== "4001") {
                //     digitsState[0] = 4;
                //     digitsState[1] = 0;
                //     digitsState[2] = 0;
                //     digitsState[3] = 1;
                //     inputId.value = digitsState.join("");
                // }

                const eventObj = await fetchPreview(digitsState.join(""), selectedType);

                pathDisplay.textContent = `game_event_communications/${digitsState.join("")}.json`;
                if (eventObj) {
                    const title = `${eventObj.eventSourceData.eventIndexName}:${eventObj.eventSourceData.eventTitle}`;
                    nameDisplay.innerHTML = `名称：${title}`;
                    const albumIdPadded = eventObj.eventSourceData.albumId.toString().padStart(5, "0");
                    previewImg.src = `${assetUrl}/images/content/produce_marathons/album_banner/${albumIdPadded}.png`;

                    previewImg.style.transform = "scale(1)";
                    previewImg.style.objectFit = "contain";

                    previewImg.onload = () => {
                        const scaleFactor = 1.2;
                        previewImg.style.maxHeight = `${previewImg.naturalHeight * scaleFactor}px`;
                    };
                } else {
                    nameDisplay.innerHTML = "名称：(未找到)";
                    previewImg.src = "";
                    previewImg.style.transform = "";
                }
            } else if (selectedType === "produce_events (card)") {
                const eventIdStr = digitsState.join("");
                let idolType = eventIdStr[0] === "2" ? "idols" : "support_idols";

                const eventObj = await fetchPreview(eventIdStr, selectedType);

                pathDisplay.textContent = `produce_events/${eventIdStr}.json`;

                if (eventObj) {
                    const title = `${eventObj.eventSourceData.cardName}:${eventObj.eventSourceData.eventTitle}`;
                    nameDisplay.innerHTML = `名称：${title}`;
                    previewImg.src = `${assetUrl}/images/content/${idolType}/card_thumbnail/${eventObj.eventSourceData.enzaId}.jpg`;

                    previewImg.style.transform = "scale(1)";
                    previewImg.style.objectFit = "contain";
                    previewImg.onload = () => {
                        const scaleFactor = 1;
                        previewImg.style.maxHeight = `${previewImg.naturalHeight * scaleFactor}px`;
                    };
                } else {
                    nameDisplay.innerHTML = "名称：(未找到)";
                    previewImg.src = "";
                    previewImg.style.transform = "";
                }
            } else {
                const id = getEventIdFromDigits();
                pathDisplay.textContent = `${selectedType}/${id}.json`;
                nameDisplay.innerHTML = "(未处理)";
                previewImg.src = "";
                previewImg.style.transform = "";
            }
        }

        function addDragControl(col, index) {
            let startY = 0;
            let startVal = digitsState[index];

            const onMouseMove = (e) => {
                const delta = startY - e.clientY;
                const step = Math.floor(delta / 300 / window.devicePixelRatio); // 每50px增加1
                let newVal = (startVal + step) % 10;
                if (newVal < 0) newVal += 10;
                setDigit(index, newVal);
            };

            const onMouseUp = () => {
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
            };

            col.addEventListener("mousedown", (e) => {
                startY = e.clientY;
                startVal = digitsState[index];
                window.addEventListener("mousemove", onMouseMove);
                window.addEventListener("mouseup", onMouseUp);
            });

            // 移动端触摸支持
            col.addEventListener("touchstart", (e) => {
                startY = e.touches[0].clientY;
                startVal = digitsState[index];
            });

            col.addEventListener("touchmove", (e) => {
                const delta = startY - e.touches[0].clientY;
                const step = Math.floor(delta / 20);
                let newVal = (startVal + step) % 10;
                if (newVal < 0) newVal += 10;
                setDigit(index, newVal);
            });

            col.addEventListener("touchend", () => {
                startY = 0;
            });
        }

        openBtn.onclick = () => {
            const id = padId(getEventIdFromDigits(), digits);
            // 保存最后播放路径
            const pathType = TYPE_TO_PATH[selectedType] || selectedType;
            localStorage.setItem(STORAGE_KEY, `${pathType}/${id}.json`);
            window.location.search = `eventType=${encodeURIComponent(pathType)}&eventId=${encodeURIComponent(id)}`;
        };

        renderDigits();
        updatePathAndPreview();
        loadFavoritesDropdown();

        async function loadFavoritesDropdown() {
            try {
                const res = await fetch("/assets/data/CommuList_favorites.json", { cache: "no-store" });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const favs = await res.json();
                if (!Array.isArray(favs)) throw new Error("收藏数据应为数组");

                // 容器
                const favWrap = el("div", "fav-wrap");
                const favLabel = el("div", "small-muted", "常用剧情");
                const favSelect = document.createElement("select");
                favSelect.className = "fav-select";

                // 默认提示项
                const defaultOpt = document.createElement("option");
                defaultOpt.value = "";
                defaultOpt.textContent = "选择收藏剧情";
                favSelect.appendChild(defaultOpt);

                // 填充收藏选项
                favs.forEach((path) => {
                    const opt = document.createElement("option");
                    opt.value = path;
                    opt.textContent = path;
                    favSelect.appendChild(opt);
                });

                // 选择事件
                favSelect.onchange = () => {
                    const path = favSelect.value;
                    if (!path) return;

                    const [typeRaw, file] = path.split("/");
                    const id = file.replace(".json", "");
                    let typeLabel = typeRaw;

                    if (typeRaw === "produce_events") {
                        typeLabel = ["2", "3"].includes(id[0]) ? "produce_events (card)" : "produce_events (idol)";
                    }

                    // 同步UI
                    typeSelect.value = typeLabel;
                    selectedType = typeLabel;
                    digitsState = id.split("").map((d) => parseInt(d));
                    inputId.value = id;

                    renderDigits();
                    updatePathAndPreview();

                    // 恢复默认项以便下次可重新选择
                    favSelect.value = "";
                };

                favWrap.appendChild(favLabel);
                favWrap.appendChild(favSelect);
                main.appendChild(favWrap);
            } catch (e) {
                console.error("加载收藏剧情失败：", e);
            }
        }
    }

    return { init };
})();
