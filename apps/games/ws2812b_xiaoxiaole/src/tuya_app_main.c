/**
 * @file tuya_app_main.c
 * @brief Entry for WS2812B strip 消消乐 on T5-E1
 */

#include "tal_api.h"
#include "tkl_output.h"

#include "board_com_api.h"
#include "game_xiaoxiaole.h"

/***********************************************************
***********************variable define**********************
***********************************************************/
static PIXEL_HANDLE_T sg_pixels = NULL;

/***********************************************************
***********************function define**********************
***********************************************************/
static void user_main(void)
{
    OPERATE_RET rt = OPRT_OK;

    tal_log_init(TAL_LOG_LEVEL_DEBUG, 2048, (TAL_LOG_OUTPUT_CB)tkl_log_output);

    PR_NOTICE("==========================================");
    PR_NOTICE(" WS2812B 消消乐  |  T5-E1");
    PR_NOTICE("==========================================");
    PR_NOTICE("Project name:        %s", PROJECT_NAME);
    PR_NOTICE("App version:         %s", PROJECT_VERSION);
    PR_NOTICE("Compile time:        %s", __DATE__);
    PR_NOTICE("TuyaOpen version:    %s", OPEN_VERSION);
    PR_NOTICE("Platform board:      %s", PLATFORM_BOARD);
    PR_NOTICE("Strip LEDs:          %d", STRIP_LED_COUNT);
    PR_NOTICE("DIN=P4  R=P44  G=P45  B=P46");
    PR_NOTICE("Short-press: clear that color (len>=2)");
    PR_NOTICE("Long-press:  restart");
    PR_NOTICE("==========================================");

    /* T5AI_MODULE has no onboard peripherals; safe no-op */
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

    game_reset(sg_pixels);

    while (1) {
        BTN_EVT_E evt = game_consume_button_event();
        switch (evt) {
        case BTN_EVT_RED:
            game_handle_press(sg_pixels, CELL_RED);
            break;
        case BTN_EVT_GREEN:
            game_handle_press(sg_pixels, CELL_GREEN);
            break;
        case BTN_EVT_BLUE:
            game_handle_press(sg_pixels, CELL_BLUE);
            break;
        case BTN_EVT_RESTART:
            game_reset(sg_pixels);
            break;
        default:
            break;
        }
        tal_system_sleep(20);
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
    thrd_param.stackDepth = 1024 * 6;
    thrd_param.priority = THREAD_PRIO_1;
    thrd_param.thrdname = "tuya_app_main";
    tal_thread_create_and_start(&ty_app_thread, NULL, NULL, tuya_app_thread, NULL, &thrd_param);
}
#endif
