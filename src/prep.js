
// current task: show highlight on hololink page
// TODO: make highlight listener correct
// TODO: yahoo news, toolbar css get override


var csrf_token
var session_id
var shadow
var lock_sidebar = false
var highlight = []
var hololink_have_this_article = true
var current_user = ''
var sidebar_update_highlight = false
var target_hololink_host = "http://127.0.0.1:8000/"
var sidebar_highlight_content = ''
var page_got_highlighted_when_created = false
var content_script_status = 'loading'
var current_page_url = window.location.href;
var current_page_title = document.title; // this will change sometimes, like stratechery. So we send this info via background script.

var hololink_toolbar_container = document.createElement('div');
hololink_toolbar_container.setAttribute('class', 'hololink-toolbar-container');
document.body.appendChild(hololink_toolbar_container);

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

// setup toolbar spinner
var hololink_toolbar_inner_with_spinner = document.createElement('div');
hololink_toolbar_inner_with_spinner.setAttribute('class', 'hololink-toolbar-inner-with-spinner');

// we use loading animation from here
// https://loading.io/css/
hololink_toolbar_inner_with_spinner.innerHTML = "<div class='lds-ellipsis'><div></div><div></div><div></div><div></div></div>"


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



function render_toolbar(){
    const selection = document.getSelection && document.getSelection();
    var position = calaculate_tooltip_position()

    if (selection.toString().length > 0 && !$('.hololink-toolbar-inner').length) {
        if (content_script_status == 'complete'){
            position_toolbar(position.x, position.y);
            hololink_toolbar_container.appendChild(hololink_toolbar_inner);
            $('#hololink_toolbar_highlight').on('click', function(){

                var highlight = render_highlight(selection);
                assemble_sidebar_highlight_content(highlight)

                var hololink_sidebar = find_element_in_sidebar_shadow_root('.highlight-annotation-container')
                
                // when sidebar open, we have to insert the highlight content into sidebar right away 
                if (hololink_sidebar.length){
                    hololink_sidebar.html(sidebar_highlight_content)
                }

                //close hololink-toolbar bubble
                if ($('.hololink-toolbar-inner').length){
                    $('.hololink-toolbar-container').find('.hololink-toolbar-inner').remove();
                }
                
                // Force tooltip to close after user clicked toolbar button
                $('.hololink-toolbar-tooltip').remove()
            });

            
            $('#hololink_toolbar_annotate').on('click', function(){
                render_annotation();
            });
        } else if (content_script_status == 'loading') {
            position_toolbar(position.x, position.y);
            hololink_toolbar_container.appendChild(hololink_toolbar_inner_with_spinner);
        }
        
    }
    $('.hololink-toolbar-button').tooltip({
        template: '<div class="hololink-toolbar-tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
        trigger : 'hover',
        html: true,
    });
};



function render_annotation(){

};

function render_highlight(selection){
    //console.log('sss', selection.anchorNode, selection.getRangeAt(0).commonAncestorContainer.innerText)

    if (!selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        var datetime = Date.now();
        
        console.log(range)
        var serialized_range_object = serialize(range)

        // get selection text and insert it in sidebar, we need to access all necessary selection data before
        // we highlight it
        var highlight_text = getSelectionText(selection)

        highlight_id_on_page = generate_url(datetime, current_page_url)
        const removeHighlights = highlightRange(range, 'hololink-highlight', { class: 'hololink-highlight', "data-annotation":highlight_id_on_page});




        console.log(removeHighlights)

        // TODO: find a solution to insert custom element but not affect the DOM tree

        var data = {
            "id_on_page": highlight_id_on_page,
            "text": highlight_text,
            "page_url": current_page_url,
            "page_title": current_page_title,
            "comment":'',
            "range_object":serialized_range_object
        };

        highlight.push(data);
        sidebar_update_highlight = true
        console.log(data)
        post_highligh_to_hololink(data)

        //clean selection
        if (window.getSelection) {
            if (window.getSelection().empty) {  
                window.getSelection().empty();
            }
        }
    }
    return data
};

// this function can get the user selected text including in textarea
function getSelectionText(selection) {
    var text = "";
    var active_element = document.activeElement;
    var active_element_tag_name = active_element ? active_element.tagName.toLowerCase() : null;
    if (active_element_tag_name == "textarea") {
        text = active_element.value.slice(active_element.selectionStart, active_element.selectionEnd);
    } else if (selection) {
        text = selection.toString()
    }
    return text;
}


function post_highligh_to_hololink(highlight){
    // if hololink doesn't have this article, we have to post this article to hololink first
    // with recommendation set to default
    if (hololink_have_this_article == false){
        var page_text = findContentContainer()
        var userSelectedProjectsId = []
        fullData = {
            query: "postData",
            targetPageText: page_text,
            hololinkUrl: target_hololink_host+"api/articles/",
            targetPageUrl: current_page_url,
            targetPageTitle: current_page_title,
            userSelectedProjects: userSelectedProjectsId,
            recommendation: false
        }

        chrome.runtime.sendMessage({action: "DataReadyForPost",data: fullData}, function(response){
            console.log('begin text clipping process', response);
            if (response.message == "mission_complete"){
                chrome.runtime.sendMessage({action:'post_highlight', data:highlight});
            }
        }); 
    } else {
        chrome.runtime.sendMessage({action:'post_highlight', data:highlight});
    }
    
};

function generate_url(target_id){
    return `${current_user}-${target_id}`
}

// Move that bubble to the appropriate location.
function position_toolbar(x, y) {
    if (content_script_status == 'complete'){
        hololink_toolbar_inner.style.left = x + 'px';
        hololink_toolbar_inner.style.top = y + 'px';
    } else {
        hololink_toolbar_inner_with_spinner.style.left = x + 'px';
        hololink_toolbar_inner_with_spinner.style.top = y + 'px';
    }
    
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

function assemble_sidebar_highlight_content(highlight_target){
    // restore highlight from hololink data
    var highlight_content = `
        <div style="padding: 0 20px 20px 20px;">
            <div class="card highlight-annotation" style="border-radius: 5px; padding: 20px; cursor: pointer;" id="${highlight_target.id_on_page}">
                <div class="row highlight-information-container d-flex" style="margin-bottom: 10px;">
                    <div class="col d-flex" style="margin: auto auto auto 0 ;">
                        <div class="highlight-user">
                            ${highlight_target.highlighted_by_username}
                        </div>
                    </div>
                    <div class="col d-flex">
                        <div class="highlight-time" style="margin: auto 0 auto auto;">
                            2020/11/26
                        </div>
                    </div>
                </div>
                <div class="row d-flex">
                    <div class="card shadow-sm highlight-content flex-grow-1">
                        <div class="row">
                            <div>
                                ${highlight_target.text}
                            </div>
                        </div>
                        <div class="row d-flex" style="margin-top: 10px;">
                            <button class="delete-hololink-highlight" id="delete_hololink_highlight_${highlight_target.id_on_page}" style="right:0"><img class="delete-hololink-highlight-img"></button>
                        </div>
                    </div>  
                </div>
            </div>
        </div>
    `
    sidebar_highlight_content = sidebar_highlight_content + highlight_content
    //console.log(sidebar_highlight_content)
}

function find_element_in_sidebar_shadow_root(element){
    shadow = $('.hololink-sidebar-container')[0].shadowRoot
    target_element = $(shadow).find(`${element}`);
    return target_element
}


function deserialize_range_object_and_highlight(highlight){
    if (page_got_highlighted_when_created == false){
        var restore_range_object = deserialize(highlight.range_object)
        const removeHighlights = highlightRange(restore_range_object, 'hololink-highlight', { class: 'hololink-highlight', id:highlight.id_on_page});
    }
}

//'open' mode to access shadow dom elements from outisde the shadow root.
const hololink_sidebar_container = document.createElement('div');
hololink_sidebar_container.setAttribute('class', 'hololink-sidebar-container')
document.body.appendChild(hololink_sidebar_container);

const shadowRoot = hololink_sidebar_container.attachShadow({mode: 'open'});
//const hololink_sidebar_inner = document.createElement('div');
//hololink_sidebar_inner.setAttribute('class', 'hololink-sidebar-inner')
//shadowRoot.appendChild(hololink_sidebar_inner)


// callback for ensure_content_script_is_runnung
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if(request.ping) { 
        console.log('ensured')
        sendResponse({pong: true}); 
        return true; 
    }
});
// Close the hololink-toolbar amd sidebar when we click on the screen.
$(window).on('mousedown', function(e){
    // check if click event occured inside the hololink-toolbar-container
    var target_array = Array.from(e.target.classList)
    const check_click_exist_target_class_for_toolbar = target_array.some( r => ['hololink-toolbar-button-img', 'hololink-toolbar-button', 'hololink-toolbar-inner', 'hololink-toolbar-inner-with-spinner'].indexOf(r) >= 0 )
    const check_click_exist_target_class_for_sidebar = target_array.some( r => ['hololink-sidebar-container', 'hololink-highlight'].indexOf(r) >= 0 )

    if ($('.hololink-toolbar-inner').length ){
        if (!check_click_exist_target_class_for_toolbar){
            $('.hololink-toolbar-container').find('.hololink-toolbar-inner').remove();
        }
    } else if ($('.hololink-toolbar-inner-with-spinner').length) {
        $('.hololink-toolbar-container').find('.hololink-toolbar-inner-with-spinner').remove();
    }

    // Close sidebar if user's click event triggered outside the sidebar.
    var shadow = $('.hololink-sidebar-container')[0].shadowRoot
    var hololink_sidebar = $(shadow).find('.hololink-sidebar')

    if (hololink_sidebar.length){
        if (!check_click_exist_target_class_for_sidebar){
            if (lock_sidebar == false){
                hololink_sidebar.remove();
            }
        }
    } 
});

async function open_sidebar(){
    // In order to make this async function much simpler, we use sync ajax instead of $.get(url, function(){})
    jQuery.ajax({
        url: chrome.extension.getURL("hololink-sidebar.html"),
        success: function(data) {
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

            $(shadow).find('#close_hololink_sidebar').on('click', function(){
                $(shadow).find('.hololink-sidebar').remove();
            });
            
            var highlight_annotation_container = $(shadow).find('.highlight-annotation-container')
            highlight_annotation_container.html(sidebar_highlight_content)

            trashcan_img_path = chrome.extension.getURL("img/trashcan.svg")
            var delere_highlight_img = $(shadow).find('.delete-hololink-highlight-img');
            delere_highlight_img.attr('width', 20)
            delere_highlight_img.attr('height', 20)
            delere_highlight_img.attr('src', `${trashcan_img_path}`)

            // when user click highlight in sidebar, focus highlight text in main document 
            $(shadow).find('.highlight-annotation, .highlight-user, .highlight-time, .highlight-content').on('click', function(e){
                if (!e.target.id){
                    e.target.id = $(this).closest('.highlight-annotation').attr('id')
                    console.log(e.target.id )
                }

                var target_element = $(`hololink-highlight[id=${e.target.id}]`)
                var target_element_offset = get_better_offect(true, target_element) - ($(window).height() - target_element.outerHeight(true))/2

                
                window.scrollTo({
                    top:target_element_offset, 
                    behavior:'smooth'
                });


                // remove all hovered element
                $('.hololink-highlight').removeClass('hovered')
                $(shadow).find('.highlight-annotation').removeClass('hovered')

                target_element.toggleClass('hovered')

            }); 

        },
        async:false
    });
};

function scoll_to_highlight_and_forcus_at_sidebar(element){
    var shadow = $('.hololink-sidebar-container')[0].shadowRoot;
    var target_element = $(shadow).find(`#${element.target.id}`);
    var target_window = $(shadow).find('.highlight-annotation-container');
    var target_element_offset = get_better_offect(true, target_element, target_window);
    target_window.animate({
        scrollTop: target_element_offset
    }, 500);
    
    // remove all hovered element
    $(shadow).find('.highlight-annotation').removeClass('hovered')
    $('.hololink-highlight').removeClass('hovered')

    //target_element.focus();
    target_element.toggleClass('hovered')
    // because we highlight a selection with one id, in order to avoid some error, 
    // we have to specific attribute and class
    $(`hololink-highlight[id=${element.target.id}]`).toggleClass('hovered')

    console.log('dd',$(`hololink-highlight[id=${element.target.id}]`))

}

/**
 * Listener 
 * 1. content_script_change_status - when tabs updated, this will be fired
 * 2. open_sidebar - when user push open sidebar button 
 * 3. mouseup event - to render hololink toolbar
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if(request.action == 'content_script_change_status'){

        content_script_status = 'loading'

        if (request.message == 'hololink_doesnt_have_this_article'){
            console.log(request)
            hololink_have_this_article = false
        } else {
            highlight = request.highlight
        }
        current_user = request.user;
        csrf_token = request.csrf_token;
        session_id = request.session_id;
        current_page_title = request.current_page_title
        current_page_url = request.current_page_url

        sidebar_highlight_content = ''
        // restore highlight when page is created
        for (var i=0; i<highlight.length; i++){        
            console.log(highlight.length)
            assemble_sidebar_highlight_content(highlight[i])
            deserialize_range_object_and_highlight(highlight[i]);            
        }

        // add click listener to activate sidebar when user click highlight
        $('.hololink-highlight').on('click', function(e){
            console.log('ff')
            shadow = $('.hololink-sidebar-container')[0].shadowRoot
            var hololink_sidebar = $(shadow).find('.hololink-sidebar')
            if(!hololink_sidebar.length){
                open_sidebar()
                    .then(scoll_to_highlight_and_forcus_at_sidebar(e))
            } else {
                scoll_to_highlight_and_forcus_at_sidebar(e)
            }
            
        })

        console.log(highlight)

        page_got_highlighted_when_created = true;
        content_script_status = 'complete'
        console.log(content_script_status, current_page_title)

        if ($('.hololink-toolbar-inner-with-spinner').length) {
            $('.hololink-toolbar-container').find('.hololink-toolbar-inner-with-spinner').remove();
            render_toolbar()
        }

    }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if (request.action == 'open_sidebar'){
        open_sidebar()
            .then(sendResponse({message:"successfully open sidebar"}))   
            .then(console.log)
    }
    return true
});

document.addEventListener('mouseup', function (e) {
    render_toolbar();
}, false);

/*
function: betterOffset
ref: https://stackoverflow.com/a/46677056/14058520
hint: Allows you to calculate dynamic and static offset whether they are in a div container with overscroll or not.

            name:           type:               option:         notes:
@param      s (static)      boolean             required        default: true | set false for dynamic
@param      e (element)     string or object    required
@param      v (viewer)      string or object    optional        If you leave this out, it will use $(window) by default. What I am calling the 'viewer' is the thing that scrolls (i.e. The element with "overflow-y:scroll;" style.).

@return                  numeric
*/
function get_better_offect(s, e, v) {
    // Set Defaults
    s = (typeof s == 'boolean') ? s : true;
    e = (typeof e == 'object') ? e : $(e);
    if (v != undefined) {v = (typeof v == 'object') ? v : $(v);} else {v = false;}

    // Set Variables
    var w = $(window),              // window object
        wp = w.scrollTop(),         // window position
        eo = e.offset().top;        // element offset
    if (v) {
        var vo = v.offset().top,    // viewer offset
            vp = v.scrollTop();     // viewer position
    }

    // Calculate
    if (s) {
        return (v) ? (eo - vo) + vp : eo;
    } else {
        return (v) ? eo - vo : eo - wp;
    }
}

/* 
* ----------------------------------------------------------------------------------------------------------------
* Need to refactor to module later
* Treora / dom-highlight-range
* https://github.com/Treora/dom-highlight-range
* ----------------------------------------------------------------------------------------------------------------
*/


function highlightRange(range, tagName, attributes = {}) {
    // Ignore range if empty.
    if (range.collapsed){
        return;
    }

    console.log('original', range)

    temp_range_object = serialize(range)

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

    return removeHighlights

    /*
     * TODO: need to find a solution that will recover range object after we changed the DOM
     * The method we use right now can only work on some webs (we can't use this mehtod on daudo)
     */
   
    // range object get messed up by our DOM changes, we have to restore it.
    // this will help us find target new highlight node 
    // temp_range_object.start.selector = temp_range_object.start.selector + " > hololink-highlight"
    // temp_range_object.end.selector = temp_range_object.end.selector + " > hololink-highlight"
    // var startNode = find(temp_range_object.start)
    // var endNode = find(temp_range_object.end)

    // console.log(temp_range_object, startNode, endNode)

    // range.setStart(startNode);
    // range.setEnd(endNode);
    
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

    // Ensure this isn't being called multiple times and creating multiple nested highlights
    if (node.parentNode.nodeName.toLocaleLowerCase() == tagName){
        throw new Error('Prevent create nested highlight');
    }

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

/*
 * ----------------------------------------------------------------------------------------------------------------
 * Using tildeio / range-serializer
 * https://github.com/tildeio/range-serializer
 * ----------------------------------------------------------------------------------------------------------------
 */

function serialize(range) {
    var start = generate(range.startContainer);
    start.offset = range.startOffset;
    var end = generate(range.endContainer);
    end.offset = range.endOffset;

    return {start: start, end: end};
}

function deserialize(result) {
    var range = document.createRange(),
        startNode = find(result.start),
        endNode = find(result.end);

    range.setStart(startNode, result.start.offset);
    range.setEnd(endNode, result.end.offset);
    
    return range;
}

function generate(node) {
    var textNodeIndex = childNodeIndexOf(node.parentNode, node),
        currentNode = node,
        tagNames = [];

    while (currentNode) {
        var tagName = currentNode.tagName;

        if (tagName) {
            var nthIndex = computedNthIndex(currentNode);
            var selector = tagName;

            if (nthIndex > 1) {
                selector += ":nth-of-type(" + nthIndex + ")";
            }

            tagNames.push(selector);
        }

        currentNode = currentNode.parentNode;
    }

    return {selector: tagNames.reverse().join(" > ").toLowerCase(), childNodeIndex: textNodeIndex};
}

function childNodeIndexOf(parentNode, childNode) {
    var childNodes = parentNode.childNodes;
    for (var i = 0, l = childNodes.length; i < l; i++) {
        if (childNodes[i] === childNode) { return i; }
    }
}

function computedNthIndex(childElement) {
    var childNodes = childElement.parentNode.childNodes,
        tagName = childElement.tagName,
        elementsWithSameTag = 0;

    for (var i = 0, l = childNodes.length; i < l; i++) {
        if (childNodes[i] === childElement) { return elementsWithSameTag + 1; }
        if (childNodes[i].tagName === tagName) { elementsWithSameTag++; }
    }
}

function find(result) {
    var element = document.querySelector(result.selector);
    if (!element) { throw new Error('Unable to find element with selector: ' + result.selector); }
    return element.childNodes[result.childNodeIndex];
}

/**
 * getHtml.js
 */

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
    var clone_selectedContainer = selectedContainer.cloneNode(true);

    var deleteObjects =  clone_selectedContainer.querySelectorAll("[data-simple-delete]");
    //這裡反而不能用下面那種 While 的寫法，不然會出現 parentNode = null 的狀況，因為取回的結構有些不太一樣
    //<p id="weather_text" data-simple-delete="true">臺北市  25-32  ℃</p> 

    for (var i = 0, max = deleteObjects.length; i < max; i++) {
        console.log(deleteObjects[i]);
        deleteObjects[i].parentNode.removeChild(deleteObjects[i]);
    };
    


    // Contribute https://stackoverflow.com/a/14003661
    // 有些網頁會把 script 寫進 innerhtml。另外這裡如果用 for 迴圈來寫，因為getElementsByTagName拿回來的是 Nodelist 而不是 Array 
    // 所以每當你移除其中的一個元素時 Nodelist 都會更新，而原有的元素會擠進 [0] 導致你再也取不到它

    var deleteScripts = clone_selectedContainer.getElementsByTagName('script');

    while(deleteScripts[0]){
        console.log(deleteScripts[0]);
        deleteScripts[0].parentNode.removeChild(deleteScripts[0]);
    }

    //刪除圖片
    var deleteImages = clone_selectedContainer.getElementsByTagName('img');

    while(deleteImages[0]){
        deleteImages[0].parentNode.removeChild(deleteImages[0]);
    }

    //刪除影片
    var deleteVideos = clone_selectedContainer.getElementsByTagName('video');

    while(deleteVideos[0]){
        deleteVideos[0].parentNode.removeChild(deleteVideos[0]);
    }
    
    //有些網頁會在 body 裡放置 dynamic css 
    var deletestylesheet = clone_selectedContainer.getElementsByTagName('style');

    while(deletestylesheet[0]){
        console.log(deletestylesheet[0]);
        deletestylesheet[0].parentNode.removeChild(deletestylesheet[0]);
    }
    
    var data = clone_selectedContainer.innerText
    
    data = data.replace(/(\r\n|\n|\r)/gm, "");

    return data;
}
