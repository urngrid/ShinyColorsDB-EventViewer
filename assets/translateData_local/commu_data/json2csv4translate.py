import json
import csv

# 输入文件路径
input_files = ['CommuList_card.json', 'CommuList_events.json']

# 用于记录已经处理过的 eventAlbumName 值
processed_event_album_names = set()
processed_cardNames = set()

# 准备 CSV 数据
csv_output = []

# 处理两个输入文件
for input_file in input_files:

    # 读取 JSON 数据
    with open(input_file, 'r', encoding='utf-8') as file:
        json_data = json.load(file)
        
    for item in json_data:
        event_data = item["eventSourceData"]
        
        # 处理 eventAlbumName，字段必须存在且非空且去重
        if "eventAlbumName" in event_data and event_data["eventAlbumName"]:
            album_name = event_data["eventAlbumName"]
            if album_name not in processed_event_album_names:
                csv_output.append([
                    "eventAlbumName", album_name, "待翻译"
                ])
                processed_event_album_names.add(album_name)
                
        # 处理 eventAlbumName，字段必须存在且非空且去重
        if "cardName" in event_data and event_data["cardName"]:
            cardName = event_data["cardName"]
            if cardName not in processed_cardNames:
                csv_output.append([
                    "cardName", cardName, "待翻译"
                ])
                processed_cardNames.add(cardName)
        
        
        # 处理 eventTitle，检查是否存在且非空
        if "eventTitle" in event_data and event_data["eventTitle"]:
            csv_output.append([
                "eventTitle", event_data["eventTitle"], "待翻译"
            ])
        
        # 处理 eventName，检查是否存在且非空
        if "eventName" in event_data and event_data["eventName"]:
            csv_output.append([
                "eventName", event_data["eventName"], "待翻译"
            ])

# 输出 CSV 文件路径
output_file = 'translated_title_data.csv'  # 你可以根据需要调整文件路径

# 写入 CSV 文件
with open(output_file, mode='w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    writer.writerow(["Key", "Value", "待翻译"])
    writer.writerows(csv_output)

print(f"CSV 文件已保存为: {output_file}")
