/**
 * プレイヤー名の文字数バリデーション・ユーティリティ
 * 制限仕様: 半角24字以内、全角12字以内（混合の場合は12字以内）
 */

/**
 * 1文字が半角文字（ASCII印刷可能文字または半角カタカナ）かどうかを判定
 */
export function isHalfWidthChar(char: string): boolean {
  const code = char.codePointAt(0);
  if (code === undefined) return false;

  // 半角スペース〜チルダ (0x20 - 0x7E)
  if (code >= 0x0020 && code <= 0x007e) {
    return true;
  }

  // 半角カタカナ・句読点 (｡ 〜 ﾟ: 0xFF61 - 0xFF9F)
  if (code >= 0xff61 && code <= 0xff9f) {
    return true;
  }

  return false;
}

/**
 * 文字列に全角文字が1文字でも含まれているかどうかを判定
 */
export function hasFullWidthChar(text: string): boolean {
  for (const char of Array.from(text)) {
    if (!isHalfWidthChar(char)) {
      return true;
    }
  }
  return false;
}

/**
 * 文字列に対する最大許容文字数を取得（全角を含むなら12文字、半角のみなら24文字）
 */
export function getMaxPlayerNameLength(text: string): number {
  return hasFullWidthChar(text) ? 12 : 24;
}

/**
 * サロゲートペアや絵文字を考慮した正確な文字数を取得
 */
export function getPlayerNameCharCount(text: string): number {
  return Array.from(text).length;
}

/**
 * 文字数制限の表示用情報を取得（リアルタイムUI用）
 */
export function getNameCharLimitInfo(text: string) {
  const count = getPlayerNameCharCount(text);
  const hasFull = hasFullWidthChar(text);
  const max = hasFull ? 12 : 24;
  const isOver = count > max;
  return {
    count,
    max,
    hasFull,
    isOver,
  };
}

/**
 * プレイヤー名が文字数制限を満たしているかを検証
 */
export function validatePlayerName(name: string): { valid: boolean; reason?: string } {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, reason: '名前を入力してください。' };
  }

  const hasFull = hasFullWidthChar(trimmed);
  const max = hasFull ? 12 : 24;
  const count = getPlayerNameCharCount(trimmed);

  if (count > max) {
    return {
      valid: false,
      reason: hasFull
        ? `全角または混合の名前は12文字以内で入力してください（現在: ${count}文字）。`
        : `半角の名前は24文字以内で入力してください（現在: ${count}文字）。`,
    };
  }

  return { valid: true };
}

/**
 * プレイヤー名を制限文字数内に収まるように切り詰める（サニタイズ用）
 */
export function clampPlayerName(name: string): string {
  const trimmed = name.trim();
  const chars = Array.from(trimmed);
  if (chars.length === 0) return '';

  const result: string[] = [];
  let containsFull = false;

  for (const ch of chars) {
    const isHalf = isHalfWidthChar(ch);
    const wouldContainFull = containsFull || !isHalf;
    const maxLimit = wouldContainFull ? 12 : 24;

    if (result.length + 1 > maxLimit) {
      break;
    }

    result.push(ch);
    if (!isHalf) {
      containsFull = true;
    }
  }

  return result.join('');
}
