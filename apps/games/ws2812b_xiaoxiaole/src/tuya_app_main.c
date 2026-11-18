/**
 * @file tuya_app_main.c
 * @brief Entry for WS2812B strip shooter on T5-E1
 */

#include "tal_api.h"
#include "tkl_output.h"

#include "board_com_api.h"
#include "game_xiaoxiaole.h"

#define TICK_MS 10

static PIXEL_HANDLE_T sg_pixels = NULL;

static void user_main(void)
{
    OPERATE_RET rt = OPRT_OK;

    tal_log_init(TAL_LOG_LEVEL_DEBUG, 2048, (TAL_LOG_OUTPUT_CB)tkl_log_output);

    PR_NOTICE("==========================================");
    PR_NOTICE(" WS2812B 射击消消乐  |  T5-E1");
    PR_NOTICE("==========================================");
    PR_NOTICE("Project: %s  ver %s", PROJECT_NAME, PROJECT_VERSION);
    PR_NOTICE("DIN=P4  R=P44  G=P45  B=P46");
    PR_NOTICE("LED0-2 flame | LED3..N-1 playfield");
    PR_NOTICE("Short: shoot color | Long(idle): LED len 150..300/30");
    PR_NOTICE("Any key after win/lose: restart");
    PR_NOTICE("==========================================");

    board_register_hardware();

    rt = game_hw_init(&sg_pixels);
    if (OPRT_OK != rt) {
        PR_ERR("game_hw_init failed: %d", rt);
        return;
    }

    rt = game_buttons_init();
    if (OPRT_OK != rt) {
        PR_ERR("game_buttons_init failed: %d", rt);
        return;
    }

    game_reset();

    while (1) {
        BTN_EVT_E evt = game_consume_button_event();
        const GAME_STATE_T *st = game_get_state();

        if (st->game_over) {
            if (evt == BTN_EVT_LONG) {
                game_cycle_led_count(&sg_pixels);
            } else if (evt != BTN_EVT_NONE) {
                game_reset();
            }
        } else {
            switch (evt) {
            case BTN_EVT_RED:
                game_shoot(GAME_COLOR_RED);
                break;
            case BTN_EVT_GREEN:
                game_shoot(GAME_COLOR_GREEN);
                break;
            case BTN_EVT_BLUE:
                game_shoot(GAME_COLOR_BLUE);
                break;
            case BTN_EVT_LONG:
                /* in-game long-press also restarts */
                game_reset();
                break;
            default:
                break;
            }
        }

        game_tick(sg_pixels, TICK_MS);
        tal_system_sleep(TICK_MS);
    }
}

#if OPERATING_SYSTEM == SYSTEM_LINUX
void main(int argc, char *argv[])
{
    (void)argc;
    (void)argv;
    user_main();
}
#else

static THREAD_HANDLE ty_app_thread = NULL;

static void tuya_app_thread(void *arg)
{
    (void)arg;
    user_main();
    tal_thread_delete(ty_app_thread);
    ty_app_thread = NULL;
}

void tuya_app_main(void)
{
    THREAD_CFG_T thrd_param = {0};
    thrd_param.stackDepth = 1024 * 8;
    thrd_param.priority = THREAD_PRIO_1;
    thrd_param.thrdname = "tuya_app_main";
    tal_thread_create_and_start(&ty_app_thread, NULL, NULL, tuya_app_thread, NULL, &thrd_param);
}
#endif
