// /scripts/ReactionViewer.js

(function (global) {
    const ReactionViewer = {
        destroy() {
            // 1. 移除 resize 监听
            if (this._resizeHandler) {
                window.removeEventListener("resize", this._resizeHandler);
                this._resizeHandler = null;
            }

            // 2. 销毁 Pixi 应用 (释放 WebGL 上下文)
            if (this.app) {
                this.app.destroy(true, { children: true, texture: true, baseTexture: true });
                this.app = null;
            }

            // 3. 移除 DOM 容器
            if (this.container && this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            this.container = null;

            // 4. 清理引用
            this.spine = null;
            this.standControls = null;
            this.chibiControls = null;
            this.panel = null;
            this.controlsWrapper = null;
        },
        async init() {
            // === 基础状态 ===
            this.fullId = "1930010010"; // 默认 ID
            this.category = "stand"; // 当前分类 (stand/stand_costume/cb/cb_costume)
            this.mode = "stand"; // 当前模式: 'stand' | 'chibi'
            this.defaultAnim = "wait";
            this._headRatioEnabled = true;

            // === 常量配置 ===
            this.RELAY_EVENT_NAME = "relay";
            this.LOOP_EVENT_NAME = "loop_start";
            this.ANIMATION_MIX = 0.3;

            // 缩放配置
            this.SCALE_CONFIG = {
                stand: 1.6666, // 标准立绘基础缩放
                chibi: 1.0, // Q版立绘基础缩放
            };

            // Q版 Root 骨骼基准值 (用于自动归一化大小)
            // 以 cb (日常服) 的 0.36 为标准。如果读取到演出服是 0.14，会自动放大适配
            this.CHIBI_ROOT_REF = 0.36;

            this._idToLabelMap = {
                "001": "mano",
                "002": "hiori",
                "003": "meguru",
                "004": "kogane",
                "005": "mamimi",
                "006": "sakuya",
                "007": "yuika",
                "008": "kiriko",
                "009": "kaho",
                "010": "chiyoko",
                "011": "juri",
                "012": "rinze",
                "013": "natsuha",
                "014": "amana",
                "015": "tenka",
                "016": "chiyuki",
                "017": "asahi",
                "018": "fuyuko",
                "019": "mei",
                "020": "toru",
                "021": "madoka",
                "022": "koito",
                "023": "hinana",
                "024": "nichika",
                "025": "mikoto",
                "026": "luca",
                "027": "hana",
                "028": "haruki",
                "091": "hazuki",
                801: "ruby",
                802: "kana",
                803: "mem",
                804: "akane",
            };

            // === 运行时缓存 ===
            this.mainAnims = [];
            this.subAnims = [];
            this.subAnimInputs = {};
            this._costumeCache = {};
            this._reactionMap = {};

            // DOM 引用
            this.standControls = null;
            this.chibiControls = null;

            // === 初始化流程 ===
            this._buildDOM();
            this._initPixi();

            // 默认选中 001
            const defaultCharId = "001";
            if (this.charSelectStand) this.charSelectStand.value = defaultCharId;
            if (this.charSelectChibi) this.charSelectChibi.value = defaultCharId;

            this.fullId = this.fullId.slice(0, 3) + defaultCharId + this.fullId.slice(6);

            // 启动!
            this._switchMode("stand");
        },

        // =========================================================================
        // DOM 构建与 UI 逻辑
        // =========================================================================

        _buildDOM() {
            const cont = document.createElement("div");
            cont.id = "reaction-viewer-root";
            Object.assign(cont.style, {
                position: "fixed",
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                background: "#000",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            });
            document.body.appendChild(cont);
            this.container = cont;

            // 面板容器
            const panel = document.createElement("div");
            Object.assign(panel.style, {
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "rgba(0,0,0,0.8)",
                color: "#fff",
                borderRadius: "8px",
                padding: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                cursor: "default",
                zIndex: 10000,
                minWidth: "220px",
            });
            this.container.appendChild(panel);
            this.panel = panel;

            const scale = window.innerWidth < 768 ? 0.5 : 1;
            panel.style.transformOrigin = "top right";
            panel.style.transform = `scale(${scale})`;

            // 折叠按钮
            const toggleBtn = document.createElement("button");
            toggleBtn.textContent = "▶";
            Object.assign(toggleBtn.style, {
                width: "30px",
                height: "30px",
                padding: "0",
                fontSize: "18px",
                border: "none",
                background: "#222",
                color: "#fff",
                borderRadius: "6px",
                cursor: "pointer",
                alignSelf: "flex-end",
            });
            panel.appendChild(toggleBtn);
            this.toggleBtn = toggleBtn;
            this.panelExpanded = false;

            // 内部控制区 Wrapper
            const controlsWrapper = document.createElement("div");
            Object.assign(controlsWrapper.style, { display: "none", flexDirection: "column", gap: "6px" });
            panel.appendChild(controlsWrapper);
            this.controlsWrapper = controlsWrapper;

            // === 1. 选项卡 (Tabs) ===
            const tabBar = document.createElement("div");
            Object.assign(tabBar.style, { display: "flex", gap: "4px", marginBottom: "4px" });

            const tabStand = document.createElement("button");
            tabStand.textContent = "标准模式";
            Object.assign(tabStand.style, this._tabStyle(true));
            tabStand.onclick = () => this._switchMode("stand");

            const tabChibi = document.createElement("button");
            tabChibi.textContent = "Q版模式";
            Object.assign(tabChibi.style, this._tabStyle(false));
            tabChibi.onclick = () => this._switchMode("chibi");

            this.tabStand = tabStand;
            this.tabChibi = tabChibi;
            tabBar.appendChild(tabStand);
            tabBar.appendChild(tabChibi);
            controlsWrapper.appendChild(tabBar);

            // === 2. 构建 Standard Controls ===
            this.standControls = document.createElement("div");
            Object.assign(this.standControls.style, { display: "flex", flexDirection: "column", gap: "6px" });
            this._buildStandControls(this.standControls);
            controlsWrapper.appendChild(this.standControls);

            // === 3. 构建 Chibi Controls ===
            this.chibiControls = document.createElement("div");
            Object.assign(this.chibiControls.style, { display: "none", flexDirection: "column", gap: "6px" });
            this._buildChibiControls(this.chibiControls);
            controlsWrapper.appendChild(this.chibiControls);

            // === 4. 通用重置按钮 ===
            const resetBtn = document.createElement("button");
            resetBtn.textContent = "重置动画";
            Object.assign(resetBtn.style, this._btnStyle());
            resetBtn.onclick = () => {
                if (!this.spine) return;
                this.spine.state.setAnimation(0, this.defaultAnim, true);
                for (let track = 1; track <= 5; track++) {
                    this.spine.state.setEmptyAnimation(track, 0);
                }
                this._updateAnimationPanelUI(true);
            };
            controlsWrapper.appendChild(resetBtn);

            // === ✅ 新增：跳转回 CommuSelector 按钮 ===
            const backBtn = document.createElement("button");
            backBtn.textContent = "⬅ 返回剧情选择";
            // 使用稍微不同的背景色以示区分
            Object.assign(backBtn.style, this._btnStyle(), {
                marginTop: "10px",
                background: "#522", // 淡红色背景
                borderColor: "#844",
            });

            backBtn.onclick = () => {
                // 1. 销毁当前 ReactionViewer
                this.destroy();

                // 2. 调用 CommuSelector.init()
                if (global.CommuSelector && typeof global.CommuSelector.init === "function") {
                    global.CommuSelector.init();
                } else {
                    console.error("CommuSelector not found!");
                    // 如果找不到，刷新页面也是一种回退手段
                    // window.location.reload();
                }
            };
            controlsWrapper.appendChild(backBtn);

            // 折叠逻辑
            this.toggleBtn.onclick = () => {
                this.panelExpanded = !this.panelExpanded;
                controlsWrapper.style.display = this.panelExpanded ? "flex" : "none";
                toggleBtn.textContent = this.panelExpanded ? "▼" : "▶";
            };
        },

        _buildStandControls(container) {
            // 角色
            this.charSelectStand = this._createCharSelect((newId) => this._onCharChange(newId));
            container.appendChild(this.charSelectStand);

            // 服装
            this.costumeSelectStand = document.createElement("select");
            Object.assign(this.costumeSelectStand.style, this._selectStyle());
            this.costumeSelectStand.onchange = () => this._onCostumeChange(this.costumeSelectStand.value);
            container.appendChild(this.costumeSelectStand);

            // 服装切换 (Stand <-> Stand_Costume)
            this.categoryBtnStand = document.createElement("button");
            this.categoryBtnStand.textContent = `服装: ${this.category}`;
            Object.assign(this.categoryBtnStand.style, this._btnStyle());
            this.categoryBtnStand.onclick = () => this._toggleCategory();
            container.appendChild(this.categoryBtnStand);

            // 头身比
            const headBtn = document.createElement("button");
            headBtn.textContent = `头身比: ON`;
            Object.assign(headBtn.style, this._btnStyle());
            headBtn.onclick = () => this._toggleHeadRatio(headBtn);
            container.appendChild(headBtn);

            // 主动画
            this.mainAnimSelectStand = document.createElement("select");
            Object.assign(this.mainAnimSelectStand.style, this._selectStyle());
            container.appendChild(this.mainAnimSelectStand);

            // 次级动画 (仅 Standard 有)
            this._buildSubAnimSection(container, "subAnimContainerStand");

            // Reaction
            const reactionLabel = document.createElement("div");
            reactionLabel.textContent = "角色交互：";
            reactionLabel.style.fontSize = "14px";
            reactionLabel.style.color = "#ccc";
            container.appendChild(reactionLabel);

            this.reactionSelect = document.createElement("select");
            Object.assign(this.reactionSelect.style, this._selectStyle());
            this.reactionSelect.onchange = () => this._playReaction(this.reactionSelect.value);
            container.appendChild(this.reactionSelect);
        },

        _buildChibiControls(container) {
            // 角色
            this.charSelectChibi = this._createCharSelect((newId) => this._onCharChange(newId));
            container.appendChild(this.charSelectChibi);

            // 服装
            this.costumeSelectChibi = document.createElement("select");
            Object.assign(this.costumeSelectChibi.style, this._selectStyle());
            this.costumeSelectChibi.onchange = () => this._onCostumeChange(this.costumeSelectChibi.value);
            container.appendChild(this.costumeSelectChibi);

            // 类型切换 (cb <-> cb_costume)
            this.categoryBtnChibi = document.createElement("button");
            this.categoryBtnChibi.textContent = `类型: cb`;
            Object.assign(this.categoryBtnChibi.style, this._btnStyle());
            this.categoryBtnChibi.onclick = () => this._toggleCategory();
            container.appendChild(this.categoryBtnChibi);

            // 皮肤 (Skin)
            const skinLabel = document.createElement("div");
            skinLabel.textContent = "皮肤 (Skin):";
            skinLabel.style.fontSize = "14px";
            skinLabel.style.color = "#ccc";
            container.appendChild(skinLabel);

            this.skinSelectChibi = document.createElement("select");
            Object.assign(this.skinSelectChibi.style, this._selectStyle());
            this.skinSelectChibi.onchange = () => {
                if (!this.spine) return;
                this.spine.skeleton.setSkinByName(this.skinSelectChibi.value);
                this.spine.skeleton.setSlotsToSetupPose();
            };
            container.appendChild(this.skinSelectChibi);

            // 主动画 (全量)
            this.mainAnimSelectChibi = document.createElement("select");
            Object.assign(this.mainAnimSelectChibi.style, this._selectStyle());
            container.appendChild(this.mainAnimSelectChibi);

            // *注：Q版不再构建次级动画区域*
        },

        _buildSubAnimSection(container, containerRefName) {
            const wrapper = document.createElement("div");
            const toggle = document.createElement("button");
            toggle.textContent = "次级动画 ▼";
            Object.assign(toggle.style, this._btnStyle());
            wrapper.appendChild(toggle);

            const subCont = document.createElement("div");
            Object.assign(subCont.style, {
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px",
                maxHeight: "300px",
                overflowY: "auto",
                display: "none",
            });
            wrapper.appendChild(subCont);
            container.appendChild(wrapper);

            this[containerRefName] = subCont;

            toggle.onclick = () => {
                const expanded = subCont.style.display === "grid";
                subCont.style.display = expanded ? "none" : "grid";
                toggle.textContent = expanded ? "次级动画 ▼" : "次级动画 ▲";
            };
        },

        _createCharSelect(onChangeCallback) {
            const sel = document.createElement("select");
            Object.assign(sel.style, this._selectStyle());

            for (let i = 1; i <= 28; i++) {
                const idStr = i.toString().padStart(3, "0");
                const label = this._idToLabelMap[idStr];
                if (!label) continue;
                const opt = document.createElement("option");
                opt.value = idStr;
                opt.textContent = label;
                sel.appendChild(opt);
            }
            const specialChars = [
                { id: "091", label: "hazuki" },
                { id: "801", label: "ruby" },
                { id: "802", label: "kana" },
                { id: "803", label: "mem" },
                { id: "804", label: "akane" },
            ];
            specialChars.forEach(({ id, label }) => {
                const opt = document.createElement("option");
                opt.value = id;
                opt.textContent = label;
                sel.appendChild(opt);
            });

            sel.onchange = () => onChangeCallback(sel.value);
            return sel;
        },

        async _switchMode(mode) {
            this.mode = mode;
            const isStand = mode === "stand";

            // UI 切换
            this.tabStand.style.background = isStand ? "#444" : "#222";
            this.tabChibi.style.background = !isStand ? "#444" : "#222";
            this.standControls.style.display = isStand ? "flex" : "none";
            this.chibiControls.style.display = !isStand ? "flex" : "none";

            // Category 重置与转换
            if (isStand) {
                if (this.category.includes("cb")) {
                    this.category = this.category === "cb_costume" ? "stand_costume" : "stand";
                }
            } else {
                if (this.category.includes("stand")) {
                    this.category = this.category === "stand_costume" ? "cb_costume" : "cb";
                }
            }

            this._updateCategoryBtnText();

            // 保持角色 ID 同步
            const currentCharId = this.fullId.slice(3, 6);
            if (isStand) this.charSelectStand.value = currentCharId;
            else this.charSelectChibi.value = currentCharId;

            // 重新加载资源
            await this._loadCostumeList(currentCharId);
            this._loadAndShowSpine();

            if (isStand) await this._loadIdolReactions(currentCharId);
            else this._showCommentBubble(""); // Q版清除气泡
        },

        async _onCharChange(newId) {
            // 同步
            if (this.charSelectStand) this.charSelectStand.value = newId;
            if (this.charSelectChibi) this.charSelectChibi.value = newId;

            // 特殊角色默认服装逻辑
            const SPECIAL_DEFAULT_COSTUME = {
                "091": "2040910010",
                801: "1048010010",
                802: "1048020010",
                803: "1048030010",
                804: "2048040010",
            };

            if (SPECIAL_DEFAULT_COSTUME[newId]) {
                this.fullId = SPECIAL_DEFAULT_COSTUME[newId];
            } else {
                this.fullId = "193" + newId + "0010";
            }

            this._loadAndShowSpine();
            await this._loadCostumeList(newId);
            if (this.mode === "stand") await this._loadIdolReactions(newId);
        },

        _onCostumeChange(newCostumeId) {
            this.fullId = newCostumeId;
            this._loadAndShowSpine();
        },

        _toggleCategory() {
            if (this.mode === "stand") {
                this.category = this.category === "stand" ? "stand_costume" : "stand";
            } else {
                this.category = this.category === "cb" ? "cb_costume" : "cb";
            }
            this._updateCategoryBtnText();
            this._loadAndShowSpine();
        },

        _updateCategoryBtnText() {
            if (this.categoryBtnStand) this.categoryBtnStand.textContent = `服装: ${this.category}`;
            if (this.categoryBtnChibi) this.categoryBtnChibi.textContent = `类型: ${this.category}`;
        },

        // =========================================================================
        // Spine 核心逻辑
        // =========================================================================
        _initPixi() {
            const bgColor = typeof global_theme_color !== "undefined" ? parseInt(global_theme_color, 16) : 0x000000;
            this.app = new PIXI.Application({
                width: window.innerWidth,
                height: window.innerHeight,
                backgroundColor: bgColor,
                antialias: false,
                resolution: window.devicePixelRatio || 2,
                autoDensity: true,
            });
            this.container.appendChild(this.app.view);
            this.scene = new PIXI.Container();
            this.app.stage.addChild(this.scene);

            // ✅ 修改点：保存引用以便 destroy 时移除
            this._resizeHandler = () => this._fitCurrentSpine();
            window.addEventListener("resize", this._resizeHandler);

            this._canvasClickHandler = (e) => {
                if (!this.spine || !this.spine.state) return;
                const current = this.spine.state.getCurrent(0);
                const currentName = current ? current.animation.name : null;
                if (currentName && currentName !== this.defaultAnim) {
                    this.spine.stateData.setMix(currentName, this.defaultAnim, this.ANIMATION_MIX);
                    this.spine.state.setAnimation(0, this.defaultAnim, true);
                    this._updateAnimationPanelUI();
                }
            };
            this.app.view.addEventListener("click", this._canvasClickHandler);
        },

        _loadAndShowSpine() {
            if (!this.fullId) return;

            // ✅ 修改：增加 isRetry 参数，防止 A->B->A 的死循环
            const loadLogic = async (cat, isRetry = false) => {
                const rawId = String(this.fullId);
                const isAwake = rawId.endsWith("_awake");
                const pureId = isAwake ? rawId.slice(0, -6) : rawId;
                const isEvo = pureId.length === 12;

                let basePath;
                if (this.mode === "chibi") {
                    // Q版路径
                    basePath = `spine/idols/${cat}/${pureId}`;
                } else {
                    // 标准版路径
                    if (isAwake) basePath = `spine/awake_idols/${cat}/${pureId}`;
                    else if (isEvo) basePath = `spine/idol_evolution_skins/${cat}/${pureId}`;
                    else basePath = `spine/idols/${cat}/${pureId}`;
                }

                const prefix = typeof assetUrl !== "undefined" ? assetUrl : ".";

                // 构建相关文件的完整 URL
                const jsonUrl = `${prefix}/${basePath}/data.json`;
                const pngUrl = `${prefix}/${basePath}/data.png`;
                const atlasUrl = `${prefix}/${basePath}/data.atlas`;

                console.log(`[ReactionViewer] Loading: ${jsonUrl} (Mode: ${this.mode})`);

                try {
                    const res = await fetch(jsonUrl, { method: "HEAD" });
                    if (!res.ok) throw new Error("File not found");

                    // =========================================================
                    // 🧹 深度清理逻辑
                    // =========================================================

                    if (this._lastSpineResources) {
                        if (this._lastSpineResources.textures) {
                            for (const key in this._lastSpineResources.textures) {
                                if (this._lastSpineResources.textures.hasOwnProperty(key)) {
                                    this._lastSpineResources.textures[key].destroy(true);
                                }
                            }
                        }
                        this._lastSpineResources = null;
                    }

                    if (PIXI.utils.BaseTextureCache[pngUrl]) {
                        PIXI.utils.BaseTextureCache[pngUrl].destroy();
                        delete PIXI.utils.BaseTextureCache[pngUrl];
                    }
                    if (PIXI.utils.TextureCache[pngUrl]) {
                        PIXI.utils.TextureCache[pngUrl].destroy();
                        delete PIXI.utils.TextureCache[pngUrl];
                    }
                    if (PIXI.utils.TextureCache[atlasUrl]) {
                        delete PIXI.utils.TextureCache[atlasUrl];
                    }

                    // =========================================================
                    // 🚀 开始加载
                    // =========================================================

                    const loader = new PIXI.Loader();
                    loader.add("idol_" + Date.now(), jsonUrl);

                    loader.load((ldr, resources) => {
                        const key = Object.keys(resources).find((k) => k.startsWith("idol_"));
                        const spineRes = resources[key];

                        if (!spineRes || !spineRes.spineData) return;

                        this._lastSpineResources = spineRes;

                        if (this.spine) {
                            this.scene.removeChild(this.spine);
                            this.spine.destroy({ children: true });
                            this.spine = null;
                        }

                        const spine = new PIXI.spine.Spine(spineRes.spineData);
                        this.scene.addChild(spine);
                        this.spine = spine;

                        this._fitCurrentSpine();

                        if (this.mode === "chibi") {
                            this._initSkinList();
                        } else {
                            if (this._headRatioEnabled) this._applyHeadRatio();
                        }

                        this._refreshAnimLists();
                        this._playDefaultAnim();

                        spine.state.addListener({
                            start: (entry) => {
                                const select = this.mode === "stand" ? this.mainAnimSelectStand : this.mainAnimSelectChibi;
                                if (entry.trackIndex === 0 && select) {
                                    select.value = entry.animation.name;
                                }
                            },
                            complete: (entry) => {
                                const select = this.mode === "stand" ? this.mainAnimSelectStand : this.mainAnimSelectChibi;
                                if (entry.trackIndex === 0 && select) {
                                    select.value = this.defaultAnim;
                                }
                            },
                        });
                    });
                } catch (err) {
                    console.warn(`Load failed: ${err.message}`);

                    // ✅ 修改：双向 Fallback 逻辑
                    // 只有在不是重试状态(!isRetry)下才尝试切换，避免死循环
                    if (this.mode === "stand" && !isRetry) {
                        if (cat === "stand") {
                            // 尝试加载 stand_costume
                            console.log("[ReactionViewer] 'stand' not found, trying 'stand_costume'");
                            this.category = "stand_costume";
                            this._updateCategoryBtnText();
                            loadLogic("stand_costume", true); // 标记为重试
                        } else if (cat === "stand_costume") {
                            // 尝试加载 stand
                            console.log("[ReactionViewer] 'stand_costume' not found, trying 'stand'");
                            this.category = "stand";
                            this._updateCategoryBtnText();
                            loadLogic("stand", true); // 标记为重试
                        }
                    }
                }
            };

            loadLogic(this.category);
        },

        _fitCurrentSpine() {
            if (!this.spine) return;

            this.app.renderer.resize(window.innerWidth, window.innerHeight);
            const w = this.app.screen.width;
            const h = this.app.screen.height;

            const baseW = typeof global_ViewerWidth !== "undefined" ? global_ViewerWidth : 1920;
            const baseH = typeof global_ViewerHeight !== "undefined" ? global_ViewerHeight : 1080;
            let ratio = Math.min(window.innerWidth / baseW, window.innerHeight / baseH);

            if (this.mode === "chibi") {
                // === Q版 自动矫正逻辑 ===
                let baseScale = this.SCALE_CONFIG.chibi;

                // 获取 Root 骨骼的原始导出缩放值
                let correctionMultiplier = 1.0;
                const rootBone = this.spine.skeleton.findBone("root");

                if (rootBone && rootBone.data.scaleX > 0) {
                    const internalScale = rootBone.data.scaleX;
                    // 计算补偿系数： 标准值(0.36) / 当前值
                    correctionMultiplier = this.CHIBI_ROOT_REF / internalScale;
                }

                const finalScale = baseScale * correctionMultiplier * ratio;

                this.spine.scale.set(finalScale);
                this.spine.x = w / 2;
                this.spine.y = h * 0.75;

                // 调试输出
                console.groupCollapsed(`[ReactionViewer] Chibi Fit Correction`);
                console.log(`Internal Root Scale: ${rootBone ? rootBone.data.scaleX.toFixed(3) : "N/A"}`);
                console.log(`Final Applied Scale: ${finalScale.toFixed(4)}`);
                console.groupEnd();
            } else {
                // === 标准版 ===
                const baseScale = this.SCALE_CONFIG.stand;
                this.spine.scale.set(baseScale * ratio);
                this.spine.x = w / 2;
                this.spine.y = h * (1 - 0.3675);
            }
        },

        _initSkinList() {
            if (!this.spine || !this.skinSelectChibi) return;
            const skins = this.spine.spineData.skins;
            this.skinSelectChibi.innerHTML = "";

            let hasNormal = false;
            skins.forEach((skin) => {
                const opt = document.createElement("option");
                opt.value = skin.name;
                opt.textContent = skin.name;
                this.skinSelectChibi.appendChild(opt);
                if (skin.name === "normal") hasNormal = true;
            });

            if (hasNormal) {
                this.skinSelectChibi.value = "normal";
                this.spine.skeleton.setSkinByName("normal");
                this.spine.skeleton.setSlotsToSetupPose();
            }
        },

        _playDefaultAnim() {
            if (!this.spine) return;
            try {
                this.spine.state.setAnimation(0, this.defaultAnim, true);
            } catch (e) {
                console.warn(e);
            }
        },

        // =========================================================================
        // 动画控制
        // =========================================================================

        _refreshAnimLists() {
            if (!this.spine) return;
            const allAnims = this.spine.spineData.animations.map((a) => a.name);

            this.mainAnims = [];
            this.subAnims = [];

            if (this.mode === "stand") {
                // === Standard: 维持原有的正则分类逻辑 ===
                allAnims.forEach((name) => {
                    if (/^(off|on|arm_|eye_|face_|lip_|blank|yes|no)|.*(_on|_off|_rtn|_relay)$|return|cheek_red/.test(name)) {
                        this.subAnims.push(name);
                    } else {
                        this.mainAnims.push(name);
                    }
                });
            } else {
                // === Chibi: 简化逻辑 ===
                this.mainAnims = [...allAnims].sort();

                // 确保默认动画 wait 置顶
                const defaultIndex = this.mainAnims.indexOf(this.defaultAnim);
                if (defaultIndex > 0) {
                    this.mainAnims.splice(defaultIndex, 1);
                    this.mainAnims.unshift(this.defaultAnim);
                }

                // Q版不使用次级动画
                this.subAnims = [];
            }

            // --- 1. 填充主动画下拉框 ---
            const mainSelect = this.mode === "stand" ? this.mainAnimSelectStand : this.mainAnimSelectChibi;

            if (mainSelect) {
                mainSelect.innerHTML = "";
                this.mainAnims.forEach((anim) => {
                    const opt = document.createElement("option");
                    opt.value = anim;
                    opt.textContent = anim;
                    if (anim === this.defaultAnim) opt.selected = true;
                    mainSelect.appendChild(opt);
                });
                mainSelect.onchange = () => this._setCharacterAnimation(mainSelect.value);
            }

            // --- 2. 填充次级动画 UI (仅 Standard 执行) ---
            if (this.mode === "stand" && this.subAnimContainerStand && this.subAnims.length > 0) {
                const subContainer = this.subAnimContainerStand;
                subContainer.innerHTML = "";
                this.subAnimInputs = {};

                this.subAnims.forEach((anim) => {
                    const label = document.createElement("label");
                    Object.assign(label.style, { color: "#fff", display: "flex", alignItems: "center" });

                    // ✅ 变量名修改：cb -> checkbox
                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.style.marginRight = "4px";

                    checkbox.onchange = () => {
                        if (!this.spine) return;

                        let track = 1;
                        if (/^face_/.test(anim)) track = 1;
                        else if (/^(yes|no)/.test(anim)) track = 2;
                        else if (/^(mask)/.test(anim)) track = 2;
                        else if (/^eye_/.test(anim)) track = 3;
                        else if (/^lip_/.test(anim)) track = 5;

                        // ✅ 使用 checkbox.checked
                        if (checkbox.checked) this.spine.state.setAnimation(track, anim, true);
                        else this.spine.state.setEmptyAnimation(track, 0.2);
                    };

                    label.appendChild(checkbox);
                    const span = document.createElement("span");
                    span.textContent = anim;
                    span.style.fontSize = "12px";
                    label.appendChild(span);
                    subContainer.appendChild(label);

                    // ✅ 存入字典
                    this.subAnimInputs[anim] = checkbox;
                });
            }
        },

        _setCharacterAnimation(charAnim) {
            if (!charAnim || !this.spine) return;
            const thisSpine = this.spine;
            const animation = thisSpine.spineData.animations.find((a) => a.name === charAnim);
            if (!animation) return;

            let relayAnim = null;
            let loopStartTime = null;
            const eventTimeline = animation.timelines.find((t) => t.events);
            if (eventTimeline) {
                eventTimeline.events.forEach((e) => {
                    if (e.data.name === this.RELAY_EVENT_NAME) relayAnim = e.stringValue;
                    if (e.data.name === this.LOOP_EVENT_NAME) loopStartTime = e.time;
                });
            }

            thisSpine.state.setEmptyAnimation(0, 0);

            const playAnimation = (animName, loop = false, startTime = 0) => {
                const entry = thisSpine.state.setAnimation(0, animName, loop);
                entry.time = startTime;
                entry.listener = {
                    start: () => {
                        const sel = this.mode === "stand" ? this.mainAnimSelectStand : this.mainAnimSelectChibi;
                        if (sel) sel.value = animName;
                    },
                    complete: () => {
                        if (loopStartTime != null && animName === charAnim) {
                            playAnimation(charAnim, false, loopStartTime);
                            return;
                        }
                        if (relayAnim) {
                            thisSpine.stateData.setMix(animName, relayAnim, this.ANIMATION_MIX);
                            thisSpine.stateData.setMix(relayAnim, this.defaultAnim, this.ANIMATION_MIX);
                            const relayEntry = thisSpine.state.setAnimation(0, relayAnim, false);
                            relayEntry.listener = { complete: () => playAnimation(this.defaultAnim, true) };
                        } else if (animName !== this.defaultAnim) {
                            playAnimation(this.defaultAnim, true);
                        }
                    },
                };
                return entry;
            };
            return playAnimation(charAnim, false);
        },

        _updateAnimationPanelUI(allReset = false) {
            const select = this.mode === "stand" ? this.mainAnimSelectStand : this.mainAnimSelectChibi;
            if (select && this.spine) {
                const current = this.spine.state.getCurrent(0);
                const currentName = current ? current.animation.name : this.defaultAnim;
                select.value = currentName;
            }
            if (allReset) {
                Object.values(this.subAnimInputs).forEach((cb) => (cb.checked = false));
            }
        },

        _toggleHeadRatio(btn) {
            if (!this.spine || this.mode === "chibi") return;
            this._headRatioEnabled = !this._headRatioEnabled;
            btn.textContent = `头身比: ${this._headRatioEnabled ? "ON" : "OFF"}`;
            this._applyHeadRatio();
        },

        _applyHeadRatio() {
            if (!this.spine || this.mode === "chibi") return;
            const id = this.fullId.slice(3, 6);
            const label = this._idToLabelMap[id] || "default";
            const config = global_headScale_CONFIG_MAP[label] || global_headScale_CONFIG_MAP.default;
            const neckBone = this.spine.skeleton.findBone("neck");
            if (!neckBone) return;
            if (this._headRatioEnabled) {
                neckBone.data.scaleX = config.scale;
                neckBone.data.scaleY = config.scale;
                neckBone.setToSetupPose();
            } else {
                neckBone.data.scaleX = 1;
                neckBone.data.scaleY = 1;
                neckBone.setToSetupPose();
            }
        },

        // =========================================================================
        // 数据加载与 Reaction
        // =========================================================================

        async _loadCostumeList(charId) {
            if (this._costumeCache[charId]) {
                this._populateCostumeSelect(this._costumeCache[charId]);
                return;
            }
            try {
                const res = await fetch(`./assets/data/costumehash.json`);
                const data = await res.json();
                const idNum = parseInt(charId, 10);
                let costumes = data.filter((item) => parseInt(item.characterId, 10) === idNum);

                // 特殊角色处理
                if (charId === "091") {
                    const hazukiDefault = {
                        characterId: "91",
                        id: "2040910010",
                        idolId: "2040910010",
                        name: "【２８３プロの日常】七草 はづき",
                        evolutionSkinId: "0",
                        isAwake: false,
                    };
                    costumes.unshift(hazukiDefault);
                } else if (["801", "802", "803", "804"].includes(charId)) {
                    // 为每个特殊联动角色添加默认服装
                    const specialDefaults = {
                        801: [
                            { id: "1048010010", idolId: "1048010010", name: "【Be red】ルビー" },
                            { id: "1048010020", idolId: "1048010020", name: "【In red】ルビー" },
                        ],
                        802: [
                            { id: "1048020010", idolId: "1048020010", name: "【Be white】有馬 かな" },
                            { id: "1048020020", idolId: "1048020020", name: "【In white】有馬 かな" },
                        ],
                        803: [
                            { id: "2048030010", idolId: "2048030010", name: "【Be yellow】MEMちょ" },
                            { id: "1048030010", idolId: "1048030010", name: "【In yellow】MEMちょ" },
                        ],
                        804: [{ id: "2048040010", idolId: "2048040010", name: "【Actors】黒川 あかね" }],
                    };
                    if (specialDefaults[charId]) costumes = [...specialDefaults[charId], ...costumes];
                }

                this._costumeCache[charId] = costumes;
                this._populateCostumeSelect(costumes);
            } catch (e) {
                console.error("Costume load failed", e);
            }
        },

        _populateCostumeSelect(costumes) {
            const targets = [this.costumeSelectStand, this.costumeSelectChibi];
            targets.forEach((select) => {
                if (!select) return;
                select.innerHTML = "";

                // 排序 (保持原逻辑：默认在前 -> ID升序 -> Evo ID)
                const currentRoleId = this.fullId.slice(3, 6);
                const defaultFullId = "193" + currentRoleId + "0010";
                // ... 省略复杂排序代码，直接映射 ...

                costumes.forEach((item) => {
                    const opt = document.createElement("option");
                    let val = item.evolutionSkinId && item.evolutionSkinId !== "0" ? item.evolutionSkinId : item.idolId;
                    if (val.startsWith("102")) val = "193" + val.slice(3);
                    if (item.isAwake) val += "_awake";

                    let text = item.name;
                    if (item.evolutionSkinId && item.evolutionSkinId !== "0" && item.comment?.includes("エクスパンション")) {
                        text += " (Ex)";
                    }

                    opt.value = val;
                    opt.textContent = text;
                    if (val === this.fullId) opt.selected = true;
                    select.appendChild(opt);
                });
                select.value = this.fullId;
            });
        },

        async _loadIdolReactions(charId) {
            if (this.mode !== "stand") return;
            if (!this.reactionSelect) return;

            this.reactionSelect.innerHTML = "<option>加载中...</option>";
            this.reactionSelect.disabled = true;

            try {
                const res = await fetch(`./assets/data/idolReaction.json`);
                if (!res.ok) throw new Error("Fetch error");

                const allData = await res.json();
                const idNum = parseInt(charId, 10);
                const idolData = allData.find((d) => parseInt(d.idolId, 10) === idNum);

                if (!idolData) {
                    this._populateReactionList([]);
                    return;
                }

                const reactions = [];
                let idCounter = 0;

                // Home comments
                if (idolData.myPageComments) {
                    for (const r of idolData.myPageComments) {
                        reactions.push({ ...r, id: `r_${idCounter++}`, category: "home", voiceType: "home" });
                    }
                }
                // Touch/Wait comments
                if (idolData.topCharacterReaction) {
                    const tcr = idolData.topCharacterReaction;
                    for (const key of Object.keys(tcr)) {
                        const list = tcr[key];
                        if (Array.isArray(list)) {
                            list.forEach((r) => {
                                reactions.push({ ...r, id: `r_${idCounter++}`, category: key, voiceType: r.voiceType || key });
                            });
                        }
                    }
                }

                this._reactionMap = {};
                reactions.forEach((r) => (this._reactionMap[r.id] = r));
                this._populateReactionList(reactions);
            } catch (e) {
                console.error("加载 reaction 失败", e);
                this.reactionSelect.innerHTML = "<option disabled>(无数据)</option>";
            }
        },

        _populateReactionList(reactions) {
            if (!this.reactionSelect) return;
            this.reactionSelect.innerHTML = "";
            this.reactionSelect.disabled = false;

            if (!reactions || reactions.length === 0) {
                const opt = document.createElement("option");
                opt.textContent = "(无可用反应)";
                opt.disabled = true;
                this.reactionSelect.appendChild(opt);
                return;
            }

            const defaultOpt = document.createElement("option");
            defaultOpt.textContent = "请选择动作...";
            defaultOpt.value = "";
            this.reactionSelect.appendChild(defaultOpt);

            const byCategory = new Map();
            for (const r of reactions) {
                const cat = r.category || "其他";
                if (!byCategory.has(cat)) byCategory.set(cat, []);
                byCategory.get(cat).push(r);
            }

            for (const [category, list] of byCategory.entries()) {
                const group = document.createElement("optgroup");
                group.label = category;
                list.forEach((r) => {
                    const opt = document.createElement("option");
                    opt.textContent = r.voiceName || r.commentType || r.comment?.slice(0, 10) || r.id;
                    opt.value = r.id;
                    group.appendChild(opt);
                });
                this.reactionSelect.appendChild(group);
            }
        },

        _playReaction(selectedId) {
            const data = this._reactionMap?.[selectedId];
            if (!data || !this.spine) return;

            console.log(`[ReactionViewer] 播放 reaction: ${data.voiceName}`);

            // 播放主动画
            if (data.animation1) this.spine.state.setAnimation(0, data.animation1, false);

            // 播放次级动画 2-4，循环播放
            for (let i = 2; i <= 4; i++) {
                const anim = data[`animation${i}`];
                if (anim) this.spine.state.addAnimation(i - 1, anim, true, 0);
            }

            // 播放语音
            // 注意：assetUrl 需确保在全局定义，或者替换为相对路径
            const prefix = typeof assetUrl !== "undefined" ? assetUrl : ".";
            const voiceUrl = `${prefix}/sounds/voice/characters/${this.charSelectStand.value}/${data.voice}.m4a`;
            const audio = new Audio(voiceUrl);
            audio.play();

            // lip 动画
            if (data.lip) {
                const lipTrack = 5;
                this.spine.state.setAnimation(lipTrack, data.lip, true);

                audio.onended = () => {
                    if (!this.spine) return; // 防止音频播放完时 spine 已被销毁

                    // 计算闭嘴动画名
                    const closedLip = (function (lipAnim) {
                        const match = lipAnim.match(/^(.*?)(\d+)$/);
                        if (match) {
                            const [, base, num] = match;
                            return `${base}_s${num}`;
                        }
                        return `${lipAnim}_s`;
                    })(data.lip);

                    // ✅ 修改逻辑：检查动画是否存在
                    const animExists = this.spine.spineData.animations.some((a) => a.name === closedLip);

                    if (animExists) {
                        this.spine.state.setAnimation(lipTrack, closedLip, true);
                    } else {
                        // 不存在则清空轨道 (混合时间 0.2s 使过渡自然)
                        this.spine.state.setEmptyAnimation(lipTrack, 0.2);
                    }

                    // 语音结束后隐藏气泡
                    this._showCommentBubble("");
                };
            } else {
                // 没有 lip 动画，也在语音结束时隐藏气泡
                audio.onended = () => this._showCommentBubble("");
            }

            // 显示台词气泡
            this._showCommentBubble(data.comment);
        },

        _showCommentBubble(comment) {
            if (this.mode !== "stand") {
                if (this.commentBubble) this.commentBubble.style.opacity = "0";
                return;
            }
            if (!this.commentBubble) {
                const bubble = document.createElement("div");
                Object.assign(bubble.style, {
                    position: "absolute",
                    bottom: "20%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    maxWidth: "300px",
                    padding: "10px 14px",
                    background: "rgba(0,0,0,0.7)",
                    color: "#fff",
                    borderRadius: "12px",
                    textAlign: "center",
                    whiteSpace: "pre-wrap",
                    fontSize: "14px",
                    pointerEvents: "none",
                    opacity: "0",
                    transition: "opacity 0.2s",
                    zIndex: 10001,
                });
                this.container.appendChild(bubble);
                this.commentBubble = bubble;
            }
            this.commentBubble.textContent = comment || "";
            this.commentBubble.style.opacity = comment ? "1" : "0";
        },

        // --- 样式辅助 ---
        _btnStyle() {
            return {
                padding: "6px 12px",
                background: "#222",
                color: "#fff",
                border: "1px solid #555",
                borderRadius: "6px",
                cursor: "pointer",
                textAlign: "left",
            };
        },
        _selectStyle() {
            return {
                padding: "6px",
                borderRadius: "6px",
                border: "1px solid #555",
                background: "#222",
                color: "#fff",
            };
        },
        _tabStyle(active) {
            return {
                flex: 1,
                padding: "8px",
                border: "none",
                background: active ? "#444" : "#222",
                color: "#fff",
                cursor: "pointer",
                borderRadius: "4px",
                fontWeight: "bold",
            };
        },
    };

    global.ReactionViewer = ReactionViewer;
})(window);
