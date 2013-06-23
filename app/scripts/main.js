/**
 * @license
 * Jeepers <http://github.com/natchiketa/jeepers>
 * Copyright 2013 Sal Lara <http://natchiketa.com/>
 * Available under MIT license <http://rawgithub.com/natchiketa/jeepers/master/LICENSE.txt>
 */
;(function(window) {

    var COLUMNS = 20;

    var TILES_PER_COLUMN = 7;

    var VELOCITY_FACTOR = -0.25;

    var SELECTIONS = [];

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
        var zDepth = creeper().stageRadius;
        $('.jprs_tile_col').each(function () {
            var angle = ((360 / COLUMNS) * parseInt($(this).attr('data-colnum')))
                + parseInt($('#stage').attr('data-spin'));
            $(this).css({
                webkitTransform: 'rotateY(' + angle + 'deg) translateZ(' + zDepth + 'px)'
            });
        });
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
            /*if (_(SELECTIONS).pluck('id')$tile.attr('id'))*/
            return
        }
        if (_.isEmpty(SELECTIONS) || adjacentTo($tile, $('#' + _.last(SELECTIONS).id))) {
            addTileToSelection($tile);
        } else {
            _(SELECTIONS).each(function (sel) {
                $('#' + sel.id).removeClass('jprs_selected_tile')
            });
            SELECTIONS = [];
            addTileToSelection($tile)
        }
    }

    function testSelection($tile) {
        var _sel = _(SELECTIONS)
            , word = _sel.pluck('char').value().join('');
        console.log(word);
        _(SELECTIONS).each(function (sel) {
            $('#' + sel.id).removeClass('jprs_selected_tile')
        });
        SELECTIONS = [];
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

    jeepers.refreshColumns = refreshColumns;
    jeepers.creeper = creeper;
    jeepers.adjacentTiles = adjacentTiles;
    jeepers.selecting = selecting;
    jeepers.addSelectedTile = addSelectedTile;
    jeepers.testSelection = testSelection;
    jeepers.spin = spin;
    jeepers._SELECTIONS = SELECTIONS;

    this.Jeepers = jeepers;

}(this));

var _JPRS_COLUMNS = 20
    , _TILES_PER_COLUMN = 7
    , userAgent = userAgent || navigator.userAgent
    , iOS = iOS || userAgent.match(/(iPad|iPhone|iPod)/i)
    , iPhone = iPhone || userAgent.match(/(iPhone|iPod)/i)
    , startEvt = iOS ? 'touchstart' : 'mousedown';

$(document).ready(function () {
    // Add initial tiles
    var $col;
    for (var i = _JPRS_COLUMNS; i > 0; i--) {
        $col = $('<div class="jprs_tile_col" data-colnum="' + i + '"></div>');
        $col.append(
                $('<div/>').addClass('jprs_handle jprs_top_handle')
            )
            .append(
                $('<div/>').addClass('jprs_handle jprs_bottom_handle')
            )
            .append(
                $('<div/>').addClass('jprs_tiles')
            );


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
        .on('touchmove', '#stage', function (event) {
            event.preventDefault();
            $('#msg').html($tile.attr('id'))
        })
        .on('mousedown touchstart', '.jprs_tile', function (event) {
            var $tile = $(event.target).hasClass('jprs_tile')
                ? $(event.target)
                : $(event.target).parents('jprs_tile');
            Jeepers.addSelectedTile($tile);
            $('#msg').html($tile.attr('id'));
        })
        .on('mouseup touchend', '.jprs_tile', function (event) {
            var $tile = $(event.target).hasClass('jprs_tile')
                ? $(event.target)
                : $(event.target).parents('jprs_tile');
            Jeepers.testSelection($tile);
            $('#msg').html($tile.attr('id'));
        })
        .on('mouseenter mouseleave touchenter touchleave', '.jprs_tile', function (event) {
            var $tile = $(event.target).hasClass('jprs_tile')
                ? $(event.target)
                : $(event.target).parents('jprs_tile')
                , adjacent = Jeepers.adjacentTiles($tile)
                , inside = event.type == 'mouseenter' || 'touchenter';
            $tile.toggleClass('jprs_hover_tile', inside);
            [].forEach.call(_.values(adjacent), function ($at) {
                $at.toggleClass('jprs_adjacent_tile', inside);
            });
            if (Jeepers.selecting()) {
                Jeepers.addSelectedTile($tile);
            }
            $('#msg').html($tile.attr('id'))
        })
        .on(startEvt, '.jprs_tile', function (event) {
            var $tile = $(event.target).hasClass('jprs_tile')
                    ? $(event.target)
                    : $(event.target).parents('jprs_tile');
            Jeepers.addSelectedTile($tile);
        })
        .on('keydown', function (event) {
            var key = event.which
                , spin = parseInt($('#stage').attr('data-spin'));
            if (key == 37 || key == 39) {
                spin = key == 39 ? spin + 1 : spin - 1;
                $('#stage').attr('data-spin', spin);
                $(document).trigger('jprs:spin:changed');
            }
        })
        .on('jprs:spin:changed', function () {
            Jeepers.refreshColumns();
        })
        .on('dragstart', '.jprs_handle', function(event) {
            event.preventDefault();
        });

    $('#spin')
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
        });

    $('#stage').kinetic({
        maxvelocity: 20,
        throttleFPS: iOS ? 30 : 60,
        triggerHardware: iOS,
        filterTarget: function (target) {
            return !$(target).hasClass('jprs_tile');
        },
        moved: Jeepers.spin
    });

    $(window).on('resize', Jeepers.refreshColumns);

});