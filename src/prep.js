

var hololink_toolbar_container = document.createElement('div');
hololink_toolbar_container.setAttribute('class', 'hololink-toolbar-container');
document.body.appendChild(hololink_toolbar_container);

var hololink_toolbar_inner = document.createElement('div');
hololink_toolbar_inner.setAttribute('class', 'hololink-toolbar-inner');

var highlight_button = document.createElement('button');
highlight_button.setAttribute('class', 'hololink-toolbar-button');
highlight_button.setAttribute('id', 'hololink_toolbar_highlight');
highlight_button.setAttribute('data-toggle', 'tooltip');
highlight_button.setAttribute('data-placement', 'bottom');
highlight_button.setAttribute('title', 'Highlight');
var highlighte_img = document.createElement('img');
highlight_img_path = chrome.runtime.getURL("img/highlighter.svg");
highlighte_img.setAttribute('src', highlight_img_path);
highlighte_img.setAttribute('width', 20);
highlighte_img.setAttribute('height', 20);
highlight_button.appendChild(highlighte_img);

var annotate_button = document.createElement('button');
annotate_button.setAttribute('class', 'hololink-toolbar-button');
annotate_button.setAttribute('id', 'hololink_toolbar_annotate');
annotate_button.setAttribute('data-toggle', 'tooltip');
annotate_button.setAttribute('data-placement', 'bottom');
annotate_button.setAttribute('title', 'Annotate');
var annotate_img = document.createElement('img');
highlight_img_path = chrome.runtime.getURL("img/chat.svg");
annotate_img.setAttribute('src', highlight_img_path);
annotate_img.setAttribute('width', 20);
annotate_img.setAttribute('height', 20);
annotate_button.appendChild(annotate_img);

hololink_toolbar_inner.appendChild(highlight_button);
hololink_toolbar_inner.appendChild(annotate_button);

$('.hololink-toolbar-button').on("click", function(e){

})

console.log('selection sanity check')

// Lets listen to mouseup DOM events.
document.addEventListener('mouseup', function (e) {
    var selection = window.getSelection().toString();
    var position = calaculate_tooltip_position()
    if (selection.length > 0) {
      render_tooltip(position.x, position.y, selection);
      hololink_toolbar_container.appendChild(hololink_toolbar_inner)
    }
    $('.hololink-toolbar-button').tooltip({
        template: '<div class="hololink-toolbar-tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
        html: true
    })
    console.log(position)
}, false);

// Close the bubble when we click on the screen.
document.addEventListener('mousedown', function (e) {
    var toolbar_inner = document.getElementsByClassName('hololink-toolbar-inner')[0]
    if(toolbar_inner){
        toolbar_inner.parentNode.removeChild(toolbar_inner)
    }
}, false);

// Move that bubble to the appropriate location.
function render_tooltip(x, y, selection) {
    //hololink_toolbar_container.innerHTML = 'sdsss';
    hololink_toolbar_inner.style.left = x + 'px';
    hololink_toolbar_inner.style.top = y + 'px';
    //hololink_toolbar_inner.style.visibility = 'visible';
}

function calaculate_tooltip_position(){
    const range = document.getSelection().getRangeAt(0);
    const boundingRect = range.getBoundingClientRect();
    const x = boundingRect.left + boundingRect.width / 2 - 50;
    const y = window.pageYOffset + boundingRect.top + boundingRect.height + 10;
    return {x:x, y:y} 
}

//'open' mode to access shadow dom elements from outisde the shadow root.
const hololink_sidebar_container = document.createElement('div');
hololink_sidebar_container.setAttribute('class', 'hololink-sidebar-container')
document.body.appendChild(hololink_sidebar_container);

const shadowRoot = hololink_sidebar_container.attachShadow({mode: 'open'});
const hololink_sidebar_inner = document.createElement('div');
hololink_sidebar_inner.setAttribute('class', 'hololink-sidebar-inner')
shadowRoot.appendChild(hololink_sidebar_inner)

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if (request.action == 'open_sidebar'){
        console.log('receive msg')
        $.get(chrome.extension.getURL("hololink-sidebar.html"), function (data) {
            //$(data).appendTo($('.hololink-sidebar-inner'));
            var shadow = $('.hololink-sidebar-container')[0].shadowRoot
            console.log(shadow)
            var inner = $(shadow).find('.hololink-sidebar-inner');
            inner.html(data);
        });
    }
})

// callback for ensure_content_script_is_runnung
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if(request.ping) { 
        console.log('ensured')
        sendResponse({pong: true}); 
        return true; 
    }
});