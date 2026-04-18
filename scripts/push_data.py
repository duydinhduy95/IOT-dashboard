import requests
import json
import time
import os

# 1. Cấu hình
SERVER_URL = "http://localhost:3001/api/simulate-data"
# Bạn hãy đổi đường dẫn này thành đường dẫn thật tới file của bạn
FILE_PATH = os.path.expanduser("~/Downloads/2003.10.22.12.34.13") 
SENSOR_ID = 1  
COLUMN_INDEX = 0 

def push_sensor_data():
    try:
        print(f"--- Đang đọc file: {FILE_PATH} ---")
        waveform_data = []
        
        # 2. Đọc và xử lý file
        if not os.path.exists(FILE_PATH):
            print(f"❌ Không tìm thấy file tại '{FILE_PATH}'")
            print("Vui lòng kiểm tra lại đường dẫn trong file push_data.py")
            return

        with open(FILE_PATH, 'r') as f:
            for line in f:
                parts = line.split()
                if len(parts) > COLUMN_INDEX:
                    try:
                        val = float(parts[COLUMN_INDEX])
                        waveform_data.append(val)
                    except ValueError:
                        continue
        
        if not waveform_data:
            print("❌ Không tìm thấy dữ liệu hợp lệ trong file.")
            return

        print(f"✅ Đã trích xuất {len(waveform_data)} điểm dữ liệu.")

        # 3. Gửi dữ liệu lên Server
        payload = {
            "sensorId": SENSOR_ID,
            "waveform": waveform_data
        }
        
        print(f"🚀 Đang gửi dữ liệu lên Server...")
        response = requests.post(SERVER_URL, json=payload)
        
        if response.status_code == 200:
            print("🎉 Gửi dữ liệu THÀNH CÔNG!")
            print(f"Server phản hồi: {response.json().get('message')}")
        else:
            print(f"❌ Server báo lỗi: {response.status_code}")
            print(response.text)

    except Exception as e:
        print(f"💥 Đã xảy ra lỗi hệ thống: {e}")

if __name__ == "__main__":
    push_sensor_data()
