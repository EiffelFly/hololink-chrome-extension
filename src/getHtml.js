/**
 Contribute https://github.com/ZachSaucier/Just-Read/blob/b6b209ff566239b359b15d651b6716fb5fcf7f4d/content_script.js#L1191
 */

var target_hololink_host = "http://127.0.0.1:8000/"

function findContentContainer(){
    //countMaxNum-Method
    // flow: find MaxNum<p> -> select outer layer from MaxNum<p> until reach 40% total words-> clone selected word -> delete unneccessay element -> export
    var countTotlaWordsOnPage = document.body.innerText.length, 
        // 一篇網站內容中文字大多由 p 表示
        wordsContainers = document.body.querySelectorAll("p");
        
    // 接下來要找到哪個部分存了最多文字，要把這些片段挑出來挑出來

    var pTagWithMostWords = document.body,
        countHightestWord = 0;

    //如果沒有 <p> 則要找 <div> 
    if(wordsContainers.length === 0) {
        wordsContainers = document.body.querySelectorAll("div");
    };
    
    // 開始找擁有最多字的 <p>
    for (var i = 0; i < wordsContainers.length; i++){
        if (wordsContainers[i].offsetHeight != 0){ //確認該內容是可被使用者閱讀的
            var containerInnerText = wordsContainers[i].innerText; //與第四行使用同樣的比較法
            if(containerInnerText){
                var countWords = containerInnerText.length;
                if (countWords > countHightestWord){
                   countHightestWord = countWords;
                   pTagWithMostWords = wordsContainers[i];
                   console.log(countHightestWord);
                };
            };
        }
    
   
        //如果該 <p> 是無法被使用者閱讀的話則刪除它
        if(wordsContainers[i].offsetHeight === 0){
            wordsContainers[i].dataset.simpleDelete = true;
        };

    };

    var selectedContainer = pTagWithMostWords,
        countSelectedWords = countHightestWord;
    
    //從最多字的 <p> 一圈一圈向外拓，直到圈起了 2/5 的總字數
    while (countSelectedWords/countTotlaWordsOnPage < 0.1
    && selectedContainer != document.body
    && selectedContainer.parentNode.innerText){ //這一圈裡必須要有字
        selectedContainer = selectedContainer.parentNode; //向外擴一圈
        countSelectedWords = selectedContainer.innerText.length;
    };

    //如果機器找到的最後一層是 <p> 則我們要自動向外再選一層
    if (selectedContainer.tagName === "P"){
        selectedContainer = selectedContainer.parentNode;
    };

    
    // clone selectedContainer to delete and export
    var cloneSelectedContainer = selectedContainer.cloneNode(true);

    var deleteObjects =  cloneSelectedContainer.querySelectorAll("[data-simple-delete]");
    //這裡反而不能用下面那種 While 的寫法，不然會出現 parentNode = null 的狀況，因為取回的結構有些不太一樣
    //<p id="weather_text" data-simple-delete="true">臺北市  25-32  ℃</p> 

    for (var i = 0, max = deleteObjects.length; i < max; i++) {
        console.log(deleteObjects[i]);
        deleteObjects[i].parentNode.removeChild(deleteObjects[i]);
    };
    


    // Contribute https://stackoverflow.com/a/14003661
    // 有些網頁會把 script 寫進 innerhtml。另外這裡如果用 for 迴圈來寫，因為getElementsByTagName拿回來的是 Nodelist 而不是 Array 
    // 所以每當你移除其中的一個元素時 Nodelist 都會更新，而原有的元素會擠進 [0] 導致你再也取不到它

    var deleteScripts = cloneSelectedContainer.getElementsByTagName('script');

    while(deleteScripts[0]){
        console.log(deleteScripts[0]);
        deleteScripts[0].parentNode.removeChild(deleteScripts[0]);
    }

    //刪除圖片
    var deleteImages = cloneSelectedContainer.getElementsByTagName('img');

    while(deleteImages[0]){
        deleteImages[0].parentNode.removeChild(deleteImages[0]);
    }

    var deleteFigures = cloneSelectedContainer.getElementsByTagName('figure');
    while(deleteFigures[0]){
        deleteFigures[0].parentNode.removeChild(deleteFigures[0]);
    }

    // 刪除 iframe
    var deleteIFrames = cloneSelectedContainer.getElementsByTagName('iframe');
    while(deleteIFrames[0]){
        deleteIFrames[0].parentNode.removeChild(deleteIFrames[0]);
    }

    //刪除 medium noscript tag
    var deleteMediumNoScriptTag = cloneSelectedContainer.getElementsByTagName('noscript');
    while(deleteMediumNoScriptTag[0]){
        console.log(deleteMediumNoScriptTag[0])
        deleteMediumNoScriptTag[0].parentNode.removeChild(deleteMediumNoScriptTag[0]);
    }

    // 刪除 svg
    var deleteSvgs = cloneSelectedContainer.getElementsByTagName('svg');
    while(deleteSvgs[0]){
        console.log(deleteSvgs[0])
        deleteSvgs[0].parentNode.removeChild(deleteSvgs[0]);
    }

    //刪除影片
    var deleteVideos = cloneSelectedContainer.getElementsByTagName('video');

    while(deleteVideos[0]){
        deleteVideos[0].parentNode.removeChild(deleteVideos[0]);
    }
    
    //有些網頁會在 body 裡放置 dynamic css 
    var deletestylesheet = cloneSelectedContainer.getElementsByTagName('style');

    while(deletestylesheet[0]){
        deletestylesheet[0].parentNode.removeChild(deletestylesheet[0]);
    }

    // 刪除按鍵
    var deleteButton = cloneSelectedContainer.getElementsByTagName('button');
    console.log('button',deleteButton)

    while(deleteButton[0]){
        console.log('jddjd',deleteButton[0])
        deleteButton[0].parentNode.removeChild(deleteButton[0]);
    }
    
    var targetPageText = cloneSelectedContainer.innerText;
    var targetPageHtml = rebuild_target_container_to_hololink_preference(cloneSelectedContainer);
    targetPageText = targetPageText.replace(/(\r\n|\n|\r|\t)/gm, "");
    
    var data = {
        "targetPageText":targetPageText,
        "targetPageHtml":targetPageHtml
    }
    

    return data;
};

function rebuild_target_container_to_hololink_preference(targer_container){

    /*
    //\\var target_all_element = targer_container.querySelectorAll("*")
    //target_all_element.classList.add("hololink-selected-element");

    //for (var i = 0; i < target_all_element.length; i++) {
    //    target_all_element[i].classList.add('hololink-selected-element');
    //}

    //console.log(target_all_element)
    if (targer_container.childNodes.length > 1){
        var target_nodes_list = targer_container.childNodes
    } else {
        if (targer_container.childNodes.childNodes > 1){
            var target_nodes_list = targer_container.childNodes.childNodes
        }
    }
    console.log(target_nodes_list)
   
    for (var i = 0; i < target_nodes_list.length; i++) {
        // some website 
        if (target_nodes_list[i].textContent && !/\S+/.test(target_nodes_list[i].textContent)){

        }
        console.log(target_nodes_list[i].className)
        //target_nodes_list[i].classList.className += " hololink-selected-element";
    }
    */
    
    
    treeWalker=document.createTreeWalker(targer_container,NodeFilter.SHOW_TEXT,null,false);
    var currentNode = treeWalker.currentNode;
    console.log(targer_container)
    // remove unnecessary element
    try {
        targer_container.innerHTML = targer_container.innerHTML.replace(/(id|class|onclick|ondblclick|accesskey|data|dynsrc|tabindex)="[\w- ]+"/g, "")
            .replace( /style=[ \w="-:\/\/:#;]+/ig, "" )  // style="xxxx"
            .replace( /label=[\u4e00-\u9fa5 \w="-:\/\/:#;]+"/ig, "" )  // label="xxxx"
            .replace( /data[-\w]*=[ \w=\-.:\/\/?!;+"]+"[ ]?/ig, "" )   // data="xxx" || data-xxx="xxx"
            .replace( /href="javascript:[\w()"]+/ig, "" )              // href="javascript:xxx"
            //.replace( /<figure[ -\w*= \w=\-.:\/\/?!;+"]*>/ig, "" ) // <figure >
            //.replace( /<\/figure>/ig, "" ) // </figure>
            .replace( /<figcaption[ -\w*= \w=\-.:\/\/?!;+"]*>/ig, "" ) // <figcaption >
            .replace( /<\/figcaption>/ig, "" )                         // </figcaption>
            .replace( /color=[ \w="-:\/\/:#;]+/ig, "" )  // color="xxxx"
    }

    catch(error) {
        console.log('error',error)
    }

    console.log(targer_container.innerHTML)

    return targer_container.innerHTML

    //while(currentNode) {
        // if currentNode is newlines, space we ignore it
    //    if (/\S+/.test(currentNode.textContent)){
    //        if (currentNode.parentNode){
    //            console.log('ohhoho',currentNode.parentNode.parentNode);
    //        }
            
    //    } 
        
        
    //    currentNode = treeWalker.nextNode();
    //}
    

}


// 呼叫上述 function 並且將資料丟回去
chrome.runtime.sendMessage({action: "gotText",source: findContentContainer()}, function(){
    console.log('begin text clipping process');
})

