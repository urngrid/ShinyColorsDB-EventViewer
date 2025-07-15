// http-server J:/shinycolors_J/shinycolors-assets-downloader/assets/ -p 5174  --cors 
// 修改标记
// const assetUrl = "https://viewer.shinycolors.moe";
const assetUrl = "http://localhost:5174";

const usedFont = "theFont";

// 修改标记
// const zhcnFont = "AlimamaShuHeiTi";
const zhcnFont = "maoken_xiuyayuan.ttf"; //猫啃网秀雅圆 
const zhcnFont2 = "MonuTitl-0.95CnBd.ttf"; //典迹题幕 https://www.bilibili.com/read/cv32861274  https://github.com/MY1L/Monu

const translate_master_list = "https://raw.githubusercontent.com/biuuu/ShinyColors/gh-pages/story.json";
const translate_CSV_url = 'https://raw.githubusercontent.com/biuuu/ShinyColors/gh-pages/data/story/{uid}.csv';



const fontTimeout = 3000; // control font loading time 放弃字体加载超时时间


// 修改标记 
// 添加本地翻译文件目录
const local_translate_CSV_path = './assets/translateData_local/csv_modified/';
// 添加整合track注释记录
const commuNote_CSV_path = './assets/translateData_local/CommuNote.csv';
//
const commu_info_data_path = './assets/translateData_local/commu_data';

//
const global_XOffset = 0; //prev 142
const global_YOffset = 400; //prev 320
const global_YOffset_MainContents = -40; //统一作用于背景(及其他锁定于背景的元素)和人物的第二全局偏移 
const global_ViewerHeight = 1760;


//
const global_theme_color = "000000";




