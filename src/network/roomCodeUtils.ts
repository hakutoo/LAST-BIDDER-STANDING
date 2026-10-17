/**
 * ルームIDの生成・正規化ユーティリティ
 */

// アプリ固有のPeerJS IDプレフィックス（他アプリとの衝突防止）
export const ROOM_PREFIX = 'cardgame-lbid-';

/**
 * ランダムな6桁数字のルームコードを生成 (100000 〜 999999)
 * 90万通りの組み合わせがあるため、衝突確率が極めて低い
 */
export function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * ユーザーが入力したルームコード文字列を正規化
 * - 全角数字・全角英字を半角に変換
 * - 招待URL（https://...?room=123456）を丸ごと貼り付けた場合でもルームコード部分を抽出
 * - プレフィックス（cardgame-lbid-, cardgame-pvp-, room-）の除去
 * - 空白・不要な記号のトリム
 */
export function normalizeRoomCode(raw: string): string {
  if (!raw) return '';

  let code = raw.trim();

  // URLまたはURLパラメータから抽出を試みる
  try {
    const decoded = decodeURIComponent(code);
    if (decoded.includes('?room=') || decoded.includes('&room=')) {
      const match = decoded.match(/[?&]room=([^&#\s]+)/);
      if (match && match[1]) {
        code = match[1];
      }
    } else if (code.startsWith('http://') || code.startsWith('https://')) {
      const url = new URL(code);
      const roomParam = url.searchParams.get('room');
      if (roomParam) {
        code = roomParam;
      }
    }
  } catch {
    // パース失敗時はそのまま継続
  }

  // 全角英数字を半角に変換
  code = code.replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));

  // 小文字化
  code = code.toLowerCase();

  // 既知のプレフィックスを除去
  code = code
    .replace(/^cardgame-lbid-/, '')
    .replace(/^cardgame-pvp-/, '')
    .replace(/^room-/, '');

  // 前後の記号や空白を除去
  code = code.replace(/[^a-z0-9]/g, '');

  return code;
}

/**
 * ルームコードからPeerJS登録用のPeerIDを生成
 */
export function toPeerRoomId(code: string): string {
  const normalized = normalizeRoomCode(code);
  return `${ROOM_PREFIX}${normalized}`;
}
