#!/usr/bin/env python3

import asyncio
import re
import sys
import random
import string
import time
import tempfile
import argparse
from pathlib import Path

from tmailor import Client as MailClient
import freedns

# 同ディレクトリの freeocr_auto.py から FreeOCRClient をインポート
sys.path.insert(0, str(Path(__file__).parent))
from freeocr_auto import FreeOCRClient


def _rand_str(length: int, chars: str = string.ascii_lowercase + string.digits) -> str:
    return "".join(random.choices(chars, k=length))


def _extract_activation_code(text: str) -> str | None:
    """
    メール本文から FreeDNS の有効化コードを抽出する。
    URL 形式: http://freedns.afraid.org/signup/activate.php?<code>
    """
    match = re.search(
        r"freedns\.afraid\.org/signup/activate\.php\?([A-Za-z0-9_-]+)",
        text,
    )
    return match.group(1) if match else None


def _extract_captcha_text(ocr_raw: str) -> str:
    """
    freeocr.ai の OCR 結果から CAPTCHA の英数字コードを抽出する。
    SecureImage は通常 4〜8 文字の英大文字 + 数字。

    GPT は応答に **BOLD** や引用符でコードを強調することが多い。
    """
    # 1. Markdown bold: **CODE**  例: "the text is **JAGA** styled"
    m = re.search(r"\*\*([A-Za-z0-9]{2,10})\*\*", ocr_raw)
    if m:
        return m.group(1).upper()

    # 2. 引用符で囲まれた英数字
    m = re.search(
        r'["\u201c\u201d\u2018\u2019`]([A-Za-z0-9]{2,10})'
        r'["\u201c\u201d\u2018\u2019`]',
        ocr_raw,
    )
    if m:
        return m.group(1).upper()

    # 3. キーワード + コロン/ダッシュ + コード  例: "reads: XR8T2"
    m = re.search(
        r"(?:reads?|shows?|code|captcha|text|answer|contains?)"
        r"\s*[:\-]\s*([A-Za-z0-9]{2,10})",
        ocr_raw,
        re.IGNORECASE,
    )
    if m:
        return m.group(1).upper()

    # 4. "is UPPERCASE_CODE" パターン  例: "is JAGA" / "is K5M3P2"
    m = re.search(r"\bis\s+([A-Z][A-Z0-9]{1,7})\b", ocr_raw)
    if m:
        return m.group(1).upper()

    # 5. 短くて英数字のみ（説明なしで直接コードを返した場合）
    cleaned = re.sub(r"[^A-Za-z0-9]", "", ocr_raw).strip()
    if 2 <= len(cleaned) <= 10:
        return cleaned.upper()

    # 6. 大文字+数字が混在するシーケンスを優先（"ABC123" > "HELLO"）
    upper_seqs = re.findall(r"[A-Z][A-Z0-9]{1,7}", ocr_raw)
    mixed = [s for s in upper_seqs if re.search(r"[0-9]", s) and re.search(r"[A-Z]", s)]
    if mixed:
        return mixed[0].upper()

    # 7. 全大文字の短いシーケンス (2-6文字)
    short_upper = [s for s in upper_seqs if 2 <= len(s) <= 6]
    if short_upper:
        return min(short_upper, key=len).upper()

    # 8. 任意の英数字シーケンスから最短のもの
    seqs = re.findall(r"[A-Za-z0-9]{2,8}", ocr_raw)
    if seqs:
        return min(seqs, key=len).upper()

    return cleaned.upper()


# --------------------------------------------------------------------------- #
# メイン処理
# --------------------------------------------------------------------------- #

async def create_freedns_account(
    headless: bool = True,
    proxy: str | None = None,
    debug: bool = False,
    mail_poll_interval: int = 5,
    mail_poll_timeout: int = 180,
    captcha_retries: int = 5,
) -> dict:
    """
    FreeDNS アカウントを自動作成する。

    Returns:
        {"email": ..., "username": ..., "password": ...}
    """

    # ---------------------------------------------------------------------- #
    # 1. 一時メールアドレスを生成
    # ---------------------------------------------------------------------- #

    print("[*] 一時メールアドレスを生成中...")
    mail_client = MailClient()
    email_obj = mail_client.generate_random_email()
    temp_email: str = email_obj.email
    temp_token: str = email_obj.token
    print(f"[+] メールアドレス: {temp_email}")

    # ---------------------------------------------------------------------- #
    # 2. アカウント情報をランダム生成
    # ---------------------------------------------------------------------- #

    username = "u" + _rand_str(9)
    password = (
        _rand_str(4, string.ascii_uppercase)
        + _rand_str(4, string.digits)
        + _rand_str(4, string.ascii_lowercase)
        + random.choice("!@#$")
    )
    firstname = _rand_str(6, string.ascii_lowercase).capitalize()
    lastname = _rand_str(6, string.ascii_lowercase).capitalize()

    print(f"[*] ユーザー名: {username}")
    print(f"[*] パスワード: {password}")

    # ---------------------------------------------------------------------- #
    # 3. OCR クライアント初期化（Turnstile 自動解決）
    # ---------------------------------------------------------------------- #

    ocr_client = FreeOCRClient(
        headless=headless,
        proxy=proxy,
        debug=debug,
        retries=30,
    )

    # ---------------------------------------------------------------------- #
    # 4. CAPTCHA 解決 → アカウント作成（リトライあり）
    # ---------------------------------------------------------------------- #

    last_error: str | None = None

    for attempt in range(1, captcha_retries + 1):
        print(f"\n[*] === CAPTCHA 試行 {attempt}/{captcha_retries} ===")

        # フレッシュなセッションで FreeDNS クライアントを生成
        dns_client = freedns.Client()

        # CAPTCHA 画像を取得（bytes: PNG）
        print("[*] CAPTCHA 画像を取得中...")
        captcha_bytes = dns_client.get_captcha()

        if not captcha_bytes or len(captcha_bytes) < 100:
            print("[!] CAPTCHA 画像が空でした。再試行します...")
            continue

        # 一時ファイルに保存して OCR
        captcha_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(
                suffix=".png", delete=False, dir=Path(__file__).parent
            ) as tmp:
                tmp.write(captcha_bytes)
                captcha_path = Path(tmp.name)

            print(f"[*] freeocr.ai で CAPTCHA を解析中...")
            ocr_raw = await ocr_client.ocr(captcha_path)
            print(f"[*] OCR 生テキスト: {ocr_raw[:120]!r}")

        except Exception as e:
            print(f"[!] OCR エラー: {e}")
            last_error = str(e)
            continue
        finally:
            if captcha_path and captcha_path.exists():
                captcha_path.unlink()

        captcha_code = _extract_captcha_text(ocr_raw)
        if not captcha_code:
            print("[!] CAPTCHA コードを抽出できませんでした。再試行します...")
            continue

        print(f"[+] CAPTCHA コード: '{captcha_code}'")

        # アカウント作成リクエスト
        print("[*] FreeDNS アカウント作成リクエストを送信中...")
        try:
            dns_client.create_account(
                captcha_code=captcha_code,
                firstname=firstname,
                lastname=lastname,
                username=username,
                password=password,
                email=temp_email,
            )
            print("[+] アカウント作成リクエスト送信成功！有効化メールを待機します...")
            last_error = None
            break

        except RuntimeError as e:
            last_error = str(e)
            err_lower = last_error.lower()
            print(f"[!] アカウント作成失敗: {last_error}")

            # ユーザー名重複など CAPTCHA 以外のエラーは即終了
            if "captcha" not in err_lower and "code" not in err_lower and "verification" not in err_lower:
                # ユーザー名重複の場合は新しいユーザー名で再試行
                if "username" in err_lower or "already" in err_lower:
                    username = "u" + _rand_str(9)
                    print(f"[*] ユーザー名を変更: {username}")
                    continue
                raise

    if last_error:
        raise RuntimeError(
            f"CAPTCHA を {captcha_retries} 回試行しましたが失敗しました:\n{last_error}"
        )

    # ---------------------------------------------------------------------- #
    # 5. 有効化メールを待機・解析
    # ---------------------------------------------------------------------- #

    print(f"\n[*] 有効化メールを待機中 (最大 {mail_poll_timeout} 秒)...")
    activation_code: str | None = None
    deadline = time.time() + mail_poll_timeout

    while time.time() < deadline:
        await asyncio.sleep(mail_poll_interval)
        remaining = int(deadline - time.time())

        try:
            msg_list = mail_client.get_messages(temp_email)
            count = len(msg_list.messages)
            if count > 0:
                print(f"    受信メール数: {count} 件")
            for msg in msg_list.messages:
                print(f"    件名: {msg.subject!r} / 送信者: {msg.sender!r}")
                body = (msg.body_text or "") + (msg.body_html or "")
                code = _extract_activation_code(body)
                if code:
                    activation_code = code
                    break
        except Exception as e:
            print(f"[!] メール取得エラー: {e}")

        if activation_code:
            print(f"[+] 有効化コード取得: {activation_code[:16]}...")
            break

        print(f"    メール待機中 ... 残り {remaining} 秒")

    if not activation_code:
        raise RuntimeError(
            f"有効化メールが {mail_poll_timeout} 秒以内に届きませんでした\n"
            f"メール: {temp_email}"
        )

    # ---------------------------------------------------------------------- #
    # 6. アカウントを有効化
    # ---------------------------------------------------------------------- #

    print("[*] アカウントを有効化中...")
    dns_client.activate_account(activation_code)
    print("[+] アカウント有効化成功！")

    # ---------------------------------------------------------------------- #
    # 7. ログイン確認
    # ---------------------------------------------------------------------- #

    print("[*] ログイン確認中...")
    login_client = freedns.Client()
    login_client.login(username, password)
    print("[+] ログイン成功！")

    return {
        "email": temp_email,
        "username": username,
        "password": password,
    }


# --------------------------------------------------------------------------- #
# CLI エントリーポイント
# --------------------------------------------------------------------------- #

def main() -> None:
    parser = argparse.ArgumentParser(
        description="FreeDNS.afraid.org アカウント自動生成ツール",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--proxy", default=None, metavar="URL",
        help="プロキシ URL (例: http://127.0.0.1:10808)",
    )
    parser.add_argument(
        "--no-headless", action="store_true",
        help="ブラウザを表示する（デバッグ用）",
    )
    parser.add_argument(
        "--debug", action="store_true",
        help="デバッグログを出力する",
    )
    parser.add_argument(
        "--captcha-retries", type=int, default=5,
        help="CAPTCHA リトライ回数 (デフォルト: 5)",
    )
    parser.add_argument(
        "--mail-timeout", type=int, default=180,
        help="有効化メール待機タイムアウト秒数 (デフォルト: 180)",
    )
    parser.add_argument(
        "--mail-poll-interval", type=int, default=5,
        help="メールポーリング間隔秒数 (デフォルト: 5)",
    )
    args = parser.parse_args()

    try:
        result = asyncio.run(
            create_freedns_account(
                headless=not args.no_headless,
                proxy=args.proxy,
                debug=args.debug,
                captcha_retries=args.captcha_retries,
                mail_poll_timeout=args.mail_timeout,
                mail_poll_interval=args.mail_poll_interval,
            )
        )
        sep = "=" * 44
        print(f"\n{sep}")
        print(" FreeDNS アカウント作成完了 ".center(44, "="))
        print(sep)
        print(f"  Email   : {result['email']}")
        print(f"  Username: {result['username']}")
        print(f"  Password: {result['password']}")
        print(sep)

    except RuntimeError as e:
        print(f"\n[!] エラー: {e}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n[!] 中断されました", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
