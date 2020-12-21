var target_hololink_host = "http://127.0.0.1:8000/"
var csrf_token
var session_id
var current_page_title
var current_page_url

function ErrorsHandler(response){
    if (!response.ok) {
        response.json().then( json => {
            if (json.duplication_error){
                chrome.runtime.sendMessage({'action':'Dataposted', 'result':'failed_duplication', 'duplicated_projects':json.duplication_error})
            } else {
                chrome.runtime.sendMessage({'action':'Dataposted', 'result':'failed'})
            }
        })
    }
    else{
        chrome.runtime.sendMessage({'action':'Dataposted', 'result':"success"})
    }
    return response
}

function send_response_to_content_script(response){
    if (response.ok) {
        console.log(response)
        return sendResponse({message:"mission_complete"})
    }
}

function deleteHighlightHandler(response){
    if (!response.ok){
        console.log('ERROR: ' + response)
    } else {
        response.json().then(json => {
            targetHighlightId = json.highlight[0].id
            if (targetHighlightId){
                chrome.cookies.get({"url":target_hololink_host, "name":"csrftoken"}, function(cookie){
                    if (cookie){
                        csrf_token = cookie.value;
                        chrome.cookies.get({"url":target_hololink_host, "name":"sessionid"}, function(cookie){
                            if (cookie){
                                session_id = cookie.value
                                var myHeaders = new Headers();
                                myHeaders.append("X-CSRFToken", csrf_token);
                                myHeaders.append("Content-Type", "application/json");
                                myHeaders.append("Cookie", `sessionid=${session_id}; csrftoken=${csrf_token}`);
                                myHeaders.append("X-Requested-With", "XMLHttpRequest");

                                var requestOptions = {
                                    method: 'DELETE',
                                    headers: myHeaders,
                                    redirect: 'follow',
                                    credentials: 'include',
                                };
            
                                fetch(target_hololink_host+`api/highlight/${targetHighlightId}/`, requestOptions)
                                    .then(response => console.log(response))   
                            } 
                     
                        });
                    }
                });
            }
        }).catch(err => {
            // the status was ok but there is no json body
           console.log(Promise.resolve({response: response}))
           console.log(err)
       });
    }
}

function got_user_data_of_current_page_handler(response){
    if (!response.ok){
        console.log('ERROR: ' + response)
        chrome.runtime.sendMessage({'action':'gotProjectsList', 'result':'failed'})
    }
    else{
        response.json().then(json => {
            // the status was ok and there is a json body and resolve to another object for further usage

            var response_data =  Promise.resolve({json: json, response: response});
            var ProjectsList = [];
            for (i=0; i<json.projects.length; i++){
                ProjectsList_json = {
                    "id": json.projects[i]['id'],
                    "name": json.projects[i]['name']

                }
                ProjectsList.push(ProjectsList_json)                
            }
            //console.log(json.highlight[0].message)
            //console.log(ProjectsList)
            chrome.runtime.sendMessage({'action':'gotProjectandRecommendationData', 'result':'success', 'projects':ProjectsList, 'recommendations':json.recommendations, 'user':json.user});
            console.log(json)
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                // send warning to content_script that Hololink doesn't have this article
                if (json.highlight.length){
                    if (json.highlight[0].message && json.highlight[0].message == "Hololink doesn't have this article"){
                        chrome.tabs.sendMessage(tabs[0].id, {action: 'content_script_change_status', message:"hololink_doesnt_have_this_article", user:json.user, csrf_token:csrf_token, session_id:session_id, current_page_title:current_page_title, current_page_url:current_page_url});
                    } else if (json.highlight.length) {
                        chrome.tabs.sendMessage(tabs[0].id, {action: 'content_script_change_status', message:"hololink_have_this_article", user:json.user, highlight:json.highlight, csrf_token:csrf_token, session_id:session_id, current_page_title:current_page_title, current_page_url:current_page_url});
                    }
                } else {
                    chrome.tabs.sendMessage(tabs[0].id, {action: 'content_script_change_status', message:"hololink_have_this_article", user:json.user, highlight:json.highlight, csrf_token:csrf_token, session_id:session_id, current_page_title:current_page_title, current_page_url:current_page_url});
                } 
            });  
        }).catch(err => {
             // the status was ok but there is no json body
            console.log(Promise.resolve({response: response}))
            console.log(err)
        });
    }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if (request.action == 'DataReadyForPost'){
        chrome.cookies.get({"url":target_hololink_host, "name":"csrftoken"}, function(cookie){
            if (cookie){
                csrf_token = cookie.value;
                chrome.cookies.get({"url":target_hololink_host, "name":"sessionid"}, function(cookie){
                    if (cookie){
                        session_id = cookie.value
                        
                        var myHeaders = new Headers();
                        myHeaders.append("X-CSRFToken", csrf_token);
                        myHeaders.append("Content-Type", "application/json");
                        myHeaders.append("Cookie", `sessionid=${session_id}; csrftoken=${csrf_token}`);
                        myHeaders.append("X-Requested-With", "XMLHttpRequest");
                        console.log(myHeaders)

                        console.log(request.data)
        
                        var raw = JSON.stringify({
                            "name": request.data.targetPageTitle,
                            "content": request.data.targetPageText,
                            "from_url": request.data.targetPageUrl,
                            "recommended": request.data.recommendation,
                            "projects": request.data.userSelectedProjects,
                            "article_html": request.data.targetPageHtml,
                        });

                        console.log(raw)

                        var requestOptions = {
                            method: 'POST',
                            headers: myHeaders,
                            body: raw,
                            redirect: 'follow',
                            credentials: 'include',
                            mode:'cors'
                        };
            
                        fetch(request.data.hololinkUrl, requestOptions)
                            .then(ErrorsHandler)
                            .then(response => (response.ok)? sendResponse({message:"mission_complete"}): sendResponse({message:"mission_failed"}))
                            .then(response => response.text())
                            .then(result => console.log(result))
                            .catch(error => console.log('error', error));                  
                    }    
                });
            }
        });
    }
    return true
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if (request.action == "get_specific_highlight_id_and_delete"){
        chrome.cookies.get({"url":target_hololink_host, "name":"csrftoken"}, function(cookie){
            if (cookie){
                csrf_token = cookie.value;
                chrome.cookies.get({"url":target_hololink_host, "name":"sessionid"}, function(cookie){
                    if (cookie){
                        session_id = cookie.value
                        var myHeaders = new Headers();
                        myHeaders.append("X-CSRFToken", csrf_token);
                        myHeaders.append("Content-Type", "application/json");
                        myHeaders.append("Cookie", `sessionid=${session_id}; csrftoken=${csrf_token}`);
                        myHeaders.append("X-Requested-With", "XMLHttpRequest");
    
                        var raw = JSON.stringify({
                            "page_url":request.data.page_url,
                            "page_title":request.data.page_title,
                            "id_on_page":request.data.id_on_page
                        })
    
                        var requestOptions = {
                            method: 'POST',
                            headers: myHeaders,
                            body: raw,
                            redirect: 'follow',
                            credentials: 'include',
                        };
    
                        fetch(target_hololink_host+"api/specific-highlight/", requestOptions)
                            .then(deleteHighlightHandler)   
                    } 
             
                });
            }
        });
    }
})

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if (request.action == "loadUserProjects"){
        get_user_basic_data_of_current_page(request)
    }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if (request.action == "post_highlight"){
        chrome.cookies.get({"url":target_hololink_host, "name":"csrftoken"}, function(cookie){
            if (cookie){
                csrf_token = cookie.value;
                chrome.cookies.get({"url":target_hololink_host, "name":"sessionid"}, function(cookie){
                    if (cookie){
                        session_id = cookie.value
                        var myHeaders = new Headers();
                        myHeaders.append("X-CSRFToken", csrf_token);
                        myHeaders.append("Content-Type", "application/json");
                        myHeaders.append("Cookie", `sessionid=${session_id.value}; csrftoken=${csrf_token.value}`);
                        myHeaders.append("X-Requested-With", "XMLHttpRequest");
    
                        var raw = JSON.stringify(request.data)
    
                        var requestOptions = {
                            method: 'POST',
                            headers: myHeaders,
                            body: raw,
                            redirect: 'follow',
                            credentials: 'include',
                            mode:'cors'
                        };
    
                        console.log('send')
    
                        fetch(target_hololink_host+'api/highlight/', requestOptions)
                            .then(response => response.text())
                            .then(result => console.log(result))
                            .catch(error => console.log('error', error));    
                    } 
                });
            }
        });
    }
});

function get_user_basic_data_of_current_page(request){
    chrome.cookies.get({"url":target_hololink_host, "name":"csrftoken"}, function(cookie){
        if (cookie){
            csrf_token = cookie.value;
            chrome.cookies.get({"url":target_hololink_host, "name":"sessionid"}, function(cookie){
                if (cookie){
                    session_id = cookie.value
                    var myHeaders = new Headers();
                    myHeaders.append("X-CSRFToken", csrf_token);
                    myHeaders.append("Content-Type", "application/json");
                    myHeaders.append("Cookie", `sessionid=${session_id}; csrftoken=${csrf_token}`);
                    myHeaders.append("X-Requested-With", "XMLHttpRequest");
                    // myHeaders.append("Page-Url", request.page_url);
                    // myHeaders.append("Page-Title", request.page_title);

                    var raw = JSON.stringify({
                        "page_url":request.page_url,
                        "page_title":request.page_title
                    })

                    var requestOptions = {
                        method: 'POST',
                        headers: myHeaders,
                        body: raw,
                        redirect: 'follow',
                        credentials: 'include',
                    };

                    fetch(request.target_url, requestOptions)
                        .then(got_user_data_of_current_page_handler)   
                } 
         
            });
        }
    });
}


/*
    由於 Google Chrome 會自動 overwrite referer 所以要特別用 webRequest
    api 來重新設置 referer。
    -> 之後要注意如何修改才能更保障安全性
*/

chrome.webRequest.onBeforeSendHeaders.addListener(function(details){
    var newRef = target_hololink_host + "api/articles";
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
    {urls:[target_hololink_host+"*"]},
    [
        "requestHeaders",
        "blocking",
        "extraHeaders"
    ]
);

// Take consideration on onCreated event, but it's too unreliable
// [Improvement] - Need to find solution to limit request 
chrome.tabs.onUpdated.addListener(function(tab_id, change_info, tab){
    //check whether user logged in
    console.log('check tab update info', change_info)
    if (change_info.status == 'complete'){
        chrome.cookies.get({"url":target_hololink_host, "name":"sessionid"}, function(cookie){
            if (cookie){
                session_id = cookie
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
         
        //get csrf_token
        chrome.cookies.get({"url":target_hololink_host, "name":"csrftoken"}, function(cookie){
            csrf_token = cookie;
            console.log(csrf_token)
        });

        // send csrf_token and session_id to content_script
        // and get basic data of current page
        chrome.tabs.query({active: true, currentWindow: true}, function(tab) {
            console.log(tab)
            current_page_title = tab[0].title;
            current_page_url = tab[0].url;
            request = {
                page_url:current_page_url,
                page_title:current_page_title,
                target_url:target_hololink_host+'api/broswer-extension-data/'
            }
            get_user_basic_data_of_current_page(request)
        });
    }
})

/*
chrome.tabs.onCreated.addListener(function(){
    //check whether user logged in 
    chrome.cookies.get({"url":target_hololink_host, "name":"sessionid"}, function(cookie){
        if (cookie){
            session_id = cookie
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
    //get csrf_token
    chrome.cookies.get({"url":target_hololink_host, "name":"csrftoken"}, function(cookie){
        csrf_token = cookie;
    });
});
*/

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