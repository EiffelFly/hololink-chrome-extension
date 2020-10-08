
// check 使用者是否有登入 — Check login cookie，如果沒有則顯示 popup_notlogin.html 導到 Hololink 的登入頁面

var title = " ";
var url = " ";
var userSelectedProjectsIndex = []
var userSelectedProjectsId = []
var userProjectsOptionsHtml = []
var userProjectsOptions = []

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

        //呼叫 background.js 去取用 hololink api-projectsList 
        chrome.runtime.sendMessage({'action':'loadUserProjects', 'target_url':'https://hololink.co/api/broswer-extension-data/'})
    
    });

    //$('select-project').selectpicker();

    $('#user-log-in').click(function(){
        chrome.tabs.create({'url':'https://hololink.co/accounts/login/'})
    });


    //確認 Project-select 是否有被選
    //由於 Django rest framework m2m field 目前只接受傳入 Id(pk)，因此這個 background.js 
    //Get 到 project list 時會完全遵照 id 來排列，故 select box 挑到 clickedIndex+1 將等同 Id(pk)
    $('select').on("changed.bs.select",function(e, clickedIndex, newValue, oldValue) {
        //clickedIndex 
        
        if(newValue==true){
            if(userSelectedProjectsIndex.includes(clickedIndex)==false){
                project = userProjectsOptions[clickedIndex]['id']
                userSelectedProjectsId.push(project)
                userSelectedProjectsIndex.push(clickedIndex)
            }
        }
        else{
            if(userSelectedProjectsIndex.includes(clickedIndex)==true){
                idIndex = userSelectedProjectsId.indexOf(userProjectsOptions[clickedIndex]['id'])
                index = userSelectedProjectsIndex.indexOf(clickedIndex)
                userSelectedProjectsId.splice(idIndex,1)
                userSelectedProjectsIndex.splice(index,1)
            }
        }
      

        console.log(userSelectedProjectsId)
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







chrome.runtime.onMessage.addListener(function(response){
    if (response.action == 'gotProjectandRecommendationData'){
        if (response.result == 'success'){
            
            response.projects.forEach(element => {
                var option = `<option data-token=${element['name']}>` + element['name'] + "</option>";
                userProjectsOptionsHtml.push(option);
            });
            $('.selectpicker').html(userProjectsOptionsHtml);
            $('.selectpicker').selectpicker('refresh');

            recommendation_dailuUsageRemain = 5 - response.recommendations.length

            console.log(recommendation_dailuUsageRemain)

            if (recommendation_dailuUsageRemain == 0){
                $('#check_recommendation').attr("disabled", true);
            } else {
                $('#check_recommendation').attr("disabled", false);
            }

            $('#dailyUsageRemain').text(recommendation_dailuUsageRemain)

        }
    }
})


chrome.runtime.onMessage.addListener(function(request){
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
            target_url: "https://hololink.co/api/articles/",
            data_url: url,
            data_title:  title,
            data_projects: userSelectedProjectsId,
        }
        
        if ($('#check_recommendation').is(":checked")){
            fullData['recommendation'] = 'true';
        }
        else{
            fullData['recommendation'] = 'false';
        }
        console.log(fullData['recommendation'])
        
        chrome.runtime.sendMessage({"action":"DataReadyForPost", "data": fullData}, function(response){
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




