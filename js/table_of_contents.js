
function tocButtonClick(pageId) {
    showTocMenu(pageId);
}

function tocButtonLeave(pageId, e) {

    var button = document.getElementById(`toc-anchor-${pageId}`);
    var bounds = button.getBoundingClientRect();

    if(e.y > bounds.bottom) {
        return;
    }

    if(e.x > bounds.right || e.x < bounds.left
        || e.y < bounds.top) {
        hideTocMenu(pageId);
    }
}

function tocMenuLeave(pageId) {
    hideTocMenu(pageId);
}

function showTocMenu(pageId) {

    // Find max height.
    var maxHeight = $(`#post-header-${pageId}`).height();

    $(`#toc-div-${pageId}`).css('max-height', maxHeight);
    $(`#toc-div-${pageId}`).slideDown(200);
}

function hideTocMenu(pageId) {
    $(`#toc-div-${pageId}`).slideUp(200);
}