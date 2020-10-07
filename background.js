
var csrfToken = ' ';
var sessionid = ' ';

function ErrorsHandler(response){
    if (!response.ok) {
        console.log('ERROR: ' + response)
        //throw Error(response.statusText)
        chrome.runtime.sendMessage({'action':'Dataposted', 'result':'failed'})
    }
    else{
        console.log('post success')
        chrome.runtime.sendMessage({'action':'Dataposted', 'result':"success"})
    }
    return response
}

function gotPeojectsListHandler(response){
    if (!response.ok){
        console.log('ERROR: ' + response)
        chrome.runtime.sendMessage({'action':'gotProjectsList', 'result':'failed'})
    }
    else{
        response.json().then(json => {
            // the status was ok and there is a json body and resolve to another object for further usage
            var response_data =  Promise.resolve({json: json, response: response});
            var ProjectsList = [];
            for (i=0; i<json.count; i++){
                console.log(json.results[i])
                ProjectsList_json = {
                    "id": json.results[i]['id'],
                    "name": json.results[i]['name']

                }
                ProjectsList.push(ProjectsList_json)                
            }
            console.log(json)
            console.log(ProjectsList)
            chrome.runtime.sendMessage({'action':'gotProjectsList', 'result':'success', 'data':ProjectsList})
            
        }).catch(err => {
             // the status was ok but there is no json body
            console.log(Promise.resolve({response: response}))
            console.log(err)
        });

        
    }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    chrome.cookies.get({"url":"https://hololink.co/", "name":"csrftoken"}, function(cookie){
        if (cookie){
            csrfToken = cookie.value;
            chrome.cookies.get({"url":"https://hololink.co/", "name":"sessionid"}, function(cookie){
                if (cookie){
                    sessionid = cookie.value
                    if (request.query == "postData"){   
                        var myHeaders = new Headers();
                        myHeaders.append("X-CSRFToken", csrfToken);
                        myHeaders.append("Content-Type", "application/json");
                        myHeaders.append("Cookie", `sessionid=${sessionid}; csrftoken=${csrfToken}`);
                        myHeaders.append("X-Requested-With", "XMLHttpRequest");
                        console.log(myHeaders)
        
                        var raw = JSON.stringify({
                            "name": request.data_title,
                            "content": request.data,
                            "from_url": request.data_url,
                            "recommendation": request.recommendation,
                            "projects": request.data_projects,
                        });
                        
                        console.log(request.data_projects)

                        var requestOptions = {
                            method: 'POST',
                            headers: myHeaders,
                            body: raw,
                            redirect: 'follow',
                            credentials: 'include',
                            mode:'cors'
                        };
            
                        fetch(request.target_url, requestOptions)
                            .then(ErrorsHandler)
                            .then(response => response.text())
                            .then(result => console.log(result))
                            .catch(error => console.log('error', error));
                            
                    }
                }    
            });
        }
    });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if (request.action == "loadUserProjects"){
        chrome.cookies.get({"url":"https://hololink.co/", "name":"csrftoken"}, function(cookie){
            if (cookie){
                csrfToken = cookie.value;
                chrome.cookies.get({"url":"https://hololink.co/", "name":"sessionid"}, function(cookie){
                    if (cookie){
                        sessionid = cookie.value
                        var myHeaders = new Headers();
                        myHeaders.append("X-CSRFToken", csrfToken);
                        myHeaders.append("Content-Type", "application/json");
                        myHeaders.append("Cookie", `sessionid=${sessionid}; csrftoken=${csrfToken}`);
                        myHeaders.append("X-Requested-With", "XMLHttpRequest");

                        var requestOptions = {
                            method: 'GET',
                            headers: myHeaders,
                            redirect: 'follow',
                            credentials: 'include',
                        };

                        fetch(request.target_url, requestOptions)
                            .then(gotPeojectsListHandler)   
                    } 
             
                });
            }
        });
    }
});



/*
    由於 Google Chrome 會自動 overwrite referer 所以要特別用 webRequest
    api 來重新設置 referer。
    -> 之後要注意如何修改才能更保障安全性
*/

chrome.webRequest.onBeforeSendHeaders.addListener(function(details){
    var newRef = "https://hololink.co/api/articles";
    var gotRef = false;
    console.log('ohYA, inwebRequest')
    for(var n in details.requestHeaders){
        gotRef = details.requestHeaders[n].name.toLowerCase()=="referer";
        if(gotRef){
            details.requestHeaders[n].value = newRef;
            break;
            
        }
    }
    if(!gotRef){
        details.requestHeaders.push({name:"Referer",value:newRef});
    }
    return {requestHeaders:details.requestHeaders};},
    {urls:["https://hololink.co/*"]},
    [
        "requestHeaders",
        "blocking",
        "extraHeaders"
    ]
);


chrome.tabs.onUpdated.addListener(function(){
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
})


/*
chrome.tabs.onActivated.addListener(function(){
    console.log('popup open');
    chrome.cookies.get({"url":"https://hololink.co/", "name":"sessionid"}, function(cookie){
        if (cookie){
            //chrome.browserAction.setPopup({"popup":"popup.html"})
            window.location.href="popup.html";
            console.log('user already logged in');  
        }
        else{
            window.location.href="popup_login.html";
            //chrome.browserAction.setPopup({"popup":"popup_login.html"})
            console.log('user not log in'); 
        } 
    });
})
*/

/*
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if (request.action == "gotText"){
        var xhr = new XMLHttpRequest();
        var title =" ";
        var url = " ";

        xhr.open('POST', 'https://hololink.co/article/add/');
        xhr.setRequestHeader("Content-Type", "application/json");

        chrome.tabs.query({active:true, currentWindow:true},function(tab){ //之所以要放上 currentWindow 的原因在於如果不加這個指令，系統會以為你是指 popup，這樣會回傳 undefined
            var title = tab[0].title;
            var url = tab[0].url;
        });
        
        var form = new FormData();

        form.append("name", title);
        form.append("content", "Does this work?????????");
        form.append("url", url);

        xhr.send(form);

        console.log('oyes it works')
    }
})
*/