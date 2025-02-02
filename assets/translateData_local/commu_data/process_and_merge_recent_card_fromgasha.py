from datetime import datetime
import json
import shutil
import os

# 获取今天的日期作为默认的 releaseDate
default_release_date = datetime.today().strftime("%Y-%m-%d")

# 读取新的 JSON 格式文件
new_format_path = "./cardinfo_recent.json"
with open(new_format_path, "r", encoding="utf-8") as file:
    new_data = json.load(file)

# 定义一个函数，根据 idolId 前缀确定卡片类型
def get_card_type(idol_id):
    prefix = idol_id[:3]
    return {
        "103": "P_SR",
        "104": "P_SSR",
        "203": "S_SR",
        "204": "S_SSR"
    }.get(prefix, "Unknown")

# 处理新的 JSON 格式
output_records = []

for record in new_data:
    # 处理 produce idol 事件
    idol = record.get("idol", {})
    idol_id = idol.get("id", "")
    card_name = idol.get("name", "")
    release_date = record.get("createdAt") or default_release_date

    for event in idol.get("produceAfterEvents", []) + idol.get("produceIdolEvents", []):
        event_id = event.get("id", None)
        event_title = event.get("title", "Unknown")

        if event_id:
            output_records.append({
                "eventId": str(event_id),
                "eventSourceData": {
                    "cardName": card_name,
                    "eventTitle": event_title,
                    "enzaId": idol_id,
                    "cardType": get_card_type(idol_id),
                    "releaseDate": release_date
                }
            })

    # 处理 support idol 事件
    support_idol = record.get("supportIdol", {})
    support_idol_id = support_idol.get("id", "")
    support_card_name = support_idol.get("name", "")

    for event in support_idol.get("produceSupportIdolEvents", []):
        event_id = event.get("id", None)
        event_title = event.get("title", "Unknown")

        if event_id:
            output_records.append({
                "eventId": str(event_id),
                "eventSourceData": {
                    "cardName": support_card_name,
                    "eventTitle": event_title,
                    "enzaId": support_idol_id,
                    "cardType": get_card_type(support_idol_id),
                    "releaseDate": release_date
                }
            })

# 读取已有的 commulist_card.json 文件
def load_existing_data():
    try:
        with open("CommuList_card.json", "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print("Existing data file not found. Starting fresh.")
        return []

# 合并新旧数据并排序
def merge_and_sort_data(new_data, existing_data):
    merged_data = existing_data + new_data

    unique_data = {}
    for record in merged_data:
        event_id = record["eventId"]
        if event_id not in unique_data:
            unique_data[event_id] = record

    unique_data_list = list(unique_data.values())
    unique_data_list.sort(key=lambda x: str(x["eventId"]))
    print(f"Merged data count: {len(unique_data_list)}")
    return unique_data_list

# 主函数
def main():
    new_data = output_records
    existing_data = load_existing_data()
    merged_data = merge_and_sort_data(new_data, existing_data)

    # 备份旧的 commulist_card.json 文件
    if os.path.exists("CommuList_card.json"):
        shutil.copy("CommuList_card.json", "CommuList_card_backup.json")

    # 写入合并后的数据到 commulist_card.json 文件
    with open("CommuList_card.json", "w", encoding="utf-8") as f:
        json.dump(merged_data, f, indent=4, ensure_ascii=False)

    print("数据已成功合并并保存到 CommuList_card.json 文件")

if __name__ == "__main__":
    main()