/**
 Contribute https://github.com/ZachSaucier/Just-Read/blob/b6b209ff566239b359b15d651b6716fb5fcf7f4d/content_script.js#L1191
 */

function findContentContainer(){
    //countMaxNum-Method
    //我猜如果你要用 fullext 而不是(/\S+/g)表示的有空格的字節串也可以，但是這樣可能會花太多運算資源？你只要全部統一即可（中文會不會有問題？）
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

    console.log(selectedContainer);
    
    //從最多字的 <p> 一圈一圈向外拓，直到圈起了 2/5 的總字數
    while (countSelectedWords/countTotlaWordsOnPage < 0.2
    && selectedContainer != document.body
    && selectedContainer.parentNode.innerText){ //這一圈裡必須要有字
        selectedContainer = selectedContainer.parentNode; //向外擴一圈
        countSelectedWords = selectedContainer.innerText.length;
        console.log(selectedContainer)
    };

    //如果機器找到的最後一層是 <p> 則我們要自動向外再選一層
    if (selectedContainer.tagName === "P"){
        selectedContainer = selectedContainer.parentNode;
    };

    
    var deleteObjects = selectedContainer.querySelectorAll("[data-simple-delete]");
    //這裡反而不能用下面那種 While 的寫法，不然會出現 parentNode = null 的狀況，因為取回的結構有些不太一樣
    //<p id="weather_text" data-simple-delete="true">臺北市  25-32  ℃</p> 

    for (var i = 0, max = deleteObjects.length; i < max; i++) {
        console.log(deleteObjects[i]);
        deleteObjects[i].parentNode.removeChild(deleteObjects[i]);
    };
    


    // Contribute https://stackoverflow.com/a/14003661
    // 有些網頁會把 script 寫進 innerhtml。另外這裡如果用 for 迴圈來寫，因為getElementsByTagName拿回來的是 Nodelist 而不是 Array 
    // 所以每當你移除其中的一個元素時 Nodelist 都會更新，而原有的元素會擠進 [0] 導致你再也取不到它
    /*
    <script>
        $("#checkIE").hide();
        if (isIE(6) || isIE(7) || isIE(8) || isIE(9) || isIE(10) || isIE(11)) {
            $("#checkIE").show();
        }
        $('.close').click(function () {
        $("#checkIE").hide();
        })
    </script> 
    */
    var deleteScripts = selectedContainer.getElementsByTagName('script');

    while(deleteScripts[0]){
        console.log(deleteScripts[0]);
        deleteScripts[0].parentNode.removeChild(deleteScripts[0]);
    }

    
    //有些網頁會在 innerHTML 裡放置 dynamic css 
    var deletestylesheet = selectedContainer.getElementsByTagName('style');

    while(deletestylesheet[0]){
        console.log(deletestylesheet[0]);
        deletestylesheet[0].parentNode.removeChild(deletestylesheet[0]);
    }
    return selectedContainer.innerHTML;
}


// 呼叫上述 function 並且將資料丟回去
chrome.runtime.sendMessage({action: "gotText",source: findContentContainer()}, function(){
    console.log('begin text clipping process');
})