/**
 * @file game_xiaoxiaole.c
 * @brief WS2812B strip 消消乐 for T5-E1
 *
 * Wiring:
 *   WS2812B DIN -> P4  (SPI1 MOSI)
 *   Red button   -> P44 (active-low)
 *   Green button -> P45 (active-low)
 *   Blue button  -> P46 (active-low)
 */

#include "game_xiaoxiaole.h"

#include <string.h>

#include "tal_api.h"
#include "tkl_pinmux.h"

#include "tdd_button_gpio.h"
#include "tdd_pixel_type.h"
#include "tdd_pixel_ws2812.h"
#include "tdl_button_manage.h"
#include "tdl_pixel_color_manage.h"

/***********************************************************
************************macro define************************
***********************************************************/
#define COLOR_RESOLUTION 255
#define COLOR_BRIGHTNESS 28 /* keep strip cool / eye-safe */

#define BTN_RED_PIN   TUYA_GPIO_NUM_44
#define BTN_GREEN_PIN TUYA_GPIO_NUM_45
#define BTN_BLUE_PIN  TUYA_GPIO_NUM_46

#define WS2812_SPI_PORT TUYA_SPI_NUM_1
#define WS2812_DATA_PIN TUYA_GPIO_NUM_4

#define MATCH_MIN_MANUAL 2 /* press clears groups of this size or larger */
#define MATCH_MIN_CASCADE 3

/***********************************************************
***********************variable define**********************
***********************************************************/
static CELL_COLOR_E sg_board[STRIP_LED_COUNT];
static uint32_t sg_score = 0;
static volatile BTN_EVT_E sg_btn_evt = BTN_EVT_NONE;
static uint32_t sg_rng = 0xA5A5C3C3u;

/***********************************************************
***********************function define**********************
***********************************************************/
static uint32_t __rand_u32(void)
{
    /* xorshift32 */
    uint32_t x = sg_rng;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    sg_rng = x ? x : 0x12345678u;
    return sg_rng;
}

static CELL_COLOR_E __rand_color(void)
{
    return (CELL_COLOR_E)(CELL_RED + (__rand_u32() % 3));
}

static void __cell_to_pixel(CELL_COLOR_E cell, PIXEL_COLOR_T *out)
{
    memset(out, 0, sizeof(*out));
    switch (cell) {
    case CELL_RED:
        out->red = COLOR_BRIGHTNESS;
        break;
    case CELL_GREEN:
        out->green = COLOR_BRIGHTNESS;
        break;
    case CELL_BLUE:
        out->blue = COLOR_BRIGHTNESS;
        break;
    default:
        break;
    }
}

static void __fill_random_board(void)
{
    for (uint32_t i = 0; i < STRIP_LED_COUNT; i++) {
        sg_board[i] = __rand_color();
    }
}

static uint32_t __compact_board(void)
{
    uint32_t w = 0;
    for (uint32_t r = 0; r < STRIP_LED_COUNT; r++) {
        if (sg_board[r] != CELL_EMPTY) {
            sg_board[w++] = sg_board[r];
        }
    }
    uint32_t emptied = STRIP_LED_COUNT - w;
    while (w < STRIP_LED_COUNT) {
        sg_board[w++] = CELL_EMPTY;
    }
    return emptied;
}

static void __refill_empty(void)
{
    for (uint32_t i = 0; i < STRIP_LED_COUNT; i++) {
        if (sg_board[i] == CELL_EMPTY) {
            sg_board[i] = __rand_color();
        }
    }
}

/**
 * Clear contiguous runs of @p target with length >= @p min_len.
 * Returns number of cells cleared.
 */
static uint32_t __clear_groups(CELL_COLOR_E target, uint32_t min_len)
{
    uint32_t cleared = 0;
    uint32_t i = 0;

    while (i < STRIP_LED_COUNT) {
        if (sg_board[i] != target) {
            i++;
            continue;
        }
        uint32_t j = i;
        while (j < STRIP_LED_COUNT && sg_board[j] == target) {
            j++;
        }
        uint32_t len = j - i;
        if (len >= min_len) {
            for (uint32_t k = i; k < j; k++) {
                sg_board[k] = CELL_EMPTY;
            }
            cleared += len;
        }
        i = j;
    }
    return cleared;
}

/**
 * Auto-cascade: clear any color group with length >= MATCH_MIN_CASCADE.
 */
static uint32_t __cascade_clear(void)
{
    uint32_t total = 0;
    uint32_t round;

    do {
        round = 0;
        round += __clear_groups(CELL_RED, MATCH_MIN_CASCADE);
        round += __clear_groups(CELL_GREEN, MATCH_MIN_CASCADE);
        round += __clear_groups(CELL_BLUE, MATCH_MIN_CASCADE);
        if (round > 0) {
            total += round;
            __compact_board();
            __refill_empty();
        }
    } while (round > 0);

    return total;
}

void game_render(PIXEL_HANDLE_T pixels)
{
    PIXEL_COLOR_T color;

    for (uint32_t i = 0; i < STRIP_LED_COUNT; i++) {
        __cell_to_pixel(sg_board[i], &color);
        tdl_pixel_set_single_color(pixels, i, 1, &color);
    }
    tdl_pixel_dev_refresh(pixels);
}

static void __flash_miss(PIXEL_HANDLE_T pixels)
{
    PIXEL_COLOR_T white = {.red = COLOR_BRIGHTNESS / 2,
                           .green = COLOR_BRIGHTNESS / 2,
                           .blue = COLOR_BRIGHTNESS / 2,
                           .warm = 0,
                           .cold = 0};
    PIXEL_COLOR_T off = {0};

    tdl_pixel_set_single_color_all(pixels, &white);
    tdl_pixel_dev_refresh(pixels);
    tal_system_sleep(80);
    tdl_pixel_set_single_color_all(pixels, &off);
    tdl_pixel_dev_refresh(pixels);
    tal_system_sleep(60);
    game_render(pixels);
}

uint32_t game_get_score(void)
{
    return sg_score;
}

void game_reset(PIXEL_HANDLE_T pixels)
{
    sg_score = 0;
    sg_rng ^= (uint32_t)tal_system_get_millisecond();
    __fill_random_board();
    /* avoid starting with an instant cascade win */
    for (int guard = 0; guard < 8; guard++) {
        uint32_t c = 0;
        c += __clear_groups(CELL_RED, MATCH_MIN_CASCADE);
        c += __clear_groups(CELL_GREEN, MATCH_MIN_CASCADE);
        c += __clear_groups(CELL_BLUE, MATCH_MIN_CASCADE);
        if (c == 0) {
            break;
        }
        __compact_board();
        __refill_empty();
    }
    game_render(pixels);
    PR_NOTICE("Game reset. Score=0, LEDs=%d", STRIP_LED_COUNT);
}

void game_handle_press(PIXEL_HANDLE_T pixels, CELL_COLOR_E color)
{
    uint32_t cleared = __clear_groups(color, MATCH_MIN_MANUAL);
    if (cleared == 0) {
        PR_NOTICE("No match for color %d", (int)color);
        __flash_miss(pixels);
        return;
    }

    sg_score += cleared;
    PR_NOTICE("Cleared %u, score=%u", cleared, sg_score);

    /* brief blank of cleared cells */
    game_render(pixels);
    tal_system_sleep(120);

    __compact_board();
    game_render(pixels);
    tal_system_sleep(100);

    __refill_empty();
    game_render(pixels);
    tal_system_sleep(80);

    uint32_t cascade = __cascade_clear();
    if (cascade > 0) {
        sg_score += cascade;
        PR_NOTICE("Cascade +%u, score=%u", cascade, sg_score);
        game_render(pixels);
    }
}

void game_on_button_event(BTN_EVT_E evt)
{
    /* keep latest event; main loop consumes */
    sg_btn_evt = evt;
}

BTN_EVT_E game_consume_button_event(void)
{
    BTN_EVT_E evt = sg_btn_evt;
    sg_btn_evt = BTN_EVT_NONE;
    return evt;
}

static OPERATE_RET __register_ws2812(void)
{
    OPERATE_RET rt = OPRT_OK;
    PIXEL_DRIVER_CONFIG_T cfg = {
        .port = WS2812_SPI_PORT,
        .line_seq = GRB_ORDER, /* WS2812B typical wire order */
    };

    /* P4 is SPI1_MOSI on T5-E1 */
    tkl_io_pinmux_config(TUYA_GPIO_NUM_2, TUYA_SPI1_CLK);
    tkl_io_pinmux_config(TUYA_GPIO_NUM_3, TUYA_SPI1_CS);
    tkl_io_pinmux_config(WS2812_DATA_PIN, TUYA_SPI1_MOSI);
    tkl_io_pinmux_config(TUYA_GPIO_NUM_5, TUYA_SPI1_MISO);

    TUYA_CALL_ERR_RETURN(tdd_ws2812_driver_register(LEDS_PIXEL_NAME, &cfg));
    PR_NOTICE("WS2812 registered on SPI1 / P%d as '%s'", (int)WS2812_DATA_PIN, LEDS_PIXEL_NAME);
    return rt;
}

static OPERATE_RET __register_buttons(void)
{
    OPERATE_RET rt = OPRT_OK;
    BUTTON_GPIO_CFG_T hw = {0};

    hw.level = TUYA_GPIO_LEVEL_LOW;
    hw.mode = BUTTON_TIMER_SCAN_MODE;
    hw.pin_type.gpio_pull = TUYA_GPIO_PULLUP;

    hw.pin = BTN_RED_PIN;
    TUYA_CALL_ERR_RETURN(tdd_gpio_button_register(BUTTON_NAME, &hw));

    hw.pin = BTN_GREEN_PIN;
    TUYA_CALL_ERR_RETURN(tdd_gpio_button_register(BUTTON_NAME_2, &hw));

    hw.pin = BTN_BLUE_PIN;
    TUYA_CALL_ERR_RETURN(tdd_gpio_button_register(BUTTON_NAME_3, &hw));

    PR_NOTICE("Buttons: RED=P%d GREEN=P%d BLUE=P%d", BTN_RED_PIN, BTN_GREEN_PIN, BTN_BLUE_PIN);
    return rt;
}

OPERATE_RET game_hw_init(PIXEL_HANDLE_T *out_pixels)
{
    OPERATE_RET rt = OPRT_OK;
    PIXEL_HANDLE_T handle = NULL;

    if (NULL == out_pixels) {
        return OPRT_INVALID_PARM;
    }

    TUYA_CALL_ERR_RETURN(__register_ws2812());
    TUYA_CALL_ERR_RETURN(__register_buttons());

    TUYA_CALL_ERR_RETURN(tdl_pixel_dev_find(LEDS_PIXEL_NAME, &handle));

    PIXEL_DEV_CONFIG_T pixels_cfg = {
        .pixel_num = STRIP_LED_COUNT,
        .pixel_resolution = COLOR_RESOLUTION,
    };
    TUYA_CALL_ERR_RETURN(tdl_pixel_dev_open(handle, &pixels_cfg));

    *out_pixels = handle;
    return rt;
}

static void __button_cb(char *name, TDL_BUTTON_TOUCH_EVENT_E event, void *argc)
{
    (void)argc;
    BTN_EVT_E mapped = BTN_EVT_NONE;

    if (NULL == name) {
        return;
    }

    if (0 == strcmp(name, BUTTON_NAME)) {
        mapped = BTN_EVT_RED;
    } else if (0 == strcmp(name, BUTTON_NAME_2)) {
        mapped = BTN_EVT_GREEN;
    } else if (0 == strcmp(name, BUTTON_NAME_3)) {
        mapped = BTN_EVT_BLUE;
    } else {
        return;
    }

    if (TDL_BUTTON_LONG_PRESS_START == event) {
        game_on_button_event(BTN_EVT_RESTART);
        PR_NOTICE("%s long-press -> restart", name);
        return;
    }

    if (TDL_BUTTON_PRESS_DOWN == event) {
        game_on_button_event(mapped);
        PR_NOTICE("%s click", name);
    }
}

OPERATE_RET game_buttons_init(void)
{
    OPERATE_RET rt = OPRT_OK;
    TDL_BUTTON_CFG_T button_cfg = {.long_start_valid_time = 1500,
                                   .long_keep_timer = 1000,
                                   .button_debounce_time = 40,
                                   .button_repeat_valid_count = 0,
                                   .button_repeat_valid_time = 0};

    TDL_BUTTON_HANDLE h1 = NULL;
    TDL_BUTTON_HANDLE h2 = NULL;
    TDL_BUTTON_HANDLE h3 = NULL;

    TUYA_CALL_ERR_RETURN(tdl_button_create(BUTTON_NAME, &button_cfg, &h1));
    tdl_button_event_register(h1, TDL_BUTTON_PRESS_DOWN, __button_cb);
    tdl_button_event_register(h1, TDL_BUTTON_LONG_PRESS_START, __button_cb);

    TUYA_CALL_ERR_RETURN(tdl_button_create(BUTTON_NAME_2, &button_cfg, &h2));
    tdl_button_event_register(h2, TDL_BUTTON_PRESS_DOWN, __button_cb);
    tdl_button_event_register(h2, TDL_BUTTON_LONG_PRESS_START, __button_cb);

    TUYA_CALL_ERR_RETURN(tdl_button_create(BUTTON_NAME_3, &button_cfg, &h3));
    tdl_button_event_register(h3, TDL_BUTTON_PRESS_DOWN, __button_cb);
    tdl_button_event_register(h3, TDL_BUTTON_LONG_PRESS_START, __button_cb);

    return rt;
}
