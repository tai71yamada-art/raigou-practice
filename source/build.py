# 雷轟 練習アプリのビルド
#   python3 source/build.py            … 1ファイル版（dist/raigou_app.html）とホーム画面版（リポジトリ直下）を作る
#   python3 source/build.py --check    … 作るだけで、ホーム画面版は書き換えない（dist だけ）
#
# ソースの構成
#   VERSION            … アプリのバージョン（設定画面と sw.js に入る）
#   html/              … head.html（<style>の手前まで）・body.html（画面の骨組み）・tail.html
#   css/style.css      … 見た目
#   js/ORDER.txt       … 読み込む順番。engine → ai → ui → app の順（後ろのファイルは前のものを使える）
#   js/engine/         … ルール（画面を直接さわらない。画面とのやりとりは VIEW 経由）
#   js/ai/             … AI
#   js/ui/ js/audio/   … 画面・演出・音
#   js/app/            … 設定・結果・起動
#   assets/            … 画像と音。HTML/CSS/JS の中の {{asset:パス}} {{chara:キャラID}} {{audio:名前}} が中身に置き換わる
#   pwa/               … ホーム画面版の付属ファイル（sw.js の {{VERSION}} も置き換わる）
import os, re, base64, json, sys, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DIST = os.path.join(ROOT, 'dist')
MIME = {'png':'image/png', 'webp':'image/webp', 'jpg':'image/jpeg'}
CHARA_KEYS = ['hero', 'win', 'lose', 'cutin', 'avatar', 'avatar_act', 'avatar_hit', 'avatar_joy']
PWA_SKIP_AUDIO = ['bgmData', 'bgmTitleData']   # ホーム画面版では BGM を別ファイル（bgm.mp3 / bgm_title.mp3）で読む

def rd(p, binary=False):
    with open(os.path.join(HERE, p), 'rb' if binary else 'r', **({} if binary else {'encoding':'utf-8'})) as f:
        return f.read()

def data_uri(path):
    ext = path.rsplit('.', 1)[1]
    return 'data:' + MIME[ext] + ';base64,' + base64.b64encode(rd('assets/' + path, True)).decode()

def chara_block(cid):
    folder = os.path.join(HERE, 'assets', 'chara', cid)
    files = {f.rsplit('.', 1)[0]: f for f in os.listdir(folder)}
    missing = [k for k in CHARA_KEYS if k not in files]
    if missing: raise SystemExit('キャラ ' + cid + ' の画像が足りません: ' + ', '.join(missing))
    d = {k: data_uri('chara/%s/%s' % (cid, files[k])) for k in CHARA_KEYS}
    return '<script type="text/plain" id="charaData-' + cid + '">' + json.dumps(d, separators=(',', ':')) + '</script>'

def fill(text, version, pwa):
    text = text.replace('{{VERSION}}', version)
    text = re.sub(r'\{\{asset:([^}]+)\}\}', lambda m: data_uri(m.group(1)), text)
    text = re.sub(r'\{\{chara:([^}]+)\}\}', lambda m: chara_block(m.group(1)), text)
    def audio(m):
        name = m.group(1)
        if pwa and name in PWA_SKIP_AUDIO: return ''
        return '<script type="text/plain" id="' + name + '">' + base64.b64encode(rd('assets/audio/' + name + '.mp3', True)).decode() + '</script>'
    text = re.sub(r'\{\{audio:([^}]+)\}\}', audio, text)
    left = re.findall(r'\{\{[a-z]+:[^}]*\}\}', text)
    if left: raise SystemExit('置き換えられなかった印があります: ' + ', '.join(left[:5]))
    return text

def build_html(version, pwa):
    js = ''.join(rd('js/' + f) for f in rd('js/ORDER.txt').split())
    html = rd('html/head.html') + rd('css/style.css') + rd('html/body.html') + js + rd('html/tail.html')
    return fill(html, version, pwa)

def main():
    version = rd('VERSION').strip()
    os.makedirs(DIST, exist_ok=True)
    single = build_html(version, pwa=False)
    with open(os.path.join(DIST, 'raigou_app.html'), 'w', encoding='utf-8') as f: f.write(single)
    print('dist/raigou_app.html', len(single.encode()) // 1024, 'KB', version)
    if '--check' in sys.argv: return
    # ホーム画面版（リポジトリ直下に置く＝GitHub Pages でそのまま公開される）
    with open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8') as f: f.write(build_html(version, pwa=True))
    with open(os.path.join(ROOT, 'sw.js'), 'w', encoding='utf-8') as f: f.write(rd('pwa/sw.js').replace('{{VERSION}}', version))
    for name in os.listdir(os.path.join(HERE, 'pwa')):
        if name != 'sw.js': shutil.copyfile(os.path.join(HERE, 'pwa', name), os.path.join(ROOT, name))
    shutil.copyfile(os.path.join(HERE, 'assets/audio/bgmData.mp3'), os.path.join(ROOT, 'bgm.mp3'))
    shutil.copyfile(os.path.join(HERE, 'assets/audio/bgmTitleData.mp3'), os.path.join(ROOT, 'bgm_title.mp3'))
    print('index.html / sw.js / 付属ファイルを更新')

if __name__ == '__main__':
    main()
