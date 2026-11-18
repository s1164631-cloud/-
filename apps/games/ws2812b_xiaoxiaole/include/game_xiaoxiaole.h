/**
 * @file game_xiaoxiaole.h
 * @brief WS2812B strip match-clear (消消乐) game API
 */
#ifndef __GAME_XIAOXIAOLE_H__
#define __GAME_XIAOXIAOLE_H__

#include "tuya_cloud_types.h"
#include "tdl_pixel_dev_manage.h"

#ifdef __cplusplus
extern "C" {
#endif

/** Number of WS2812 LEDs on the strip (change to match your hardware). */
#ifndef STRIP_LED_COUNT
#define STRIP_LED_COUNT 16
#endif

typedef enum {
    CELL_EMPTY = 0,
    CELL_RED,
    CELL_GREEN,
    CELL_BLUE,
} CELL_COLOR_E;

typedef enum {
    BTN_EVT_NONE = 0,
    BTN_EVT_RED,
    BTN_EVT_GREEN,
    BTN_EVT_BLUE,
    BTN_EVT_RESTART,
} BTN_EVT_E;

OPERATE_RET game_hw_init(PIXEL_HANDLE_T *out_pixels);
OPERATE_RET game_buttons_init(void);
void game_reset(PIXEL_HANDLE_T pixels);
void game_on_button_event(BTN_EVT_E evt);
BTN_EVT_E game_consume_button_event(void);
void game_handle_press(PIXEL_HANDLE_T pixels, CELL_COLOR_E color);
void game_render(PIXEL_HANDLE_T pixels);
uint32_t game_get_score(void);

#ifdef __cplusplus
}
#endif

#endif /* __GAME_XIAOXIAOLE_H__ */
