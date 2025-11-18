// ==UserScript==
// @name         Naver2Proxer
// @namespace    dravorle.proxer.me
// @version      1.5.6
// @description  Ermöglicht es weiterhin auch lizenzierte Naver-Manga direkt in Proxer zu lesen
// @author       Dravorle
// @match        https://proxer.me/chapter/*
// @supportURL   https://proxer.me/forum/283/384751
// @updateURL    https://github.com/dravorle/Naver2Proxer/raw/master/Naver2Proxer.user.js
// @require      https://proxer.me/templates/proxer14/js/jquery-1.9.1.min.js
// @require      https://proxer.me/templates/proxer14/js/jquery-ui-1.10.3.custom.min.js
// @require      https://proxer.me/templates/proxer14/js/jquery.plugins.js?3
// @connect      webtoons.com
// @connect      webtoon-phinf.pstatic.net
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-end
// @compatible   Tampermonkey
// @compatible   Greasemonkey
// @compatible   Violentmonkey
// @compatible   FireMonkey
// @inject-into  page
// ==/UserScript==

var MaxPages, CurrPages;
var version = "v1.5.7";

if (typeof unsafeWindow === "undefined") {
  try {
    window.unsafeWindow = (function () {
      var el = document.createElement("p");
      el.setAttribute("onclick", "return window");
      return el.onclick();
    })();
  } catch (e) {
    window.unsafeWindow = window;
    console.warn(
      "[Naver2Proxer] Warnung: unsafeWindow wird nicht vollständig unterstützt. Einige Funktionen könnten eingeschränkt sein."
    );
  }
}

if (typeof GM_xmlhttpRequest !== "function") {
  alert(
    "[Naver2Proxer] GM_xmlhttpRequest wird von deinem UserScript-Manager nicht unterstützt! Das Script funktioniert nicht korrekt."
  );
}

run();

function run() {
  unsafeWindow.jQuery(".inner a.menu[data-ajax]").off("click");
  $('<meta name="referrer" content="same-origin">').appendTo("head");

  if (
    $(".inner")
      .text()
      .indexOf("Dieses Kapitel ist leider noch nicht verfügbar :/") > -1
  ) {
    console.log("[Naver2Proxer] Kein Chapter verfügbar.");
    return;
  }

  if ($("#chapter_next").attr("href").indexOf("webtoons.com") > -1) {
    console.log("[Naver2Proxer " + version + "] Offizielles Chapter entdeckt.");
    $(
      "<script> pages = []; baseurl = '" +
        getCurrentLink().split("?")[0] +
        "'; current_page = 1; serverurl = ''; nextChapter = '" +
        $("a.menu:contains('Nächstes Kapitel')").attr("href") +
        "'; </script>"
    ).appendTo("head");

    if (nextChapter === "undefined") {
      console.log("[Naver2Proxer] Letztes Chapter erreicht.");
      nextChapter = $("#simple-navi a[href]:contains('Kapitel')")
        .attr("href")
        .replace("list", "relation");
    }

    $("#chapter_next").on("click", handleNaverClick);

    unsafeWindow.jQuery(document).off("keydown");

    $(document).on("keydown", function (e) {
      var code = e.keyCode || e.which;
      if (code === 39 || code === 68) {
        handleNaverClick(e);
      }
    });

    if (location.href.indexOf("?startRead") > -1) {
      $("#chapter_next").trigger("click");
      history.pushState(null, null, baseurl);
    }
  }
}

function handleNaverClick(e) {
  e.preventDefault();

  if ($("#loading").length > 0) {
    return;
  }

  $("body").append(
    '<div id="loading" class="customBubble" style="display:inline;"></div>'
  );

  fetchImages();
}

function fetchImages() {
  try {
    GM_xmlhttpRequest({
      method: "GET",
      url: $("#chapter_next").attr("href"),
      headers: {
        referer: $("#chapter_next").attr("href"),
        origin: $("#chapter_next").attr("href"),
        "X-Requested-With": $("#chapter_next").attr("href"),
        cookie: "pagGDPR=true;rstagGDPR_DE=true;",
      },
      onload: function (response) {
        try {
          maxPages = $(response.responseText.trim()).find(
            "#_imageList img"
          ).length;
          currPages = 0;
          $(response.responseText.trim())
            .find("#_imageList img")
            .each(function (i) {
              pages.push([
                $(this).data("url"),
                $(this).attr("height"),
                $(this).attr("width"),
              ]);
            });
          buildProxerReader(get_cookie("manga_reader"));
        } catch (err) {
          showError(
            "Fehler beim Verarbeiten der Kapitelbilder: " + err.message
          );
        }
      },
      onerror: function (err) {
        showError(
          "Fehler beim Laden der Kapitelbilder: " +
            (err && err.message ? err.message : err)
        );
      },
      ontimeout: function () {
        showError("Timeout beim Laden der Kapitelbilder.");
      },
    });
  } catch (err) {
    showError("Fehler beim Starten des Requests: " + err.message);
  }
}

function buildProxerReader(style) {
  var title =
    "[Naver] <a href='" +
    baseurl +
    "'>" +
    $("table.details tr:eq(0) td:eq(1)").text() +
    "</a> (Chapter " +
    baseurl.split("/")[5] +
    ")";
  $("#main > *").remove();

  $(
    "<div id='panel'> <div id='breadcrumb'>" +
      title +
      "</div> <div id='navigation'> <span id='curPages'></span> <span id='pages'></span> <span id='allPages'></span> </div> <div id='readers' style='position:relative;float:right;margin:0 20px;font-size: 20px;'><a style='margin:5px;' class='menu" +
      (style === "slide" ? " active" : "") +
      "' data-style='slide' title='Standardreader' href='javascript:;'><i class='fa fa-arrows-h'></i></a><a style='margin:5px;' class='menu" +
      (style === "slide" ? "" : " active") +
      "' data-style='longstrip' title='Longstrip-Reader' href='javascript:;'><i class='fa fa-arrows-v'></i></a> </div> <div style='clear:both'></div> </div> <div id='reader' align='center'> <a id='readerLink' href='javascript:;'> <img id='chapterImage' /> </a </div> "
  ).appendTo("#main");
  $("#readers a.menu").on("click", setReader);

  $(
    '<link rel="stylesheet" type="text/css" href="/components/com_proxer/css/read/default.css">'
  ).appendTo("#main");

  history.pushState(null, null, window.location.href);

  $("#loading").remove();
  if (style === "slide") {
    initSlide();
  } else if (style === "longstrip") {
    initLong();
  } else {
    initSlide();
  }
}

function fetch(url, index, callback) {
  try {
    GM_xmlhttpRequest({
      method: "get",
      responseType: "blob",
      url: url,
      headers: {
        referer: url,
        origin: url,
        "X-Requested-With": url,
      },
      onload: function (response) {
        try {
          var urlCreator = window.URL || window.webkitURL;
          pages[index].push(urlCreator.createObjectURL(response.response));
          callback(index);
        } catch (err) {
          showError("Fehler beim Verarbeiten des Bildes: " + err.message);
        }
      },
      onerror: function (err) {
        showError(
          "Fehler beim Laden eines Bildes: " +
            (err && err.message ? err.message : err)
        );
      },
      ontimeout: function () {
        showError("Timeout beim Laden eines Bildes.");
      },
    });
  } catch (err) {
    showError("Fehler beim Starten des Bild-Requests: " + err.message);
  }
}

function showError(msg) {
  var $err = $("#n2p_error");
  if ($err.length === 0) {
    $("body").append(
      '<div id="n2p_error" style="position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#c00;color:#fff;padding:10px 20px;z-index:9999;border-radius:5px;font-size:16px;box-shadow:0 2px 8px #0008;">' +
        msg +
        "</div>"
    );
  } else {
    $err.text(msg).show();
  }
  setTimeout(function () {
    $("#n2p_error").fadeOut();
  }, 7000);
}

function setReader() {
  set_cookie("manga_reader", $(this).attr("data-style"), cookie_expire);

  location.href = getCurrentLink() + "startRead";
}

function initLong() {
  var $readerLink = $("#readerLink");
  var $pages = $("#pages");
  var $curPages = $("#curPages");
  var $allPages = $("#allPages");
  var $reader = $("#reader");

  $readerLink.on("click", function () {
    nextPageLong();
    return false;
  });

  $pages.html(
    '<div class="number loaded"><a href="javascript:void(0);" >' +
      pages.length +
      "</a></a>"
  );
  var list = '<ul id="listPages">';
  var images = "";
  for (var i = 0; i < pages.length; i++) {
    list +=
      '<li><a data-p="' +
      (i + 1) +
      '" href="javascript:;">Page ' +
      (i + 1) +
      "</a></li>";
    $curPages.append(
      '<div class="number number_' +
        i +
        '" style="display:none;"><a data-p="' +
        (i + 1) +
        '" href="javascript:void(0)">' +
        (i + 1) +
        "</a></div> "
    );
    images +=
      '<img style="display:block;" class="unloaded" id="chapterImage' +
      i +
      '" width="' +
      Math.min(pages[i][2], $reader.width()) +
      '" height="' +
      Math.round(
        (Math.min(pages[i][2], $reader.width()) * pages[i][1]) / pages[i][2]
      ) +
      '" />';
  }
  list += "</ul>";
  $allPages.html(list);
  $reader.html('<a href="javascript:void(0);">' + images + "</a>");

  $allPages.add($curPages).on("click", "a", function () {
    changePageLong($(this).attr("data-p"), false);
  });

  $reader.on("click", "img", function () {
    nextChap();
  });

  create_message(
    "key_suggestion",
    7000,
    "Verwende W/S bzw. Pfeil oben/unten zum scrollen.<br>" +
      "Doppelklicke auf A/D bzw. Pfeil links/rechts um das Kapitel zu wechseln.<br>" +
      "Drücke am Ende eines Kapitels D/Pfeil rechts, um das nächste Kapitel zu erreichen."
  );

  changePageLong(current_page, true);

  if (nextChapter === "/mcp?section=manga&s=updatesnew#top") {
    $("#panel").attr(
      "style",
      "position:fixed;top:42px;left:50%;width:" +
        $reader.width() -
        10 +
        "px;margin-left:-" +
        $reader.width() / 2 +
        "px;"
    );
  }

  var button_down = false;
  var button_down_code;
  jQuery(document).off("keydown");
  jQuery(document).on("keydown", function (e) {
    if (
      !button_down &&
      !jQuery("input").is(":focus") &&
      !jQuery("textarea").is(":focus") &&
      jQuery("#reader").length > 0
    ) {
      button_down = true;
      code = e.keyCode || e.which;
      var windowheight = $(window).height() - 50;
      if (e.keyCode === 37 || e.keyCode === 65) {
        if (e.timeStamp - timeStamp37 < 250 && e.timeStamp - timeStamp37 > 100)
          thisChap();
        timeStamp37 = e.timeStamp;
        $(window).scrollTo("-=" + windowheight);
        button_down = true;
        e.preventDefault();
        button_down_code = setInterval(function () {
          if (button_down) {
            $(window).scrollTo("-=" + windowheight);
          }
        }, 200);
      }
      if (e.keyCode === 39 || e.keyCode === 68) {
        if (e.timeStamp - timeStamp39 < 250 && e.timeStamp - timeStamp39 > 100)
          nextChap();
        timeStamp39 = e.timeStamp;
        $(window).scrollTo("+=" + windowheight);
        if (
          $(window).scrollTop() + $(window).height() >=
          $(document).height()
        ) {
          setTimeout(nextChap, 1500);
        }
        button_down = true;
        e.preventDefault();
        button_down_code = setInterval(function () {
          if (
            $(window).scrollTop() + $(window).height() >=
            $(document).height()
          ) {
            setTimeout(nextChap, 1500);
          }
          if (button_down) {
            $(window).scrollTo("+=" + windowheight);
          }
        }, 200);
      }

      if (code === 40 || code === 83) {
        e.preventDefault();
        button_down_code = setInterval(function () {
          if (button_down) {
            jQuery.scrollTo("+=13");
          }
        }, 20);
      }

      if (code === 38 || code === 87) {
        e.preventDefault();
        button_down_code = setInterval(function () {
          if (button_down) {
            jQuery.scrollTo("-=13");
          }
        }, 20);
      }
    }
  });
  jQuery(document).keyup(function (e) {
    button_down_code = window.clearInterval(button_down_code);
    button_down = false;
  });

  $(window).off("scroll");
  $(window).on("scroll", function (e) {
    var loop = true;
    while (loop) {
      var position = $("#chapterImage" + (current_page - 1)).position().top;
      var scrolled = $(window).scrollTop();
      var curHeight = $("#chapterImage" + (current_page - 1)).height();
      var prevHeight = 10000;
      if (current_page - 2 >= 0) {
        prevHeight = $("#chapterImage" + (current_page - 2)).height();
      }

      if (scrollable && scrolled - position >= curHeight) {
        scroll = false;
        nextPageLong();
      } else if (scrollable && position - scrolled >= prevHeight) {
        scroll = false;
        prevPageLong();
      } else {
        loop = false;
      }
    }

    if (!scrollable && counter > 1) {
      scrollable = true;
    }
    counter++;
  });

  timeStamp37 = 0;
  timeStamp39 = 0;
}

var isSpread = false;
var gt_key_tap_showed = false;
var scrollable = false;
var scroll = true;
var counter = 0;

function initSlide() {
  var $readerLink = $("#readerLink");
  var $pages = $("#pages");
  var $curPages = $("#curPages");
  var $allPages = $("#allPages");

  $readerLink.on("click", function () {
    nextPageSlide();
    return false;
  });

  $pages.html(
    '<div class="number loaded"><a href="javascript:void(0);" >' +
      pages.length +
      "</a></a>"
  );
  var list = '<ul id="listPages">';
  for (var i = 0; i < pages.length; i++) {
    list +=
      '<li><a data-p="' +
      (i + 1) +
      '" href="javascript:;">Page ' +
      (i + 1) +
      "</a></li>";
    $curPages.append(
      '<div class="number number_' +
        i +
        '" style="display:none;"><a data-p="' +
        (i + 1) +
        '" href="javascript:void(0)">' +
        (i + 1) +
        "</a></div> "
    );
  }
  list += "</ul>";
  $allPages.html(list);

  $allPages.add($curPages).on("click", "a", function () {
    changePageSlide($(this).attr("data-p"), false);
  });

  create_message(
    "key_suggestion",
    4000,
    "Verwende die Pfeiltasten oder W-A-S-D zum Navigieren."
  );

  changePageSlide(current_page, true);

  var button_down = false;
  var button_down_code;
  jQuery(document).off("keydown");
  jQuery(document).on("keydown", function (e) {
    if (
      !button_down &&
      !jQuery("input").is(":focus") &&
      !jQuery("textarea").is(":focus") &&
      jQuery("#reader").length > 0
    ) {
      button_down = true;
      code = e.keyCode || e.which;
      if (code === 37 || code === 65) {
        if (!isSpread) prevPageSlide();
        else if (
          e.timeStamp - timeStamp37 < 400 &&
          e.timeStamp - timeStamp37 > 150
        )
          prevPageSlide();
        timeStamp37 = e.timeStamp;

        button_down = true;
        e.preventDefault();
        button_down_code = setInterval(function () {
          if (button_down) {
            $("#reader").scrollTo("-=13", { axis: "x" });
          }
        }, 20);
      }
      if (code === 39 || code === 68) {
        if (!isSpread) nextPageSlide();
        else if (
          e.timeStamp - timeStamp39 < 400 &&
          e.timeStamp - timeStamp39 > 150
        )
          nextPageSlide();
        timeStamp39 = e.timeStamp;

        button_down = true;
        e.preventDefault();
        button_down_code = setInterval(function () {
          if (button_down) {
            $("#reader").scrollTo("+=13", { axis: "x" });
          }
        }, 20);
      }

      if (code === 40 || code === 83) {
        e.preventDefault();
        button_down_code = setInterval(function () {
          if (button_down) {
            $(document).scrollTo("+=13", { axis: "y" });
          }
        }, 20);
      }

      if (code === 38 || code === 87) {
        e.preventDefault();
        button_down_code = setInterval(function () {
          if (button_down) {
            $(document).scrollTo("-=13", { axis: "y" });
          }
        }, 20);
      }
    }
  });
  jQuery(document).keyup(function (e) {
    button_down_code = window.clearInterval(button_down_code);
    button_down = false;
  });

  timeStamp37 = 0;
  timeStamp39 = 0;
}

function changePageSlide(page, init) {
  if (pages.length === 0) {
    alert("Fehler beim Laden des Kapitels. Bitte aktualisiere diese Seite.");
  } else if (page > pages.length) {
    $("#wrapper").css("max-width", "");
    window.location = nextChapter + "#top";
  } else if (page > 0) {
    var p = page - 1;

    for (var i = 0; i < pages.length; i++) {
      if ($(".number_" + i).length) {
        if (i === p) {
          $(".number_" + i)
            .show()
            .addClass("current_page");
        } else {
          $(".number_" + i).removeClass("current_page");
        }
      }
    }

    current_page = page;
    if (typeof pages[p][3] !== "undefined") {
      $("#chapterImage").attr("src", phpUrldecode(pages[p][3]));
    } else {
      fetch(pages[p][0], p, function (index) {
        if (typeof pages[index][3] !== "undefined") {
          $("#chapterImage").attr("src", phpUrldecode(pages[index][3]));
        }
      });
    }
  } else {
    changePageSlide(1, false);
  }

  timeStamp37 = 0;
  timeStamp39 = 0;
}

function changePageLong(page, init) {
  if (pages.length === 0) {
    alert("Fehler beim Laden des Kapitels. Bitte aktualisiere diese Seite.");
  } else if (page > pages.length) {
    $("#wrapper").css("max-width", "");
    window.location = nextChapter + "#top";
  } else if (page > 0) {
    var p = page - 1;

    var preLoad = new Array();
    for (i = 0; i < pages.length; i++) {
      if ((i < p && i + 3 > p) || (i > p && i - 3 < p) || i === p) {
        $(".number_" + i).css("display", "");
        if (i === p) {
          $(".number_" + i).addClass("current_page");
        } else {
          $(".number_" + i).removeClass("current_page");
        }
        preLoad.push(new Array(i, phpUrldecode(pages[i][0])));
      } else {
        if (i > p && i - 6 < p) {
          preLoad.push(new Array(i, phpUrldecode(pages[i][0])));
        }
        $(".number_" + i).css("display", "none");
      }
    }

    if (scroll) {
      if (page - 1 !== 0) {
        window.scrollTo(0, $("#chapterImage" + (page - 1)).offset().top - 50);
        setTimeout(function () {
          window.scrollTo(0, $("#chapterImage" + (page - 1)).offset().top - 50);
        }, 80);
      } else {
        var amount = 0;
        var tmode = get_cookie("tmode");
        if (tmode === "ht" || tmode === "") {
          amount = 300;
        }
        window.scrollTo(0, amount);
      }
    }
    scroll = true;

    current_page = page;
    preloadLong(preLoad);
  } else {
    changePageLong(1, false);
  }
}

function thisChap() {
  $("#wrapper").css("max-width", "");
  window.location = window.location.href.split("chapter")[1] + "#top";
}

function nextChap() {
  $("#wrapper").css("max-width", "");
  window.location = "https://proxer.me" + nextChapter + "#top";
}

function nextPageLong() {
  changePageLong(+current_page + 1, false);
}

function prevPageLong() {
  changePageLong(+current_page - 1, false);
}

function preloadLong(loadPages) {
  for (var i = 0; i < loadPages.length; i++) {
    if (typeof pages[loadPages[i][0]][3] === "undefined") {
      fetch(pages[loadPages[i][0]][0], loadPages[i][0], finishPreloadLong);
    }
  }
}

function finishPreloadLong(index) {
  $(".number_" + index).addClass("loaded");

  if ($("#chapterImage" + index).hasClass("unloaded")) {
    $("#chapterImage" + index).removeClass("unloaded");
    $("#chapterImage" + index).css("opacity", "1");
    $("#chapterImage" + index).attr("src", phpUrldecode(pages[index][3]));
  }
}
