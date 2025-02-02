import requests
import json
import os

# 从GitHub下载最新的story.json文件
def download_latest_story_json(url, local_path):
    response = requests.get(url)
    if response.status_code == 200:
        # 确保目录存在
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        # 保存story.json文件
        with open(local_path, 'w', encoding='utf-8') as file:
            file.write(response.text)
        print(f"最新的story.json文件已保存到：{local_path}")
    else:
        print(f"下载失败：{url}")

# 读取映射文件
def read_mapping_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        return json.load(file)

# 下载CSV文件并保存，避免空行
def download_and_save_csv(csv_url, csv_path):
    # 检查文件是否已经存在
    if os.path.exists(csv_path):
        print(f"文件已存在，跳过下载：{csv_path}")
        return
    
    response = requests.get(csv_url)
    if response.status_code == 200:
        # 确保目录存在
        os.makedirs(os.path.dirname(csv_path), exist_ok=True)
        
        # 读取CSV内容并过滤空行
        csv_lines = response.text.splitlines()
        filtered_lines = [line for line in csv_lines if line.strip()]  # 去除空行
        
        # 保存CSV文件
        with open(csv_path, 'w', encoding='utf-8', newline='') as csv_file:
            csv_file.write('\n'.join(filtered_lines))
        print(f"文件已保存到：{csv_path}")
    else:
        print(f"下载失败：{csv_url}")

# 主函数
def main():
    # GitHub上的story.json文件链接
    story_json_url = 'https://raw.githubusercontent.com/biuuu/ShinyColors/gh-pages/story.json'
    # 本地story.json文件路径
    local_story_json_path = r'J:/shinycolors_J/ShinyColorsDB-EventViewer/assets/translateData_local/story.json'
    
    # 下载最新的story.json文件
    download_latest_story_json(story_json_url, local_story_json_path)
    
    # 读取映射记录
    mappings = read_mapping_file(local_story_json_path)
    
    for mapping in mappings:
        json_record, csv_filename = mapping
        csv_url = f"https://raw.githubusercontent.com/biuuu/ShinyColors/gh-pages/data/story/{csv_filename}.csv"
        output_csv_dir = r'J:/shinycolors_J/ShinyColorsDB-EventViewer/assets/translateData_local/csv'
        # 根据json文件的记录创建子目录
        sub_dir = json_record.split('/')[0]  # 假设json_record的格式是 "目录/文件名.json"
        output_csv_path = os.path.join(output_csv_dir, sub_dir, os.path.basename(json_record).replace('.json', '.csv'))
        
        # 下载并保存CSV
        download_and_save_csv(csv_url, output_csv_path)

if __name__ == "__main__":
    main()
