/**
 * Slack APIを使用してユーザーのタイムゾーン(tz)を取得する
 * 取得に失敗した場合はデフォルトで "Asia/Tokyo" を返す
 */
export async function fetchUserTimeZone(client: any, userId: string): Promise<string> {
  try {
    const response = await client.users.info({
      user: userId,
      include_locale: true,
    });

    if (response.ok && response.user?.tz) {
      return response.user.tz;
    } else {
      console.warn(`tzの取得に失敗しました。デフォルトの Asia/Tokyo を使用します。`, response.error);
    }
  } catch (error) {
    console.error("users.info API呼び出し中にエラーが発生しました:", error);
  }

  return "Asia/Tokyo";
}