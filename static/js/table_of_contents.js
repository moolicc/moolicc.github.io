
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
    //document.getElementById(`toc-div-${pageId}`).style.display = "block";
    $(document.getElementById(`toc-div-${pageId}`)).slideDown();
}

function hideTocMenu(pageId) {
    //document.getElementById(`toc-div-${pageId}`).style.display = "none";

    $(document.getElementById(`toc-div-${pageId}`)).slideUp(200);
}