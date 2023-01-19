

$(document).ready(function() {

    $("h1").hover(function () {
        showAnchor($(this));
    });

    $("h1").mouseleave(function () {
        hideAnchor($(this));
    });

    
    $("h2").hover(function () {
        showAnchor($(this));
    });

    $("h2").mouseleave(function () {
        hideAnchor($(this));
    });
    
    $("h3").hover(function () {
        showAnchor($(this));
    });

    $("h3").mouseleave(function () {
        hideAnchor($(this));
    });
    
    $("h4").hover(function () {
        showAnchor($(this));
    });

    $("h4").mouseleave(function () {
        hideAnchor($(this));
    });
    
    $("h5").hover(function () {
        showAnchor($(this));
    });

    $("h5").mouseleave(function () {
        hideAnchor($(this));
    });

    setAnchorIcon($(".zola-anchor"));
});

function showAnchor(h) {
    h.children('a').show();
}

function hideAnchor(h) {
    h.children('a').hide();
}

function setAnchorIcon(a) {
    a.html('<i class="fa-solid fa-link"></i>');
}