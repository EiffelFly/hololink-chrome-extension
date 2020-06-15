20200615
1. 處理不能上傳 url 的問題
2. 確認上傳的 Html 是否會因檔案過大而被剪除（不會）
3. 在 background.js 使用 onUpdated.addListener 來讀取 cookie 判斷使用者是否為登入狀態


20200614
1. 使用 cloneNode 來處理 DOM -> 避免到 content_script 會改動到使用者頁面的問題
2. 製作 Upload Hololink 的 button 動畫及標示
3. Upload Hololink 內部的 message 串接

20200612-1：
    使用 <Fetch> 來 POST 請求到 Hololink.co, 無法解決 csrf token 的問題

20200610-1：
    在公司修改：新增功能 — 依據使用者的登入狀況置換 popup

20200609-2：
    在家裡修改：發現整個程式碼迴圈的錯誤，開始修改。修改結束後發現準確率上升非常多

20200609-1：
    在公司修改：增加消除body 內 script 和 style 的方法

    