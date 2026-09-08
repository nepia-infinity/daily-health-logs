/**
 * 現在の設定をもとに、次の定期配信設定を返します。
 * 未登録または未設定の場合は、初回実行として配信を開始します。
 */
export function getNextSurveyEnabled(current?: boolean): boolean {
  return current !== true;
}
