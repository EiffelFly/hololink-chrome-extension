
// current task: show highlightsDataArray on hololink page
// TODO: yahoo news, toolbar css get override
// TODO: if user select and mis-disselect range then immediately click highlight button, it will cause error
// TODO: make django highlight created_at be the exact same time as we create ID
// TODO: if sidebar is open, how to dynamically insert new highlight


var csrf_token
var session_id
var shadow
var lock_sidebar = false
var highlightsDataArray = []
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
var highlight_img_path = chrome.runtime.getURL("img/highlighter.svg");
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
var annotate_img_path = chrome.runtime.getURL("img/chat.svg");
annotate_img.setAttribute('src', annotate_img_path);
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

                // Sort highlights data according to range-startContainer offsetTop and characterOffset
                var highlight = render_highlight(selection);
                highlightsDataArray.push(highlight);
                sortHighlighsDataArray()
                console.log('highlightsDataArray',highlightsDataArray)
                sidebar_highlight_content = ''
                for (i=0; i<highlightsDataArray.length; i++){
                    assemble_sidebar_highlight_content(highlightsDataArray[i], type="highlight")
                }
                
                var hololink_sidebar = find_element_in_sidebar_shadow_root('.hololink-annotation-container')
                
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
                var highlight = render_annotation(selection);
                highlightsDataArray.push(highlight);
                sortHighlighsDataArray()
                console.log('highlightsDataArray',highlightsDataArray)
                sidebar_highlight_content = ''
                for (i=0; i<highlightsDataArray.length; i++){
                    assemble_sidebar_highlight_content(highlightsDataArray[i], type="annotation", highlight.id_on_page)
                }
                var hololink_sidebar = find_element_in_sidebar_shadow_root('.hololink-annotation-container')
                
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

                var hololink_sidebar = $(shadow).find('.hololink-sidebar')
                if(!hololink_sidebar.length){
                    open_sidebar()
                        .then(scoll_to_highlight_and_forcus_at_sidebar(highlight.id_on_page))
                } else {
                    scoll_to_highlight_and_forcus_at_sidebar(highlight.id_on_page)
                }

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



function render_annotation(selection){
    if (!selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        var datetime = Date.now();
        var serialized_range_object = serialize(range)

        // get selection text and insert it in sidebar, we need to access all necessary selection data before
        // we highlight it
        var highlight_text = getSelectionText(selection)
        highlight_id_on_page = generate_url(datetime, current_page_url)
        const removeHighlights = highlightRange(range, 'hololink-highlight', { class: 'hololink-highlight', "data-id":highlight_id_on_page});
        const characterOffset = getCaretCharacterOffsetWithin(range.commonAncestorContainer)
        // Element in overflow container will have different offset.top behavior
        const RangeStartContainerOffsetTop = getStaticOffsetFromStaticElement(range.startContainer);

        var data = {
            "id_on_page": highlight_id_on_page,
            "text": highlight_text,
            "page_url": current_page_url,
            "page_title": current_page_title,
            "comment":'',
            "range_object":serialized_range_object,
            "anchor_point_data":{
                highlight_parent_node_text:range.commonAncestorContainer.textContent, // TODO: verify this is correct
                character_offset:characterOffset,
                range_start_container_offset_top:RangeStartContainerOffsetTop
            },
            "highlighted_by_username":current_user
        };

        $(`hololink-highlight[data-id^='${highlight_id_on_page}']`).on('click', function(e){
            shadow = $('.hololink-sidebar-container')[0].shadowRoot
            var hololink_sidebar = $(shadow).find('.hololink-sidebar')
            if(!hololink_sidebar.length){
                // while user reopen sidebar after they annotate text, we make it become highlight status, remove edit panel
                sidebar_highlight_content = ''
                for (i=0; i<highlightsDataArray.length; i++){
                    assemble_sidebar_highlight_content(highlightsDataArray[i], type="highlight")
                }
                open_sidebar()
                    .then(scoll_to_highlight_and_forcus_at_sidebar(highlight_id_on_page))
            } else {
                scoll_to_highlight_and_forcus_at_sidebar(highlight_id_on_page)
            }
        });

        post_highligh_to_hololink(data)

        return data
    }
    
};

function render_highlight(selection){
    //console.log('sss', selection.anchorNode, selection.getRangeAt(0).commonAncestorContainer.innerText)

    if (!selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        var datetime = Date.now();
        var serialized_range_object = serialize(range)

        // get selection text and insert it in sidebar, we need to access all necessary selection data before
        // we highlight it
        var highlight_text = getSelectionText(selection)
        highlight_id_on_page = generate_url(datetime, current_page_url)
        const removeHighlights = highlightRange(range, 'hololink-highlight', { class: 'hololink-highlight', "data-id":highlight_id_on_page});
        const characterOffset = getCaretCharacterOffsetWithin(range.commonAncestorContainer)

        // Element in overflow container will have different offset.top behavior
        const RangeStartContainerOffsetTop = getStaticOffsetFromStaticElement(range.startContainer);

        var data = {
            "id_on_page": highlight_id_on_page,
            "text": highlight_text,
            "page_url": current_page_url,
            "page_title": current_page_title,
            "comment":'',
            "range_object":serialized_range_object,
            "anchor_point_data":{
                highlight_parent_node_text:range.commonAncestorContainer.textContent, // TODO: verify this is correct
                character_offset:characterOffset,
                range_start_container_offset_top:RangeStartContainerOffsetTop
            },
            "highlighted_by_username":current_user
        };

        $(`hololink-highlight[data-id^='${highlight_id_on_page}']`).on('click', function(e){
            shadow = $('.hololink-sidebar-container')[0].shadowRoot
            var hololink_sidebar = $(shadow).find('.hololink-sidebar')
            if(!hololink_sidebar.length){
                open_sidebar()
                    .then(scoll_to_highlight_and_forcus_at_sidebar(highlight_id_on_page))
            } else {
                scoll_to_highlight_and_forcus_at_sidebar(highlight_id_on_page)
            }
            
        })

        sidebar_update_highlight = true
        post_highligh_to_hololink(data);

        //clean selection
        if (window.getSelection) {
            if (window.getSelection().empty) {  
                window.getSelection().empty();
            }
        }
    }
    return data
};

// offsetTop property does not actually take the “absolute” position but relative to its parent element that has a relative position.
// like blockquote's offsetTop will be inaccurate without this function
// ref: https://medium.com/@alexcambose/js-offsettop-property-is-not-great-and-here-is-why-b79842ef7582
// USAGE:
// const someElement = document.getElementById('someElementId');
// const Y = getStaticOffsetFromStaticElement(someElement);
// const X = getStaticOffsetFromStaticElement(someElement, true);

const getStaticOffsetFromStaticElement = (element, horizontal = false) => {
    if(!element) return 0;
    return getStaticOffsetFromStaticElement(element.offsetParent, horizontal) + (horizontal ? element.offsetLeft : element.offsetTop);
}
  

// [Important] necessary function for identify exact highlight words on hololink 
// We use Tim down range-position method to get the character offset of selection
// the solution is naive, need to find a way cope with line breaks. but if we keep everything as same as original
// ref: https://stackoverflow.com/questions/4811822/get-a-ranges-start-and-end-offsets-relative-to-its-parent-container
// ref: https://github.com/timdown/rangy/blob/1e55169d2e4d1d9458c2a87119addf47a8265276/src/modules/inactive/rangy-position.js

function getCaretCharacterOffsetWithin(element){
    var caretOffset = 0;
    var doc = element.ownerDocument || element.document;
    var win = doc.defaultView || doc.parentWindow;
    var sel;
    if (typeof win.getSelection != "undefined") {
        sel = win.getSelection();
        if (sel.rangeCount > 0) { //  WebKit-specific - https://stackoverflow.com/a/23699875/14058520
            var range = win.getSelection().getRangeAt(0);
            var preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            console.log('preCaretRange', preCaretRange, preCaretRange.toString(), range.toString())
            caretOffset = preCaretRange.toString().length;
        }
    } else if ( (sel = doc.selection) && sel.type != "Control") {
        var textRange = sel.createRange();
        var preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
}

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
            targetPageText: page_text.targetPageText,
            targetPageHtml: page_text.targetPageHtml,
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

function assemble_sidebar_highlight_content(highlight_target, type, annotationId){

    if (annotationId == "undefined") annotationId = 0;

    var highlightDateMilliseconds = highlight_target.id_on_page.split('-')
    highlightDateMilliseconds = highlightDateMilliseconds[highlightDateMilliseconds.length - 1 ]
    var currentDate = Date.now()

    if (currentDate-highlightDateMilliseconds <= 1000){
        var highlightDate = 'now'
    } else if (1000 < currentDate-highlightDateMilliseconds && currentDate-highlightDateMilliseconds <= 60000){
        var seconds = Math.round((currentDate-highlightDateMilliseconds)/1000)
        var highlightDate = `${seconds} seconds ago`
    } else if (60000 < currentDate-highlightDateMilliseconds && currentDate-highlightDateMilliseconds <= 3600000){
        var minutes = Math.round((currentDate-highlightDateMilliseconds)/60000)
        var highlightDate = `${minutes} minutes ago`
    } else if (3600000 < currentDate-highlightDateMilliseconds && currentDate-highlightDateMilliseconds <= 86400000){
        var hours = Math.round((currentDate-highlightDateMilliseconds)/3600000)
        var highlightDate = `${hours} hours ago`
    } else {
        var highlightDate = new Date(highlightDateMilliseconds)
        highlightDate = highlightDate.toLocaleDateString()
    }

    if (type == "highlight"){
        // restore highlight from hololink data
            var highlight_content = `
            <div style="padding: 0 20px 20px 20px;">
                <div class="card hololink-annotation" style="border-radius: 5px; padding: 20px; cursor: pointer;" data-id="${highlight_target.id_on_page}">
                    <div class="row highlight-information-container d-flex" style="margin-bottom: 5px;">
                        <div class="col d-flex" style="margin: auto auto auto 0 ;">
                            <div class="highlight-user">
                                ${highlight_target.highlighted_by_username}
                            </div>
                        </div>
                        <div class="col d-flex">
                            <div class="highlight-time" style="margin: auto 0 auto auto;">
                                ${highlightDate}
                            </div>
                        </div>
                    </div>
                    <div class="row d-flex">
                        <div class="card shadow-sm highlight-content flex-grow-1">
                            <div class="row">
                                <div class="highlight-text">
                                    ${highlight_target.text}
                                </div>
                            </div>
                            <div class="row d-flex" style="margin-top: 10px;">
                                <div class="hololink-annotation-buttons-container" style="margin-left:auto">
                                    <button class="annotate-hololink-highlight" id="annotate_hololink_highlight_${highlight_target.id_on_page}" style="right:0"><img class="annotate-hololink-highlight-img"></button>
                                    <button class="delete-hololink-highlight" id="delete_hololink_highlight_${highlight_target.id_on_page}" style="right:0"><img class="delete-hololink-highlight-img"></button>     
                                </div>
                            </div>
                        </div>  
                    </div>
                </div>
            </div>
        `
    } else if (type == "annotation") {
        if (highlight_target.id_on_page == annotationId){
            var highlight_content = `
                <div style="padding: 0 20px 20px 20px;">
                    <div class="card hololink-annotation" style="border-radius: 5px; padding: 20px; cursor: pointer;" data-id="${highlight_target.id_on_page}">
                        <div class="row highlight-information-container d-flex no-gutters" style="margin-bottom: 5px;">
                            <div class="col d-flex" style="margin: auto auto auto 0 ;">
                                <div class="highlight-user">
                                    ${highlight_target.highlighted_by_username}
                                </div>
                            </div>
                            <div class="col d-flex">
                                <div class="highlight-time" style="margin: auto 0 auto auto;">
                                    ${highlightDate}
                                </div>
                            </div>
                        </div>
                        <div class="row d-flex">
                            <div class="card shadow-sm highlight-content flex-grow-1">
                                <div class="row no-gutters">
                                    <div class="highlight-text col">
                                        ${highlight_target.text}
                                    </div>
                                </div>
                                <div class="row hightlight-annotation-text-container no-gutters" style="margin-top: 5px;">
                                    <textarea autofocus required class="hightlight-annotation-text" data-id="${highlight_target.id_on_page}" placeholder="Add annotation" rows="4" style="width:100%"></textarea>
                                </div>
                                <div class="row no-gutters d-flex hightlight-annotation-button-container"  style="margin-top: 10px;">
                                    <div class="d-flex" style="width:100%">
                                        <button class="close-annotation-edit-panel mr-auto" data-id="${highlight_target.id_on_page}">cancel</button>
                                        <button class="save-annotation ml-auto" data-id="${highlight_target.id_on_page}">save</button>  
                                    </div>
                                </div>
                                <div class="row d-flex no-gutters" style="margin-top: 10px;">
                                    <div class="hololink-annotation-buttons-container" style="margin-left:auto">
                                        <button class="annotate-hololink-highlight" id="annotate_hololink_highlight_${highlight_target.id_on_page}" style="right:0"><img class="annotate-hololink-highlight-img"></button>
                                        <button class="delete-hololink-highlight" id="delete_hololink_highlight_${highlight_target.id_on_page}" style="right:0"><img class="delete-hololink-highlight-img"></button>     
                                    </div>
                                </div>
                            </div>  
                        </div>
                    </div>
                </div>
            `
        } else {
            var highlight_content = `
                <div style="padding: 0 20px 20px 20px;">
                    <div class="card hololink-annotation" style="border-radius: 5px; padding: 20px; cursor: pointer;" data-id="${highlight_target.id_on_page}">
                        <div class="row highlight-information-container d-flex" style="margin-bottom: 5px;">
                            <div class="col d-flex" style="margin: auto auto auto 0 ;">
                                <div class="highlight-user">
                                    ${highlight_target.highlighted_by_username}
                                </div>
                            </div>
                            <div class="col d-flex">
                                <div class="highlight-time" style="margin: auto 0 auto auto;">
                                    ${highlightDate}
                                </div>
                            </div>
                        </div>
                        <div class="row d-flex">
                            <div class="card shadow-sm highlight-content flex-grow-1">
                                <div class="row">
                                    <div class="highlight-text">
                                        ${highlight_target.text}
                                    </div>
                                </div>
                                <div class="row d-flex" style="margin-top: 10px;">
                                    <div class="hololink-annotation-buttons-container" style="margin-left:auto">
                                        <button class="annotate-hololink-highlight" id="annotate_hololink_highlight_${highlight_target.id_on_page}" style="right:0"><img class="annotate-hololink-highlight-img"></button>
                                        <button class="delete-hololink-highlight" id="delete_hololink_highlight_${highlight_target.id_on_page}" style="right:0"><img class="delete-hololink-highlight-img"></button>     
                                    </div>
                                </div>
                            </div>  
                        </div>
                    </div>
                </div>
            `
        }
        
    }
    
    sidebar_highlight_content = sidebar_highlight_content + highlight_content
}

function find_element_in_sidebar_shadow_root(element){
    shadow = $('.hololink-sidebar-container')[0].shadowRoot
    target_element = $(shadow).find(`${element}`);
    return target_element
}


function deserialize_range_object_and_highlight(highlight){
    if (page_got_highlighted_when_created == false){
        var restore_range_object = deserialize(highlight.range_object)
        const removeHighlights = highlightRange(restore_range_object, 'hololink-highlight', { class: 'hololink-highlight', "data-id":highlight.id_on_page});
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
// Close the hololink-toolbar and sidebar when we click on the screen.
$(window).on('mousedown', function(e){
    // check if click event occured inside the hololink-toolbar-container or sidebar
    var target_array = Array.from(e.target.classList)
    const check_click_event_occured_inside_toolbar = target_array.some( r => ['hololink-toolbar-button-img', 'hololink-toolbar-button', 'hololink-toolbar-inner', 'hololink-toolbar-inner-with-spinner'].indexOf(r) >= 0 )
    const check_click_event_occured_inside_sidebar = target_array.some( r => ['hololink-sidebar-container', 'hololink-highlight'].indexOf(r) >= 0 )

    if ($('.hololink-toolbar-inner').length ){
        if (check_click_event_occured_inside_toolbar == false){
            $('.hololink-toolbar-container').find('.hololink-toolbar-inner').remove();
        }
    } else if ($('.hololink-toolbar-inner-with-spinner').length) {
        $('.hololink-toolbar-container').find('.hololink-toolbar-inner-with-spinner').remove();
    }

    // Close sidebar if user's click event triggered outside the sidebar.
    var shadow = $('.hololink-sidebar-container')[0].shadowRoot
    var hololink_sidebar = $(shadow).find('.hololink-sidebar')

    if (hololink_sidebar.length){
        if (check_click_event_occured_inside_sidebar == false){
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
            
            var highlight_annotation_container = $(shadow).find('.hololink-annotation-container')
            highlight_annotation_container.html(sidebar_highlight_content)

            var trashcan_img_path = chrome.extension.getURL("img/trashcan.svg")
            var delete_highlight_container = $(shadow).find('.delete-hololink-highlight-img');
            delete_highlight_container.attr('width', 20)
            delete_highlight_container.attr('height', 20)
            delete_highlight_container.attr('src', `${trashcan_img_path}`)

            var annotate_img_container = $(shadow).find('.annotate-hololink-highlight-img');
            annotate_img_container.attr('width', 20)
            annotate_img_container.attr('height', 20)
            annotate_img_container.attr('src', `${annotate_img_path}`)

            // when user click highlight in sidebar, focus highlight text in main document 
            var currentClickId = ''
            $(shadow).find('.hololink-annotation, .highlight-user, .highlight-time, .highlight-content').unbind('click'); // remove any previous click event listener
            $(shadow).find('.hololink-annotation, .highlight-user, .highlight-time, .highlight-content').on('click', function(element){
                element.stopPropagation();
                var targetDataId = element.target.getAttribute('data-id')
                if (!targetDataId){
                    targetDataId = $(this).closest('.hololink-annotation').attr('data-id')
                    console.log(targetDataId)
                } 
            
                var target_elements = $(`hololink-highlight[data-id='${targetDataId}']`)
                var target_element_offset = getOffsetFromElementInOverflowContainer(true, target_elements) - ($(window).height() - target_elements.outerHeight(true))/2
                var targetElementAtSideBar = $(shadow).find(`.hololink-annotation[data-id='${targetDataId}']`)

                window.scrollTo({
                    top:target_element_offset, 
                    behavior:'smooth'
                });

                // remove all hovered element
                $('.hololink-highlight').removeClass('hovered')
                $(shadow).find('.hololink-annotation').removeClass('hovered')

                target_elements.toggleClass('hovered')

                // remove hovered element at sidebar
                $(shadow).find('.hololink-annotation').removeClass('hovered')

                targetElementAtSideBar.toggleClass('hovered')

                // delete hololink highlight
                if (element.target.className.indexOf('delete-hololink-highlight') > -1 || element.target.className.indexOf('delete-hololink-highlight-img') > -1){
                    var highlightText = $.trim(targetElementAtSideBar.find('.highlight-text').text())
                    var data = {
                        "id_on_page":targetDataId,
                        "page_url": current_page_url,
                        "page_title": current_page_title
                    }
                    chrome.runtime.sendMessage({action:'get_specific_highlight_id_and_delete', data:data});
                    targetElementAtSideBar.parent().remove();
                    var target_elements_js = document.querySelectorAll(`hololink-highlight[data-id='${targetDataId}']`)
                    console.log(target_elements)
                    for (var i=0; i<target_elements.length; i++){
                        removeHighlight(target_elements[i])
                    }
                    for (const [key, value] of Object.entries(highlightsDataArray)) {
                        if (value.id_on_page == targetDataId){
                            highlightsDataArray.splice(key, 1)
                        }
                    }
                }

                if (element.target.className.indexOf('close-annotation-edit-panel') > -1){
                    $(shadow).find('.hightlight-annotation-text-container').remove()
                    $(shadow).find('.hightlight-annotation-button-container').remove()
                }

                if (element.target.className.indexOf('save-annotation') > -1){
                    var annotationText = $(shadow).find('.hightlight-annotation-text').val();
                    console.log('annotationText',annotationText)

                    var data = {
                        id_on_page:targetDataId,
                        page_title:current_page_title,
                        page_url:current_page_url,
                        annotationText:annotationText
                    }

                    $(shadow).find('.hightlight-annotation-text-container').remove()
                    $(shadow).find('.hightlight-annotation-button-container').remove()

                    chrome.runtime.sendMessage({action:'updateAnnotation', data:data});

                }
                console.log('clicked', element)                
            });
        },
        async:false // make quering hololink-sidebar.html become sync
    });
};

function scoll_to_highlight_and_forcus_at_sidebar(targetDataId){
    var shadow = $('.hololink-sidebar-container')[0].shadowRoot;
    
    var target_element = $(shadow).find(`[data-id='${targetDataId}']`);
    var target_window = $(shadow).find('.hololink-annotation-container');
    var target_element_offset = getOffsetFromElementInOverflowContainer(true, target_element, target_window);    
    target_window.animate({
        scrollTop: target_element_offset
    }, 500);
    
    // remove all hovered element
    $(shadow).find('.hololink-annotation').removeClass('hovered')
    $('.hololink-highlight').removeClass('hovered')

    //target_element.focus();
    target_element.toggleClass('hovered')
    // because we highlight a selection with one id, in order to avoid some error, 
    // we have to specific attribute and class
    $(`hololink-highlight[data-id=${targetDataId}]`).toggleClass('hovered')

};

function sortHighlighsDataArray(){
    highlightsDataArray = highlightsDataArray.sort(function(a,b){
        if (a.anchor_point_data.range_start_container_offset_top > b.anchor_point_data.range_start_container_offset_top){
            return 1
        } 
        if (a.anchor_point_data.range_start_container_offset_top == b.anchor_point_data.range_start_container_offset_top){
            if (a.anchor_point_data.character_offset > b.anchor_point_data.character_offset){
                return 1
            } 
            if (a.anchor_point_data.character_offset == b.anchor_point_data.character_offset){
                return 0
            }
            return -1
        }
        if (a.anchor_point_data.range_start_container_offset_top < b.anchor_point_data.range_start_container_offset_top){
            return -1
        } 

    });
    console.log(highlightsDataArray)
};


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
            highlightsDataArray = request.highlight
            console.log(highlightsDataArray)
            sortHighlighsDataArray()
        }
        current_user = request.user;
        csrf_token = request.csrf_token;
        session_id = request.session_id;
        current_page_title = request.current_page_title
        current_page_url = request.current_page_url

        sidebar_highlight_content = ''
        // restore highlight when page is created
        for (var i=0; i<highlightsDataArray.length; i++){        
            assemble_sidebar_highlight_content(highlightsDataArray[i], type="highlight")
            deserialize_range_object_and_highlight(highlightsDataArray[i]);            
        }

        // add click listener to activate sidebar when user click highlight
        $('.hololink-highlight').on('click', function(e){
            var targetDataId = e.target.getAttribute('data-id')
            shadow = $('.hololink-sidebar-container')[0].shadowRoot
            var hololink_sidebar = $(shadow).find('.hololink-sidebar')
            if(!hololink_sidebar.length){
                open_sidebar()
                    .then(scoll_to_highlight_and_forcus_at_sidebar(targetDataId))
            } else {
                scoll_to_highlight_and_forcus_at_sidebar(targetDataId)
            }
            
        })

        console.log(highlightsDataArray)

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
function getOffsetFromElementInOverflowContainer(s, e, v) {
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

    // We have messed up range object, in order to make calculation afterward be accurate, 
    // we have to restore it.

    range.setStartBefore(highlightElements[0]);
    range.setEndAfter(highlightElements[nodes.length - 1])

    return removeHighlights
    
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
        console.log(highlightElement)
        highlightElement.parentNode.replaceChild(highlightElement.firstChild, highlightElement);
    } else {
        // If the highlight somehow contains multiple nodes now, move them all.
        console.log(highlightElement)
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
    var rangeOffsetTop = range.commonAncestorContainer.parentNode.offsetTop
    return {start: start, end: end, offsetTop:rangeOffsetTop};
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
    wrapTextNodeInP(finalContainer);
    removeElementAttributesAndEmptyElement(finalContainer);
    

    var targetPageText = finalContainer.innerText;

    targetPageText = targetPageText.replace(/(\r\n|\n|\r|\t)/gm, "");
    
    var data = {
        "targetPageText":targetPageText,
        "targetPageHtml":finalContainer.innerHTML
    }

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