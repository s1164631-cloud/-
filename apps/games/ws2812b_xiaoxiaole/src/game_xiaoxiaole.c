/**
 * @file game_xiaoxiaole.c
 * @brief WS2812B strip shooter for T5-E1
 *
 * Wiring: DIN=P4 (SPI1 MOSI), Red=P44, Green=P45, Blue=P46
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
************************ hardware **************************
***********************************************************/
#define BTN_RED_PIN   TUYA_GPIO_NUM_44
#define BTN_GREEN_PIN TUYA_GPIO_NUM_45
#define BTN_BLUE_PIN  TUYA_GPIO_NUM_46
#define WS2812_SPI_PORT TUYA_SPI_NUM_1
#define WS2812_DATA_PIN TUYA_GPIO_NUM_4

#define BRIGHT_BLOCK  120
#define BRIGHT_BULLET 200
#define BRIGHT_FLAME  180
#define BRIGHT_HEALTH 40
#define RIPPLE_LEN    8

/***********************************************************
*********************** speed table ************************
***********************************************************/
/* index by level 1..10 */
static const uint16_t SG_SPAWN_MS[GAME_MAX_LEVEL + 1] = {
    0, 2000, 1850, 1650, 1400, 1100, 800, 800, 800, 800, 800};
static const uint16_t SG_FALL_MS[GAME_MAX_LEVEL + 1] = {
    0, 400, 370, 340, 300, 260, 200, 200, 200, 200, 200};

/***********************************************************
*********************** state ******************************
***********************************************************/
static GAME_STATE_T sg_state;
static uint16_t sg_led_count = GAME_LED_DEFAULT;
static volatile BTN_EVT_E sg_btn_evt = BTN_EVT_NONE;
static uint32_t sg_rng = 0xC0FFEEu;

static uint32_t sg_acc_spawn;
static uint32_t sg_acc_fall;
static uint32_t sg_acc_bullet;
static uint32_t sg_flame_phase;

typedef struct {
    bool active;
    uint16_t center;
    uint16_t age; /* frames */
} RIPPLE_T;
static RIPPLE_T sg_ripple;

/***********************************************************
*********************** helpers ****************************
***********************************************************/
static uint32_t __rand_u32(void)
{
    uint32_t x = sg_rng;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    sg_rng = x ? x : 0x12345678u;
    return sg_rng;
}

static uint16_t __top_pos(void)
{
    return (uint16_t)(sg_led_count - 1);
}

static void __color_to_pixel(GAME_COLOR_E c, uint16_t bright, PIXEL_COLOR_T *out)
{
    memset(out, 0, sizeof(*out));
    switch (c) {
    case GAME_COLOR_RED:
        out->red = bright;
        break;
    case GAME_COLOR_GREEN:
        out->green = bright;
        break;
    case GAME_COLOR_BLUE:
        out->blue = bright;
        break;
    case GAME_COLOR_YELLOW:
        out->red = bright;
        out->green = bright * 7 / 10;
        break;
    case GAME_COLOR_PINK:
        out->red = bright;
        out->blue = bright * 4 / 10;
        out->green = bright / 8;
        break;
    default:
        break;
    }
}

static void __apply_level_speeds(void)
{
    uint8_t lv = sg_state.level;
    if (lv < 1) {
        lv = 1;
    }
    if (lv > GAME_MAX_LEVEL) {
        lv = GAME_MAX_LEVEL;
    }

    uint16_t spawn = SG_SPAWN_MS[lv];
    uint16_t fall = SG_FALL_MS[lv];

    if (sg_state.skill_speed_boost) {
        spawn = (uint16_t)(spawn / 2);
        fall = (uint16_t)(fall / 2);
        if (spawn < GAME_SPAWN_MIN_MS) {
            spawn = GAME_SPAWN_MIN_MS;
        }
        if (fall < GAME_FALL_MIN_MS) {
            fall = GAME_FALL_MIN_MS;
        }
    }

    sg_state.spawn_interval_ms = spawn;
    sg_state.fall_interval_ms = fall;
}

static void __update_level_from_score(void)
{
    uint8_t new_lv = (uint8_t)(sg_state.score / GAME_LEVEL_UP_SCORE + 1);
    if (new_lv > GAME_MAX_LEVEL) {
        new_lv = GAME_MAX_LEVEL;
    }
    if (new_lv != sg_state.level) {
        sg_state.level = new_lv;
        __apply_level_speeds();
        PR_NOTICE("Level up -> %u  spawn=%ums fall=%ums", sg_state.level,
                  sg_state.spawn_interval_ms, sg_state.fall_interval_ms);
    }
}

static int __find_free_block(void)
{
    for (int i = 0; i < GAME_MAX_BLOCKS; i++) {
        if (!sg_state.blocks[i].active) {
            return i;
        }
    }
    return -1;
}

static int __find_free_bullet(void)
{
    for (int i = 0; i < GAME_MAX_BULLETS; i++) {
        if (!sg_state.bullets[i].active) {
            return i;
        }
    }
    return -1;
}

static void __clear_all_blocks(void)
{
    for (int i = 0; i < GAME_MAX_BLOCKS; i++) {
        sg_state.blocks[i].active = false;
    }
}

static void __spawn_block(void)
{
    int idx = __find_free_block();
    if (idx < 0) {
        return;
    }

    GAME_BLOCK_T *b = &sg_state.blocks[idx];
    b->active = true;
    b->pos = __top_pos();

    /* ~12% yellow shells */
    if ((__rand_u32() % 100) < 12) {
        b->color = GAME_COLOR_YELLOW;
        b->is_shell = true;
    } else {
        b->color = (GAME_COLOR_E)(__rand_u32() % 3); /* R/G/B */
        b->is_shell = false;
    }
}

static bool __spawn_bullet_at(uint16_t pos, GAME_COLOR_E color)
{
    int idx = __find_free_bullet();
    if (idx < 0) {
        return false;
    }
    if (pos < GAME_ZONE_START) {
        pos = GAME_ZONE_START;
    }
    if (pos > __top_pos()) {
        pos = __top_pos();
    }
    sg_state.bullets[idx].active = true;
    sg_state.bullets[idx].pos = pos;
    sg_state.bullets[idx].color = color;
    return true;
}

static void __start_ripple(uint16_t center)
{
    sg_ripple.active = true;
    sg_ripple.center = center;
    sg_ripple.age = 0;
}

static void __trigger_skill(void)
{
    if (sg_state.skill_speed_boost) {
        return; /* once per game */
    }

    PR_NOTICE("*** SKILL TRIGGERED ***");
    __clear_all_blocks();
    for (int i = 0; i < GAME_MAX_BULLETS; i++) {
        sg_state.bullets[i].active = false;
    }

    /* 3 pink bullets at pos 3,4,5 */
    __spawn_bullet_at(3, GAME_COLOR_PINK);
    __spawn_bullet_at(4, GAME_COLOR_PINK);
    __spawn_bullet_at(5, GAME_COLOR_PINK);

    sg_state.fall_interval_ms =
        (uint16_t)(sg_state.fall_interval_ms / 2);
    sg_state.spawn_interval_ms =
        (uint16_t)(sg_state.spawn_interval_ms / 2);
    if (sg_state.fall_interval_ms < GAME_FALL_MIN_MS) {
        sg_state.fall_interval_ms = GAME_FALL_MIN_MS;
    }
    if (sg_state.spawn_interval_ms < GAME_SPAWN_MIN_MS) {
        sg_state.spawn_interval_ms = GAME_SPAWN_MIN_MS;
    }

    sg_state.skill_speed_boost = true;
    sg_state.skill_charged = false;

    /* visual cue: ripple from base */
    __start_ripple(GAME_ZONE_START);
}

static void __on_match_hit(GAME_BLOCK_T *block)
{
    (void)block;
    sg_state.miss_streak = 0;

    sg_state.combo++;
    sg_state.sp_combo++;
    sg_state.score += (uint32_t)(10u * sg_state.combo);

    if (sg_state.sp_combo >= GAME_HEALTH_COMBO) {
        sg_state.health_count++;
        sg_state.sp_combo = 0;
        PR_NOTICE("Health +1 -> %u", sg_state.health_count);
        if (sg_state.health_count >= sg_led_count) {
            sg_state.won = true;
            sg_state.game_over = true;
            PR_NOTICE("=== YOU WIN === score=%u", sg_state.score);
        }
    }

    if (sg_state.combo == 4) {
        sg_state.skill_charged = true;
        PR_NOTICE("Skill CHARGED (SFX)");
    }

    if (sg_state.combo >= 5 && sg_state.skill_charged && !sg_state.skill_speed_boost) {
        __trigger_skill();
    }

    __update_level_from_score();
}

static void __on_mismatch_hit(uint16_t pos)
{
    if (sg_state.lives > 0) {
        sg_state.lives--;
    }
    sg_state.combo = 0;
    sg_state.skill_charged = false;
    sg_state.miss_streak++;
    PR_NOTICE("MISS lives=%u miss_streak=%u", sg_state.lives, sg_state.miss_streak);

    if (sg_state.miss_streak >= 2) {
        __start_ripple(pos);
        sg_state.miss_streak = 0;
    }

    if (sg_state.lives == 0) {
        sg_state.game_over = true;
        sg_state.won = false;
        PR_NOTICE("=== GAME OVER === score=%u", sg_state.score);
    }
}

static void __on_pink_hit(GAME_BLOCK_T *block)
{
    (void)block;
    /* ×2 flat 20, no combo change */
    sg_state.score += 20;
    __update_level_from_score();
}

static void __resolve_collisions(void)
{
    for (int bi = 0; bi < GAME_MAX_BULLETS; bi++) {
        GAME_BULLET_T *bullet = &sg_state.bullets[bi];
        if (!bullet->active) {
            continue;
        }

        for (int ki = 0; ki < GAME_MAX_BLOCKS; ki++) {
            GAME_BLOCK_T *block = &sg_state.blocks[ki];
            if (!block->active) {
                continue;
            }
            if (block->pos != bullet->pos) {
                continue;
            }

            /* collision at same cell */
            if (bullet->color == GAME_COLOR_PINK) {
                __on_pink_hit(block);
                block->active = false;
                bullet->active = false;
                break;
            }

            if (bullet->color == block->color) {
                __on_match_hit(block);
                block->active = false;
                bullet->active = false;
                break;
            }

            /* color mismatch */
            uint16_t pos = block->pos;
            block->active = false;
            bullet->active = false;
            __on_mismatch_hit(pos);
            break;
        }
    }
}

static void __step_bullets(void)
{
    for (int i = 0; i < GAME_MAX_BULLETS; i++) {
        GAME_BULLET_T *b = &sg_state.bullets[i];
        if (!b->active) {
            continue;
        }
        if (b->pos >= __top_pos()) {
            b->active = false;
            continue;
        }
        b->pos++;
    }
}

static void __step_blocks(void)
{
    for (int i = 0; i < GAME_MAX_BLOCKS; i++) {
        GAME_BLOCK_T *b = &sg_state.blocks[i];
        if (!b->active) {
            continue;
        }
        if (b->pos <= GAME_ZONE_START) {
            /* reached flame edge — leak */
            uint16_t pos = b->pos;
            b->active = false;
            __on_mismatch_hit(pos);
            continue;
        }
        b->pos--;
    }
}

/***********************************************************
*********************** render *****************************
***********************************************************/
static void __rainbow_at(uint16_t offset, uint16_t bright, PIXEL_COLOR_T *out)
{
    /* 6-step rainbow */
    static const GAME_COLOR_E seq[] = {
        GAME_COLOR_RED, GAME_COLOR_YELLOW, GAME_COLOR_GREEN,
        GAME_COLOR_BLUE, GAME_COLOR_PINK, GAME_COLOR_RED};
    __color_to_pixel(seq[offset % 6], bright, out);
}

static void __render_ripple_pixel(uint16_t i, PIXEL_COLOR_T *fb)
{
    if (!sg_ripple.active) {
        return;
    }

    int dist = (int)i - (int)sg_ripple.center;
    if (dist < 0) {
        dist = -dist;
    }
    /* expand with age; trail length 8 */
    int wave = (int)sg_ripple.age;
    if (dist > wave || dist > RIPPLE_LEN) {
        return;
    }

    /* quadratic brightness decay by distance */
    uint32_t t = (uint32_t)(RIPPLE_LEN - dist);
    uint32_t bright = (t * t * BRIGHT_BULLET) / (RIPPLE_LEN * RIPPLE_LEN);
    if (bright == 0) {
        return;
    }
    PIXEL_COLOR_T c;
    __rainbow_at((uint16_t)dist + sg_ripple.age, (uint16_t)bright, &c);
    /* additive blend */
    fb[i].red = (fb[i].red + c.red > GAME_COLOR_RES) ? GAME_COLOR_RES : (fb[i].red + c.red);
    fb[i].green = (fb[i].green + c.green > GAME_COLOR_RES) ? GAME_COLOR_RES : (fb[i].green + c.green);
    fb[i].blue = (fb[i].blue + c.blue > GAME_COLOR_RES) ? GAME_COLOR_RES : (fb[i].blue + c.blue);
}

static void __render(PIXEL_HANDLE_T pixels)
{
    static PIXEL_COLOR_T fb[GAME_LED_MAX];
    memset(fb, 0, sizeof(PIXEL_COLOR_T) * sg_led_count);

    if (sg_state.game_over && sg_state.won) {
        PIXEL_COLOR_T g = {0};
        g.green = BRIGHT_BLOCK;
        for (uint16_t i = 0; i < sg_led_count; i++) {
            fb[i] = g;
        }
        tdl_pixel_set_multi_color(pixels, 0, sg_led_count, fb);
        tdl_pixel_dev_refresh(pixels);
        return;
    }

    /* health progress as dim green underlay from base */
    uint16_t health_draw = sg_state.health_count;
    if (health_draw > sg_led_count) {
        health_draw = sg_led_count;
    }
    for (uint16_t i = 0; i < health_draw; i++) {
        fb[i].green = BRIGHT_HEALTH;
    }

    /* flame zone 0-2 */
    for (uint16_t i = 0; i <= GAME_FLAME_LAST && i < sg_led_count; i++) {
        uint16_t flick = (uint16_t)(BRIGHT_FLAME / 2 + (__rand_u32() % (BRIGHT_FLAME / 2)));
        uint16_t phase = (uint16_t)((sg_flame_phase + i * 3) & 0xFF);
        fb[i].red = flick;
        fb[i].green = (uint16_t)(flick * (40 + (phase % 40)) / 120);
        fb[i].blue = 0;
        /* lives indicator: dim blue tip on flame LED for remaining lives */
        if (i < sg_state.lives) {
            fb[i].blue = 30;
        }
    }

    /* blocks */
    for (int i = 0; i < GAME_MAX_BLOCKS; i++) {
        GAME_BLOCK_T *b = &sg_state.blocks[i];
        if (!b->active || b->pos >= sg_led_count) {
            continue;
        }
        PIXEL_COLOR_T c;
        __color_to_pixel(b->color, b->is_shell ? (BRIGHT_BLOCK + 40) : BRIGHT_BLOCK, &c);
        fb[b->pos] = c;
    }

    /* bullets */
    for (int i = 0; i < GAME_MAX_BULLETS; i++) {
        GAME_BULLET_T *b = &sg_state.bullets[i];
        if (!b->active || b->pos >= sg_led_count) {
            continue;
        }
        PIXEL_COLOR_T c;
        __color_to_pixel(b->color, BRIGHT_BULLET, &c);
        fb[b->pos] = c;
    }

    /* rainbow ripple overlay */
    if (sg_ripple.active) {
        for (uint16_t i = GAME_ZONE_START; i < sg_led_count; i++) {
            __render_ripple_pixel(i, fb);
        }
        sg_ripple.age++;
        if (sg_ripple.age > RIPPLE_LEN + 6) {
            sg_ripple.active = false;
        }
    }

    /* skill charged hint: pulse tip LED */
    if (sg_state.skill_charged && !sg_state.skill_speed_boost) {
        PIXEL_COLOR_T tip;
        __color_to_pixel(GAME_COLOR_PINK, (uint16_t)(80 + (sg_flame_phase % 80)), &tip);
        fb[__top_pos()] = tip;
    }

    tdl_pixel_set_multi_color(pixels, 0, sg_led_count, fb);
    tdl_pixel_dev_refresh(pixels);
}

/***********************************************************
*********************** public API *************************
***********************************************************/
void game_reset(void)
{
    memset(&sg_state, 0, sizeof(sg_state));
    sg_state.lives = GAME_MAX_LIVES;
    sg_state.level = 1;
    sg_state.health_count = GAME_HEALTH_INIT;
    sg_state.combo = 0;
    sg_state.sp_combo = 0;
    sg_state.miss_streak = 0;
    sg_state.skill_charged = false;
    sg_state.skill_speed_boost = false;
    sg_state.game_over = false;
    sg_state.won = false;
    __apply_level_speeds();

    sg_acc_spawn = 0;
    sg_acc_fall = 0;
    sg_acc_bullet = 0;
    sg_flame_phase = 0;
    sg_ripple.active = false;
    sg_rng ^= (uint32_t)tal_system_get_millisecond();

    PR_NOTICE("Game reset | LEDs=%u lives=%u health=%u", sg_led_count, sg_state.lives,
              sg_state.health_count);
}

void game_shoot(GAME_COLOR_E color)
{
    if (sg_state.game_over) {
        return;
    }
    if (color > GAME_COLOR_BLUE) {
        return;
    }
    if (!__spawn_bullet_at(GAME_ZONE_START, color)) {
        PR_DEBUG("No free bullet slot");
    }
}

void game_tick(PIXEL_HANDLE_T pixels, uint32_t dt_ms)
{
    sg_flame_phase++;

    if (sg_state.game_over) {
        __render(pixels);
        return;
    }

    sg_acc_spawn += dt_ms;
    sg_acc_fall += dt_ms;
    sg_acc_bullet += dt_ms;

    if (sg_acc_spawn >= sg_state.spawn_interval_ms) {
        sg_acc_spawn = 0;
        __spawn_block();
    }

    if (sg_acc_fall >= sg_state.fall_interval_ms) {
        sg_acc_fall = 0;
        __step_blocks();
        __resolve_collisions();
    }

    if (sg_acc_bullet >= GAME_BULLET_SPEED_MS) {
        sg_acc_bullet = 0;
        __step_bullets();
        __resolve_collisions();
    }

    __render(pixels);
}

void game_on_button_event(BTN_EVT_E evt)
{
    sg_btn_evt = evt;
}

BTN_EVT_E game_consume_button_event(void)
{
    BTN_EVT_E e = sg_btn_evt;
    sg_btn_evt = BTN_EVT_NONE;
    return e;
}

uint16_t game_get_led_count(void)
{
    return sg_led_count;
}

const GAME_STATE_T *game_get_state(void)
{
    return &sg_state;
}

static OPERATE_RET __open_pixels(PIXEL_HANDLE_T *out_pixels)
{
    OPERATE_RET rt = OPRT_OK;
    PIXEL_HANDLE_T handle = NULL;

    TUYA_CALL_ERR_RETURN(tdl_pixel_dev_find(LEDS_PIXEL_NAME, &handle));

    PIXEL_DEV_CONFIG_T cfg = {
        .pixel_num = sg_led_count,
        .pixel_resolution = GAME_COLOR_RES,
    };
    TUYA_CALL_ERR_RETURN(tdl_pixel_dev_open(handle, &cfg));
    *out_pixels = handle;
    return rt;
}

void game_cycle_led_count(PIXEL_HANDLE_T *pixels)
{
    uint16_t next = (uint16_t)(sg_led_count + GAME_LED_STEP);
    if (next > GAME_LED_MAX) {
        next = GAME_LED_MIN;
    }
    sg_led_count = next;
    PR_NOTICE("LED count -> %u (N=%u)", sg_led_count, sg_led_count - 1);

    if (pixels && *pixels) {
        tdl_pixel_dev_close(*pixels);
        if (OPRT_OK != __open_pixels(pixels)) {
            PR_ERR("Re-open pixels failed");
        }
    }
    game_reset();
}

OPERATE_RET game_hw_init(PIXEL_HANDLE_T *out_pixels)
{
    OPERATE_RET rt = OPRT_OK;
    PIXEL_DRIVER_CONFIG_T drv = {
        .port = WS2812_SPI_PORT,
        .line_seq = GRB_ORDER,
    };
    BUTTON_GPIO_CFG_T hw = {0};

    if (NULL == out_pixels) {
        return OPRT_INVALID_PARM;
    }

    tkl_io_pinmux_config(TUYA_GPIO_NUM_2, TUYA_SPI1_CLK);
    tkl_io_pinmux_config(TUYA_GPIO_NUM_3, TUYA_SPI1_CS);
    tkl_io_pinmux_config(WS2812_DATA_PIN, TUYA_SPI1_MOSI);
    tkl_io_pinmux_config(TUYA_GPIO_NUM_5, TUYA_SPI1_MISO);

    TUYA_CALL_ERR_RETURN(tdd_ws2812_driver_register(LEDS_PIXEL_NAME, &drv));

    hw.level = TUYA_GPIO_LEVEL_LOW;
    hw.mode = BUTTON_TIMER_SCAN_MODE;
    hw.pin_type.gpio_pull = TUYA_GPIO_PULLUP;

    hw.pin = BTN_RED_PIN;
    TUYA_CALL_ERR_RETURN(tdd_gpio_button_register(BUTTON_NAME, &hw));
    hw.pin = BTN_GREEN_PIN;
    TUYA_CALL_ERR_RETURN(tdd_gpio_button_register(BUTTON_NAME_2, &hw));
    hw.pin = BTN_BLUE_PIN;
    TUYA_CALL_ERR_RETURN(tdd_gpio_button_register(BUTTON_NAME_3, &hw));

    TUYA_CALL_ERR_RETURN(__open_pixels(out_pixels));

    PR_NOTICE("HW ready DIN=P%d buttons P%d/P%d/P%d LEDs=%u", WS2812_DATA_PIN, BTN_RED_PIN,
              BTN_GREEN_PIN, BTN_BLUE_PIN, sg_led_count);
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
        game_on_button_event(BTN_EVT_LONG);
        return;
    }
    if (TDL_BUTTON_PRESS_DOWN == event) {
        game_on_button_event(mapped);
    }
}

OPERATE_RET game_buttons_init(void)
{
    OPERATE_RET rt = OPRT_OK;
    TDL_BUTTON_CFG_T cfg = {.long_start_valid_time = 1500,
                            .long_keep_timer = 1000,
                            .button_debounce_time = 40,
                            .button_repeat_valid_count = 0,
                            .button_repeat_valid_time = 0};
    TDL_BUTTON_HANDLE h1 = NULL, h2 = NULL, h3 = NULL;

    TUYA_CALL_ERR_RETURN(tdl_button_create(BUTTON_NAME, &cfg, &h1));
    tdl_button_event_register(h1, TDL_BUTTON_PRESS_DOWN, __button_cb);
    tdl_button_event_register(h1, TDL_BUTTON_LONG_PRESS_START, __button_cb);

    TUYA_CALL_ERR_RETURN(tdl_button_create(BUTTON_NAME_2, &cfg, &h2));
    tdl_button_event_register(h2, TDL_BUTTON_PRESS_DOWN, __button_cb);
    tdl_button_event_register(h2, TDL_BUTTON_LONG_PRESS_START, __button_cb);

    TUYA_CALL_ERR_RETURN(tdl_button_create(BUTTON_NAME_3, &cfg, &h3));
    tdl_button_event_register(h3, TDL_BUTTON_PRESS_DOWN, __button_cb);
    tdl_button_event_register(h3, TDL_BUTTON_LONG_PRESS_START, __button_cb);
    return rt;
}
