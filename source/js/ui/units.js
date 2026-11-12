/* ================= 衛星軍の機体 =================
   ストーリーと練習モードの相手。アイコンはAIの基盤の絵のまま、カットイン・VS・雷轟合戦の絵だけ機体の絵になる。
   機体を足す時は assets/units/<名前>.webp（背景を抜いた横900px）を置き、下に1行足す（強化型ドローン・重量タンクなど）。
   色を省くと衛星軍の色（ARMY_COLOR：グレー）。 */
const ARMY_COLOR = { color:'#9aa0a8', hi:'#c3c8cf', ink:'#101114' };
const UNITS = {
  drone: { name:'ドローン', img:'{{asset:units/drone.webp}}' },   // 道中で出くわす単機。そこまで強くない
  tank:  { name:'タンク',   img:'{{asset:units/tank.webp}}' }     // コントロールセンターの防衛。倒すとセンターが止まる
};
