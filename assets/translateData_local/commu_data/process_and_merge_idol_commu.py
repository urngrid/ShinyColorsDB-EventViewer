import os
import json

# 处理单个 JSON 文件，提取所需数据
def process_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    processed_records = []
    idol_id = data.get("id")  # 提取 idolId
    name = data.get("firstName")  # 提取 name

    # 检查是否有 communications
    communications = data.get("communications", [])
    for comm in communications:
        event_id = comm.get("communicationId")
        if event_id:  # 确保 communicationId 存在
            processed_records.append({
                "eventId": int(event_id),  # 确保 eventId 是整数类型
                "eventSourceData": {
                    "eventTitle": comm.get("title"),
                    "communicationCategory": comm.get("communicationCategory"),
                    "eventType": comm.get("albumType"),
                    "eventName": None,  # 留空
                    "idolId": int(idol_id) if idol_id else None,  # 转换为整数
                    "name": name
                }
            })

    print(f"Processed {len(processed_records)} events from {file_path}.")
    return processed_records

# 遍历目录并处理所有 JSON 文件
def process_all_files(directory):
    all_records = []

    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(".json"):  # 只处理 .json 文件
                file_path = os.path.join(root, file)
                all_records.extend(process_file(file_path))

    return all_records

# 加载已有数据
def load_existing_data(output_file):
    try:
        with open(output_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"{output_file} not found. Starting fresh.")
        return []

# 合并新旧数据并排序
def merge_and_sort_data(new_data, existing_data):
    merged_data = existing_data + new_data

    # 去重：根据 eventId 去重
    unique_data = {}
    for record in merged_data:
        event_id = record["eventId"]
        unique_data[event_id] = record  # 字典确保唯一性

    unique_data_list = list(unique_data.values())
    unique_data_list.sort(key=lambda x: x["eventId"])  # 按 eventId 排序
    print(f"Merged data count: {len(unique_data_list)}")
    return unique_data_list

# 主函数
def main():
    input_directory = "raw_idolinfo"  # 输入文件目录
    output_file = "CommuList_idol.json"  # 输出文件

    # 处理所有文件
    new_data = process_all_files(input_directory)

    # 加载已有数据
    existing_data = load_existing_data(output_file)

    # 合并并排序数据
    merged_data = merge_and_sort_data(new_data, existing_data)

    # 保存结果
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(merged_data, f, indent=4, ensure_ascii=False)

    print(f"数据已成功合并并保存到 {output_file} 文件")

if __name__ == "__main__":
    main()
