# WS2812B 灯带消消乐（T5-E1）

在 **T5-E1** 上用 WS2812B 灯带和三个颜色按键玩消消乐。

## 接线

| 功能 | 引脚 | 说明 |
|------|------|------|
| 灯带 DIN | **P4** | SPI1 MOSI |
| 红色按键 | **P44** | 低电平有效，内部上拉 |
| 绿色按键 | **P45** | 低电平有效，内部上拉 |
| 蓝色按键 | **P46** | 低电平有效，内部上拉 |
| 灯带 VCC / GND | 5V 电源 | 建议灯带单独供电，并与开发板共地 |

按键另一端接 GND。灯珠数量默认 **16**，可在 `include/game_xiaoxiaole.h` 里改 `STRIP_LED_COUNT`。

## 玩法

1. 上电后灯带随机点亮红 / 绿 / 蓝。
2. **短按**对应颜色键：消除该颜色、长度 ≥ 2 的连续段，得分累加。
3. 剩余灯珠向左靠拢，空位随机补色；若出现长度 ≥ 3 的同色段会自动连锁消除。
4. 没有可消时会闪一下白光提示。
5. **长按任意键（约 1.5s）**：重新开局。

亮度默认较低，避免灯带过热。

## 编译与烧录

```bash
cd /path/to/TuyaOpen
. ./export.sh
cd apps/games/ws2812b_xiaoxiaole
tos.py config choice -c T5AI_MODULE   # 或直接使用已有 app_default.config
tos.py build
tos.py flash
tos.py monitor
```

板级配置使用通用 `T5AI_MODULE`，在应用里自行注册 SPI1/WS2812 与三颗按键，不依赖 Pixel 专用板载外设。

## 文件

```
ws2812b_xiaoxiaole/
├── CMakeLists.txt
├── app_default.config
├── config/T5AI_MODULE.config
├── include/game_xiaoxiaole.h
├── src/game_xiaoxiaole.c
├── src/tuya_app_main.c
└── README.md
```
