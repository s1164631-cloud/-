/**
 * @file game_xiaoxiaole.h
 * @brief WS2812B strip shooter (消消乐射击版) for T5-E1
 *
 * LED 0-2   : flame base (no collision)
 * LED 3..N-1: playfield — blocks fall down, bullets fly up
 */
#ifndef __GAME_XIAOXIAOLE_H__
#define __GAME_XIAOXIAOLE_H__

#include "tuya_cloud_types.h"
#include "tdl_pixel_dev_manage.h"

#ifdef __cplusplus
extern "C" {
#endif

/***********************************************************
************************ constants *************************
***********************************************************/
#define GAME_LED_DEFAULT      150
#define GAME_LED_MIN          150
#define GAME_LED_MAX          300
#define GAME_LED_STEP         30

#define GAME_MAX_LIVES        3
#define GAME_HEALTH_INIT      3
#define GAME_HEALTH_COMBO     3
#define GAME_LEVEL_UP_SCORE   100
#define GAME_MAX_LEVEL        10
#define GAME_BULLET_SPEED_MS  20
#define GAME_COLOR_RES        1000

#define GAME_FLAME_LAST       2
#define GAME_ZONE_START       3
#define GAME_MAX_BLOCKS       16
#define GAME_MAX_BULLETS      4

#define GAME_SPAWN_MIN_MS     400
#define GAME_FALL_MIN_MS      100

/***********************************************************
*********************** type defines ***********************
***********************************************************/
typedef enum {
    GAME_COLOR_RED = 0,
    GAME_COLOR_GREEN,
    GAME_COLOR_BLUE,
    GAME_COLOR_YELLOW, /* shell / only pink clears cleanly */
    GAME_COLOR_PINK,   /* skill bullet */
} GAME_COLOR_E;

typedef struct {
    bool active;
    uint16_t pos; /* 3 .. N-1 */
    GAME_COLOR_E color;
    bool is_shell;
} GAME_BLOCK_T;

typedef struct {
    bool active;
    uint16_t pos;
    GAME_COLOR_E color;
} GAME_BULLET_T;

typedef struct {
    uint32_t score;
    uint8_t lives;
    uint8_t level; /* 1..10 */
    uint16_t combo;
    uint16_t sp_combo;
    uint16_t miss_streak;
    uint16_t health_count;
    uint16_t spawn_interval_ms;
    uint16_t fall_interval_ms;
    bool skill_charged;
    bool skill_speed_boost; /* once true: skill never again; keep accel */
    bool game_over;
    bool won;
    GAME_BLOCK_T blocks[GAME_MAX_BLOCKS];
    GAME_BULLET_T bullets[GAME_MAX_BULLETS];
} GAME_STATE_T;

typedef enum {
    BTN_EVT_NONE = 0,
    BTN_EVT_RED,
    BTN_EVT_GREEN,
    BTN_EVT_BLUE,
    BTN_EVT_LONG, /* long-press: cycle LED length when idle / restart when playing */
} BTN_EVT_E;

/***********************************************************
*********************** API ********************************
***********************************************************/
OPERATE_RET game_hw_init(PIXEL_HANDLE_T *out_pixels);
OPERATE_RET game_buttons_init(void);

void game_reset(void);
void game_on_button_event(BTN_EVT_E evt);
BTN_EVT_E game_consume_button_event(void);

/** Advance simulation by @p dt_ms and render. */
void game_tick(PIXEL_HANDLE_T pixels, uint32_t dt_ms);

void game_shoot(GAME_COLOR_E color);
void game_cycle_led_count(PIXEL_HANDLE_T *pixels);

uint16_t game_get_led_count(void);
const GAME_STATE_T *game_get_state(void);

#ifdef __cplusplus
}
#endif

#endif /* __GAME_XIAOXIAOLE_H__ */
