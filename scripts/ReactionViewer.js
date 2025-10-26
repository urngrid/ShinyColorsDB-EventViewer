// /scripts/ReactionViewer.js

(function (global) {
    const ReactionViewer = {
        async init() {
            this.fullId = "1930010010"; // 默认服装 ID
            this.category = "stand"; // 默认服装类型
            this.defaultAnim = "wait"; // 默认动画
            this._headRatioEnabled = true;

            this.RELAY_EVENT_NAME = "relay";
            this.LOOP_EVENT_NAME = "loop_start";
            this.ANIMATION_MIX = 0.3;
            this._headScale_CONFIG_MAP = {
                default: { scale: 1 },
                mano: { scale: 0.92 },
                hiori: { scale: 0.92 },
                meguru: { scale: 0.91 },
                kogane: { scale: 0.91 },
                mamimi: { scale: 0.92 },
                sakuya: { scale: 0.92 },
                yuika: { scale: 0.89 },
                kiriko: { scale: 0.91 },
                kaho: { scale: 0.89 },
                chiyoko: { scale: 0.9 },
                juri: { scale: 0.91 },
                rinze: { scale: 0.93 },
                natsuha: { scale: 0.89 },
                amana: { scale: 0.89 },
                tenka: { scale: 0.89 },
                chiyuki: { scale: 0.9 },
                asahi: { scale: 0.89 },
                fuyuko: { scale: 0.92 },
                mei: { scale: 0.93 },
                toru: { scale: 0.93 },
                madoka: { scale: 0.92 },
                koito: { scale: 0.93 },
                hinana: { scale: 0.91 },
                nichika: { scale: 0.92 },
                mikoto: { scale: 0.91 },
                luca: { scale: 0.92 },
                hana: { scale: 0.93 },
                haruki: { scale: 0.91 },
                hazuki: { scale: 0.89 },
                ruby: { scale: 0.93 },
                kana: { scale: 0.91 },
                mem: { scale: 0.92 },
                akane: { scale: 0.9 },
            };
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

            this.mainAnims = [];
            this.subAnims = [];
            this.subAnimInputs = {};
            this._costumeCache = {};
            this.costumeSelect = null;
            this.categoryBtn = null;

            this._buildDOM();
            this._initPixi();
            // 首次加载 001 角色
            const defaultCharId = "001";
            this.charSelect.value = defaultCharId;
            this.fullId = this.fullId.slice(0, 3) + defaultCharId + this.fullId.slice(6);
            await this._loadCostumeList(defaultCharId); // 异步加载服装列表
            this._loadAndShowSpine();
            // ✅ 新增：载入默认角色交互列表
            await this._loadIdolReactions("001");
        },

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

            // === 折叠面板 ===
            const panel = document.createElement("div");
            Object.assign(panel.style, {
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "rgba(0,0,0,0.7)",
                color: "#fff",
                borderRadius: "8px",
                padding: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                cursor: "default",
                zIndex: 10000,
            });
            this.container.appendChild(panel);
            this.panel = panel;
            // 适应移动端
            const scale = window.innerWidth < 768 ? 0.5 : 1;
            panel.style.transformOrigin = "top right";
            panel.style.transform = `scale(${scale})`;

            // 折叠按钮
            const toggleBtn = document.createElement("button");
            toggleBtn.textContent = "▶"; // 默认折叠
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

            // 内部控制区（折叠时隐藏）
            const controls = document.createElement("div");
            Object.assign(controls.style, { display: "none", flexDirection: "column", gap: "6px" });
            panel.appendChild(controls);
            this.controls = controls;

            // === 角色切换下拉列表 ===
            const charSelect = document.createElement("select");
            Object.assign(charSelect.style, {
                padding: "6px",
                borderRadius: "6px",
                border: "1px solid #555",
                background: "#222",
                color: "#fff",
                marginBottom: "6px",
            });

            // 填充 001-028 的角色选项
            for (let i = 1; i <= 28; i++) {
                const idStr = i.toString().padStart(3, "0");
                const label = this._idToLabelMap[idStr];
                if (!label) continue;
                const opt = document.createElement("option");
                opt.value = idStr;
                opt.textContent = label;
                charSelect.appendChild(opt);
            }

            // === 添加特殊角色 ===
            const specialChars = [
                { id: "091", label: this._idToLabelMap["091"] || "hazuki" },
                { id: "801", label: this._idToLabelMap["801"] || "ruby" },
                { id: "802", label: this._idToLabelMap["802"] || "kana" },
                { id: "803", label: this._idToLabelMap["803"] || "mem" },
                { id: "804", label: this._idToLabelMap["804"] || "akane" },
            ];

            specialChars.forEach(({ id, label }) => {
                const opt = document.createElement("option");
                opt.value = id;
                opt.textContent = label;
                charSelect.appendChild(opt);
            });

            this.charSelect = charSelect;
            this.panel.insertBefore(charSelect, this.panel.firstChild);
            this.controls.appendChild(charSelect);

            // === 服装下拉列表 ===
            const costumeSelect = document.createElement("select");
            Object.assign(costumeSelect.style, {
                padding: "6px",
                borderRadius: "6px",
                border: "1px solid #555",
                background: "#222",
                color: "#fff",
                marginBottom: "6px",
            });
            this.costumeSelect = costumeSelect;
            this.controls.appendChild(costumeSelect);

            // 角色切换事件
            charSelect.onchange = async () => {
                const newId = charSelect.value;

                // 特殊角色默认服装
                const SPECIAL_DEFAULT_COSTUME = {
                    "091": "2040910010",
                    801: "1048010010",
                    802: "1048020010",
                    803: "1048030010",
                    804: "2048040010",
                };

                // 更新 fullId 的角色部分
                let defaultFullId;
                if (SPECIAL_DEFAULT_COSTUME[newId]) {
                    defaultFullId = SPECIAL_DEFAULT_COSTUME[newId]; // 使用特殊角色默认服装
                } else {
                    // 普通角色使用 193+角色id+序号规则
                    defaultFullId = "193" + newId + "0010";
                }

                this.fullId = defaultFullId;
                console.log(`[ReactionViewer] 切换角色为 ${newId}，fullId=${this.fullId}`);

                // 先加载默认皮肤 spine
                this._loadAndShowSpine();

                // 加载或使用缓存服装列表
                await this._loadCostumeList(newId);

                // 更新服装切换按钮显示文本
                if (this.categoryBtn) {
                    this.categoryBtn.textContent = `服装: ${this.category}`;
                }

                await this._loadIdolReactions(newId);
            };
            // 服装切换事件
            costumeSelect.onchange = () => {
                const selectedCostumeId = costumeSelect.value;

                this.fullId = selectedCostumeId;
                this._loadAndShowSpine();
            };

            // 服装切换按钮
            const catBtn = document.createElement("button");
            this.categoryBtn = catBtn;
            catBtn.textContent = `服装: ${this.category}`;
            Object.assign(catBtn.style, ReactionViewer._btnStyle());
            catBtn.onclick = () => this._toggleCategory(catBtn);
            controls.appendChild(catBtn);

            // 头身比开关
            const headBtn = document.createElement("button");
            headBtn.textContent = `头身比: ${this._headRatioEnabled ? "ON" : "OFF"}`;
            Object.assign(headBtn.style, ReactionViewer._btnStyle());
            headBtn.onclick = () => this._toggleHeadRatio(headBtn);
            controls.appendChild(headBtn);

            // === 主动画下拉列表 ===
            const mainAnimSelect = document.createElement("select");
            controls.appendChild(mainAnimSelect);
            this.mainAnimSelect = mainAnimSelect;
            mainAnimSelect.style.padding = "6px";
            mainAnimSelect.style.borderRadius = "6px";
            mainAnimSelect.style.border = "1px solid #555";
            mainAnimSelect.style.background = "#222";
            mainAnimSelect.style.color = "#fff";

            // === 次级动画开关折叠 ===
            const subAnimWrapper = document.createElement("div");
            const subAnimToggle = document.createElement("button");
            subAnimToggle.textContent = "次级动画 ▼";
            Object.assign(subAnimToggle.style, ReactionViewer._btnStyle());
            subAnimWrapper.appendChild(subAnimToggle);

            // 次级动画容器（两列网格）
            const subAnimContainer = document.createElement("div");
            Object.assign(subAnimContainer.style, {
                display: "grid",
                gridTemplateColumns: "1fr 1fr", // 两列均分
                gap: "4px",
                maxHeight: "600px", // 可选限制高度
                overflowY: "auto", // 超出显示滚动条
            });
            subAnimWrapper.appendChild(subAnimContainer);
            subAnimContainer.style.display = "none"; // 默认折叠

            // 切换折叠
            subAnimToggle.onclick = () => {
                const expanded = subAnimContainer.style.display === "grid";
                subAnimContainer.style.display = expanded ? "none" : "grid";
                subAnimToggle.textContent = expanded ? "次级动画 ▼" : "次级动画 ▲";
            };

            controls.appendChild(subAnimWrapper);
            this.subAnimContainer = subAnimContainer;

            // === 角色交互（Reaction）下拉列表 ===
            const reactionLabel = document.createElement("div");
            reactionLabel.textContent = "角色交互：";
            Object.assign(reactionLabel.style, {
                marginTop: "6px",
                fontSize: "14px",
                color: "#ccc",
            });
            controls.appendChild(reactionLabel);

            const reactionSelect = document.createElement("select");
            Object.assign(reactionSelect.style, {
                padding: "6px",
                borderRadius: "6px",
                border: "1px solid #555",
                background: "#222",
                color: "#fff",
                marginBottom: "6px",
            });
            controls.appendChild(reactionSelect);

            this.reactionSelect = reactionSelect;

            // reactionSelect 选中事件（播放语音和动画）
            reactionSelect.onchange = () => this._playReaction(reactionSelect.value);

            // 在动画下拉列表后添加重置按钮
            const resetBtn = document.createElement("button");
            resetBtn.textContent = "重置动画";
            Object.assign(resetBtn.style, this._btnStyle());
            resetBtn.onclick = () => {
                if (!this.spine) return;
                // 播放默认动画 wait
                this.spine.state.setAnimation(0, this.defaultAnim, true);
                // 清空次级动画
                for (let track = 1; track <= 5; track++) {
                    this.spine.state.setEmptyAnimation(track, 0);
                }

                // 🔄 同步UI状态
                this._updateAnimationPanelUI(true);
            };
            this.controls.appendChild(resetBtn);

            this.toggleBtn.onclick = () => {
                this.panelExpanded = !this.panelExpanded;
                controls.style.display = this.panelExpanded ? "flex" : "none";
                toggleBtn.textContent = this.panelExpanded ? "▼" : "▶";
            };
        },

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

        _initPixi() {
            this.app = new PIXI.Application({
                width: window.innerWidth,
                height: window.innerHeight,
                backgroundColor: parseInt(global_theme_color, 16),
                antialias: false,
                resolution: window.devicePixelRatio || 2,
                autoDensity: true,
            });
            this.container.appendChild(this.app.view);
            this.scene = new PIXI.Container();
            this.app.stage.addChild(this.scene);
            window.addEventListener("resize", () => this._fitCurrentSpine());

            // 若之前注册过 handler，先移除（保证不会重复）
            if (this._canvasClickHandler) {
                this.app.view.removeEventListener("click", this._canvasClickHandler);
            }
            // 保持引用，便于 later remove
            this._canvasClickHandler = (e) => {
                // 点击 canvas 时才触发（不会误触 panel）
                if (!this.spine || !this.spine.state) return;
                const current = this.spine.state.getCurrent(0);
                const currentName = current ? current.animation.name : null;
                if (currentName && currentName !== this.defaultAnim) {
                    // 清空 1~5 轨
                    // for (let i = 1; i <= 5; i++) this.spine.state.setEmptyAnimation(i, 0);
                    // 平滑过渡回 wait
                    this.spine.stateData.setMix(currentName, this.defaultAnim, this.ANIMATION_MIX);
                    this.spine.state.setAnimation(0, this.defaultAnim, true);
                    // 🔄 同步UI状态
                    this._updateAnimationPanelUI();
                }
            };
            this.app.view.addEventListener("click", this._canvasClickHandler);
        },

        _loadAndShowSpine() {
            if (!this.fullId) return;

            const tryLoadSpine = async (category) => {
                const url = `${assetUrl}/spine/idols/${category}/${this.fullId}/data.json`;
                try {
                    const res = await fetch(url, { method: "HEAD" });
                    if (!res.ok) throw new Error("spine 文件不存在");

                    // 文件存在，使用 loader 加载
                    const loader = new PIXI.Loader();
                    loader.add("idol", url);
                    loader.load((ldr, res) => {
                        const spineRes = res["idol"];
                        if (!spineRes || !spineRes.spineData) {
                            console.error("spine data load failed:", res);
                            return;
                        }
                        if (this.spine) {
                            this.scene.removeChild(this.spine);
                            this.spine.destroy({ children: true });
                            this.spine = null;
                        }

                        const spine = new PIXI.spine.Spine(spineRes.spineData);
                        spine.x = this.app.renderer.width / 2;
                        spine.y = this.app.renderer.height * 0.8;
                        spine.scale.set(1.6666);
                        this.scene.addChild(spine);
                        this.spine = spine;

                        this._fitCurrentSpine();
                        this._refreshAnimLists();
                        this._playDefaultAnim();

                        spine.state.addListener({
                            start: (entry) => {
                                if (entry.trackIndex === 0) this.mainAnimSelect.value = entry.animation.name;
                            },
                            complete: (entry) => {
                                if (entry.trackIndex === 0) this.mainAnimSelect.value = this.defaultAnim;
                            },
                        });

                        if (this._headRatioEnabled) this._applyHeadRatio();
                    });
                } catch (err) {
                    console.warn(`[ReactionViewer] spine not found: ${url}, error: ${err.message}`);
                    // 尝试切换另一个 category
                    const fallbackCategory = category === "stand" ? "stand_costume" : "stand";
                    if (fallbackCategory !== category) {
                        console.log(`[ReactionViewer] 尝试切换 category 为 ${fallbackCategory}`);
                        this.category = fallbackCategory;
                        if (this.categoryBtn) {
                            this.categoryBtn.textContent = `服装: ${this.category}`;
                        }
                        await tryLoadSpine(fallbackCategory);
                    }
                }
            };

            tryLoadSpine(this.category);
        },
        _fitCurrentSpine() {
            if (!this.spine) return;
            this.app.renderer.resize(window.innerWidth, window.innerHeight);
            const w = this.app.screen.width;
            const h = this.app.screen.height;
            let ratio = Math.min(window.innerWidth / global_ViewerWidth, window.innerHeight / global_ViewerHeight);
            console.log(ratio);

            // const bounds = this.spine.getLocalBounds();

            // 计算缩放，使角色整体适应容器
            // const scale = Math.min((w * 0.8) / bounds.width, (h * 0.8) / bounds.height);
            this.spine.scale.set(1.6666 * ratio, 1.6666 * ratio); // this.spine.scale.set(scale);

            // 使用中心对齐
            // const centerY = bounds.y + bounds.height / 2;
            this.spine.x = w / 2;
            // this.spine.y = h / 2 + (h / 2 - h / 2); // 直接居中
            this.spine.y = h * (1 - 0.3675); // 角色y坐标比例 1后减去数字越大约高
            // console.log("spiney", this.spine.y);
        },

        _playDefaultAnim() {
            if (!this.spine) return;
            try {
                this.spine.state.setAnimation(0, this.defaultAnim, true);
                this._applyHeadRatio();
            } catch (e) {
                console.warn("Animation play failed:", e);
            }
        },

        _toggleCategory(btn) {
            this.category = this.category === "stand" ? "stand_costume" : "stand";
            btn.textContent = `服装: ${this.category}`;
            this._loadAndShowSpine();
        },

        _toggleHeadRatio(btn) {
            if (!this.spine) return;
            this._headRatioEnabled = !this._headRatioEnabled;
            btn.textContent = `头身比修正：${this._headRatioEnabled ? "ON" : "OFF"}`;
            this._applyHeadRatio();
        },

        _applyHeadRatio() {
            if (!this.spine) return;
            const id = this.fullId.slice(3, 6);
            const label = this._idToLabelMap[id] || "default";
            const config = this._headScale_CONFIG_MAP[label] || this._headScale_CONFIG_MAP.default;
            const neckBone = this.spine.skeleton.findBone("neck");
            if (!neckBone) return;

            if (this._headRatioEnabled) {
                // 应用头身比
                neckBone.data.scaleX = config.scale;
                neckBone.data.scaleY = config.scale;
                neckBone.setToSetupPose();
                // 更新骨骼
            } else {
                // 还原到默认比例
                neckBone.data.scaleX = 1;
                neckBone.data.scaleY = 1;
                neckBone.setToSetupPose();
            }

            // console.log("neckscale", neckBone.data.scaleX, neckBone.data.scaleY, this._headRatioEnabled, config.scale);
        },
        _refreshAnimLists() {
            if (!this.spine) return;
            const allAnims = this.spine.spineData.animations.map((a) => a.name);

            this.mainAnims = [];
            this.subAnims = [];

            allAnims.forEach((name) => {
                if (/^(off|on|arm_|eye_|face_|lip_|blank|yes|no)|.*(_on|_off|_rtn|_relay)$|return|cheek_red/.test(name)) this.subAnims.push(name);
                else this.mainAnims.push(name);
            });

            // 主动画下拉
            this.mainAnimSelect.innerHTML = "";
            this.mainAnims.forEach((anim) => {
                const opt = document.createElement("option");
                opt.value = anim;
                opt.textContent = anim;
                if (anim === this.defaultAnim) opt.selected = true;
                this.mainAnimSelect.appendChild(opt);
            });
            this.mainAnimSelect.onchange = () => {
                const selected = this.mainAnimSelect.value;
                this._setCharacterAnimation(selected, false, 0);
            };

            // 次级动画开关
            this.subAnimContainer.innerHTML = "";
            this.subAnims.forEach((anim) => {
                const label = document.createElement("label");
                label.style.color = "#fff";
                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.style.marginRight = "4px";
                cb.onchange = () => {
                    if (!this.spine) return;

                    let track = 1;
                    if (/^face_/.test(anim)) track = 1;
                    else if (/^(yes|no)/.test(anim)) track = 2;
                    else if (/^(mask)/.test(anim)) track = 2;
                    else if (/^eye_/.test(anim)) track = 3;
                    else if (/^lip_/.test(anim)) track = 5;
                    if (cb.checked) {
                        this.spine.state.setAnimation(track, anim, true);
                        console.log("track", track, "anim", anim);
                    } else {
                        this.spine.state.setEmptyAnimation(track, 0.2);
                    }
                };
                label.appendChild(cb);
                label.appendChild(document.createTextNode(anim));
                this.subAnimContainer.appendChild(label);
                this.subAnimInputs[anim] = cb;
            });
        },
        _setCharacterAnimation(charAnim) {
            if (!charAnim || !this.spine) return;
            const thisSpine = this.spine;
            const animation = this._getAnimation(charAnim, thisSpine);
            if (!animation) return;

            let relayAnim = null;
            let loopStartTime = null;

            // 查找事件：relay / loop_start
            const eventTimeline = animation.timelines.find((t) => t.events);
            if (eventTimeline) {
                eventTimeline.events.forEach((e) => {
                    if (e.data.name === this.RELAY_EVENT_NAME) relayAnim = e.stringValue;
                    if (e.data.name === this.LOOP_EVENT_NAME) loopStartTime = e.time;
                });
            }

            // 清空轨道0动画队列
            thisSpine.state.setEmptyAnimation(0, 0);

            const playAnimation = (animName, loop = false, startTime = 0) => {
                const entry = thisSpine.state.setAnimation(0, animName, loop);
                entry.time = startTime;

                entry.listener = {
                    start: () => {
                        this.mainAnimSelect.value = animName;
                    },
                    complete: () => {
                        // loop_start 逻辑
                        if (loopStartTime != null && animName === charAnim) {
                            // 重新播放动画，从 loop_start.time 开始
                            playAnimation(charAnim, false, loopStartTime);
                            return;
                        }

                        // relay逻辑
                        if (relayAnim) {
                            thisSpine.stateData.setMix(animName, relayAnim, this.ANIMATION_MIX);
                            thisSpine.stateData.setMix(relayAnim, this.defaultAnim, this.ANIMATION_MIX);

                            const relayEntry = thisSpine.state.setAnimation(0, relayAnim, false);
                            relayEntry.listener = {
                                complete: () => {
                                    // relay播放完 → 默认 wait
                                    playAnimation(this.defaultAnim, true);
                                },
                            };
                        } else if (animName !== this.defaultAnim) {
                            // 没有relay → 回到默认 wait
                            playAnimation(this.defaultAnim, true);
                        }
                    },
                };
                return entry;
            };

            return playAnimation(charAnim, false);
        },
        _getAnimation(animName, spine) {
            if (!spine || !spine.spineData) return null;
            return spine.spineData.animations.find((a) => a.name === animName) || null;
        },
        _updateAnimationPanelUI(allReset = false) {
            // 主动画下拉框同步
            if (this.mainAnimSelect && this.spine) {
                const current = this.spine.state.getCurrent(0);
                const currentName = current ? current.animation.name : this.defaultAnim;
                this.mainAnimSelect.value = currentName;
            }

            // 次级动画开关全部关闭
            if (allReset) {
                Object.entries(this.subAnimInputs).forEach(([anim, cb]) => {
                    cb.checked = false;
                });
            }
        },

        async _loadCostumeList(charId) {
            // 使用缓存直接返回
            if (this._costumeCache[charId]) {
                this._populateCostumeSelect(this._costumeCache[charId]);
                return;
            }

            let costumes = [];

            try {
                const res = await fetch(`./assets/data/costumehash.json`);
                const data = await res.json();
                const idNum = parseInt(charId, 10);

                // 普通 costume
                costumes = data.filter((item) => parseInt(item.characterId, 10) === idNum);

                // === 特殊角色处理 ===
                if (charId === "091") {
                    // hazuki 默认服装手动添加
                    const hazukiDefault = {
                        characterGroupId: "0",
                        characterHash: "394d2343fb67d559c2b94d39d1cb0c83",
                        characterId: "91",
                        comment: "衣装名なし",
                        evolutionSkinHash: "4a3d7e83858acca867450228d22cf232",
                        evolutionSkinId: "0",
                        groupId: "0",
                        hash: "5b2f10492b098e87216c6c6646001193",
                        id: "2040910010",
                        idolId: "2040910010",
                        isAvailable: true,
                        isEvolutionSkin: false,
                        isReleased: true,
                        isSelected: true,
                        isSkin: false,
                        kind: "all",
                        message: "",
                        name: "【２８３プロの日常】七草 はづき",
                        openAt: null,
                        order: 0,
                        rarity: 4,
                        releasedConditionComment: "",
                        selectCostumeType: "plain",
                        skinId: "0",
                        unitId: "0",
                    };
                    costumes.unshift(hazukiDefault); // 提升到首位
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
                    // 特殊服装提升到前面
                    costumes = [...specialDefaults[charId], ...costumes];
                }

                // 缓存
                this._costumeCache[charId] = costumes;
                this._populateCostumeSelect(costumes);
            } catch (e) {
                console.error("加载服装列表失败:", e);
                this.costumeSelect.innerHTML = "";
            }
        },

        _populateCostumeSelect(costumes) {
            this.costumeSelect.innerHTML = "";

            const currentRoleId = this.fullId.slice(3, 6); // 当前角色 ID

            // === 特殊角色默认服装映射 ===
            const specialDefaultMap = {
                "091": "2040910010",
                801: "1048010010",
                802: "1048020010",
                803: "1048030010",
                804: "2048040010",
            };

            const isSpecial = specialDefaultMap.hasOwnProperty(currentRoleId);
            const defaultFullId = isSpecial ? specialDefaultMap[currentRoleId] : "193" + currentRoleId + "0010"; // 普通角色默认序号规则

            // 处理 102 -> 193，仅普通角色使用
            const processedCostumes = costumes.map((item) => {
                let fullId = item.idolId;
                if (!isSpecial && fullId.startsWith("102")) fullId = "193" + fullId.slice(3);
                return { ...item, fullId };
            });

            // 排序：特殊角色保留原顺序，普通角色默认 fullId 前置，其余按 10 位数字升序
            if (!isSpecial) {
                processedCostumes.sort((a, b) => {
                    if (a.fullId === defaultFullId) return -1;
                    if (b.fullId === defaultFullId) return 1;
                    return parseInt(a.fullId, 10) - parseInt(b.fullId, 10);
                });
            }

            let defaultSelectedValue = defaultFullId;

            processedCostumes.forEach((item) => {
                const opt = document.createElement("option");
                opt.value = item.fullId;
                opt.textContent = item.name;

                if (item.fullId === defaultFullId) {
                    opt.selected = true;
                    defaultSelectedValue = item.fullId;
                }

                this.costumeSelect.appendChild(opt);
            });

            // 保证 select 的 value 与默认 fullId 对齐
            this.costumeSelect.value = defaultSelectedValue;
            console.log("costumeSelect.value", this.costumeSelect.value);
        },
        async _loadIdolReactions(charId) {
            try {
                // 1️⃣ 读取 JSON
                const res = await fetch(`./assets/data/idolReaction.json`);
                const allData = await res.json();

                const idNum = parseInt(charId, 10);
                const idolData = allData.find((d) => parseInt(d.idolId, 10) === idNum);

                if (!idolData) {
                    console.warn(`[ReactionViewer] 未找到角色 ${charId} 的 reaction 数据`);
                    this._populateReactionList([]);
                    return;
                }

                const reactions = [];
                let idCounter = 0; // 列表 id 序号

                // 2️⃣ 处理 myPageComments
                if (idolData.myPageComments?.length) {
                    for (const r of idolData.myPageComments) {
                        reactions.push({
                            ...r,
                            id: `reaction_${idCounter++}`,
                            category: "home",
                            voiceType: "home",
                        });
                    }
                }

                // 3️⃣ 处理 topCharacterReaction 下的所有数组
                if (idolData.topCharacterReaction) {
                    const tcr = idolData.topCharacterReaction;

                    for (const key of Object.keys(tcr)) {
                        const list = tcr[key];
                        if (!Array.isArray(list)) continue;

                        list.forEach((r) => {
                            reactions.push({
                                ...r,
                                id: `reaction_${idCounter++}`, // 根据序号生成唯一 id
                                category: key, // 保留原始 key
                                voiceType: r.voiceType || key,
                            });
                        });
                    }
                }

                // 4️⃣ 排序可选（这里按原始 JSON 顺序，idCounter 已保证顺序）
                // reactions.sort((a, b) => (a.priority || 0) - (b.priority || 0));

                // 5️⃣ 建立 reaction 映射表
                this._reactionMap = {};
                reactions.forEach((r) => {
                    this._reactionMap[r.id] = r;
                });

                console.log(`[ReactionViewer] 角色 ${charId} 反应总数: ${reactions.length}`);
                this._populateReactionList(reactions);
            } catch (e) {
                console.error("加载 idolReaction.json 失败:", e);
                this._populateReactionList([]);
            }
        },
        _populateReactionList(reactions) {
            if (!this.reactionSelect) {
                const reactionLabel = document.createElement("div");
                reactionLabel.textContent = "角色反应:";
                reactionLabel.style.color = "#fff";
                reactionLabel.style.marginTop = "6px";
                reactionLabel.style.fontWeight = "bold";

                const select = document.createElement("select");
                Object.assign(select.style, {
                    width: "100%",
                    padding: "6px",
                    borderRadius: "6px",
                    border: "1px solid #555",
                    background: "#222",
                    color: "#fff",
                    marginTop: "4px",
                });
                this.reactionSelect = select;

                // 添加到控制面板底部
                this.controls.appendChild(reactionLabel);
                this.controls.appendChild(select);

                // 下拉列表变化时触发播放
                select.onchange = () => {
                    const selected = select.value;
                    if (!selected) return;
                    const reactionData = this._reactionMap?.[selected];
                    if (reactionData) this._playReaction(selected);
                };

                // 点击下拉列表选项时，也触发播放
                select.onclick = () => {
                    setTimeout(() => {
                        const selected = select.value;
                        if (!selected) return;
                        const reactionData = this._reactionMap?.[selected];
                        if (reactionData) this._playReaction(selected);
                    }, 0);
                };
            }

            // 清空旧选项
            this.reactionSelect.innerHTML = "";

            if (!reactions || reactions.length === 0) {
                const opt = document.createElement("option");
                opt.textContent = "(无可用反应)";
                opt.disabled = true;
                opt.selected = true;
                this.reactionSelect.appendChild(opt);
                return;
            }

            // === ✅ 按原始 category (JSON key) 分组显示 ===
            // 使用 Map 保持每个 group 的顺序
            const byCategory = new Map();
            for (const r of reactions) {
                const cat = r.category || "未分类";
                if (!byCategory.has(cat)) byCategory.set(cat, []);
                byCategory.get(cat).push(r);
            }

            for (const [category, list] of byCategory.entries()) {
                const group = document.createElement("optgroup");
                group.label = category; // 原始 JSON key，例如 moveReactions, waitReactions

                list.forEach((r) => {
                    const opt = document.createElement("option");
                    opt.textContent = r.voiceName || r.commentType || r.comment || r.id;
                    opt.value = r.id; // 使用 reaction_序号
                    group.appendChild(opt);

                    // 记录映射，供播放时查找
                    if (!this._reactionMap) this._reactionMap = {};
                    this._reactionMap[r.id] = r;
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
            const voiceUrl = `${assetUrl}/sounds/voice/characters/${this.charSelect.value}/${data.voice}.m4a`;
            const audio = new Audio(voiceUrl);
            audio.play();

            // lip 动画
            if (data.lip) {
                const lipTrack = 5;
                this.spine.state.setAnimation(lipTrack, data.lip, true);

                audio.onended = () => {
                    // 切换到闭嘴动画
                    const closedLip = (function (lipAnim) {
                        const match = lipAnim.match(/^(.*?)(\d+)$/);
                        if (match) {
                            const [, base, num] = match;
                            return `${base}_s${num}`;
                        }
                        return `${lipAnim}_s`;
                    })(data.lip);

                    this.spine.state.setAnimation(lipTrack, closedLip, true);

                    // 语音结束后隐藏气泡
                    this._showCommentBubble(""); // 传空字符串表示隐藏
                };
            } else {
                // 没有 lip 动画，也在语音结束时隐藏气泡
                audio.onended = () => this._showCommentBubble("");
            }

            // 显示台词气泡
            this._showCommentBubble(data.comment);
        },
        _showCommentBubble(comment) {
            // 如果不存在气泡 DOM，就创建
            if (!this.commentBubble) {
                const bubble = document.createElement("div");
                Object.assign(bubble.style, {
                    position: "absolute",
                    bottom: "20%", // 根据角色位置调整
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

            if (!comment) {
                // 隐藏气泡
                this.commentBubble.style.opacity = "0";
                return;
            }

            // 设置文本并显示
            this.commentBubble.textContent = comment;
            this.commentBubble.style.opacity = "1";
        },
    };

    global.ReactionViewer = ReactionViewer;
})(window);
