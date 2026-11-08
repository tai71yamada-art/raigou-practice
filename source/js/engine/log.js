/* ================= ログ（ルール側の入口） =================
   書いた文は VIEW を通して画面のログ欄に出る（画面の処理は ui/log.js） */
function log(text, cls){ return VIEW.log(text, cls); }
function logTurn(text){ return VIEW.logTurn(text); }
