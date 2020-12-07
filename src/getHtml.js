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

    var elementWithMostWords = []
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
                   elementWithMostWords.unshift(wordsContainers[i]);
                   console.log(countHightestWord, elementWithMostWords);
                };
            };
        }
    
   
        //如果該 <p> 是無法被使用者閱讀的話則刪除它
        if(wordsContainers[i].offsetHeight === 0){
            wordsContainers[i].dataset.simpleDelete = true;
        };

    };

    var selectedContainer = elementWithMostWords[0],
        countSelectedWords = countHightestWord;
    
    //find_container_with_most_words()

    console.log(selectedContainer)
    //從最多字的 <p> 一圈一圈向外拓，直到圈起了 2/5 的總字數
    while (countSelectedWords/countTotlaWordsOnPage < 0.4
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
        //console.log(deleteScripts[0]);
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

    // remove figure caption
    var deleteFigcaption = cloneSelectedContainer.getElementsByTagName('figcaption');
    while(deleteFigcaption[0]){
        deleteFigcaption[0].parentNode.removeChild(deleteFigcaption[0]);
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
        //console.log(deleteSvgs[0])
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
    //console.log('button',deleteButton)

    while(deleteButton[0]){
        //console.log('jddjd',deleteButton[0])
        deleteButton[0].parentNode.removeChild(deleteButton[0]);
    }



    
    var targetPageText = cloneSelectedContainer.innerText;

    

    removeAttribute(cloneSelectedContainer);
    removeEmptyElement(cloneSelectedContainer);
    restructureToFlatContainer(cloneSelectedContainer);
    removeHololinkHighlightTag(cloneSelectedContainer);

    //console.log(cloneSelectedContainer.innerHTML)

    targetPageText = targetPageText.replace(/(\r\n|\n|\r|\t)/gm, "");
    
    var data = {
        "targetPageText":targetPageText,
        "targetPageHtml":targetPageHtml
    }
    

    return data;
};

function removeAttribute(targer_container){

    // remove unnecessary attribute
    try {
        targer_container.innerHTML = targer_container.innerHTML.replace(/(id|class|onclick|ondblclick|accesskey|data|dynsrc|tabindex)="[\w- ]+"/g, "")
            .replace( /style=[ \w="-:\/\/:#;]+/ig, "" )  // style="xxxx"
            .replace( /label=[\u4e00-\u9fa5 \w="-:\/\/:#;]+"/ig, "" )  // label="xxxx"
            .replace( /data[-\w]*=[ \w=\-.:\/\/?!;+"]+"[ ]?/ig, "" )   // data="xxx" || data-xxx="xxx"
            .replace( /href="javascript:[\w()"]+/ig, "" )              // href="javascript:xxx"
            //.replace( /<figure[ -\w*= \w=\-.:\/\/?!;+"]*>/ig, "" ) // <figure >
            //.replace( /<\/figure>/ig, "" ) // </figure>
            //.replace( /<figcaption[ -\w*= \w=\-.:\/\/?!;+"]*>/ig, "" ) // <figcaption >
            //.replace( /<\/figcaption>/ig, "" )                         // </figcaption>
            .replace( /color=[ \w="-:\/\/:#;]+/ig, "" )  // color="xxxx"
    }

    catch(error) {
        console.log('error',error)
    }
}

function removeHololinkHighlightTag(target){
    var hololinkHighlight = target.querySelectorAll("hololink-highlight")
    for (var n=0; n < hololinkHighlight.length; n ++){
        unWrapElement(hololinkHighlight[n])
    }
}

function removeEmptyElement(target){
    var target_empty_elements = target.querySelectorAll("*:empty")
    target_empty_elements.forEach(function(target){
        //console.log(target)
        target.parentNode.removeChild(target)
    });
}

function unWrapElement(target){
    // place childNodes in document fragment
	var docFrag = document.createDocumentFragment();
	while (target.firstChild) {
		var child = target.removeChild(target.firstChild);
        docFrag.appendChild(child);
	}
    // replace wrapper with document fragment
    //console.log(target)
    if (target.parentNode){
        target.parentNode.replaceChild(docFrag, target);
    }
	
}

function restructureToFlatContainer(target){
    var notFlatItIndicator = ['span', 'a', 'b', 'abbr', 'acronym','bdo','big','br','cite','code','dfn','em','i',
        'kbd','label','map','q','span','strong','time','address','article','aside','blockquote','canvas','dd',
        'dl','dt','fieldset','footer','form','h1','h2','h3','h4','h5','h6','header','li','main','nav','ol','p',
        'pre','table','tfoot','ul'
    ]
    //console.log('first', target.childNodes)
    notFlatItIndicator.push('hololink-highlight')
    notFlatItIndicator.push('memex-highlight')
    
    if (target.childNodes.length > 0){
        //console.log('have_childs')
        var flatIt = true;
        for (var n = 0; n < target.childNodes.length; n ++) {
            var child = target.childNodes[n];
            // cleanup comment node and empty text node
            if (child.nodeType === 8 || (child.nodeType === 3 && !/\S/.test(child.nodeValue))) {
                //console.log('empty or comment',child)
                target.removeChild(child);
                n --;
            } else if(child.nodeType === 1) {
                if (notFlatItIndicator.indexOf(child.tagName.toLowerCase()) >= 0){
                    //console.log(child)
                    flatIt = false
                } else if (child.tagName.toLowerCase() === 'div' || 'section'){
                    if (child.innerHTML === ''){
                        target.removeChild(child);
                        n --;
                    } else {
                        //console.log('recursive', child)
                        restructureToFlatContainer(child);
                    }
                }
            } else if (child.nodeType === 3 && /\S/.test(child.nodeValue)){
                //console.log('text',child)
                flatIt = false
            }
        }
        if (flatIt == true){
            //console.log('letflat', target)
            unWrapElement(target)
        }
    }
};
// 呼叫上述 function 並且將資料丟回去
chrome.runtime.sendMessage({action: "gotText",source: findContentContainer()}, function(){
    console.log('begin text clipping process');
})

