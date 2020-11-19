// Add bubble to the top of the page.
var hololink_tooltip_container = document.createElement('div');
hololink_tooltip_container.setAttribute('class', 'hololink-tooltip');
document.body.appendChild(hololink_tooltip_container);
console.log('selection sanity check')

// Lets listen to mouseup DOM events.
document.addEventListener('mouseup', function (e) {
    var selection = window.getSelection().toString();
    var position = calaculate_tooltip_position()
    if (selection.length > 0) {
      render_tooltip(position.x, position.y, selection);
    }
    console.log(position)
}, false);

// Close the bubble when we click on the screen.
document.addEventListener('mousedown', function (e) {
    hololink_tooltip_container.style.visibility = 'hidden';
}, false);

// Move that bubble to the appropriate location.
function render_tooltip(x, y, selection) {
    hololink_tooltip_container.innerHTML = selection;
    hololink_tooltip_container.style.left = x + 'px';
    hololink_tooltip_container.style.top = y + 'px';
    hololink_tooltip_container.style.visibility = 'visible';
}

function calaculate_tooltip_position(){
    const range = document.getSelection().getRangeAt(0);
    const boundingRect = range.getBoundingClientRect();
    const x = boundingRect.left + boundingRect.width / 2 - 50;
    const y = window.pageYOffset + boundingRect.top + boundingRect.height + 10;
    return {x:x, y:y} 
}