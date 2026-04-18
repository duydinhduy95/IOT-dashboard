import requests
import json

SERVER_URL = "http://localhost:3001/api/simulate-data"

def push_stats(signal, days):
    payload = {
        "inputSignal": signal,
        "remainingDays": days
    }
    
    print(f"🚀 Đang gửi Status mới: Signal={signal}, Days={days}...")
    try:
        response = requests.post(SERVER_URL, json=payload)
        if response.status_code == 200:
            print("🎉 THÀNH CÔNG! Hãy nhìn Dashboard của bạn nhảy số ngay lập tức.")
        else:
            print(f"❌ Lỗi: {response.status_code}")
    except Exception as e:
        print(f"💥 Lỗi kết nối: {e}")

if __name__ == "__main__":
    # Bạn có thể thay đổi số ở đây để test
    push_stats(99, 5)
