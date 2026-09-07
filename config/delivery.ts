/**
 * ワークスペース共通の定期配信設定
 *
 * 配信時刻を変更した場合はScheduled Triggerを作り直してください。
 */
export const DELIVERY_TIME_ZONE = "Asia/Tokyo";
export const DELIVERY_HOUR = 9;
export const DELIVERY_MINUTE = 0;

/** 1バッチで同時に送信するDM数 */
export const DELIVERY_BATCH_SIZE = 5;

/** バッチ間の待機時間（ミリ秒） */
export const DELIVERY_BATCH_DELAY_MS = 1_000;

/** 429を含む一時的な送信失敗に対する最大試行回数 */
export const DELIVERY_MAX_ATTEMPTS = 3;
