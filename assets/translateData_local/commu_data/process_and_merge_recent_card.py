import json


# 从cardinfo_recent.json中读取新偶像卡的剧情数据，合并到CommuList_idol.json中 从.moe获取的json粘贴到recentjson时应当被[]包裹


# 读取 cardinfo_recent.json 文件并处理数据
def process_recent_data():
    with open("cardinfo_recent.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    processed_records = []

    # 遍历原始数据
    for item in data:
        if isinstance(item, dict):  # 检查是否是字典
            for key, value in item.items():
                if isinstance(value, dict) and "b" in value:  # 检查是否包含 "b"
                    card_data = value["b"]

                    def process_events(event_list, event_title_key, event_name_key):
                        if not event_list:
                            return
                        for event in event_list:
                            event_id = event.get("eventId")
                            if event_id:  # 确保 eventId 存在
                                event_title = event.get(event_title_key) or event.get(event_name_key)
                                event_source_data = {
                                    "cardName": card_data.get("cardName"),
                                    "eventTitle": event_title,
                                    "enzaId": card_data.get("enzaId"),
                                    "cardType": card_data.get("cardType"),
                                    "releaseDate": card_data.get("releaseDate")
                                }
                                processed_records.append({
                                    "eventId": event_id,
                                    "eventSourceData": event_source_data
                                })
                            else:
                                print(f"Missing eventId in {event}")

                    # 处理 cardIdolEvents
                    if "cardIdolEvents" in card_data:
                        process_events(card_data["cardIdolEvents"], "eventTitle", None)

                    # 处理 cardSupportEvents
                    if "cardSupportEvents" in card_data:
                        process_events(card_data["cardSupportEvents"], None, "eventName")

    print(f"Processed {len(processed_records)} events from recent data.")
    return processed_records

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
    unique_data_list.sort(key=lambda x: x["eventId"])
    print(f"Merged data count: {len(unique_data_list)}")
    return unique_data_list

# 主函数
def main():
    new_data = process_recent_data()
    existing_data = load_existing_data()
    merged_data = merge_and_sort_data(new_data, existing_data)

    with open("CommuList_card.json", "w", encoding="utf-8") as f:
        json.dump(merged_data, f, indent=4, ensure_ascii=False)

    print("数据已成功合并并保存到 CommuList_card.json 文件")

if __name__ == "__main__":
    main()
