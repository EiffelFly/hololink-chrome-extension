
var csrfToken = ' ';

function ErrorsHandler(response){
    if (!response.ok) {
        console.log('ERROR: ' + response)
        //throw Error(response.statusText)
        chrome.runtime.sendMessage({'action':'Dataposted', 'result':'failed'})
    }
    else{
        chrome.runtime.sendMessage({'action':'Dataposted', 'result':"success"})
    }
    return response
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    chrome.cookies.get({"url":"https://hololink.co/", "name":"csrftoken"}, function(cookie){
        csrfToken = cookie.value;
        if (request.Query == "postData"){
        
            var formData = new FormData();
            formData.append("name", request.data_title);
            formData.append("content", request.data);
            formData.append("from_url", request.data_url);
            console.log(csrfToken);
    
            fetch(request.url, {
                method:'POST',
                credentials: "same-origin",
                headers:{
                    'X-CSRF-Token': csrfToken,
                    'Accept': 'multipart/form-data',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData,
            })
                .then(ErrorsHandler)
                .then(response => response.text())
                .then(response => console.log(response))
                .catch(error => console.log('Error:', error));
    
            return true;
            
        }
    });
});




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