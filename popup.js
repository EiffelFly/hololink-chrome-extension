
// check 使用者是否有登入 — Check login cookie，如果沒有則顯示 popup_notlogin.html 導到 Hololink 的登入頁面

var title = " ";
var url = " ";

$(function(){

    /*
    chrome.cookies.get({"url":"https://hololink.co/", "name":"sessionid"}, function(cookie){
        if (cookie){
            chrome.browserAction.setPopup({"popup":"popup.html"})
            //window.location.href="popup.html";
            console.log('user already logged in');  
        }
        else{
            //window.location.href="popup_login.html";
            chrome.browserAction.setPopup({"popup":"popup_login.html"})
            console.log('user not log in'); 
        } 
    });
    */

    chrome.tabs.query({active:true, currentWindow:true},function(tab){ /*之所以要放上 currentWindow 的原因在於如果不加這個指令，系統會以為你是指 popup，這樣會回傳 undefined */
        title = tab[0].title;
        url = tab[0].url;
        console.log(url);
        console.log(title);
        document.getElementById("websiteTitleInput").innerText = title;
        //我們要讓鼠標 focus 在 title 的最後一個字
        var len = title.length;
        $('#websiteTitleInput')[0].focus();
        $('#websiteTitleInput')[0].setSelectionRange(len, len);

    });

    $('#user-log-in').click(function(){
        chrome.tabs.create({'url':'https://hololink.co/accounts/login/'})
    });

    $('#upload_hololink_button').click(function(){
        window.onload = callTextClipper(); //window.onload會等網頁的全部內容，包括圖片，CSS及<iframe>等外部內容載入後才會觸發*/
        $(this).prop("disabled", true);
        $(this).prop('spinner',true).html(
            `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
             <span style="font-size: 1rem; padding-left: 10px;">Loading ...</span>`
        );
    });
});


chrome.runtime.onMessage.addListener(function(request,sender){
    if (request.action == 'Dataposted'){
        if (request.result == 'success'){
            $('#upload_hololink_button').prop('spinner', false).html(
                `<span style="font-size: 1rem; padding-left: 10px;">Done</span>`             
            );
        }
        else {
            $('#upload_hololink_button').prop('spinner', false).html(
                `<span style="font-size: 1rem; padding-left: 10px;">Failed</span>`             
            );
        }
        
    }
    
}); 


/*listen clipper 是否成功擷取資料，並且存入 */
chrome.runtime.onMessage.addListener(function(request,sender){ 
    if (request.action == "gotText"){
        fullData = {
            query: "postData",
            data: request.source,
            target_url: "https://hololink.co/article/add/",
            data_url: url,
            data_title:  title,
        }
        
        if ($('#check_recommendation').is(":checked")){
            fullData['recommendation'] = 'true';
        }
        else{
            fullData['recommendation'] = 'false';
        }
        
        chrome.runtime.sendMessage(fullData, function(response){
            if (response != undefined && response != "") {
                console.log(response);
            }
            else {
                console.log(null);
            }
        });



        /*
        if ($('#check_recommandation').is(":checked")){
            console.log('recommandation true');
            console.log(request.source)
            chrome.runtime.sendMessage({
                Query: "postData",
                data: request.source,
                url: "https://hololink.co/article/add/",
                data_url: url ,
                data_title: title,
                recommandation: true
            }, function(response){
                //debugger;
                if (response != undefined && response != "") {
                    console.log(response);
                }
                else {
                    //debugger;
                    console.log(null);
                }
            });
        }
        else{
            console.log('recommandation false');
            chrome.runtime.sendMessage({
                Query: "postData",
                data: request.source,
                url: "https://hololink.co/article/add/",
                data_url: url ,
                data_title: title,
                recommandation: 'false',
            }, function(response){
                //debugger;
                if (response != undefined && response != "") {
                    console.log(response);
                }
                else {
                    //debugger;
                    console.log(null);
                }
            });
        } 
        */  
    };
});

/* 呼叫 Text-Clipper */
function callTextClipper(){
    chrome.tabs.executeScript(null, {file:"getHtml.js"}, function(){
        // If you try and inject into an extensions page or the webstore/NTP you'll get an error
        console.log("let's go")
        if (chrome.runtime.lastError){
            console.log('There was an error injecting script : \n' + chrome.runtime.lastError.message)
        }
    });
}



