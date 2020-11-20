

var hololink_toolbar_container = document.createElement('div');
hololink_toolbar_container.setAttribute('class', 'hololink-toolbar-container');
document.body.appendChild(hololink_toolbar_container);

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

hololink_toolbar_container.appendChild(highlight_button);
hololink_toolbar_container.appendChild(annotate_button);

$('.hololink-toolbar-button').on("click", function(e){

})



console.log('selection sanity check')


// Lets listen to mouseup DOM events.
document.addEventListener('mouseup', function (e) {
    var selection = window.getSelection().toString();
    var position = calaculate_tooltip_position()
    if (selection.length > 0) {
      render_tooltip(position.x, position.y, selection);
    }
    $('.hololink-toolbar-button').tooltip({
        template: '<div class="hololink-toolbar-tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
        html: true
    })
    console.log(position)
}, false);

// Close the bubble when we click on the screen.
document.addEventListener('mousedown', function (e) {
    hololink_toolbar_container.style.visibility = 'hidden';
}, false);

// Move that bubble to the appropriate location.
function render_tooltip(x, y, selection) {
    //hololink_toolbar_container.innerHTML = 'sdsss';
    hololink_toolbar_container.style.left = x + 'px';
    hololink_toolbar_container.style.top = y + 'px';
    hololink_toolbar_container.style.visibility = 'visible';
}

function calaculate_tooltip_position(){
    const range = document.getSelection().getRangeAt(0);
    const boundingRect = range.getBoundingClientRect();
    const x = boundingRect.left + boundingRect.width / 2 - 50;
    const y = window.pageYOffset + boundingRect.top + boundingRect.height + 10;
    return {x:x, y:y} 
}