// TODO: check why can't we still remove some nodes
// TODO: some website don't use p, div but font, like http://www.paulgraham.com/index.html
// TODO: if we the container have most words is outside the main div, we will get fucked! like: https://www.researchmfg.com/2020/05/different_pcb_pcba/


/**
 Contribute https://github.com/ZachSaucier/Just-Read/blob/b6b209ff566239b359b15d651b6716fb5fcf7f4d/content_script.js#L1191
 */

var target_hololink_host = "http://127.0.0.1:8000/"
var selectedTextThreshhold = 0.1
var currentPageHref = window.location.href


function findContentContainer(){

    // dynamically change selectedTextThreshhold depended on domain

    // udn-global
    if (/https?:\/\/(.+?\.)?global\.udn/.test(currentPageHref)){
        console.log('change')
        selectedTextThreshhold = 0.05
    }



    console.log(document.body)
    //countMaxNum-Method
    // flow: find MaxNum<p> -> select outer layer from MaxNum<p> until reach 40% total words-> clone selected word -> delete unneccessay element -> export
    var countTotlaWordsOnPage = document.body.innerText.length, 
        
    // 一篇網站內容中文字大多由 p 表示
    // 找找看 font。舊型網站常用
     // TODO: 需要找到更好的做法
    //如果沒有 <p> 則要找 <div><font>
    wordsContainers = document.body.querySelectorAll("p");

    if (wordsContainers.length == 0){
        wordsContainers = document.body.querySelectorAll("div, font");
    }
        
    // 接下來要找到哪個部分存了最多文字，要把這些片段挑出來挑出來

    var elementWithMostWords = []
        countHightestWord = 0;

    console.log(wordsContainers)
    
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

    
    //從最多字的 <p> 一圈一圈向外拓，直到圈起了 2/5 的總字數
    while (countSelectedWords/countTotlaWordsOnPage < selectedTextThreshhold
    && selectedContainer != document.body
    && selectedContainer.parentNode.innerText){ //這一圈裡必須要有字
        selectedContainer = selectedContainer.parentNode; //向外擴一圈
        countSelectedWords = selectedContainer.innerText.length;
        console.log(selectedContainer, countSelectedWords)
    };

    console.log('rrrr',selectedContainer)


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
        //console.log(deleteObjects[i]);
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

    //delete form
    var deleteForm = cloneSelectedContainer.getElementsByTagName('form');
    while(deleteForm[0]){
        deleteForm[0].parentNode.removeChild(deleteForm[0]);
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
        //console.log(deleteMediumNoScriptTag[0])
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
    while(deleteButton[0]){
        deleteButton[0].parentNode.removeChild(deleteButton[0]);
    }

    /**
     * Get/Store and Remove some Wikipedia element
     */

    wikiDomainRegex = /https?:\/\/(.+?\.)?wikipedia\.org/
    if (wikiDomainRegex.test(currentPageHref)){
        var selectWikiInfoBox = cloneSelectedContainer.getElementsByClassName('infobox vcard');
        var wikiInfoBox = []
        while(selectWikiInfoBox[0]){
            wikiInfoBox.push(selectWikiInfoBox[0].cloneNode(true))
            selectWikiInfoBox[0].parentNode.removeChild(selectWikiInfoBox[0]);
        }

        var deleteWikiJumpLink = cloneSelectedContainer.getElementsByClassName('mw-jump-link');
        while(deleteWikiJumpLink[0]){
            deleteWikiJumpLink[0].parentNode.removeChild(deleteWikiJumpLink[0]);
        }

        var deleteWikiEditSection = cloneSelectedContainer.getElementsByClassName('mw-editsection');
        while(deleteWikiEditSection[0]){
            deleteWikiEditSection[0].parentNode.removeChild(deleteWikiEditSection[0]);
        }

        var deleteWikiSiteNotice = cloneSelectedContainer.querySelectorAll('#siteNotice');
        for (var i = 0, max = deleteWikiSiteNotice.length; i < max; i++) {
            deleteWikiSiteNotice[i].parentNode.removeChild(deleteWikiSiteNotice[i]);
        };

        var deleteWikiCatLinks = cloneSelectedContainer.querySelectorAll('#catlinks');
        for (var i = 0, max = deleteWikiCatLinks.length; i < max; i++) {
            deleteWikiCatLinks[i].parentNode.removeChild(deleteWikiCatLinks[i]);
        };

        var deleteWikiMBox = cloneSelectedContainer.querySelectorAll('[class^="mbox-"]');
        for (var i = 0, max = deleteWikiMBox.length; i < max; i++) {
            //console.log(deleteObjects[i]);
            deleteWikiMBox[i].parentNode.removeChild(deleteWikiMBox[i]);
        };
        
        var deleteWikiNavigationBar = cloneSelectedContainer.querySelectorAll('.toc[role="navigation"]');
        for (var i = 0, max = deleteWikiNavigationBar.length; i < max; i++) {
            //console.log(deleteObjects[i]);
            deleteWikiNavigationBar[i].parentNode.removeChild(deleteWikiNavigationBar[i]);
        };

        var deleteWikiNavBox = cloneSelectedContainer.getElementsByClassName('navbox');
        while(deleteWikiNavBox[0]){
            deleteWikiNavBox[0].parentNode.removeChild(deleteWikiNavBox[0]);
        }

    }

    /**
     * Remove: udn-global and udn specific element
     */

    udnGlobalDomainRegex = /https?:\/\/(.+?\.)?global\.udn/
    if (udnGlobalDomainRegex.test(currentPageHref)){
        // remove whatsapp share button
        var deleteWhatsappShareButton = cloneSelectedContainer.getElementsByClassName('social_bar');
        while(deleteWhatsappShareButton[0]){
            deleteWhatsappShareButton[0].parentNode.removeChild(deleteWhatsappShareButton[0]);
        }

        var deleteSubscribe = cloneSelectedContainer.getElementsByClassName('area');
        while(deleteSubscribe[0]){
            deleteSubscribe[0].parentNode.removeChild(deleteSubscribe[0]);
        }

        
    }

    udnDomainRegex = /https?:\/\/(.+?\.)?udn\.com/
    if (udnDomainRegex.test(currentPageHref)){
        deleteSocialBar = cloneSelectedContainer.getElementsByClassName('social_bar');
        while(deleteSocialBar[0]){
            deleteSocialBar[0].parentNode.removeChild(deleteSocialBar[0]);
        }
        deleteShareBar = cloneSelectedContainer.getElementsByClassName('shareBar');
        while(deleteShareBar[0]){
            deleteShareBar[0].parentNode.removeChild(deleteShareBar[0]);
        }
        deleteSharePush = cloneSelectedContainer.getElementsByClassName('shareBar__info--push');
        while(deleteSharePush[0]){
            deleteSharePush[0].parentNode.removeChild(deleteSharePush[0]);
        }
        deleteTagsBox = cloneSelectedContainer.getElementsByClassName('tabsbox');
        while(deleteTagsBox[0]){
            deleteTagsBox[0].parentNode.removeChild(deleteTagsBox[0]);
        }
        var deleteStoryTags = cloneSelectedContainer.querySelectorAll('#story_tags');
        for (var i = 0, max = deleteStoryTags.length; i < max; i++) {
            deleteStoryTags[i].parentNode.removeChild(deleteStoryTags[i]);
        };
    }
    
    

    /**
     * Remove: ltn specific element
     */
    LtnDomainRegex = /https?:\/\/(.+?\.)?ltn\.com/
    if (LtnDomainRegex.test(currentPageHref)){
        var deleteLtnAppPromotion = cloneSelectedContainer.getElementsByClassName('appE1121');
        while(deleteLtnAppPromotion[0]){
            deleteLtnAppPromotion[0].parentNode.removeChild(deleteLtnAppPromotion[0]);
        }
    }
    
    /**
     * Remove: stratechery element
     */

    strateCheryDomaninRegex = /https?:\/\/(.+?\.)?stratechery\.com/
    if (strateCheryDomaninRegex.test(currentPageHref)){
        var deletePrimaryContainer = cloneSelectedContainer.getElementsByClassName('menu-primary-container');
        while(deletePrimaryContainer[0]){
            deletePrimaryContainer[0].parentNode.removeChild(deleteLtnAppPromotion[0]);
        }
        var deletePodcastLinks = cloneSelectedContainer.getElementsByClassName('podcastlinks');
        while(deletePodcastLinks[0]){
            deletePodcastLinks[0].parentNode.removeChild(deletePodcastLinks[0]);
        }
        var deleteShare = cloneSelectedContainer.getElementsByClassName('sharedaddy');
        while(deleteShare[0]){
            deleteShare[0].parentNode.removeChild(deleteShare[0]);
        }
        var deleteFootnote = cloneSelectedContainer.getElementsByClassName('bigfoot-footnote__container');
        while(deleteFootnote[0]){
            console.log(deleteFootnote)
            deleteFootnote[0].parentNode.removeChild(deleteFootnote[0]);
        }
        var deleteFootnoteLink = cloneSelectedContainer.getElementsByClassName('footnote-link');
        while(deleteFootnoteLink[0]){
            console.log(deleteFootnoteLink)
            deleteFootnoteLink[0].parentNode.removeChild(deleteFootnoteLink[0]);
        }
    }
    
    
    


    // some attribute may not be deleted
    removeAttribute(cloneSelectedContainer);
    removeElementAttributesAndEmptyElement(cloneSelectedContainer);
    restructureToFlatContainer(cloneSelectedContainer);
    removeHololinkHighlightTag(cloneSelectedContainer);

    // In case we will face some parentNode = null issue, we wrap the container first
    var finalContainer = document.createElement('div');
    finalContainer.appendChild(cloneSelectedContainer)
    console.log('fffff',finalContainer.innerHTML)
    wrapTextNodeInP(finalContainer);
    removeElementAttributesAndEmptyElement(finalContainer);
    

    var targetPageText = finalContainer.innerText;

    targetPageText = targetPageText.replace(/(\r\n|\n|\r|\t)/gm, "");
    
    var data = {
        "targetPageText":targetPageText,
        "targetPageHtml":finalContainer.innerHTML
    }
    
    console.log(finalContainer.innerHTML)

    return data;
};

function wrapTextNodeInP(target){
    var textTreeWalker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    var nodeList = []
    var currentNode = textTreeWalker.currentNode;
    while(currentNode) {
        nodeList.push(currentNode);
        currentNode = textTreeWalker.nextNode();
    }
    for (var i = 0, max = nodeList.length; i < max; i++) {
        var textNode = nodeList[i].parentNode
        if (textNode){
            if (textNode.tagName.toLowerCase() === 'div'){
                var wrapper = document.createElement('p');
                wrapper.innerHTML = textNode.innerHTML;
                if (textNode.parentNode){
                    //console.log(textNode)
                    textNode.parentNode.insertBefore(wrapper, textNode);
                    textNode.parentNode.removeChild(textNode);
                } else {
                    console.log("ERROR: we dont's have any parentNode when wrapping text node in p tag")
                }
            }
        }
    };

}

function removeAttribute(targer_container){

    // remove unnecessary attribute
    try {
        targer_container.innerHTML = targer_container.innerHTML.replace(/(id|class|onclick|ondblclick|accesskey|data|dynsrc|tabindex)="[\w- ]+"/g, "")
            .replace( /style=[ \w="-:\/\/:#;]+/ig, "" )  // style="xxxx"
            .replace( /class=[\u4e00-\u9fa5 \w="-:\/\/:#;]+"/ig, "" )  // class="xxxx"
            .replace( /label=[\u4e00-\u9fa5 \w="-:\/\/:#;]+"/ig, "" )  // label="xxxx"
            .replace( /data[-\w]*=[ \w=\-.:\/\/?!;+"]+"[ ]?/ig, "" )   // data="xxx" || data-xxx="xxx"
            .replace( /href="javascript:[\w()"]+/ig, "" )              // href="javascript:xxx"
            //.replace( /<figure[ -\w*= \w=\-.:\/\/?!;+"]*>/ig, "" ) // <figure >
            //.replace( /<\/figure>/ig, "" ) // </figure>
            //.replace( /<figcaption[ -\w*= \w=\-.:\/\/?!;+"]*>/ig, "" ) // <figcaption >
            //.replace( /<\/figcaption>/ig, "" )                         // </figcaption>
            .replace( /color=[ \w="-:\/\/:#;]+"/ig, "" )  // color="xxxx"
            .replace( /valign=[ \w="-:\/\/:#;]+"/ig, "")  // valign="xxxx"
            .replace( /align=[ \w="-:\/\/:#;]+"/ig, "")  // align="xxxx"
            .replace( /size=[ \w="-:\/\/:#;]+"/ig, "")  // size="xxxx"
            .replace( /border=[ \w="-:\/\/:#;]+"/ig, "")  // border="xxxx"
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

function removeElementAttributesAndEmptyElement(target){
    var target_elements = target.querySelectorAll("*")
    target_elements.forEach(function(element){
        if (element.childNodes.length == 0){
            //console.log(element)
            element.parentNode.removeChild(element)
        } else {
            for (i=0; i < element.attributes.length; i++ ){
                if (element.attributes[i].nodeName.toLowerCase() !== "href"){
                    //console.log(element.attributes[i].nodeName)
                    element.removeAttribute(element.attributes[i].nodeName); 
                }
            }
        }
        
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



