// http-server J:/shinycolors_J/shinycolors-assets-downloader/assets/ -p 5174  --cors
// 修改标记
// const assetUrl = "https://viewer.shinycolors.moe";
const assetUrl = "http://localhost:5174";
//const assetUrl = "./enza_assets";

const usedFont = "theFont";

// 修改标记
// const zhcnFont = "AlimamaShuHeiTi";
const zhcnFont = "maoken_xiuyayuan.ttf"; //猫啃网秀雅圆
const zhcnFont2 = "MonuTitl-0.95CnBd.ttf"; //典迹题幕 https://www.bilibili.com/read/cv32861274  https://github.com/MY1L/Monu

const translate_master_list = "https://raw.githubusercontent.com/biuuu/ShinyColors/gh-pages/story.json";
const translate_CSV_url = "https://raw.githubusercontent.com/biuuu/ShinyColors/gh-pages/data/story/{uid}.csv";

const fontTimeout = 3000; // control font loading time 放弃字体加载超时时间

// 修改标记
// 添加本地翻译文件目录
const local_translate_CSV_path = "./assets/translateData_local/csv/";
// 添加整合track注释记录
const commuNote_CSV_path = "./assets/data/CommuNote.csv";
//
const commu_info_data_path = "./assets/data";

//
const global_XOffset = 0; //prev 142
const global_YOffset = 480; //prev 320 > 400 > 888(mobile)
const global_YOffset_MainContents = -40; //统一作用于背景(及其他锁定于背景的元素)和人物的第二全局偏移
const global_ViewerHeight = 1920; //2400(mobile)
const global_ViewerWidth = 1136;

//
const global_theme_color = "000000";

const global_headScale_CONFIG_MAP = {
    default: { scale: 1, translate: { x: 0, y: 0 } },

    mano: { scale: 0.92, translate: { x: 0, y: 0 } },
    hiori: { scale: 0.91, translate: { x: 0, y: 0 } },
    meguru: { scale: 0.91, translate: { x: 0, y: 0 } },

    kogane: { scale: 0.91, translate: { x: 0, y: 0 } },
    mamimi: { scale: 0.92, translate: { x: 0, y: 0 } },
    sakuya: { scale: 0.9, translate: { x: 0, y: 0 } },
    yuika: { scale: 0.89, translate: { x: 0, y: 0 } },
    kiriko: { scale: 0.90, translate: { x: 0, y: 0 } },

    kaho: { scale: 0.89, translate: { x: 0, y: 0 } },
    chiyoko: { scale: 0.9, translate: { x: 0, y: 0 } },
    juri: { scale: 0.91, translate: { x: 0, y: 0 } },
    rinze: { scale: 0.93, translate: { x: 0, y: 0 } },
    natsuha: { scale: 0.89, translate: { x: 0, y: 0 } },

    amana: { scale: 0.89, translate: { x: 0, y: 0 } },
    tenka: { scale: 0.89, translate: { x: 0, y: 0 } },
    chiyuki: { scale: 0.9, translate: { x: 0, y: 0 } },

    asahi: { scale: 0.89, translate: { x: 0, y: 0 } },
    fuyuko: { scale: 0.92, translate: { x: 0, y: 0 } },
    mei: { scale: 0.93, translate: { x: 0, y: 0 } },

    toru: { scale: 0.93, translate: { x: 0, y: 0 } },
    madoka: { scale: 0.94, translate: { x: 0, y: 0 } },
    koito: { scale: 0.93, translate: { x: 0, y: 0 } },
    hinana: { scale: 0.91, translate: { x: 0, y: 0 } },

    nichika: { scale: 0.92, translate: { x: 0, y: 0 } },
    mikoto: { scale: 0.91, translate: { x: 0, y: 0 } },

    luca: { scale: 0.92, translate: { x: 0, y: 0 } },
    hana: { scale: 0.93, translate: { x: 0, y: 0 } },
    haruki: { scale: 0.91, translate: { x: 0, y: 0 } },

    hazuki: { scale: 0.89, translate: { x: 0, y: 0 } },

    ruby: { scale: 0.93, translate: { x: 0, y: 0 } },
    kana: { scale: 0.91, translate: { x: 0, y: 0 } },
    mem: { scale: 0.92, translate: { x: 0, y: 0 } },

    akane: { scale: 0.9, translate: { x: 0, y: 0 } },
};
