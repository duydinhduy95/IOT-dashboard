import paho.mqtt.client as mqtt
import json

# Cấu hình
MQTT_BROKER = "broker.emqx.io"
MQTT_TOPIC = "iot/longan/machine123"

def on_connect(client, userdata, flags, rc):
    print(f"✅ Đã kết nối tới Broker: {MQTT_BROKER}")
    client.subscribe(MQTT_TOPIC)
    print(f"📡 Đang lắng nghe trên topic: {MQTT_TOPIC}...")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        print(f"\n🔔 NHẬN ĐƯỢC TIN NHẮN MỚI!")
        print(f"Topic: {msg.topic}")
        # Chỉ in ra số lượng để tránh tràn màn hình nếu waveform quá dài
        if "waveform" in payload:
            print(f"Dữ liệu: Waveform gồm {len(payload['waveform'])} điểm ảnh.")
            print(f"Giá trị đầu tiên: {payload['waveform'][0]}")
        else:
            print(f"Dữ liệu: {payload}")
    except Exception as e:
        print(f"Lỗi khi đọc tin nhắn: {e}")

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

client.connect(MQTT_BROKER, 1883, 60)
client.loop_forever()
