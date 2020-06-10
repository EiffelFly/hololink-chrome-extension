
$(function(){
    chrome.tabs.query({active:true, currentWindow:true},function(tab){ /*之所以要放上 currentWindow 的原因在於如果不加這個指令，系統會以為你是指 popup，這樣會回傳 undefined */
        var title = tab[0].title;
        var url = tab[0].url;
        console.log(url);
        console.log(title);
        $('#user_input_title').val(title);
    });
});

/*listen clipper 是否成功擷取資料，並且存入 */
chrome.runtime.onMessage.addListener(function(request,sender){ 
    if (request.action == "gotText"){
        var fullText = request.source;
        console.log(fullText)
        
    }
});

/* 呼叫 Text-Clipper */
function onPopupLoad(){
    chrome.tabs.executeScript(null, {file:"getHtml.js"}, function(){
        // If you try and inject into an extensions page or the webstore/NTP you'll get an error
        console.log("let's go")
        if (chrome.runtime.lastError){
            console.log('There was an error injecting script : \n' + chrome.runtime.lastError.message)
        }
    });
}

window.onload = onPopupLoad; /window.onload會等網頁的全部內容，包括圖片，CSS及<iframe>等外部內容載入後才會觸發*/


/** 
$(function(){
    chrome.tabs.getCurrent(function(tab){
        if(tab.title){n m 
            $('#auto_gen_title').text(tab.title);
        }
    });
});

        Materialize.textareaAutoResize($('#user_input_title'));

*/

