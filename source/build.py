# 雷轟 練習アプリのビルド
#   python3 source/build.py            … 1ファイル版（dist/raigou_app.html）とホーム画面版（リポジトリ直下）を作る
#   python3 source/build.py --check    … 作るだけで、ホーム画面版は書き換えない（dist だけ）
#
# ソースの構成
#   VERSION            … アプリのバージョン（設定画面と sw.js に入る）
#   html/              … head.html（<style>の手前まで）・body.html（画面の骨組み）・tail.html
#   css/ORDER.txt      … 見た目（CSS）の読み込み順。後ろのファイルほど優先（30-theme-denno 以降が今の見た目）
#   js/ORDER.txt       … 読み込む順番。engine → ai → ui → app の順（後ろのファイルは前のものを使える）
#   js/engine/         … ルール（画面を直接さわらない。画面とのやりとりは VIEW 経由）
#   js/ai/             … AI
#   js/ui/ js/audio/   … 画面・演出・音
#   js/app/            … 設定・結果・起動
#   assets/            … 画像と音。HTML/CSS/JS の中の {{asset:パス}} {{audio:名前}} が中身に置き換わる
#   assets/chara/<家ID>/ … キャラ1人分（chara.json＋画像9枚）。フォルダを置くだけで選べるキャラになる（README.md 参照）
#   pwa/               … ホーム画面版の付属ファイル（sw.js の {{VERSION}} も置き換わる）
import os, re, base64, json, sys, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DIST = os.path.join(ROOT, 'dist')
MIME = {'png':'image/png', 'webp':'image/webp', 'jpg':'image/jpeg', 'mp4':'video/mp4'}
CHARA_KEYS = ['hero', 'win', 'lose', 'cutin', 'avatar', 'avatar_act', 'avatar_hit', 'avatar_joy']
CHARA_OPT = ['eyes', 'eyes_video']   # 奥義解放のカットイン：目元の静止画（無ければカットインの絵）・目元の動画（あるキャラだけ）
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
    d = {k: data_uri('chara/%s/%s' % (cid, files[k])) for k in CHARA_KEYS + [k for k in CHARA_OPT if k in files]}
    return '<script type="text/plain" id="charaData-' + cid + '">' + json.dumps(d, separators=(',', ':')) + '</script>'

def charas():
    """assets/chara/ の下のフォルダ＝選べるキャラ。フォルダ名は家のID（rakura, kuze, …）"""
    base = os.path.join(HERE, 'assets', 'chara')
    out = []
    for cid in sorted(os.listdir(base)):
        f = os.path.join(base, cid, 'chara.json')
        if not os.path.exists(f): raise SystemExit('assets/chara/' + cid + '/chara.json がありません')
        with open(f, encoding='utf-8') as fp: meta = json.load(fp)
        for k in ['name', 'color', 'colorSoft']:
            if not meta.get(k): raise SystemExit(cid + ' の chara.json に ' + k + ' がありません')
        out.append((cid, meta))
    return out

def rgb(hexcolor):
    h = hexcolor.lstrip('#')
    return ','.join(str(int(h[i:i+2], 16)) for i in (0, 2, 4))

def chara_fill(text):
    cs = charas()
    js_str = lambda v: "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"
    text = text.replace('{{charas}}', '\n'.join(chara_block(cid) for cid, _ in cs))
    text = text.replace('{{chara_names}}', '{ ' + ', '.join(cid + ':' + js_str(m['name']) for cid, m in cs) + ' }')
    text = text.replace('{{chara_tiles}}', '{ ' + ', '.join(cid + ":'{{asset:chara/" + cid + "/tile.webp}}'" for cid, _ in cs) + ' }')
    text = text.replace('{{chara_colors}}', '\n'.join(
        '      html[data-chara="%s"], .chara-tile[data-chara="%s"]{ --main:%s; --main-rgb:%s; --main-soft:%s;%s }' % (cid, cid, m['color'], rgb(m['color']), m['colorSoft'],
            ' --main-hi:%s; --on-main:%s;' % (m.get('colorHi') or m['color'], m.get('onMain') or '#101114'))
        for cid, m in cs))
    text = text.replace('{{chara_css}}', '\n'.join(
        ('      /* ' + m['cssNote'] + ' */\n' if m.get('cssNote') else '') + '      ' + m['css'] for cid, m in cs if m.get('css')))
    return text

def fill(text, version, pwa):
    text = text.replace('{{VERSION}}', version)
    text = chara_fill(text)
    text = re.sub(r'\{\{asset:([^}]+)\}\}', lambda m: data_uri(m.group(1)), text)
    text = re.sub(r'\{\{chara:([^}]+)\}\}', lambda m: chara_block(m.group(1)), text)
    def audio(m):
        name = m.group(1)
        if pwa and name in PWA_SKIP_AUDIO: return ''
        return '<script type="text/plain" id="' + name + '">' + base64.b64encode(rd('assets/audio/' + name + '.mp3', True)).decode() + '</script>'
    text = re.sub(r'\{\{audio:([^}]+)\}\}', audio, text)
    left = re.findall(r'\{\{[a-z_]+(?::[^}]*)?\}\}', text)
    if left: raise SystemExit('置き換えられなかった印があります: ' + ', '.join(left[:5]))
    return text

def build_html(version, pwa):
    js = ''.join(rd('js/' + f) for f in rd('js/ORDER.txt').split())
    css = ''.join(rd('css/' + f) for f in rd('css/ORDER.txt').split())
    html = rd('html/head.html') + css + rd('html/body.html') + js + rd('html/tail.html')
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
