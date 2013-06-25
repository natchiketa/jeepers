/**
 * @license
 * Jeepers <http://github.com/natchiketa/jeepers>
 * Copyright 2013 Sal Lara <http://natchiketa.com/>
 * Available under MIT license <http://rawgithub.com/natchiketa/jeepers/master/LICENSE.txt>
 */
;(function(window) {

    var COLUMNS = 20;

    var TILES_PER_COLUMN = 7;

    var VELOCITY = 0;

    var VELOCITY_FACTOR = 0.02;

    var MAX_VELOCITY = 10;
    var MIN_VELOCITY = MAX_VELOCITY * -1;

    var SPIN_PEAK_VELOCITY = 0;

    var VELOCITY_DECAY_AMT = 0.9;

    var SELECTIONS = [];

    var _MESSAGE = '';

    var _SPINNING = false;

    var _LAST_SPIN_POS;

    var _CURRENT_WORD_VALID = true;

    /**
     * Retrieves variables shamelessly stored in the CSS properties of an
     * invisible, off-canvas element, `#creeper`, which have been generated
     * in Sass mixins by media queries.
     *
     * @private
     * @returns {Number} The parsed value of the property. Disgusting, really.
     *
     */
    function cProp(propName) {
        return parseInt($('#creeper').css(propName))
    }

    /**
     * Exposes the properties collected by `cProp` in an object wrapper.
     *
     * @static
     * @memberOf Jeepers
     * @returns {Object} An object describing the stage properties retrieved.
     */
    function creeper() {
        return {
            stageSize: cProp('top'),
            stageRadius: cProp('margin-right'),
            numberOfColumns: cProp('margin-top')
        }
    }

    /**
     * Iterates through all of the column elements in `#stage` and sets their
     * transforms. The `zDepth` is calculated using `Moderizr.mq` to provide a value
     * consistent with the size calculated by the media query in the CSS. The
     * `rotateY` is calculated based on, first, the numbering of the column, then by
     * the current value of the `'data-spin' attribute of `#stage`.
     *
     * @static
     * @memberOf Jeepers
     * @returns {Boolean} Returns true.
     */
    function refreshColumns() {
        var $msg = $('#msg')
            , zDepth = creeper().stageRadius
            , spin = parseInt($stage().attr('data-spin'));
        VELOCITY = Math.min(VELOCITY * VELOCITY_DECAY_AMT, MAX_VELOCITY);
        VELOCITY = Math.max(VELOCITY, MIN_VELOCITY);
        spin = spin + VELOCITY;
        $stage()
            .toggleClass('jprs_selection_not_word', !_CURRENT_WORD_VALID)
            .attr('data-spin', spin);
        $('.jprs_tile_col').each(function () {
            var angle = ((360 / COLUMNS) * parseInt($(this).attr('data-colnum'))) + spin;
            $(this).css({
                webkitTransform: 'rotateY(' + angle + 'deg) translateZ(' + zDepth + 'px)'
            });
        });
        if ($msg.text() != _MESSAGE && _MESSAGE != '') {
            $msg.text(_MESSAGE)
        }

        return true;
    }

    function tileAtRowCol(columnNumber, tileIndex) {
        return $('.jprs_tile_col[data-colNum="' + columnNumber + '"]')
            .find('.jprs_tile:nth-child(' + tileIndex + ')')
    }

    /**
     * Given a jQuery object containing the current tile, returns an object with the
     * adjacent tiles.
     *
     * @static
     * @memberOf Jeepers
     * @returns {Object} Returns an object containing jQuery objects for each
     * adjacent tile.
     */
    function adjacentTiles($tile) {
        var $column = $tile.parents('.jprs_tile_col')
            , thisCol = parseInt($column.attr('data-colnum'))
            , oddCol = !!(thisCol % 2)
            , prevCol = thisCol == 1 ? COLUMNS : thisCol - 1
            , nextCol = thisCol == COLUMNS ? 1 : thisCol + 1
            , adjacent = oddCol ? [0,1] : [-1,0]
            , mainTileIndex = $tile.index() + 1;
        return {
            $uprLt: tileAtRowCol(prevCol, mainTileIndex + adjacent[0]),
            $lwrLt: tileAtRowCol(prevCol, mainTileIndex + adjacent[1]),
            $above: tileAtRowCol(thisCol, mainTileIndex - 1),
            $below: tileAtRowCol(thisCol, mainTileIndex + 1),
            $uprRt: tileAtRowCol(nextCol, mainTileIndex + adjacent[0]),
            $lwrRt: tileAtRowCol(nextCol, mainTileIndex + adjacent[1])
        }
    }

    function addTileToSelection($tile) {
        console.log('addTileToSelection');
        SELECTIONS.push({
            col: $tile.parents('.jprs_tile_col').attr('data-colnum'),
            idx: $tile.index() + 1,
            id: $tile.attr('id'),
            char: $tile.attr('data-char')
        });
        $tile.addClass('jprs_selected_tile');
    }

    function adjacentTo($tile1, $tile2) {
        return _(adjacentTiles($tile1))
            .values()
            .map(function (tt) {
                return tt.attr('id') == $tile2.attr('id')
            })
            .contains(true)
    }

    function selecting() {
        return !_.isEmpty(SELECTIONS);
    }

    function addSelectedTile($tile) {
        if (!_.isEmpty(SELECTIONS) && ($tile.attr('id') == _.last(SELECTIONS).id)) {
            return;
        }
        if (_.isEmpty(SELECTIONS) || adjacentTo($tile, $('#' + _.last(SELECTIONS).id))) {
            addTileToSelection($tile);
        } else {
            clearSelection();
            addTileToSelection($tile)
        }
        if (currentChars() != '') {
            testSelection();
        }
    }

    function currentChars() {
        return _(SELECTIONS).pluck('char').value().join('');
    }

    function clearSelection() {
        _(SELECTIONS).each(function (sel) {
            $('#' + sel.id).removeClass('jprs_selected_tile')
        });
        SELECTIONS = [];
    }

    function testSelection() {
        var word = currentChars();
        setMessage(word);
    }

    function endSelection() {
        console.log('endSelection');
        clearSelection();
    }

    function startSpinning() {
        _SPINNING = true;
    }

    function stopSpinning() {
        _SPINNING = false;
    }

    function isSpinning() {
        return _SPINNING;
    }

    function getLastSpinPos() {
        return _LAST_SPIN_POS;
    }

    function setLastSpinPos(xPos) {
        _LAST_SPIN_POS = xPos;
    }

    function setVelocity(amt) {
        VELOCITY = amt > 0
            ? Math.min(MAX_VELOCITY, VELOCITY + (amt * VELOCITY_FACTOR))
            : Math.max(MIN_VELOCITY, VELOCITY + (amt * VELOCITY_FACTOR));
    }

    function setMessage(text) {
        _MESSAGE = text;
    }

    function $stage() {
        return $('#stage');
    }

    function spin(velocityObj) {
        var current = parseFloat($stage().attr('data-spin'))
            , v = velocityObj.velocity * VELOCITY_FACTOR
            , currentWithNew = (current + v) % 360
            , newSpin = currentWithNew < 0
                ? currentWithNew + 360
                : currentWithNew;
        $stage().attr({'data-spin': newSpin});
        //console.log(JSON.stringify(velocityObj));
        refreshColumns();
    }

    var jeepers = function(){};

    jeepers.refreshColumns = _.throttle(refreshColumns, 1000 / 60);
    jeepers.creeper = creeper;
    jeepers.adjacentTiles = adjacentTiles;
    jeepers.selecting = selecting;
    jeepers.addSelectedTile = addSelectedTile;
    jeepers.testSelection = testSelection;
    jeepers.endSelection = endSelection;
    jeepers.setMessage = setMessage;
    jeepers.spin = spin;
    jeepers.startSpinning = startSpinning;
    jeepers.stopSpinning = stopSpinning;
    jeepers.isSpinning = isSpinning;
    jeepers.getLastSpinPos = getLastSpinPos;
    jeepers.setLastSpinPos = setLastSpinPos;
    jeepers.setVelocity = setVelocity;
    jeepers._SELECTIONS = SELECTIONS;

    this.Jeepers = jeepers;

}(this));

// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        function( callback ){
            window.setTimeout(callback, 1000 / 60);
        };
})();


// usage:
// instead of setInterval(render, 16) ....

var _JPRS_COLUMNS = 20
    , _TILES_PER_COLUMN = 7
    , userAgent = userAgent || navigator.userAgent
    , iOS = iOS || userAgent.match(/(iPad|iPhone|iPod)/i)
    , iPhone = iPhone || userAgent.match(/(iPhone|iPod)/i)
    , startEvt = iOS ? 'touchstart' : 'mousedown'
    , currentTileId = ''
    , startedTileId = ''
    , drawingWord = false;

$(document).ready(function () {
    // Add initial tiles
    var $col;
    for (var i = _JPRS_COLUMNS; i > 0; i--) {
        $col = $('<div class="jprs_tile_col" data-colnum="' + i + '"></div>');
        $col.append($('<div/>').addClass('jprs_handle jprs_top_handle'))
            .append($('<div/>').addClass('jprs_handle jprs_bottom_handle'))
            .append($('<div/>').addClass('jprs_tiles'));

        for (var j = _TILES_PER_COLUMN; j > 0; j--) {
            $('.jprs_tiles', $col).append(
                $('<div/>', {
                    "class": "jprs_tile",
                    "data-char": String.fromCharCode(65 + Math.round(Math.random() * 25)),
                    "id": _.uniqueId('jprs_tile-')
                })
            );
        }
        $col.prependTo('#stage');
    }

    $(document)
        .on('touchmove mousemove', 'body', function (event) {
            event.preventDefault();
            var lastPos, newPos;
            newPos = event.type == 'touchmove' ? event.originalEvent.changedTouches[0].clientX : event.clientX;
            if (Jeepers.isSpinning()) {
                if (_.isNumber(Jeepers.getLastSpinPos())) {
                    lastPos = Jeepers.getLastSpinPos();
                    Jeepers.setVelocity(newPos - lastPos);
                }
            } else {
                // If current position is over a tile and currently in draw word mode
                if (/jprs_tile/.test(event.target.className) && drawingWord) {
                    // Get the element using `document.elementFromPoint`
                    var tile = event.type == 'touchmove'
                        ? document.elementFromPoint(event.originalEvent.changedTouches[0].clientX, event.originalEvent.changedTouches[0].clientY)
                        : document.elementFromPoint(event.clientX, event.clientY);
                    // If the tile's id differs from the last tile, trigger `'enter'` and `'leaving'`
                    // events for the new and previous tiles, respectively
                    if (currentTileId != tile.getAttribute('id')) {
                        $(document.getElementById(currentTileId)).trigger('jprs:tile:leaving');
                        $(tile).trigger('jprs:tile:entering');
                    }
                }
            }
            Jeepers.setLastSpinPos(newPos);
        })
        .on('mousedown touchstart', 'body', function (event) {
            if (!/jprs_tile/.test(event.target.className)) {
                var newPos = event.type == 'touchstart' ? event.originalEvent.changedTouches[0].clientX : event.clientX;
                Jeepers.setLastSpinPos(newPos);
                Jeepers.startSpinning();
            } else {
                var $tile = $(event.target);
                if (startedTileId == $tile.attr('id')) {
                    Jeepers.endSelection();
                    startedTileId = '';
                    drawingWord = false;
                } else {
                    startedTileId = $tile.attr('id');
                    drawingWord = true;
                }
            }
        })
        // Stop spin if the pointer left the document
        .on('mouseout touchleave', document, function (event) {
            event = event ? event : window.event;
            var from = event.relatedTarget || event.toElement;
            if (!from || from.nodeName == "HTML") {
                var newPos = event.type == 'touchleave' ? event.originalEvent.changedTouches[0].clientX : event.clientX;
                Jeepers.setLastSpinPos(newPos);
                Jeepers.stopSpinning();
            }
        })
        //
        .on('mouseup touchend', 'body', function (event) {
            var newPos = event.type == 'touchend' ? event.originalEvent.changedTouches[0].clientX : event.clientX;
            Jeepers.setLastSpinPos(newPos);
            Jeepers.stopSpinning();
            if (/jprs_tile/.test(event.target.className)) {
                var $tile = $(event.target);
                if ($tile.attr('id') == startedTileId) {
                    Jeepers.addSelectedTile($tile)
                } else if ($tile.attr('id') != startedTileId) {
                    Jeepers.endSelection();
                    startedTileId = '';
                }
                drawingWord = false;
            }
        })
        .on('jprs:tile:entering jprs:tile:leaving', '.jprs_tile', function (event) {
            var $tile = $(event.target).hasClass('jprs_tile')
                ? $(event.target)
                : $(event.target).parents('jprs_tile')
                , adjacent = Jeepers.adjacentTiles($tile)
                , inside = event.type == 'mouseenter' || event.type == 'touchenter';
            $tile.toggleClass('jprs_hover_tile', inside);
            [].forEach.call(_.values(adjacent), function ($at) {
                $at.toggleClass('jprs_adjacent_tile', inside);
            });
            if (event.type == 'jprs:tile:entering') currentTileId = $tile.attr('id');
            if (drawingWord) {
                Jeepers.addSelectedTile($tile);
            }
        })
        .on('keydown', function (event) {
            var key = event.which
                , spin = parseInt($('#stage').attr('data-spin'));
            if (key == 37 || key == 39) {
                spin = key == 39 ? spin + 1 : spin - 1;
                $('#stage').attr('data-spin', spin);
//                $(document).trigger('jprs:spin:changed');
            }
        })
        .on('jprs:spin:changed', function () {
            Jeepers.refreshColumns();
        })
        .on('dragstart', function(event) {
            event.preventDefault();
        });

/*    $('#spin')
        .change(function (event) {
            $(event.target).next('span').text($(event.target).val());
            $('#stage').attr('data-spin', $(event.target).val());
            Jeepers.refreshColumns();
        });

    $('#columnTranslateZ')
        .change(function (event) {
            $(event.target).next('span').text($(event.target).val());
            Jeepers.refreshColumns()
        });

    $('#perspective')
        .change(function (event) {
            $(event.target).next('span').text($(event.target).val());
            $('#stage').css({
                webkitPerspective: $(event.target).val() + 'px'
            })
        });*/

/*    $('#stage').kinetic({
        maxvelocity: 20,
        throttleFPS: iOS ? 30 : 60,
        triggerHardware: iOS,
        filterTarget: function (target) {
            return !$(target).hasClass('jprs_tile');
        },
        moved: Jeepers.spin
    });*/

/*    var stage = document.getElementById('stage');
    stage.addEventListener('touchmove', function(event) {
        try {
            $('#msg').html(event.target.getAttribute('class'));
        } catch(e) {
            console.log(e);
        }

    });*/

//    $(window).on('resize', );


    (function animloop(){
        requestAnimFrame(animloop);
        //$('#stage').attr('data-spin', parseInt($('#stage').attr('data-spin')) + 1);
        Jeepers.refreshColumns();
    })();

});

