#!/usr/bin/env python3
"""
freeocr.ai 自動OCRツール

cloudflare-solver を使用して Cloudflare Turnstile トークンを自動取得し、
freeocr.ai の OCR API に画像を送信してテキストを抽出します。

使い方:
    python freeocr_auto.py <画像ファイル>
    python freeocr_auto.py <画像ファイル> --proxy http://127.0.0.1:10808
    python freeocr_auto.py <画像ファイル> --no-headless --debug
"""

import asyncio
import logging
import sys
import random
import argparse
import httpx
from pathlib import Path

# cloudflare-solver を PYTHONPATH に追加
sys.path.insert(0, str(Path(__file__).parent.parent / "cloudflare-solver"))

from camoufox.async_api import AsyncCamoufox
from browserforge.fingerprints import Screen

logger = logging.getLogger(__name__)

FREEOCR_PAGE_URL = "https://freeocr.ai/ja"
FREEOCR_API_URL = "https://freeocr.ai/api/v1/ocr"

_MIME_MAP = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".webp": "image/webp",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
}


def _mime_type(path: Path) -> str:
    return _MIME_MAP.get(path.suffix.lower(), "application/octet-stream")


class FreeOCRClient:
    """freeocr.ai OCR クライアント（Cloudflare Turnstile 自動解決付き）"""

    def __init__(
        self,
        headless: bool = True,
        proxy: str | None = None,
        debug: bool = False,
        retries: int = 30,
    ) -> None:
        self.headless = headless
        self.proxy = proxy
        self.debug = debug
        self.retries = retries

        if debug:
            logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)

    async def _solve_turnstile(self) -> tuple[str, dict[str, str]]:
        """
        freeocr.ai にアクセスして Turnstile トークンと Cookie を取得する。

        Returns:
            (turnstile_token, cookies_dict) のタプル
        """
        proxy_config = {"server": self.proxy} if self.proxy else None

        async with AsyncCamoufox(
            headless=self.headless,
            os=["windows"],
            screen=Screen(max_width=1920, max_height=1080),
            proxy=proxy_config,
        ) as browser:
            page = await browser.new_page()

            logger.debug("freeocr.ai に移動中 ...")
            await page.goto(FREEOCR_PAGE_URL, wait_until="domcontentloaded")

            token: str | None = None

            for attempt in range(self.retries):
                logger.debug("トークン確認中 (試行 %d/%d)", attempt + 1, self.retries)

                # cf-turnstile-response hidden input を探す
                token_inputs = await page.query_selector_all(
                    'input[name="cf-turnstile-response"]'
                )
                for ti in token_inputs:
                    val = await ti.get_attribute("value")
                    if val and len(val) > 10:
                        token = val
                        break

                if token:
                    logger.debug("Turnstile トークン取得成功")
                    break

                # 可視型の Turnstile チェックボックスをクリック（必要な場合）
                for frame in page.frames:
                    if "challenges.cloudflare.com" in frame.url:
                        try:
                            frame_el = await frame.frame_element()
                            bb = await frame_el.bounding_box()
                            if bb:
                                cx = bb["x"] + bb["width"] / 9
                                cy = bb["y"] + bb["height"] / 2
                                # ヒューマンライクなクリック
                                await page.mouse.move(
                                    cx + random.uniform(-5, 5),
                                    cy + random.uniform(-5, 5),
                                    steps=random.randint(10, 25),
                                )
                                await asyncio.sleep(random.uniform(0.1, 0.3))
                                await page.mouse.down()
                                await asyncio.sleep(random.uniform(0.05, 0.15))
                                await page.mouse.up()
                        except Exception as e:
                            logger.debug("チャレンジフレームクリック失敗: %s", e)

                await asyncio.sleep(1)

            if not token:
                if self.debug:
                    await page.screenshot(path="debug_freeocr_failed.png")
                raise RuntimeError(
                    f"Turnstile トークンを {self.retries} 回試行しても取得できませんでした"
                )

            # Cookie を収集
            raw_cookies = await page.context.cookies()
            cookies = {c["name"]: c["value"] for c in raw_cookies}
            logger.debug("取得 Cookie: %s", list(cookies.keys()))

            return token, cookies

    async def ocr(self, image_path: str | Path) -> str:
        """
        画像を OCR してテキストを返す。

        Args:
            image_path: OCR する画像ファイルのパス

        Returns:
            OCR で抽出されたテキスト文字列
        """
        image_path = Path(image_path)
        if not image_path.exists():
            raise FileNotFoundError(f"画像ファイルが見つかりません: {image_path}")

        print("[*] Cloudflare Turnstile を解決中...")
        token, cookies = await self._solve_turnstile()
        print(f"[+] トークン取得: {token[:40]}...")

        cookie_header = "; ".join(f"{k}={v}" for k, v in cookies.items())

        image_data = image_path.read_bytes()
        mime = _mime_type(image_path)

        print(f"[*] OCR API にリクエスト送信中: {image_path.name}")

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                FREEOCR_API_URL,
                headers={
                    "accept": "*/*",
                    "accept-language": "ja,en-US;q=0.9,en;q=0.8",
                    "origin": "https://freeocr.ai",
                    "referer": "https://freeocr.ai/ja",
                    "user-agent": (
                        "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/144.0.0.0 Safari/537.36"
                    ),
                    "cookie": cookie_header,
                },
                files={
                    "image": (image_path.name, image_data, mime),
                    "cf_token": (None, token),
                    "enable_ab_test": (None, "false"),
                },
            )

        if response.status_code != 200:
            raise RuntimeError(
                f"API エラー: HTTP {response.status_code}\n{response.text}"
            )

        data = response.json()
        return data.get("text", "")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="freeocr.ai 自動OCRツール (Cloudflare Turnstile 自動解決)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("image", help="OCR する画像ファイルのパス")
    parser.add_argument(
        "--proxy",
        default=None,
        metavar="URL",
        help="プロキシ URL (例: http://127.0.0.1:10808)",
    )
    parser.add_argument(
        "--no-headless",
        action="store_true",
        help="ブラウザを表示する（デバッグ用）",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="デバッグログを出力する",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=30,
        help="トークン取得の最大試行回数 (デフォルト: 30)",
    )
    args = parser.parse_args()

    client = FreeOCRClient(
        headless=not args.no_headless,
        proxy=args.proxy,
        debug=args.debug,
        retries=args.retries,
    )

    try:
        result = asyncio.run(client.ocr(args.image))
        print("\n=== OCR 結果 ===")
        print(result)
    except FileNotFoundError as e:
        print(f"[!] エラー: {e}", file=sys.stderr)
        sys.exit(1)
    except RuntimeError as e:
        print(f"[!] エラー: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
