/**
 * 日付操作に関するユーティリティクラス
 */
export class DateUtils {
  private timeZone: string;

  /**
   * @param timeZone タイムゾーン文字列 (例: "Asia/Tokyo", "America/Los_Angeles")
   */
  constructor(timeZone: string = "Asia/Tokyo") {
    this.timeZone = timeZone;
  }

  /** Dateを指定したタイムゾーンの YYYY-MM-DD 文字列に変換する */
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat("sv-SE", {
      timeZone: this.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  /** Dateを指定したタイムゾーンの曜日短縮表記に変換する。例: Mon, Tue, Wed */
  getDayOfWeek(date: Date): string {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: this.timeZone,
      weekday: "short",
    }).format(date);
  }

  /**
   * 指定日の週の月曜日を YYYY-MM-DD で返す。
   */
  getWeekStartDate(date: Date): string {
    const recordDate = this.formatDate(date);
    const weekStart = this.parseDateStringAsUtc(recordDate);
    const day = weekStart.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    weekStart.setUTCDate(weekStart.getUTCDate() + diffToMonday);

    return this.formatDateUtc(weekStart);
  }

  /** YYYY-MM-DD文字列に指定日数を加算して、YYYY-MM-DDで返す。 */
  addDays(dateString: string, days: number): string {
    const date = this.parseDateStringAsUtc(dateString);
    date.setUTCDate(date.getUTCDate() + days);

    return this.formatDateUtc(date);
  }

  /** YYYY-MM-DD文字列をUTC基準のDateに変換する。 */
  private parseDateStringAsUtc(dateString: string): Date {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  /** UTC DateをYYYY-MM-DD文字列に変換する。 */
  private formatDateUtc(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}