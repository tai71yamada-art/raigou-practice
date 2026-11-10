/* ================= ストーリーモードのデータ（登場人物・背景・章） =================
   章の台本は js/story/chapters/ に1章1ファイルで置き、STORY_CHAPTERS に足していく（js/ORDER.txt にも書く）。
   台本の命令（1行＝1つ）：
     { text:'…' }                地の文
     { say:'iroha', text:'…' }   台詞（say は STORY_CHARA の名前）
     { bg:'night' }              背景を変える（STORY_BG の名前）
     { show:'iroha', pos:'left' }  立ち絵を出す・動かす（pos：left / center / right）
     { hide:'iroha' }            立ち絵を消す
     { fx:'flash' }              演出（flash＝光る、shake＝揺れる）
     { choice:[{ text:'…', jump:'ラベル' }, …] }   選択肢
     { label:'名前' } { jump:'名前' }   行き先の目印と、そこへ飛ぶ命令
     { set:'旗' }                旗を立てる。どの命令にも if:'旗'（立っている時だけ）・ifnot:'旗' を付けられる
     { battle:{ opp:'rakura', level:'lv1', rule:'basic', sente:true, ougi:null, aiOugi:null, title:'…' } }
                                 対戦。勝つと次の行へ進む。負け・引き分けはやり直し。
                                 opp＝相手のキャラ（assets/chara の家ID。省くといつものAI）、me＝自分のキャラ（省くと いろは）
     { end:true }                章の終わり（次の章があれば続けて始まる） */
const STORY_CHARA = {
  iroha:  { name:'赤月 いろは', color:'#f07a2a', house:'akatsuki', img:'{{asset:story/iroha/tachie.webp}}' },
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
function storyCharaImg(id){
  const c = STORY_CHARA[id]; if(!c) return '';
  if(c.img) return c.img;
  const a = c.chara ? charaAssets(c.chara) : null;
  return a ? a.hero : '';
}
