import json

def process_raw_events(input_file, output_file):
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    processed_records = []

    # 处理 gameEvents 和 specialEvents
    for key in ["gameEvents", "specialEvents"]:
        if key in data:
            for event in data[key]:
                album_name = event.get("name", None)  # 上级的 `name`
                event_type = event.get("eventType", key)  # 确定事件类型
                album_id =  event.get("id", None)
                communications = event.get("communications", [])
                for comm in communications:
                    event_id = comm.get("id")
                    if event_id:  # 确保 `id` 存在
                        processed_records.append({
                            "eventId": int(event_id),
                            "eventSourceData": {
                                "eventTitle": comm.get("title"),
                                "eventIndexName": comm.get("name"),
                                "eventType": event_type,
                                "eventAlbumName": album_name,
                                "albumId": album_id,
                            }
                        })

    # 去重并排序
    unique_data = {record["eventId"]: record for record in processed_records}
    sorted_data = sorted(unique_data.values(), key=lambda x: x["eventId"])

    # 保存到输出文件
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(sorted_data, f, indent=4, ensure_ascii=False)

    print(f"Processed {len(processed_records)} events from raw data.")
    print(f"Merged data count: {len(sorted_data)}.")
    print(f"Data saved to {output_file}.")

if __name__ == "__main__":
    input_file = "events_commu_raw.json"  # 输入文件路径
    output_file = "CommuList_events.json"  # 输出文件路径
    process_raw_events(input_file, output_file)
