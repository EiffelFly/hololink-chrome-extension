var shadow
var lock_sidebar = false
var highlight = []
var hololink_have_this_article = true
var current_user = ''
var sidebar_update_highlight = false

var hololink_toolbar_container = document.createElement('div');
hololink_toolbar_container.setAttribute('class', 'hololink-toolbar-container');
document.body.appendChild(hololink_toolbar_container);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if(request.action == 'content_script_change_status'){
        if (request.message == 'hololink_doesnt_have_this_article'){
            hololink_have_this_article = false
        } else {
            highlight = request.highlight
        }
        current_user = request.user;
        
    }
    console.log(hololink_have_this_article);
});

// Inject css into current page
highlight_style_href = chrome.runtime.getURL("src/highlight/highlight.css")
highlight_style_container = document.createElement('link');
highlight_style_container.setAttribute('rel', 'stylesheet')
highlight_style_container.setAttribute('type', 'text/css')
highlight_style_container.setAttribute('id', 'hololink-highlight-style');
highlight_style_container.setAttribute('href', highlight_style_href);
(document.head||document.documentElement).appendChild(highlight_style_container);

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
highlighte_img.setAttribute('class', 'hololink-toolbar-button-img');
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
annotate_img.setAttribute('class', 'hololink-toolbar-button-img');
annotate_button.appendChild(annotate_img);

hololink_toolbar_inner.appendChild(highlight_button);
hololink_toolbar_inner.appendChild(annotate_button);


console.log('selection sanity check')

// Lets listen to mouseup DOM events.
document.addEventListener('mouseup', function (e) {
    var selection = document.getSelection && document.getSelection();
    var position = calaculate_tooltip_position()
    console.log(e)
    if (selection.toString().length > 0 && !$('.hololink-toolbar-inner').length) {
        render_tooltip(position.x, position.y);
        hololink_toolbar_container.appendChild(hololink_toolbar_inner);
        console.log('inside')
        $('#hololink_toolbar_highlight').on('click', function(){
            render_highlight();

            //close hololink-toolbar bubble
            if ($('.hololink-toolbar-inner').length){
                $('.hololink-toolbar-container').find('.hololink-toolbar-inner').remove();
            }
        });

        $('#hololink_toolbar_annotate').on('click', function(){
            render_annotation();
        });
    }
    $('.hololink-toolbar-button').tooltip({
        template: '<div class="hololink-toolbar-tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
        trigger : 'hover',
        html: true,
    })
}, false);

// Close the hololink-toolbar bubble when we click on the screen.
$(window).on('mousedown', function(e){
    // check if click event occured inside the hololink-toolbar-container
    target_array = Array.from(e.target.classList)
    const check_array_exist_target_class = target_array.some( r => ['hololink-toolbar-button-img', 'hololink-toolbar-button', 'hololink-toolbar-inner'].indexOf(r) >= 0 )

    if ($('.hololink-toolbar-inner').length){
        if (!check_array_exist_target_class){
            $('.hololink-toolbar-container').find('.hololink-toolbar-inner').remove();
        }
    }
});

function render_annotation(){

};

function render_highlight(){
    var selection = document.getSelection && document.getSelection();
    //console.log('sss', selection.anchorNode, selection.getRangeAt(0).commonAncestorContainer.innerText)
    if (!selection.isCollapsed) {
        
        const range = selection.getRangeAt(0);
        var datetime = Date.now();
        var current_page_url = window.location.href;
        var current_page_title = document.title;

        highlight_id = generate_url(datetime, current_page_url)
        const removeHighlights = highlightRange(range, 'hololink-highlight', { class: 'hololink-highlight', id:highlight_id});

        //get selection text and insert it in sidebar
        var user_select_text = getSelectionText()

        var data = {
            highlight_id: highlight_id,
            user_select_text: user_selected_text,
            page_url: current_page_url,
            page_title: current_page_title,
            comment:'',
            username:current_user,
        };

        highlight_and_annotation.push(data);
        sidebar_update_highlight = true

        //clean selection
        if (window.getSelection) {
            if (window.getSelection().empty) {  
                window.getSelection().empty();
            }
        }
    }
};

// this function can get the user selected text including in textarea
function getSelectionText() {
    var text = "";
    var active_element = document.activeElement;
    var active_element_tag_name = active_element ? active_element.tagName.toLowerCase() : null;
    if (active_element_tag_name == "textarea") {
        text = active_element.value.slice(active_element.selectionStart, active_element.selectionEnd);
    } else if (window.getSelection) {
        if (window.getSelection().getRangeAt(0).commonAncestorContainer){
            text = window.getSelection().getRangeAt(0).commonAncestorContainer.innerText
        }
    }
    return text;
}




function generate_url(target_id, page_url){
    if (page_url.substr(-1) != '/'){
        return `${page_url}/#${target_id}`
    } else {
        return `${page_url}#${target_id}`
    }
}

// Move that bubble to the appropriate location.
function render_tooltip(x, y) {
    hololink_toolbar_inner.style.left = x + 'px';
    hololink_toolbar_inner.style.top = y + 'px';
}

function calaculate_tooltip_position(){
    var selection = document.getSelection && document.getSelection();
    if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const boundingRect = range.getBoundingClientRect();
        const x = boundingRect.left + boundingRect.width / 2 - 50;
        const y = window.pageYOffset + boundingRect.top + boundingRect.height + 10;
        return {x:x, y:y} 
    }
};

//'open' mode to access shadow dom elements from outisde the shadow root.
const hololink_sidebar_container = document.createElement('div');
hololink_sidebar_container.setAttribute('class', 'hololink-sidebar-container')
document.body.appendChild(hololink_sidebar_container);

const shadowRoot = hololink_sidebar_container.attachShadow({mode: 'open'});
//const hololink_sidebar_inner = document.createElement('div');
//hololink_sidebar_inner.setAttribute('class', 'hololink-sidebar-inner')
//shadowRoot.appendChild(hololink_sidebar_inner)

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if (request.action == 'open_sidebar'){
        console.log('receive msg')
        $.get(chrome.extension.getURL("hololink-sidebar.html"), function (data) {
            //$(data).appendTo($('.hololink-sidebar-inner'));
            shadow = $('.hololink-sidebar-container')[0].shadowRoot

            jquery_path = chrome.extension.getURL("src/jquery-3.5.1.min.js")

            shadow.innerHTML = `<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css" 
            integrity="sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk" crossorigin="anonymous">
            <script src=${jquery_path}></script>
            <div class="hololink-sidebar-inner"></div>`

            var inner = $(shadow).find('.hololink-sidebar-inner');
            inner.html(data);

            x_img_path = chrome.extension.getURL("img/x.svg")
            var close_sidebar_img = $(shadow).find('.close-hololink-sidebar-img');
            close_sidebar_img.attr('width', 20)
            close_sidebar_img.attr('height', 20)
            close_sidebar_img.attr('src', `${x_img_path}`)

            trashcan_img_path = chrome.extension.getURL("img/trashcan.svg")
            var delere_highlight_img = $(shadow).find('.delete-hololink-highlight-img');
            delere_highlight_img.attr('width', 20)
            delere_highlight_img.attr('height', 20)
            delere_highlight_img.attr('src', `${trashcan_img_path}`)


            $(shadow).find('#close_hololink_sidebar').on('click', function(){
                $(shadow).find('.hololink-sidebar').remove();
            });


            close_sidebar_if_user_click_outside();

        });
    }
});


// callback for ensure_content_script_is_runnung
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if(request.ping) { 
        console.log('ensured')
        sendResponse({pong: true}); 
        return true; 
    }
});

function close_sidebar_if_user_click_outside(){
    // Close sidebar if user's click event triggered outside the sidebar.

    $(window).on('click', function(e){
        if(!$(e.target).is('.hololink-sidebar-container')){
            //console.log('uee')
            if (lock_sidebar == false){
                $(shadow).find('.hololink-sidebar').remove();
            }
        }
    });
}

/* 
* Need to refactor to module later
*/


function highlightRange(range, tagName, attributes = {}) {
    // Ignore range if empty.
    if (range.collapsed){
        return;
    }
    
    // First put all nodes in an array (splits start and end nodes if needed)
    const nodes = textNodesInRange(range);
    
    // Highlight each node
    const highlightElements = [];
    for (const nodeIdx in nodes) {
        const highlightElement = wrapNodeInHighlight(nodes[nodeIdx], tagName, attributes);
        highlightElements.push(highlightElement);
    }

    // Return a function that cleans up the highlightElements.
    function removeHighlights() {
        // Remove each of the created highlightElements.
        for (const highlightIdx in highlightElements) {
            removeHighlight(highlightElements[highlightIdx]);
        }
    }
    return removeHighlights;
}

// Return an array of the text nodes in the range. Split the start and end nodes if required.
function textNodesInRange(range) {
    // If the start or end node is a text node and only partly in the range, split it.
    if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset > 0) {
        const endOffset = range.endOffset; // (this may get lost when the splitting the node)
        const createdNode = range.startContainer.splitText(range.startOffset);
        if (range.endContainer === range.startContainer) {
            // If the end was in the same container, it will now be in the newly created node.
            range.setEnd(createdNode, endOffset - range.startOffset);
        }
        range.setStart(createdNode, 0);
    }
    if (
        range.endContainer.nodeType === Node.TEXT_NODE
        && range.endOffset < range.endContainer.length
    ) {
        range.endContainer.splitText(range.endOffset);
    }
  
    // Collect the text nodes.
    const walker = range.startContainer.ownerDocument.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_TEXT,
        node => range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    );
    walker.currentNode = range.startContainer;

    // // Optimise by skipping nodes that are explicitly outside the range.
    // const NodeTypesWithCharacterOffset = [
    //  Node.TEXT_NODE,
    //  Node.PROCESSING_INSTRUCTION_NODE,
    //  Node.COMMENT_NODE,
    // ];
    // if (!NodeTypesWithCharacterOffset.includes(range.startContainer.nodeType)) {
    //   if (range.startOffset < range.startContainer.childNodes.length) {
    //     walker.currentNode = range.startContainer.childNodes[range.startOffset];
    //   } else {
    //     walker.nextSibling(); // TODO verify this is correct.
    //   }
    // }

    const nodes = [];
    if (walker.currentNode.nodeType === Node.TEXT_NODE)
        nodes.push(walker.currentNode);
    while (walker.nextNode() && range.comparePoint(walker.currentNode, 0) !== 1)
        nodes.push(walker.currentNode);
    return nodes;
}

// Replace [node] with <tagName ...attributes>[node]</tagName>
function wrapNodeInHighlight(node, tagName, attributes) {
    const highlightElement = node.ownerDocument.createElement(tagName);
    Object.keys(attributes).forEach(key => {
        highlightElement.setAttribute(key, attributes[key]);
    });
    const tempRange = node.ownerDocument.createRange();
    tempRange.selectNode(node);
    tempRange.surroundContents(highlightElement);
    return highlightElement;
}

// Remove a highlight element created with wrapNodeInHighlight.
function removeHighlight(highlightElement) {
    if (highlightElement.childNodes.length === 1) {
        highlightElement.parentNode.replaceChild(highlightElement.firstChild, highlightElement);
    } else {
        // If the highlight somehow contains multiple nodes now, move them all.
        while (highlightElement.firstChild) {
            highlightElement.parentNode.insertBefore(highlightElement.firstChild, highlightElement);
        }
        highlightElement.remove();
    }
}