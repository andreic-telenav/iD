iD.TelenavLayer = function (context) {
    var enable = false,
        svg,
        requestQueue = [],
        combinedItems = [],
        selectedItems = [],
        requestCount;

    var types = {
        dof: 'http://fcd-ss.skobbler.net:2680/directionOfFlowService_test/search',
        mr: 'http://fcd-ss.skobbler.net:2680/missingGeoService_test/search',
        tr: 'http://fcd-ss.skobbler.net:2680/turnRestrictionService_test/search'
    };

    var selectedTypes = ['dof', 'mr', 'tr'];

    // ==============================
    // ==============================
    // MapItem
    // ==============================
    // ==============================
    var MapItem = function() {
        // ---
        this._className = 'MapItem';
        this._id = null;

        this.isA = function(proposedClassName) {
            return proposedClassName === this._className;
        };
        this.getId = function() {
            return this._id;
        };
        this.getClass = function() {
            return this._className;
        };
    };
    MapItem.transformClass = function(item) {
        return item.getClass();
    };
    MapItem.transformId = function(item) {
        return item.getId();
    };
    MapItem.handleSelection = function(item) {
        var node = d3.select('#' + item.getId());
        if (node.classed('selected')) {
            if (d3.event.ctrlKey) {
                node.classed('selected', false);
                for (var i = 0; i < selectedItems.length; i++) {
                    if (selectedItems[i].getId() === item.getId()) {
                        selectedItems.splice(i, 1);
                    }
                }
            } else {
                if (svg.selectAll('g.selected')[0].length === 1) {
                    node.classed('selected', false);
                    selectedItems.length = 0;
                } else {
                    svg.selectAll('g').classed('selected', false);
                    selectedItems.length = 0;
                    node.classed('selected', true);
                    selectedItems.push(item);
                }
            }
        } else {
            if (d3.event.ctrlKey) {
                node.classed('selected', true);
                selectedItems.push(item);
            } else {
                svg.selectAll('g').classed('selected', false);
                selectedItems.length = 0;
                node.classed('selected', true);
                selectedItems.push(item);
            }
        }
        d3.event.stopPropagation();
    };
    MapItem.handleMouseOver = function(item) {
        var nodes = d3.selectAll('#' + item.getId() + ' .highlight')
            .classed('highlightOn', true)
            .classed('highlightOff', false);
    };
    MapItem.handleMouseOut = function(item) {
        var nodes = d3.selectAll('#' + item.getId() + ' .highlight')
            .classed('highlightOn', false)
            .classed('highlightOff', true);
    };
    // ==============================
    // ==============================
    // TurnRestrictionItem
    // ==============================
    // ==============================
    var TurnRestrictionItem = function(rawItemData) {
        // ---
        this._className = 'TurnRestrictionItem';
        this._id = 'tr_' + rawItemData.id.replace(/\:/g,'_').replace(/\+/g,'_').replace(/\#/g,'_');

        this.getPoint = function() {
            return rawItemData.point;
        };
        this.getSegments = function() {
            return rawItemData.segments;
        };
        this.getIdentifier = function() {
            return [
                rawItemData.id
            ];
        }
    };
    // static
    TurnRestrictionItem.prototype = new MapItem();
    TurnRestrictionItem.transformX = function(item) {
        return Math.floor(context.projection([item.getPoint().lon, item.getPoint().lat])[0]);
    };
    TurnRestrictionItem.transformY= function(item) {
        return Math.floor(context.projection([item.getPoint().lon, item.getPoint().lat])[1]);
    };
    TurnRestrictionItem.transformLinePoints = function(item) {
        var stringPoints = [];
        for (var i = 0; i < item.getSegments().length; i++) {
            for (var j = 0; j < item.getSegments()[i].points.length; j++) {
                var point = context.projection([item.getSegments()[i].points[j].lon, item.getSegments()[i].points[j].lat]);
                stringPoints.push(point.toString());
            }
        }

        return stringPoints.join(' ');
    };
    // ==============================
    // ==============================
    // MissingRoadIcon
    // ==============================
    // ==============================
    var MissingRoadItem = function(rawItemData) {
        this._className = 'MissingRoadItem';
        this._id = ('mr_' + rawItemData.lat + '_' + rawItemData.lon).replace(/\./g,'_');
        this.getLat = function() {
            return rawItemData.lat;
        };
        this.getLon = function() {
            return rawItemData.lon;
        };
        this.getIdentifier = function() {
            return [{
                x: rawItemData.x,
                y: rawItemData.y
            }];
        }
    };
    MissingRoadItem.prototype = new MapItem();
    MissingRoadItem.transformX = function(item) {
        return Math.floor(context.projection([item.getLon(), item.getLat()])[0]);
    };
    MissingRoadItem.transformY = function(item) {
        return Math.floor(context.projection([item.getLon(), item.getLat()])[1]);
    };
    // ==============================
    // ==============================
    // DirectionOfFlowItem
    // ==============================
    // ==============================
    var DirectionOfFlowItem = function(rawItemData) {
        this._className = 'DirectionOfFlowItem';
        this._id = 'dof_' + [rawItemData.fromNodeId, rawItemData.toNodeId, rawItemData.wayId].join('_');
        this.getPoints = function() {
            return rawItemData.points;
        };
        this.getIdentifier = function() {
            return [{
                wayId: rawItemData.wayId,
                fromNodeId: rawItemData.fromNodeId,
                toNodeId: rawItemData.toNodeId
            }];
        }
    };
    DirectionOfFlowItem.prototype = new MapItem();
    DirectionOfFlowItem.transformLinePoints = function(item) {
        var stringPoints = [];
        for (var i = 0; i < item.getPoints().length; i++) {
            var point = context.projection([item.getPoints()[i].lon, item.getPoints()[i].lat]);
            stringPoints.push(point.toString());
        }
        return stringPoints.join(' ');
    };

    // ==============================
    // ==============================
    // EditPanel
    // ==============================
    // ==============================
    var EditPanel = function() {

        this.show = function() {

        };

        this.renderMessage = function() {

        };

        this.setStatus = function(status) {
            status = status.toUpperCase();
            for (var i = 0; i < selectedItems.length; i++) {
                var currentItem = selectedItems[i];

                var dataToPost = {
                    username: 'Tudor009',
                    text: 'status changed',
                    status: status
                };

                var responseHandler = function(err, rawData) {
                    var data = JSON.parse(rawData.response);
                    console.log("got response", data);
                };

                switch (currentItem.getClass()) {
                    case 'DirectionOfFlowItem':
                        dataToPost.roadSegments = currentItem.getIdentifier();
                        d3.xhr('http://fcd-ss.skobbler.net:2680/directionOfFlowService_test/comment')
                            .header("Content-Type", "application/json")
                            .post(
                                JSON.stringify(dataToPost),
                                responseHandler
                            );
                        break;
                    case 'MissingRoadItem':
                        dataToPost.tiles = currentItem.getIdentifier();
                        d3.xhr('http://fcd-ss.skobbler.net:2680/missingGeoService_test/comment')
                            .header("Content-Type", "application/json")
                            .post(
                                JSON.stringify(dataToPost),
                                responseHandler
                            );
                        break;
                    case 'TurnRestrictionItem':
                        dataToPost.targetIds = currentItem.getIdentifier();
                        d3.xhr('http://fcd-ss.skobbler.net:2680/turnRestrictionService_test/comment')
                            .header("Content-Type", "application/json")
                            .post(
                                JSON.stringify(dataToPost),
                                responseHandler
                            );
                        break;
                }

            }
        };

        this.saveComment = function() {
            var comment = d3.select('.telenavComments').property('value');

            for (var i = 0; i < selectedItems.length; i++) {
                var currentItem = selectedItems[i];

                var dataToPost = {
                    username: 'Tudor009',
                    text: comment
                };

                var responseHandler = function(err, rawData){
                    var data = JSON.parse(rawData.response);
                    console.log("got response", data);
                };

                switch (currentItem.getClass()) {
                    case 'DirectionOfFlowItem':
                        dataToPost.roadSegments = currentItem.getIdentifier();
                        d3.xhr('http://fcd-ss.skobbler.net:2680/directionOfFlowService_test/comment')
                            .header("Content-Type", "application/json")
                            .post(
                                JSON.stringify(dataToPost),
                                responseHandler
                            );
                        break;
                    case 'MissingRoadItem':
                        dataToPost.tiles = currentItem.getIdentifier();
                        d3.xhr('http://fcd-ss.skobbler.net:2680/missingGeoService_test/comment')
                            .header("Content-Type", "application/json")
                            .post(
                                JSON.stringify(dataToPost),
                                responseHandler
                            );
                        break;
                    case 'TurnRestrictionItem':
                        dataToPost.targetIds = currentItem.getIdentifier();
                        d3.xhr('http://fcd-ss.skobbler.net:2680/turnRestrictionService_test/comment')
                            .header("Content-Type", "application/json")
                            .post(
                                JSON.stringify(dataToPost),
                                responseHandler
                            );
                        break;
                }

            }
        };

    };

    var _editPanel = new EditPanel();

    var _synchCallbacks = function(error, data) {

        if (data.hasOwnProperty('roadSegments')) {
            for (var i = 0; i < data.roadSegments.length; i++) {
                combinedItems.push(new DirectionOfFlowItem(
                    data.roadSegments[i]
                ));
            }
        }
        if (data.hasOwnProperty('tiles')) {
            for (var i = 0; i < data.tiles.length; i++) {
                for (var j= 0; j < data.tiles[i].points.length; j++) {
                    combinedItems.push(new MissingRoadItem(
                        data.tiles[i].points[j]
                    ));
                }
            }
        }
        if (data.hasOwnProperty('entities')) {
            for (var i = 0; i < data.entities.length; i++) {
                combinedItems.push(new TurnRestrictionItem(
                    data.entities[i]
                ));
            }
        }



        if (!--requestCount) {
            if (error) {
                svg.selectAll('g')
                    .remove();
                return;
            }
            var g = svg.selectAll('g')
                .data(combinedItems, function(item) {
                    return item.getId();
                    //return item;
                });

            var enter = g.enter().append('g')
                .attr('class', MapItem.transformClass)
                .attr('id', MapItem.transformId);

            var dOFs = enter.filter(function(item) {
                return item.isA('DirectionOfFlowItem');
            });
            var mRs = enter.filter(function(item) {
                return item.isA('MissingRoadItem');
            });
            var tRs = enter.filter(function(item) {
                return item.isA('TurnRestrictionItem');
            });

            var dofPoly = dOFs.append('polyline');
            dofPoly.attr('points', DirectionOfFlowItem.transformLinePoints);
            var dofSelPoly = dOFs.append('polyline').attr('class', 'highlight');
            dofSelPoly.attr('points', DirectionOfFlowItem.transformLinePoints);

            var mrCircle = mRs.append('circle');
            mrCircle.attr('cx', MissingRoadItem.transformX);
            mrCircle.attr('cy', MissingRoadItem.transformY);
            mrCircle.attr('r', '2');

            var trPoly = tRs.append('polyline');
            trPoly.attr('points', TurnRestrictionItem.transformLinePoints);
            var trCircle = tRs.append('circle');
            trCircle.attr('cx', TurnRestrictionItem.transformX);
            trCircle.attr('cy', TurnRestrictionItem.transformY);
            trCircle.attr('r', '10');
            var trSelPoly = tRs.append('polyline').attr('class', 'highlight');
            trSelPoly.attr('points', TurnRestrictionItem.transformLinePoints);
            var trSelCircle = tRs.append('circle').attr('class', 'highlight');
            trSelCircle.attr('cx', TurnRestrictionItem.transformX);
            trSelCircle.attr('cy', TurnRestrictionItem.transformY);
            trSelCircle.attr('r', '10');

            dOFs.on('click', MapItem.handleSelection);
            mRs.on('click', MapItem.handleSelection);
            tRs.on('click', MapItem.handleSelection);

            dOFs.on('mouseover', MapItem.handleMouseOver);
            mRs.on('mouseover', MapItem.handleMouseOver);
            tRs.on('mouseover', MapItem.handleMouseOver);

            dOFs.on('mouseout', MapItem.handleMouseOut);
            mRs.on('mouseout', MapItem.handleMouseOut);
            tRs.on('mouseout', MapItem.handleMouseOut);

            g.exit()
                .remove();
        }

    };

    function render(selection) {

        var zoom = Math.round(context.map().zoom());

        if (zoom > 14) {
            d3.select("#sidebar").classed('telenavPaneActive', enable);
            d3.select(".pane-telenav").classed('hidden', !enable);
        } else {
            d3.select("#sidebar").classed('telenavPaneActive', false);
            d3.select(".pane-telenav").classed('hidden', true);
        }

        svg = selection.selectAll('svg')
            .data([0]);

        svg.enter().append('svg');

        svg.style('display', enable ? 'block' : 'none');


        if (!enable) {

            svg.selectAll('g')
                .remove();

            return;
        }

        var directionOfFlowPolylines = svg.selectAll('.DirectionOfFlowItem > polyline');
        directionOfFlowPolylines.attr('points', DirectionOfFlowItem.transformLinePoints);

        var missingRoadsCircles = svg.selectAll('.MissingRoadItem > circle');
        missingRoadsCircles.attr('cx', MissingRoadItem.transformX);
        missingRoadsCircles.attr('cy', MissingRoadItem.transformY);

        var turnRestrictionCircles = svg.selectAll('.TurnRestrictionItem > circle');
        turnRestrictionCircles.attr('cx', TurnRestrictionItem.transformX);
        turnRestrictionCircles.attr('cy', TurnRestrictionItem.transformY);

        var turnRestrictionPolylines = svg.selectAll('.TurnRestrictionItem > polyline');
        turnRestrictionPolylines.attr('points', TurnRestrictionItem.transformLinePoints);

        var extent = context.map().extent();

        if (requestQueue.length > 0) {
            for (var i = 0; i < requestQueue.length; i++) {
                requestQueue[i].abort();
            }
            requestQueue.length = 0;
        }

        var boundingBoxUrlFragments = '?south=' +
            extent[0][1] + '&north=' + extent[1][1] + '&west=' +
            extent[0][0] + '&east=' + extent[1][0] + '&zoom=' + zoom;

        var requestUrlQueue = [];
        for (var i = 0; i < selectedTypes.length; i++) {
            requestUrlQueue.push(types[selectedTypes[i]] + boundingBoxUrlFragments);
        }

        requestCount = requestUrlQueue.length;
        combinedItems.length = 0;

        if (zoom > 14) {
            for (var i = 0; i < requestUrlQueue.length; i++) {
                requestQueue[i] = d3.json(requestUrlQueue[i], _synchCallbacks);
            }
        } else {
            svg.selectAll('g')
                .remove();
        }
    }

    render.enable = function(_) {
        if (!arguments.length) return enable;
        enable = _;
        return render;
    };

    render.dimensions = function(_) {
        if (!arguments.length) return svg.dimensions();
        svg.dimensions(_);
        return render;
    };

    var buildPane = function() {

        var div = d3.selectAll('.pane_telenav')
            .data([0]);

        var enter = div.enter().append('div')
            .attr('class', 'pane-telenav col4 hidden');
        var telenavWrapPanel = enter.append('div')
            .attr('class', 'telenav-wrap');
        var telenavWrap = telenavWrapPanel.append('div')
            .attr('class', 'telenavwrap');

        //  START 3rd container div
        var userWindow = telenavWrap.append('div')
            .attr('id', 'userWindow')
            .attr('class', 'entity-editor-pane pane');
        var userWindowHeader = userWindow.append('div')
            .attr('class', 'header fillL cf');
        userWindowHeader.append('button')
            .attr('class', 'fr preset-reset')
            .on('click', function() {
                telenavWrap.transition()
                    .style('transform', 'translate3d(0px, 0px, 0px)');
            })
            .append('span')
            .html('&#9658;');

        userWindowHeader.append('h3')
            .text('Telenav Layers');
        var userWindowBody = userWindow.append('div')
            .attr('class', 'telenav-body');
        var userWindowInner = userWindowBody.append('div')
            .attr('class', 'inspector-border inspector-preset')
            .append('div');
        var userContainer = userWindowInner.append('div')
            .attr('class', 'preset-form inspector-inner fillL3');
        var statusUpdate_form = userContainer.append('div')
            .attr('class', 'form-field');
        statusUpdate_form.append('label')
            .attr('class', 'form-label')
            .text('Change Status')
            .append('div')
            .attr('class', 'form-label-button-wrap')
            .append('button')
            .attr('class', 'save-icon')
            .call(iD.svg.Icon('#icon-save'));
        var statusUpdate_formWrap = statusUpdate_form.append('form')
            .attr('class', 'filterForm optionsContainer');
        var statusUpdate_openContainer = statusUpdate_formWrap.append('div')
            .attr('class', 'tel_displayInline');
        statusUpdate_openContainer.append('input')
            .attr('id', 'ch_open')
            .attr('name', 'changeStatus')
            .attr('value', 'OPEN')
            .attr('type', 'radio');
        statusUpdate_openContainer.append('label')
            .attr('for', 'ch_open')
            .text('Open');
        var statusUpdate_solvedContainer = statusUpdate_formWrap.append('div')
            .attr('class', 'tel_displayInline');
        statusUpdate_solvedContainer.append('input')
            .attr('id', 'ch_solved')
            .attr('name', 'changeStatus')
            .attr('value', 'SOLVED')
            .attr('type', 'radio');
        statusUpdate_solvedContainer.append('label')
            .attr('for', 'ch_solved')
            .text('Solved');
        var statusUpdate_invalidContainer = statusUpdate_formWrap.append('div')
            .attr('class', 'tel_displayInline');
        statusUpdate_invalidContainer.append('input')
            .attr('id', 'ch_invalid')
            .attr('name', 'changeStatus')
            .attr('value', 'INVALID')
            .attr('type', 'radio');
        statusUpdate_invalidContainer.append('label')
            .attr('for', 'ch_invalid')
            .text('Invalid');

        var comments_form = userContainer.append('div')
            .attr('class', 'form-field');
        comments_form.append('label')
            .attr('class', 'form-label')
            .text('Comment')
            .append('div')
            .attr('class', 'form-label-button-wrap')
            .append('button')
            .attr('class', 'save-icon')
            .call(iD.svg.Icon('#icon-save'));
        comments_form.append('textarea')
            .attr('class', 'commentText');

        //  END 3rd container div

        //  START 1st container div
        var generalSettingsWindow = telenavWrap.append('div')
            .attr('id', 'generalSettingsWindow')
            .attr('class', 'entity-editor-pane pane pane-middle');
        var generalWindowsWindowHeader = generalSettingsWindow.append('div')
            .attr('class', 'header fillL cf');
        generalWindowsWindowHeader.append('button')
            .attr('class', 'fl preset-reset preset-choose')
            .on('click', function() {
                telenavWrap.transition()
                    .style('transform', 'translate3d(' + panelWidth() + 'px, 0px,  0px)');
            })
            .append('span')
            .html('&#9668;');
        generalWindowsWindowHeader.append('button')
            .attr('class', 'fr preset-reset')
            .on('click', function() {
                telenavWrap.transition()
                    .style('transform', 'translate3d(-' + panelWidth() + 'px, 0px,  0px)');
            })
            .append('span')
            .html('&#9658;');
        generalWindowsWindowHeader.append('h3')
            .text('Telenav Pane');
        var generalSettingsBody = generalSettingsWindow.append('div')
            .attr('class', 'telenav-body');
        var generalSettingsInner = generalSettingsBody.append('div')
            .attr('class', 'preset-list-item inspector-inner');
        var generalSettingsButtonWrap = generalSettingsInner.append('div')
            .attr('class', 'preset-list-button-wrap')
            .attr('id', 'toggleEditMode')
            .on('click', function(){
                var label = generalSettingsButtonWrap.select('.label')
                if(label.classed('off')){
                    generalSettingsButtonWrap.select('.label')
                        .text('Edit Mode On')
                        .classed('off', false)
                    d3.select('.layer-telenav').classed('editMode', true);
                } else {
                    generalSettingsButtonWrap.select('.label')
                        .text('Edit Mode Off')
                        .classed('off', true)
                    d3.select('.layer-telenav').classed('editMode', false);
                }
            });

        var generalSettingsButton = generalSettingsButtonWrap.append('button')
            .attr('class', 'preset-list-button preset-reset');
        generalSettingsButton.append('div')
            .attr('class', 'label off')
            .text('Edit Mode Off');
        generalSettingsButton.append('div')
            .attr('class', 'preset-icon preset-icon-32')
            .append('svg')
            .attr('class', 'icon')
            .call(iD.svg.Icon('#icon-apply'));

        var containerBorder = generalSettingsBody.append('div')
            .attr('class', 'inspector-border inspector-preset')
            .append('div');
        var presetFormContainer = containerBorder.append('div')
            .attr('class', 'preset-form inspector-inner fillL3');

        var presetForm = presetFormContainer.append('div')
            .attr('class', 'form-field');
        presetForm.append('label')
            .attr('class', 'form-label')
            .text('Reported Status');
        var statusForm = presetForm.append('form')
            .attr('class', 'filterForm optionsContainer');
        var statusDivOpen = statusForm.append('div')
            .attr('class', 'tel_displayInline');
        statusDivOpen.append('label')
            .attr('for', 'OPEN')
            .text('open');
        statusDivOpen.append('input')
            .attr('type', 'radio')
            .attr('id', 'OPEN')
            .attr('class', 'filterItem')
            .attr('name', 'filter');

        var statusDivSolved = statusForm.append('div')
            .attr('class', 'tel_displayInline');
        statusDivSolved.append('label')
            .attr('for', 'SOLVED')
            .text('solved');
        statusDivSolved.append('input')
            .attr('type', 'radio')
            .attr('id', 'SOLVED')
            .attr('class', 'filterItem')
            .attr('name', 'filter');

        var statusDivInvalid = statusForm.append('div')
            .attr('class', 'tel_displayInline');
        statusDivInvalid.append('label')
            .attr('for', 'INVALID')
            .text('invalid');
        statusDivInvalid.append('input')
            .attr('type', 'radio')
            .attr('id', 'INVALID')
            .attr('class', 'filterItem')
            .attr('name', 'filter');
        //  END 1st container div

        //  START 2st container div
        var optionsWindow = telenavWrap.append('div')
            .attr('id', 'optionsWindow')
            .attr('class', 'entity-editor-pane pane');
        var optionsWindowHeader = optionsWindow.append('div')
            .attr('class', 'header fillL cf');
        optionsWindowHeader.append('button')
            .attr('class', 'fl preset-reset preset-choose')
            .on('click', function() {
                telenavWrap.transition()
                    .style('transform', 'translate3d(0px, 0px, 0px)');
            })
            .append('span')
            .html('&#9668;');

        optionsWindowHeader.append('h3')
            .text('Telenav Layers');
        var optionsWindowBody = optionsWindow.append('div')
            .attr('class', 'telenav-body');
        var optionsWindowInner = optionsWindowBody.append('div')
            .attr('class', 'inspector-border inspector-preset')
            .append('div');
        var optionsContainer = optionsWindowInner.append('div')
            .attr('class', 'preset-form inspector-inner fillL3');

        var direction_form = optionsContainer.append('div')
            .attr('class', 'form-field');
        direction_form.append('label')
            .attr('class', 'form-label')
            .attr('for', 'oneWayConfidence')
            .text('One Way Confidence')
            .append('div')
            .attr('class', 'form-label-button-wrap')
            .append('div')
            .attr('class', 'input')
            .append('input')
            .attr('type', 'checkbox')
            .attr('checked', 'checked')
            .attr('class', 'filterActivation')
            .attr('id', 'oneWayConfidence');
        var direction_formWrap = direction_form.append('form')
            .attr('class', 'filterForm optionsContainer');
        var direction_highlyProbableContainer = direction_formWrap.append('div')
            .attr('class', 'tel_displayInline');
        direction_highlyProbableContainer.append('input')
            .attr('id', 'C1')
            .attr('type', 'checkbox');
        direction_highlyProbableContainer.append('label')
            .attr('for', 'C1')
            .text('Highly Probable');
        var direction_mostLikelyContainer = direction_formWrap.append('div')
            .attr('class', 'tel_displayInline');
        direction_mostLikelyContainer.append('input')
            .attr('id', 'C2')
            .attr('type', 'checkbox');
        direction_mostLikelyContainer.append('label')
            .attr('for', 'C2')
            .text('Most Likely');
        var direction_probableContainer = direction_formWrap.append('div')
            .attr('class', 'tel_displayInline');
        direction_probableContainer.append('input')
            .attr('id', 'C3')
            .attr('type', 'checkbox');
        direction_probableContainer.append('label')
            .attr('for', 'C3')
            .text('Probable');

        var missing_form = optionsContainer.append('div')
            .attr('class', 'form-field');
        missing_form.append('label')
            .attr('class', 'form-label')
            .attr('for', 'missingRoadType')
            .text('Missing road type')
            .append('div')
            .attr('class', 'form-label-button-wrap')
            .append('div')
            .attr('class', 'input')
            .append('input')
            .attr('type', 'checkbox')
            .attr('checked', 'checked')
            .attr('class', 'filterActivation')
            .attr('id', 'missingRoadType');
        var missing_formWrap = missing_form.append('form')
            .attr('class', 'filterForm optionsContainer');
        var missing_roadContainer = missing_formWrap.append('div')
            .attr('class', 'tel_displayInline');
        missing_roadContainer.append('input')
            .attr('id', 'ROAD')
            .attr('type', 'checkbox');
        missing_roadContainer.append('label')
            .attr('for', 'ROAD')
            .text('Road');
        var missing_parkingContainer = missing_formWrap.append('div')
            .attr('class', 'tel_displayInline');
        missing_parkingContainer.append('input')
            .attr('id', 'PARKING')
            .attr('type', 'checkbox');
        missing_parkingContainer.append('label')
            .attr('for', 'PARKING')
            .text('Parking');
        var missing_bothContainer = missing_formWrap.append('div')
            .attr('class', 'tel_displayInline');
        missing_bothContainer.append('input')
            .attr('id', 'BOTH')
            .attr('type', 'checkbox');
        missing_bothContainer.append('label')
            .attr('for', 'BOTH')
            .text('Both');
        missing_formWrap.append('label')
            .attr('class', 'form-subLabel tel_displayBlock')
            .text('Filters');
        var missing_waterContainer = missing_formWrap.append('div')
            .attr('class', 'tel_displayInline');
        missing_waterContainer.append('input')
            .attr('id', 'WATER')
            .attr('type', 'checkbox');
        missing_waterContainer.append('label')
            .attr('for', 'WATER')
            .text('Water Trail');
        var missing_pathContainer = missing_formWrap.append('div')
            .attr('class', 'tel_displayInline');
        missing_pathContainer.append('input')
            .attr('id', 'PATH')
            .attr('type', 'checkbox');
        missing_pathContainer.append('label')
            .attr('for', 'PATH')
            .text('Path Trail');


        var restriction_form = optionsContainer.append('div')
            .attr('class', 'form-field');
        restriction_form.append('label')
            .attr('class', 'form-label')
            .attr('for', 'missingRoadType')
            .text('Turn restriction Confidence')
            .append('div')
            .attr('class', 'form-label-button-wrap')
            .append('div')
            .attr('class', 'input')
            .append('input')
            .attr('type', 'checkbox')
            .attr('checked', 'checked')
            .attr('class', 'filterActivation')
            .attr('id', 'turnRestrictionConfidence');
        var restriction_formWrap = restriction_form.append('form')
            .attr('class', 'filterForm optionsContainer');
        var restriction_highlyProbableContainer = restriction_formWrap.append('div')
            .attr('class', 'tel_displayInline');
        restriction_highlyProbableContainer.append('input')
            .attr('id', 'C1')
            .attr('type', 'checkbox');
        restriction_highlyProbableContainer.append('label')
            .attr('for', 'C1')
            .text('Highly Probable');
        var restriction_probableContainer = restriction_formWrap.append('div')
            .attr('class', 'tel_displayInline');
        restriction_probableContainer.append('input')
            .attr('id', 'C2')
            .attr('type', 'checkbox');
        restriction_probableContainer.append('label')
            .attr('for', 'C2')
            .text('Probable');
        //  END 2st container div

        var toggleEditModeContainer = enter.append('textarea')
            .attr('class', 'telenavComments');
        var sendMessageButton = enter.append('button')
            .attr('class', 'telenavSendComments')
            .html('OK');

        var closedButton = enter.append('button')
            .attr('class', 'closedButton')
            .html('closed');
        var openedButton = enter.append('button')
            .attr('class', 'openedButton')
            .html('opened');
        var invalidButton = enter.append('button')
            .attr('class', 'invalidButton')
            .html('invalid');

        // ++++++++++++
        // events
        // ++++++++++++


        d3.select('.toggleEditModeContainer').on('click', function() {
            if (d3.select('.layer-telenav').classed('editMode')) {
                d3.select('.layer-telenav').classed('editMode', false);
            } else {
                d3.select('.layer-telenav').classed('editMode', true);
            }
        });

        d3.select('#oneWayConfidence').on('click', function() {
            if (d3.select('#oneWayConfidence').property('checked')) {
                selectedTypes.push('dof');
            } else {
                selectedTypes.splice(selectedTypes.indexOf('dof'), 1);
            }
            render(d3.select('.layer-telenav'));
        });

        d3.select('#missingRoadType').on('click', function() {
            if (d3.select('#missingRoadType').property('checked')) {
                selectedTypes.push('mr');
            } else {
                selectedTypes.splice(selectedTypes.indexOf('mr'), 1);
            }
            render(d3.select('.layer-telenav'));
        });

        d3.select('#turnRestrictionConfidence').on('click', function() {
            if (d3.select('#turnRestrictionConfidence').property('checked')) {
                selectedTypes.push('tr');
            } else {
                selectedTypes.splice(selectedTypes.indexOf('tr'), 1);
            }
            render(d3.select('.layer-telenav'));
        });

        d3.select('.telenavSendComments').on('click', _editPanel.saveComment);

        d3.select('.closedButton').on('click', function() {
            _editPanel.setStatus.call(_editPanel, 'SOLVED');
        });
        d3.select('.openedButton').on('click', function() {
            _editPanel.setStatus.call(_editPanel, 'OPEN');
        });
        d3.select('.invalidButton').on('click', function() {
            _editPanel.setStatus.call(_editPanel, 'INVALID');
        });

        //get the width of the panel for animation effect
        var panelWidth = function(){
            return parseInt(d3.select('.telenav-wrap').style('width'));
        }

    }();

    return render;
};

