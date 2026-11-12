/* ================= ストーリーモードのデータ（登場人物・背景・章） =================
   章の台本は js/story/chapters/ に1章1ファイルで置き、STORY_CHAPTERS に足していく（js/ORDER.txt にも書く）。
   台本の命令（1行＝1つ）：
     { text:'…' }                地の文
     { say:'iroha', text:'…' }   台詞（say は STORY_CHARA の名前）
     { bg:'night' }              背景を変える（STORY_BG の名前）
     { show:'iroha', pos:'left' }  立ち絵を出す・動かす（pos：left / center / right）
     face:'驚き'                 表情を変える。show・say の行に付ける（{ say:'iroha', face:'驚き', text:'…' }）。
                                 表情だけ変える時は { face:'驚き', who:'iroha' }。一度変えた表情は、次に変えるまで続く
     outfit:'装備'               服装（差分の組）を変える。face と同じように show・say の行に付けるか、{ outfit:'装備', who:'iroha' }。
                                 一度変えた服装は、章が替わっても続く（はじめからの時だけ、そのキャラの outfit に戻る）
     { hide:'iroha' }            立ち絵を消す
     { fx:'flash' }              演出（flash＝光る、shake＝揺れる）
     { choice:[{ text:'…', jump:'ラベル' }, …] }   選択肢
     { label:'名前' } { jump:'名前' }   行き先の目印と、そこへ飛ぶ命令
     { set:'旗' }                旗を立てる。どの命令にも if:'旗'（立っている時だけ）・ifnot:'旗' を付けられる
     { battle:{ opp:'rakura', level:'lv1', rule:'basic', sente:true, ougi:null, aiOugi:null, title:'…' } }
                                 対戦。勝つと次の行へ進む。負け・引き分けはやり直し。
                                 opp＝相手。キャラなら家ID（'rakura' など）、衛星軍なら機体の名前（'drone'・'tank'。js/ui/units.js）。省くとドローン、me＝自分のキャラ（省くと いろは）
     { end:true }                章の終わり（次の章があれば続けて始まる） */
const STORY_CHARA = {
  /* いろは：最初は「装備なし」（リュックと刀なし）。台本で outfit:'装備' にすると、リュックと刀を背負った絵になる。
     装備なしの絵が無い表情（決意・キラキラ・泣く・悲しい）は、装備なしの近い表情（outfitFallback）で出す */
  iroha:  { name:'赤月 いろは', color:'#f07a2a', house:'akatsuki', face:'標準', outfit:'装備なし',
    outfits:{ '装備なし':{
      '標準':'{{asset:story/iroha/plain_normal.webp}}',
      '笑顔':'{{asset:story/iroha/plain_smile.webp}}',
      '不安':'{{asset:story/iroha/plain_anxious.webp}}',
      '驚き':'{{asset:story/iroha/plain_surprised.webp}}',
      '慌てる':'{{asset:story/iroha/plain_flustered.webp}}',
      '真剣':'{{asset:story/iroha/plain_serious.webp}}',
      'にこにこ':'{{asset:story/iroha/plain_happy.webp}}',
      '心配':'{{asset:story/iroha/plain_worried.webp}}'
    } },
    outfitFallback:{ '決意':'真剣', 'キラキラ':'笑顔', '泣く':'心配', '悲しい':'心配' },
    faces:{   // 装備（リュックと刀）
    '標準':'{{asset:story/iroha/face_normal.webp}}',      // 真顔
    '笑顔':'{{asset:story/iroha/face_smile.webp}}',
    '決意':'{{asset:story/iroha/face_resolve.webp}}',
    '不安':'{{asset:story/iroha/face_anxious.webp}}',
    '驚き':'{{asset:story/iroha/face_surprised.webp}}',
    '慌てる':'{{asset:story/iroha/face_flustered.webp}}',
    '真剣':'{{asset:story/iroha/face_serious.webp}}',     // 真剣に喋る
    'キラキラ':'{{asset:story/iroha/face_sparkle.webp}}', // 嬉しい（キラキラ）
    'にこにこ':'{{asset:story/iroha/face_happy.webp}}',   // 嬉しい（にこにこ）
    '心配':'{{asset:story/iroha/face_worried.webp}}',
    '泣く':'{{asset:story/iroha/face_cry.webp}}',
    '悲しい':'{{asset:story/iroha/face_sad.webp}}'
  } },
  kurara: { name:'雷藏 くらら', color:'#ffd23f', house:'rakura', chara:'rakura' }   // 立ち絵は練習モードのキャラの絵（hero）を使う
};
/* 背景：絵ができるまでは、色を組み合わせた仮のもの（css/95-story.css の .av-bg-名前）。
   絵ができたら img に画像（assets/story/bg/ に置いて、いろはの立ち絵と同じ書き方で指定）を足すと、その絵を使う */
const STORY_BG = {
  black: { label:'' },
  pod:   { label:'脱出艇の中' },
  night: { label:'荒野・夜' },
  waste: { label:'荒野・夜明け' }
};
const STORY_ME = 'akatsuki';   // ストーリーの対戦で使う自分のキャラ（いろは）
const STORY_CHAPTERS = [];
/* 立ち絵の画像。face を省くと、そのキャラの標準の表情 */
function storyCharaImg(id, face, outfit){
  const c = STORY_CHARA[id]; if(!c) return '';
  const set = c.outfits && c.outfits[outfit || c.outfit];
  if(set){
    const fb = c.outfitFallback || {};
    return set[face] || set[fb[face]] || set[c.face] || '';
  }
  if(c.faces) return c.faces[face] || c.faces[c.face] || '';
  if(c.img) return c.img;
  const a = c.chara ? charaAssets(c.chara) : null;
  return a ? a.hero : '';
}
