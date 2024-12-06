class FamilyTree {
    constructor(opts) {
        //Load Options from Initializer
        this.config = opts.config;
        //Get the base HTML node
        this.rootNode = opts.config.ftRoot;
        //Track number of parent levels
        this.parentLevelsDone = 0;
        //Track number of children levels
        this.childrenLevelsDone = 0;
        //Generate Element IDs
        this.instanceID = this.makeRandomID();
        this.nodes = {
            main: this.makeRandomID(this.instanceID),
            parents: this.makeRandomID(this.instanceID),
            children: this.makeRandomID(this.instanceID),
            siblings: this.makeRandomID(this.instanceID),
            scrollContainer: this.makeRandomID(this.instanceID),
            viewport: this.makeRandomID(this.instanceID),
            search: this.makeRandomID(this.instanceID)
        };

        //Trees - used for referencing specific trees later
        this.trees = {
            main: null,
            siblings: null,
            parents: null,
            children: null
        };

        //Initialize core variables
        this.activeCharacter = null;
        this.activeSpouse = null;
        this.spouses = null;
        this.parents = null;
        this.children = null;
        this.grandParents = {};

        //Loader Progress
        this.progress = 0;

        //Zoom Vars
        this.zoom = {
            level: opts.config.initialZoom ? parseFloat(opts.config.initialZoom / 100) : 1,
            max: (opts.config.maxZoom ? Math.min(opts.config.maxZoom / 100, 5) : 5),
            min: (opts.config.minZoom ? Math.max(opts.config.minZoom / 100, 0.25) : 0.25),
            target: { x: 0, y: 0 },
            point: { x: 0, y: 0 },
            step: (opts.config.zoomStep ? Math.min(0.1, opts.config.zoomStep / 100) : 0.1),
            pos: { x: 0, y: 0 },
            size: {
                w: (opts.config.initialCanvasSize ? opts.config.initialCanvasSize : 3000),
                h: (opts.config.initialCanvasSize ? opts.config.initialCanvasSize : 3000)
            }
        }
        this.recursiveMax = opts.config.recursionMax || 200;
        this.recursiveLoops = 0;
        //Begin Initialization
        this.initialize();
    }

    initialize() {
        var instance = this;
        console.log('RHEA (FT): Initializing...');
        if (this.config.maxZoom && this.zoomLevel > this.config.maxZoom) {
            this.zoomLevel = this.config.maxZoom;
        }
        if (this.config.minZoom && this.zoomLevel < this.config.minZoom) {
            this.zoomLevel = this.config.minZoom;
        }

        this.createNodes()
            .then(function () {
                return instance.getCharacterData();
            })
            .then(function () {
                instance.makeFamilyTree(instance.config.initialCharacter);
            })
    }

    getBaseURL() {
        if (this.config.serverURL) {
            return this.config.serverURL;
        }
        console.log('[CLOTHO] No domain registered. Falling back to domain detection');
        var { protocol, host } = window.location;
        return `${protocol}//${host}`
    }

    createNodes() {
        var instance = this;
        return new Promise(function (resolve, reject) {
            console.log('RHEA (FT): Injecting HTML Nodes.')
            //Configure the viewport node
            var viewport = instance.rootNode;
            $(viewport)
                .attr('id', instance.nodes.viewport)
                .addClass('loading');

            //Create the Loader splash screen
            var loader = document.createElement('div');
            $(loader)
                .addClass('loader')
                .html('<div class="rhea-loader-text">Loading Family Tree</div>')
                .appendTo($(viewport));

            //Create and configure the canvas/scrolling-container
            var scrollContainer = document.createElement('div');
            $(scrollContainer)
                .attr('id', instance.nodes.scrollContainer)
                .addClass('scrollable-container')
                .appendTo($(viewport));

            //Create and configure the Descendants container - Children
            var childrenContainer = document.createElement('div');
            $(childrenContainer)
                .attr('id', instance.nodes.children)
                .addClass('ft-container children-tree')
                .appendTo($(scrollContainer));

            //Create Siblings container
            var siblings = document.createElement('div');
            $(siblings)
                .attr('id', instance.nodes.siblings)
                .addClass('ft-container siblings-tree')
                .appendTo($(scrollContainer));

            //Create Main Character Container (includes spouses, if any)
            var mainChar = document.createElement('div');
            $(mainChar)
                .attr('id', instance.nodes.main)
                .addClass('ft-container main-tree')
                .appendTo($(scrollContainer));

            //Create Parents Container
            var parents = document.createElement('div');
            $(parents)
                .attr('id', instance.nodes.parents)
                .addClass('ft-container parents-tree')
                .appendTo($(scrollContainer));

            //Search Box
            var searchContainer = document.createElement('div');
            var searchInput = document.createElement('input');
            var searchClear = document.createElement('button');
            var searchInputWrap = document.createElement('div');
            $(searchInput)
                .attr('id', instance.nodes.search)
                .attr('placeholder', 'Search family tree')
                .addClass('rhea-ft-search-input')
                .appendTo($(searchInputWrap));

            $(searchClear)
                .addClass('rhea-search-clear')
                .html('<i class="fal fa-times"></i>')
                .appendTo($(searchInputWrap))

            $(searchInputWrap)
                .addClass('rhea-search-input-wrap')
                .appendTo($(searchContainer))


            //Zoom Buttons
            if (instance.config.showZoomControls) {
                var btnZoomIn = document.createElement('button');
                var btnZoomOut = document.createElement('button');
                var zoomBtns = document.createElement('div');

                $(btnZoomOut)
                    .attr('zoom-direction', 'out')
                    .html('<i class="fad fa-search-minus fa-lg fa-fw"></i>')
                    .appendTo($(zoomBtns));

                $(btnZoomIn)
                    .attr('zoom-direction', 'in')
                    .html('<i class="fad fa-search-plus fa-lg fa-fw"></i>')
                    .appendTo($(zoomBtns));

                $(zoomBtns)
                    .addClass('rhea-ft-zoom-controls')
                    .appendTo($(searchContainer));


            }
            $(searchContainer)
                .addClass('rhea-ft-search')
                .appendTo($(viewport));

            //Center the Canvas within the viewport
            $(scrollContainer).css({
                left: -($(scrollContainer).width() / 2) + ($(viewport).innerWidth() / 2),
                top: -($(scrollContainer).height() / 2) + ($(viewport).innerHeight() / 2)
            });

            //Apply drag functionality (jQuery-UI)
            $(scrollContainer).draggable({
                start: function (event, ui) {
                    // var container = $(`#${instance.nodes.viewport}`);
                    // instance.zoom.point.x = (event.pageX - $('body').offset().left) / instance.zoom.level - parseInt($(event.target).css('left'));
                    // instance.zoom.point.y = (event.pageY - container.offset().top) / instance.zoom.level - parseInt($(event.target).css('top'));
                    // console.log(instance.zoom.point)
                    instance.zoom.point = {
                        x: (parseInt($(this).css('left'), 10) - ui.position.left),
                        y: (parseInt($(this).css('top'), 10) - ui.position.top)
                    }
                },
                drag: function (event, ui) {
                    var dx = ui.position.left - ui.originalPosition.left;
                    var dy = ui.position.top - ui.originalPosition.top;

                    ui.position.left = ui.originalPosition.left + (dx);
                    ui.position.top = ui.originalPosition.top + (dy);

                    ui.position.left += instance.zoom.point.x;
                    ui.position.top += instance.zoom.point.y
                    // var factor = (1 / instance.zoom.level) - 1;
                    // $(scrollContainer).css({
                    // 	'transform-origin': `${instance.zoom.point.x}px ${instance.zoom.point.y}`
                    // })
                    // ui.position.left += Math.round((ui.position.left - ui.originalPosition.left) * factor);
                    // ui.position.top += Math.round((ui.position.top - ui.originalPosition.top) * factor) ;
                    // ui.position.left = Math.round((ui.position.left - ui.originalPosition.left) / instance.zoom.level - instance.zoom.point.x);
                    // ui.position.top = Math.round((ui.position.top - ui.originalPosition.top) * factor) ;

                    // ui.offset.top = Math.round(ui.position.top + $(`#${instance.nodes.viewport}`).offset().top);
                    // ui.offset.left = Math.round(ui.position.left + $(`#${instance.nodes.viewport}`).offset().left);
                    // ui.position.top = Math.round(ui.position.top / instance.zoom.level);
                    // ui.position.left = Math.round(ui.position.left / instance.zoom.level);
                }
            });

            //Apply zoom functionality
            $(scrollContainer).on('mousewheel DOMMouseScroll', function (event) {
                instance.scrollZoom(event);
            })
            //Bind Search function to input
            $(searchInput).on('keyup', function (event) {
                instance.searchTree(event.target.value);
            })
            $(searchClear).on('click', function () {
                $(searchInput).val('')
            })

            $(`#${instance.nodes.viewport} .rhea-ft-zoom-controls button`).on('click', function (event) {
                var direction = $(event.currentTarget).attr('zoom-direction');
                var step = direction === 'out' ? -instance.zoom.step : instance.zoom.step;
                var currentZoom = instance.zoom.level;
                var newZoom = currentZoom + step;
                // console.log('Min', instance.zoom.min, 'max', instance.zoom.max);
                if (newZoom < instance.zoom.min) {
                    newZoom = instance.zoom.min;
                }
                if (newZoom > instance.zoom.max) {
                    newZoom = instance.zoom.max;
                }
                newZoom = parseFloat(newZoom.toString().substr(0, 3));
                // console.log('Zoom: ', newZoom)
                instance.zoom.level = newZoom;

                instance.setZoom(newZoom);
                // console.log(currentZoom, step)
            })

            //DEBUG: Show Guides
            if (instance.config.debug) {
                //Canvas Center Guide
                var canvasTarget = document.createElement('div');
                $(canvasTarget)
                    .addClass('debug-target target-canvas')
                    .css({
                        left: ($(scrollContainer).width() / 2) - 5.5,
                        top: ($(scrollContainer).height() / 2) - 5.5
                    })
                    .appendTo($(scrollContainer));

                //Viewport Center Guide
                var viewportTarget = document.createElement('div');
                $(viewportTarget)
                    .addClass('debug-target target-viewport')
                    .css({
                        left: ($(viewport).innerWidth() / 2) - 5.5,
                        top: ($(viewport).innerHeight() / 2) - 5.5
                    })
                    .appendTo($(viewport));

                //Viewport Axis X
                var axisX = document.createElement('div');
                $(axisX)
                    .addClass('debug-axis axis-x')
                    .css({
                        top: ($(viewport).innerHeight() / 2) - 1
                    })
                    .appendTo($(viewport));

                //Viewport Axis Y
                var axisX = document.createElement('div');
                $(axisX)
                    .addClass('debug-axis axis-y')
                    .css({
                        left: ($(viewport).innerWidth() / 2) - 1
                    })
                    .appendTo($(viewport));
            }

            //Finished. Return to initialize()
            resolve();
        })
    }

    makeFamilyTree(characterID) {
        var instance = this;
        this.clearTree()
            .then(function () {
                // console.log('Finding Character Data')
                return instance.getActiveCharacter(characterID);
            })
            .then(function () {
                return instance.getSpouses();
            })
            .then(function () {
                return instance.getParents(instance.activeCharacter);
            })
            .then(async function (parents) {
                // Get Active Character's great-grandparents
                for (var p = 0; p < parents.length; p++) {
                    var parent = parents[p];
                    //Grand Parents
                    parents[p].parents = await instance.getParents(parent);
                    for (var gp = 0; gp < parent.parents.length; gp++) {
                        var grandParent = parent.parents[gp];
                        //Great Grand Parents
                        parent.parents[gp].parents = await instance.getParents(grandParent);
                    }

                }

                //Set as class variable for other functions
                instance.parents = parents;
                console.log(`RHEA (FT): Ancestors of ${instance.activeCharacter.title}:`, parents);
            })
            .then(function () {
                console.log('here')
                console.log(`RHEA (FT): Getting Children of ${instance.activeCharacter.title}${instance.activeSpouse ? ' and ' + instance.activeSpouse.title : ''}`);
                return instance.getChildren(instance.activeCharacter, instance.activeSpouse, true);
            })
            .then(function (children) {
                console.log('RHEA (FT): Children', children);
                instance.children = children;
            })
            .then(function () {
                //change to pass in a character
                return instance.getSiblings();
            })
            .then(function (siblings) {
                instance.siblings = siblings;

            })
            .then(function () {
                //Prepare Main Tree
                return instance.prepareTree('main');
            })
            .then(function (mainTree) {
                //Render Main Tree
                var orientation = 'WEST';
                var verticalOffset = 0;
                if (instance.config.treeDirection) {
                    switch (instance.config.treeDirection) {
                        // Redirect Tree direction to match user preference
                        case 'bottom':
                            orientation = 'NORTH';
                            verticalOffset = 1;
                            break;
                        default:
                        case 'top':
                            orientation = 'SOUTH';
                            verticalOffset = 1;
                            break;
                        case 'left':
                            orientation = 'EAST';
                            break;
                        case 'right':
                            orientation = 'WEST';
                            break;
                    }
                }
                var config = {
                    tree: 'main',
                    chart: {
                        container: `#${instance.nodes.main}`,
                        rootOrientation: orientation,
                        connectors: {
                            type: 'step'
                        },
                        node: {
                            HTMLclass: 'ft-node'
                        },
                        nodeAlign: top,
                        hideRootNode: (!instance.children || instance.children.length == 0),
                        siblingSeparation: 80,
                        levelSeparation: verticalOffset === 1 ? 100 : 30
                    }
                };

                return instance.renderTree(mainTree, config);

            })
            .then(function (treeName) {

                return instance.positionTree(treeName);
            })
            .then(function () {

                //Prepare Siblings Tree
                return instance.prepareTree('siblings');
            })
            .then(function (siblingsTree) {
                //Render Siblings Tree
                // console.log('here')
                var orientation = 'EAST';
                var verticalOffset = 0;
                if (instance.config.treeDirection) {
                    switch (instance.config.treeDirection) {
                        //Redirect Tree direction to match user preference
                        case 'bottom':
                            orientation = 'SOUTH';
                            verticalOffset = 1;
                            break;
                        default:
                        case 'top':
                            orientation = 'NORTH';
                            verticalOffset = 1;
                            break;
                        case 'left':
                            orientation = 'WEST';
                            break;
                        case 'right':
                            orientation = 'EAST';
                            break;
                    }
                }
                var config = {
                    tree: 'siblings',
                    chart: {
                        container: `#${instance.nodes.siblings}`,
                        rootOrientation: orientation,
                        connectors: {
                            type: 'step'
                        },
                        node: {
                            HTMLclass: 'ft-node'
                        },
                        nodeAlign: top,
                        // hideRootNode: (!instance.children || instance.children.length == 0),
                        siblingSeparation: 80,
                        levelSeparation: verticalOffset === 1 ? 100 : 30
                    }
                };

                return instance.renderTree(siblingsTree, config);

            })
            .then(function (treeName) {
                return instance.positionTree(treeName);
            })
            .then(function () {

                //Prepare Children Tree
                return instance.prepareTree('children');
            })
            .then(function (childrenTree) {
                //Render Children Tree
                // console.log('here')
                var orientation = 'EAST';
                var verticalOffset = 0;
                if (instance.config.treeDirection) {
                    switch (instance.config.treeDirection) {
                        //Redirect Tree direction to match user preference
                        case 'bottom':
                            orientation = 'SOUTH';
                            verticalOffset = 1;
                            break;
                        default:
                        case 'top':
                            orientation = 'NORTH';
                            verticalOffset = 1;
                            break;
                        case 'left':
                            orientation = 'WEST';
                            break;
                        case 'right':
                            orientation = 'EAST';
                            break;
                    }
                }
                var config = {
                    tree: 'children',
                    chart: {
                        container: `#${instance.nodes.children}`,
                        rootOrientation: orientation,
                        connectors: {
                            type: 'step'
                        },
                        node: {
                            HTMLclass: 'ft-node'
                        },
                        nodeAlign: top,
                        // hideRootNode: (!instance.children || instance.children.length == 0),
                        siblingSeparation: 80,
                        levelSeparation: verticalOffset === 1 ? 100 : 30
                    }
                };

                return instance.renderTree(childrenTree, config);

            })
            .then(function (treeName) {
                return instance.positionTree(treeName);
            })
            .then(function () {

                //Prepare Parents Tree
                return instance.prepareTree('parents');
            })
            .then(function (parentsTree) {
                //Render Parents Tree
                // console.log('PARENTS TREE', parentsTree);
                var orientation = 'WEST';
                var verticalOffset = 0;
                if (instance.config.treeDirection) {
                    switch (instance.config.treeDirection) {
                        //Redirect Tree direction to match user preference
                        case 'bottom':
                            orientation = 'NORTH';
                            verticalOffset = 1;
                            break;
                        default:
                        case 'top':
                            orientation = 'SOUTH';
                            verticalOffset = 1;
                            break;
                        case 'left':
                            orientation = 'EAST';
                            break;
                        case 'right':
                            orientation = 'WEST';
                            break;
                    }
                }
                var config = {
                    verticalOffset,
                    tree: 'parents',
                    chart: {
                        container: `#${instance.nodes.parents}`,
                        rootOrientation: orientation,
                        connectors: {
                            type: 'step'
                        },
                        node: {
                            HTMLclass: 'ft-node'
                        },
                        nodeAlign: top,
                        // hideRootNode: (!instance.children || instance.children.length == 0),
                        siblingSeparation: 80,
                        levelSeparation: verticalOffset === 1 ? 100 : 30
                    }
                };

                return instance.renderTree(parentsTree, config);

            })
            .then(function (treeName) {
                return instance.positionTree(treeName);
            })
            .then(function () {
                var node = $(`#${instance.nodes.scrollContainer} .main-character`).get(0);
                instance.centerScrollContainer(node);
            })
            .then(function () {
                instance.registerEvents();
                instance.zoom.level = instance.config.initialZoom ? parseFloat(instance.config.initialZoom / 100) : 1;
                $(`#${instance.nodes.scrollContainer}`).css('transition-timing-function', 'ease-out')
                $(`#${instance.nodes.scrollContainer}`).css('transition-duration', '.5s')
                $(`#${instance.nodes.scrollContainer}`).css('transform', `scale(${instance.zoom.level},${instance.zoom.level})`);
                setTimeout(function () {
                    $(`#${instance.nodes.scrollContainer}`).css('transition-duration', '0s');
                    $(`#${instance.nodes.scrollContainer}`).css('transition-timing-function', 'linear')
                }, 1000)
                $(`#${instance.nodes.viewport}`).removeClass('loading');
                console.log('RHEA (FT): Processing complete.');
            })
            .catch(function (msg) {
                console.warn('RHEA (FT): ' + msg);
            })

    }

    getActiveCharacter(characterID) {
        var instance = this;
        return new Promise(function (resolve, reject) {
            var worldID = instance.config.worldID;

            if (characterID) {
                var characters = WorldData[worldID].characters;
                if (characters && characters.length) {
                    characters.filter(function (character) {
                        if (character.id === characterID) {
                            instance.activeCharacter = character;
                            console.log('RHEA (FT): Found Active Character');
                            resolve();
                        }
                        return false;
                    });
                } else {
                    reject(`Unable to find a character with ID "${characterID}" in world with ID "${worldID}"`);
                }

            } else {
                reject('No character ID.');
            }
        })
    }

    getSpouses() {
        var instance = this;
        return new Promise(function (resolve, reject) {
            if (instance.activeCharacter) {
                console.log(`RHEA (FT): Finding Spouses of "${instance.activeCharacter.title}"`);
                var spouses = [];
                var worldID = instance.config.worldID;
                var characters = WorldData[worldID].characters;
                var relations = WorldData[worldID].relations;
                var activeCharacter = instance.activeCharacter;
                if (characters && relations) {
                    for (var r = 0; r < relations.length; r++) {
                        var relation = relations[r];
                        if (relation.subtype === 'spouses') {
                            if (relation.character1 === activeCharacter.id) {
                                for (var c = 0; c < characters.length; c++) {
                                    var character = characters[c];
                                    if (character.id === relation.character2) {
                                        spouses.push(character);
                                    }
                                }
                            }
                            if (relation.character2 === activeCharacter.id) {
                                for (var c = 0; c < characters.length; c++) {
                                    var character = characters[c];
                                    if (character.id === relation.character1) {
                                        spouses.push(character);
                                    }
                                }
                            }
                        }
                    }

                    console.log(`RHEA (FT): Found ${spouses.length} spouses for "${activeCharacter.title}".`, spouses);
                    instance.spouses = spouses;

                    //Set Active Spouse
                    if (instance.config.initialSpouse) {
                        console.log('Predetermined spouse given. Looking up spouse', instance.config.initialSpouse)
                        for (var s = 0; s < spouses.length; s++) {
                            var spouse = spouses[s];
                            if (instance.config.initialSpouse === spouse.id) {
                                console.log(`RHEA (FT): Setting "${spouse.title}" as the active spouse.`);
                                instance.activeSpouse = spouse;
                                continue;
                            }
                        }
                    } else {
                        if (spouses.length > 0) {
                            console.log(`RHEA (FT): Setting "${spouses[0].title}" as the active spouse.`);
                            instance.activeSpouse = spouses[0];
                        } else {
                            console.log(`RHEA (FT): Completed spouse lookup, but no spouses were found.`)
                        }

                    }
                    resolve();
                }

            } else {
                reject('No Active Character is defined.');
            }

        })
    }

    getParents(character, type = "both") {
        var instance = this;
        return new Promise(function (resolve, reject) {
            var parents = [];

            // if(levelsDone && levelsDone < instance.config.maxParentLevels) {
            var worldID = instance.config.worldID;
            var characters = WorldData[worldID].characters;
            var activeCharacter = character;
            if (characters && characters.length) {
                if (activeCharacter) {
                    switch (type) {
                        case 'biological': {
                            for (var p = 0; p < characters.length; p++) {
                                var parent = characters[p];
                                if (parent.id === activeCharacter.parentBiological1 || parent.id === activeCharacter.parentBiological2) {

                                    parent.biological = true;
                                    parents.push(parent);
                                }
                            }
                            break;
                        }
                        case 'adopting': {
                            for (var p = 0; p < characters.length; p++) {
                                var parent = characters[p];
                                if (parent.id === activeCharacter.parentAdopting1 || parent.id === activeCharacter.parentAdopting2) {
                                    parents.push(parent);
                                }
                            }
                            break;
                        }
                        default: {
                            for (var p = 0; p < characters.length; p++) {
                                var parent = characters[p];
                                if (parent.id === activeCharacter.parentBiological1 || parent.id === activeCharacter.parentBiological2 || parent.id === activeCharacter.parentAdopting1 || parent.id === activeCharacter.parentAdopting2) {
                                    if (parent.id === activeCharacter.parentBiological1 || parent.id === activeCharacter.parentBiological2) {
                                        parent.biological = true;
                                    }
                                    parents.push(parent);
                                }
                            }
                            break;
                        }
                    }
                    // instance.parents = parents;
                    // console.log(`RHEA (FT): Found ${parents.length} parents for "${character.title}".`, parents)
                    resolve(parents)
                } else {
                    reject('Unable to find parents. No character defined.');
                }
            } else {
                reject('Unable to find parents. No character data.');
            }
            // }

        })
    }

    getSiblings() {
        var instance = this;
        return new Promise(async function (resolve, reject) {
            console.log(`RHEA (FT): Finding siblings for "${instance.activeCharacter.title}".`)
            var worldID = instance.config.worldID;
            var characters = WorldData[worldID].characters;
            var relations = WorldData[worldID].relations;

            var siblings = [];
            if (characters) {
                var parents = instance.parents;
                if (parents && parents.length > 0) {
                    for (var p = 0; p < parents.length; p++) {
                        var parent = parents[p];
                        var children = await instance.getChildren(parent, null, false);
                        for (var c = 0; c < children.length; c++) {
                            var child = children[c];
                            if (instance.activeCharacter.id !== child.id) {
                                if (parents.length === 2) {
                                    var parentA = parents[0];
                                    var parentB = parents[1];
                                    if (child.parentBiological1 === parentA.id) {
                                        if (!child.parentBiological2 || child.parentBiological2 !== parentB.id) {
                                            // console.log('parentBio1 matches, halfblood',child)
                                            child.halfblood = true;
                                        }
                                    }
                                    if (child.parentBiological1 === parentB.id) {
                                        if (!child.parentBiological2 || child.parentBiological2 !== parentA.id) {
                                            // console.log('ParentBio2 matches, halfblood',child)
                                            child.halfblood = true;
                                        }
                                    }
                                }
                                // console.log('SIBLINGS', siblings)
                                siblings.push(child);
                            }
                        }
                    }


                }
            }

            //Disabled - Parents need to be defined to prevent visual error, and if set
            // will already display siblings correctly.
            // if (relations && relations.length > 0) {
            //     var validRelations = relations.filter(function (rel) {
            //         return rel.subtype === 'siblings';
            //     })

            //     for (var r = 0; r < validRelations.length; r++) {
            //         var relation = validRelations[r];
            //         if (instance.activeCharacter.id === relation.character1) {
            //             //Get Character relation.character2,
            //             var sibling = characters.filter(function (character) {
            //                 return character.id === relation.character2;
            //             })

            //             if (sibling && sibling.length > 0) {
            //                 siblings.push(sibling[0])
            //             }
            //         }
            //         if (instance.activeCharacter.id === relation.character2) {
            //             //Get Character relation.character1,
            //             var sibling = characters.filter(function (character) {
            //                 return character.id === relation.character2;
            //             })

            //             if (sibling && sibling.length > 0) {
            //                 siblings.push(sibling[0])
            //             }
            //         }
            //     }
            // }


            var siblingsSet = new Set(siblings);
            var filteredSiblings = siblings.filter(function (sibling) {
                var duplicate = siblingsSet.has(sibling.id);
                siblingsSet.add(sibling.id);
                return !duplicate;
            })
            // console.log(siblings, filteredSiblings);
            console.log(`RHEA (FT): Found ${filteredSiblings.length} siblings for "${instance.activeCharacter.title}".`)
            resolve(filteredSiblings);
        })
    }

    getChildren(activeCharacter, spouse = null, getNested = true) {
        var instance = this;
        return new Promise(async function (resolve, reject) {
            var children = [];
            var characters = WorldData[instance.config.worldID].characters;

            if (characters && characters.length) {
                if (spouse) {
                    for (var c = 0; c < characters.length; c++) {
                        var character = characters[c];
                        if (character.parentBiological1 === activeCharacter.id) {
                            if (character.parentAdopting1 === spouse.id || character.parentAdopting2 === spouse.id || character.parentBiological2 === spouse.id) {
                                character.biological = true;
                                character.halfblood = (character.parentAdopting1 === spouse.id || character.parentAdopting2 === spouse.id ? true : false);
                                children.push(character);
                            }
                        }
                        if (character.parentBiological2 === activeCharacter.id) {
                            if (character.parentAdopting1 === spouse.id || character.parentAdopting2 === spouse.id || character.parentBiological1 === spouse.id) {
                                character.biological = true;
                                character.halfblood = (character.parentAdopting1 === spouse.id || character.parentAdopting2 === spouse.id ? true : false);
                                children.push(character);
                            }
                        }
                        if (character.parentAdopting1 === activeCharacter.id) {
                            if (character.parentAdopting2 === spouse.id) {
                                // if(character.parentBiological1 === spouse.id || character.parentBiological2 === spouse.id) {
                                // 	character.halfblood = true;
                                // }
                                children.push(character);
                            }

                        }
                        if (character.parentAdopting2 === activeCharacter.id) {
                            if (character.parentAdopting1 === spouse.id) {

                                children.push(character);
                            }

                        }
                    }
                }
                if (!spouse) {
                    // console.log('no spouse, finding children of ' + activeCharacter.title)
                    // console.log('CHARS', characters)
                    for (var c = 0; c < characters.length; c++) {
                        var character = characters[c];
                        if (character.parentBiological1 === activeCharacter.id || character.parentBiological2 === activeCharacter.id || character.parentAdopting1 === activeCharacter.id || character.parentAdopting2 === activeCharacter.id) {
                            character.halfblood = false;
                            if (character.parentBiological1 === activeCharacter.id || character.parentBiological2 === activeCharacter.id) {
                                character.biological = true
                            }
                            if (character.parentAdopting1 === activeCharacter.id || character.parentAdopting2 === activeCharacter.id) {
                                character.halfblood = true;
                            }
                            children.push(character);
                        }
                    }
                }
                // console.log('Found children for ' + activeCharacter.title)
                if (getNested) {
                    if (children && children.length > 0 && instance.recursiveLoops < instance.recursiveMax) {
                        for (var c = 0; c < children.length; c++) {
                            instance.recursiveLoops++;
                            children[c].children = await instance.getChildren(children[c]);
                        }
                    } else if (instance.recursiveLoops >= instance.recursiveMax) {
                        console.log('RHEA (FT): Recursion limit exceeded!')
                    }
                }

            }

            children = children.sort(function (childA, childB) {
                if (childA.dob && parseInt(childA.dob, 10)) {
                    if (childB.dob && parseInt(childB.dob, 10)) {
                        return parseInt(childA.dob, 10) < parseInt(childB.dob, 10) ? -1 : 1;
                    }
                }
            });

            resolve(children);
        })
    }

    prepareTree(type) {
        var instance = this;
        return new Promise(function (resolve, reject) {
            var tree = [];
            switch (type) {
                //Generate Main Character Tree Structure
                case 'main': {
                    var activeCharacter = instance.activeCharacter;
                    tree.push({
                        text: {
                            'data-character-id': activeCharacter.id
                        },
                        innerHTML: instance.generateCharacterNode(activeCharacter, 'main')
                    });

                    if (instance.activeSpouse) {
                        tree.push({
                            text: {
                                'data-character-id': instance.activeSpouse.id
                            },
                            innerHTML: instance.generateCharacterNode(instance.activeSpouse, 'spouse')
                        });
                    }
                    resolve(tree);
                    break;
                }
                case 'siblings': {
                    var siblings = instance.siblings;
                    if (siblings && siblings.length > 0) {
                        for (var s = 0; s < siblings.length; s++) {
                            var sibling = siblings[s];
                            tree.push({
                                text: {
                                    'data-character-id': sibling.id
                                },
                                innerHTML: instance.generateCharacterNode(sibling, 'sibling')
                            })
                        }
                        tree.push({
                            text: {
                                'data-fake-root': true
                            }
                        })
                    }
                    resolve(tree);
                    break;
                }
                case 'children': {
                    var children = instance.children;
                    if (children && children.length > 0) {
                        for (var c = 0; c < children.length; c++) {
                            var child = children[c];
                            var node = {
                                text: {
                                    'data-character-id': child.id
                                },
                                innerHTML: instance.generateCharacterNode(child, 'child')
                            }
                            if (child.children && child.children.length > 0) {
                                node.children = [];
                                for (var gc = 0; gc < child.children.length; gc++) {
                                    var grandchild = child.children[gc];
                                    node.children.push({
                                        text: {
                                            'data-character-id': grandchild.id
                                        },
                                        innerHTML: instance.generateCharacterNode(grandchild, 'grandchild')
                                    })
                                }
                            }
                            tree.push(node);
                        }
                    }
                    resolve(tree);
                    break;
                }
                case 'parents': {
                    var parents = instance.parents;
                    if (parents && parents.length > 0) {
                        for (var p = 0; p < parents.length; p++) {
                            var parent = parents[p];
                            var node = {
                                text: {
                                    'data-character-id': parent.id
                                },
                                innerHTML: instance.generateCharacterNode(parent, 'parent')
                            }
                            if (parent.parents && parent.parents.length > 0) {
                                node.children = [];
                                for (var gp = 0; gp < parent.parents.length; gp++) {
                                    var grandparent = parent.parents[gp];
                                    var gpNode = {
                                        text: {
                                            'data-character-id': grandparent.id
                                        },
                                        innerHTML: instance.generateCharacterNode(grandparent, 'grandparent')
                                    }
                                    if (grandparent.parents && grandparent.parents.length > 0) {
                                        gpNode.children = [];
                                        for (var ggp = 0; ggp < grandparent.parents.length; ggp++) {
                                            var greatgrandparent = grandparent.parents[ggp];
                                            gpNode.children.push({
                                                text: {
                                                    'data-character-id': greatgrandparent.id
                                                },
                                                innerHTML: instance.generateCharacterNode(greatgrandparent, 'greatgrandparent')
                                            });
                                        }
                                    }
                                    node.children.push(gpNode);
                                }
                            }
                            tree.push(node);
                        }
                    }
                    resolve(tree);
                    break;
                }
            }
        })
    }

    renderTree(tree, treeConfig) {
        var instance = this;
        console.log(`RHEA (FT): Rendering Tree "${treeConfig.tree}"`)
        return new Promise(function (resolve, reject) {
            //Setup callback to return to main processing when rendering is complete.
            treeConfig.chart.callback = {
                onTreeLoaded: function () {
                    resolve(treeConfig.tree);
                }
            };
            treeConfig.chart.scrollbar = 'None';

            //Create Tree and store reference for later use.
            instance.trees[treeConfig.tree] = new Treant({
                chart: treeConfig.chart,
                nodeStructure: {
                    pseudo: true,
                    levelSeparation: treeConfig.verticalOffset === 1 ? 100 : 60,
                    children: tree,
                }
            })
        })
    }

    positionTree(treeName) {
        var instance = this;
        return new Promise(function (resolve, reject) {
            var tree = $(`#${instance.nodes[treeName]}`);
            var canvas = $(`#${instance.nodes.scrollContainer}`);
            var origin = {
                left: canvas.width() / 2,
                top: canvas.height() / 2
            };
            console.log(`RHEA (FT): Positioning Tree "${treeName}"`)
            var direction = instance.config.treeDirection || 'default';
            console.log(`RHEA (FT): Tree Orientation "${direction}"`)
            switch (treeName) {
                case 'main': {
                    var activeCharacterNode = $(`#${instance.nodes.main} [data-character-id="${instance.activeCharacter.id}"]`);

                    switch (direction) {
                        case 'bottom': {
                            if (instance.children && instance.children.length > 0) {
                                tree.css({
                                    // left: Math.floor(origin.left - ((tree.outerWidth() / 2)) - (instance.children && instance.children.length > 0 ? 15 : 0)),
                                    left: Math.floor(origin.left - (activeCharacterNode.parent().outerWidth() / 2) - 15),
                                    top: Math.floor(origin.top - (activeCharacterNode.parent().outerHeight() / 2) - 45)
                                });
                            } else {
                                tree.css({
                                    // left: Math.floor(origin.left - ((tree.outerWidth() / 2)) - (instance.children && instance.children.length > 0 ? 15 : 0)),
                                    left: Math.floor(origin.left - (activeCharacterNode.parent().outerWidth() / 2) - 15),
                                    top: Math.floor(origin.top - (activeCharacterNode.parent().outerHeight() / 2) - 15)
                                });
                            }

                            break;
                        }
                        default:
                        case 'top': {
                            tree.css({
                                // left: Math.floor(origin.left - ((tree.outerWidth() / 2)) - (instance.children && instance.children.length > 0 ? 15 : 0)),
                                left: Math.floor(origin.left - (activeCharacterNode.parent().outerWidth() / 2) - 15),
                                top: Math.floor(origin.top - (activeCharacterNode.parent().outerHeight() / 2) - 15)
                            });
                            break;
                        }
                        case 'left': {
                            tree.css({
                                left: Math.floor(origin.left - ((tree.outerWidth() / 2)) - (instance.children && instance.children.length > 0 ? -15 : 0)),
                                top: Math.floor(origin.top - (activeCharacterNode.parent().outerHeight() / 2) - 15)
                            })
                            break;
                        }
                        case 'right': {
                            // console.log(activeCharacterNode.parent().parent())
                            tree.css({
                                left: Math.floor(origin.left - ((tree.outerWidth() / 2)) - (instance.children && instance.children.length > 0 ? 15 : 0)),
                                top: Math.floor(origin.top - (activeCharacterNode.parent().outerHeight() / 2) - 15)
                            });
                            break;
                        }
                        // default: {
                        // 	// console.log(activeCharacterNode.parent().parent())
                        // 	tree.css({
                        // 		left: Math.floor(origin.left - ((tree.outerWidth() / 2)) - (instance.children && instance.children.length > 0 ? 15 : 0)),
                        // 		top: Math.floor(origin.top - (activeCharacterNode.parent().outerHeight() / 2) - 15)
                        // 	});
                        // 	break;
                        // }
                    }
                    break;
                }
                case 'siblings': {
                    var activeCharacterNode = $(`#${instance.nodes.main} [data-character-id="${instance.activeCharacter.id}"]`);

                    switch (direction) {
                        case 'bottom': {
                            tree.css({
                                left: Math.floor(origin.left - tree.outerWidth() + (activeCharacterNode.parent().outerWidth() / 2) + 15),
                                // top: Math.floor(origin.top - tree.outerHeight() + (activeCharacterNode.parent().outerHeight() / 2) + 15)
                                top: Math.floor(origin.top - (activeCharacterNode.parent().outerHeight() / 2) - 15)
                            });
                            break;
                        }
                        default:
                        case 'top': {
                            tree.css({
                                left: Math.floor(origin.left - tree.outerWidth() + (activeCharacterNode.parent().outerWidth() / 2) + 15),
                                top: Math.floor(origin.top - tree.outerHeight() + (activeCharacterNode.parent().outerHeight() / 2) + 15)
                            });
                            break;
                        }
                        case 'left': {
                            tree.css({
                                left: Math.floor(origin.left - (activeCharacterNode.outerWidth() / 2) - 40),
                                top: Math.floor(origin.top - tree.outerHeight() + (activeCharacterNode.parent().outerHeight() / 2) + 15)
                            });
                            break;
                        }
                        case 'right': {
                            tree.css({
                                left: Math.floor(origin.left - (activeCharacterNode.outerWidth() / 2) - 15),
                                top: Math.floor(origin.top - tree.outerHeight() + (activeCharacterNode.parent().outerHeight() / 2) + 15)
                            });
                            break;
                        }
                    }
                    break;
                }
                case 'children': {
                    if (instance.children && instance.children.length > 0) {
                        // console.log('Children Tree', tree)
                        var activeCharacterNode = $(`#${instance.nodes.main} [data-character-id="${instance.activeCharacter.id}"]`);
                        var childrenRoot = $(tree.find('.pseudo').get(0));
                        var mainRoot = $(`#${instance.nodes.main} .pseudo`);
                        switch (direction) {
                            case 'bottom': {
                                tree.css({
                                    left: Math.floor((activeCharacterNode.parent().parent().position().left - childrenRoot.position().left) + mainRoot.position().left),
                                    top: Math.floor((activeCharacterNode.parent().parent().position().top - childrenRoot.position().top) + mainRoot.position().top)
                                });
                                break;
                            }
                            default:
                            case 'top': {
                                tree.css({
                                    left: Math.floor((activeCharacterNode.parent().parent().position().left - childrenRoot.position().left) + mainRoot.position().left),
                                    top: Math.floor((activeCharacterNode.parent().parent().position().top - childrenRoot.position().top) + mainRoot.position().top)
                                });
                                break;
                            }
                            case 'left': {
                                tree.css({
                                    left: Math.floor(origin.left + (activeCharacterNode.parent().outerWidth() / 2)),
                                    top: Math.floor((activeCharacterNode.parent().parent().position().top - childrenRoot.position().top) + mainRoot.position().top)
                                });
                                break;
                            }
                            case 'right': {
                                tree.css({
                                    // right: Math.floor(origin.left + (activeCharacterNode.parent().outerWidth() / 2)),
                                    left: Math.floor(origin.left - tree.outerWidth() - (activeCharacterNode.parent().outerWidth() / 2)),
                                    top: Math.floor((activeCharacterNode.parent().parent().position().top - childrenRoot.position().top) + mainRoot.position().top)
                                });
                                break;
                            }
                        }
                        break;
                    }

                }
                case 'parents': {
                    var activeCharacterNode = $(`#${instance.nodes.main} [data-character-id="${instance.activeCharacter.id}"]`);
                    var parentsRoot = $(tree.find('.pseudo').get(0));
                    switch (direction) {
                        case 'bottom': {
                            if (instance.siblings && instance.siblings.length > 0) {
                                var siblingsTree = $(`#${instance.nodes.siblings}`);
                                var siblingsRoot = $(siblingsTree.find('.pseudo').get(0));


                                tree.css({
                                    // right: Math.floor(origin.left + (activeCharacterNode.parent().outerWidth() / 2) ),
                                    left: Math.floor((siblingsTree.position().left + siblingsRoot.position().left) - parentsRoot.position().left),
                                    top: Math.floor((siblingsTree.position().top + siblingsRoot.position().top) - parentsRoot.position().top)
                                })
                            } else {
                                tree.css({
                                    left: Math.floor(origin.left - parentsRoot.position().left + 15),
                                    // top: Math.floor((origin.top - tree.outerHeight() - (activeCharacterNode.parent().outerHeight() / 2)) + 15)
                                    top: Math.floor(origin.top + (activeCharacterNode.parent().outerHeight() / 2) - 15)
                                })
                            }
                            break;
                        }
                        default:
                        case 'top': {
                            if (instance.siblings && instance.siblings.length > 0) {
                                var siblingsTree = $(`#${instance.nodes.siblings}`);
                                var siblingsRoot = $(siblingsTree.find('.pseudo').get(0));


                                tree.css({
                                    // right: Math.floor(origin.left + (activeCharacterNode.parent().outerWidth() / 2) ),
                                    left: Math.floor((siblingsTree.position().left + siblingsRoot.position().left) - parentsRoot.position().left),
                                    top: Math.floor((siblingsTree.position().top + siblingsRoot.position().top) - parentsRoot.position().top)
                                })
                            } else {
                                tree.css({
                                    left: Math.floor(origin.left - parentsRoot.position().left + 15),
                                    top: Math.floor((origin.top - tree.outerHeight() - (activeCharacterNode.parent().outerHeight() / 2)) + 15)
                                })
                            }
                            break;
                        }
                        case 'left': {
                            if (instance.siblings && instance.siblings.length > 0) {
                                var siblingsTree = $(`#${instance.nodes.siblings}`);
                                var siblingsRoot = $(siblingsTree.find('.pseudo').get(0));


                                tree.css({
                                    right: Math.floor(origin.left + (activeCharacterNode.parent().outerWidth() / 2)),
                                    top: Math.floor((siblingsTree.position().top + siblingsRoot.position().top) - parentsRoot.position().top)
                                })
                            } else {
                                tree.css({
                                    right: Math.floor(origin.left + (activeCharacterNode.parent().outerWidth() / 2) - 15),
                                    top: Math.floor((origin.top - parentsRoot.position().top) + 12)
                                })
                            }
                            break;
                        }
                        case 'right': {
                            if (instance.siblings && instance.siblings.length > 0) {
                                var siblingsTree = $(`#${instance.nodes.siblings}`);
                                var siblingsRoot = $(siblingsTree.find('.pseudo').get(0));


                                tree.css({
                                    left: Math.floor(origin.left + (activeCharacterNode.parent().outerWidth() / 2)),
                                    top: Math.floor((siblingsTree.position().top + siblingsRoot.position().top) - parentsRoot.position().top)
                                })
                            } else {
                                tree.css({
                                    left: Math.floor(origin.left + (activeCharacterNode.parent().outerWidth() / 2) - 15),
                                    top: Math.floor((origin.top - parentsRoot.position().top) + 12)
                                })
                            }
                            // var offsetTop = (
                            // 	instance.siblings && instance.siblings.length > 0
                            // 	? ($(`#${instance.nodes.siblings}`).outerHeight() / 2) - (activeCharacterNode.parent().outerHeight() / 2)
                            // 	: 0
                            // )
                            // tree.css({
                            // 	left: Math.floor(origin.left + (activeCharacterNode.parent().outerWidth() / 2)),
                            // 	top: Math.floor(origin.top - (tree.outerHeight() / 2) - (activeCharacterNode.parent().outerHeight() / 2) + 10 - offsetTop)
                            // })
                        }
                    }
                    break;
                }
            }
            resolve();
        })
    }

    generateCharacterNode(character, type) {
        var instance = this;
        var className = '';
        switch (type) {
            case 'main': {
                className = 'main-character';
                break;
            }
            case 'sibling': {
                className = 'character-sibling';
                if (character && character.halfblood) {
                    className += ' character-halfblood';
                }
                break;
            }
            case 'spouse': {
                className = 'character-spouse';
                break;
            }
            case 'child': {
                className = 'character-child';
                break;
            }
            case 'grandchild': {
                className = 'character-grandchild';
                break;
            }
            case 'parent': {
                className = 'character-parent';
                break;
            }
            case 'grandparent': {
                className = 'character-grandparent';
                break;
            }
            case 'greatgrandparent': {
                className = 'character-greatgrandparent';
                break;
            }
            default: {
                className = '';
            }
        }
        var halfblood = (character.halfblood ? 'character-halfblood' : '');
        var template = `
		<div class="rhea-character-node ${className} ${halfblood}" data-character-id="${character.id}">
			<div class="character-portrait">
				<div class="character-portrait-wrapper">
					<img src="${instance.constructImageURL(character.portrait_id) || instance.generateCharImage()}" alt="">
				</div>
			</div>
			${!character.biological && type !== 'main' ? `
				<!-- Not Blood Descendant -->
				<span class="character-blood"></span>`
                : ''}
			${character.halfblood && type === 'sibling' ? `
				<!-- Half-Blood -->
				<span class="half-blood"></span>`
                : ''}
			${type === 'spouse' && instance.spouses && instance.spouses.length > 1 ? `
				<!-- Spouse Switching Buttons -->
				<div class="character-switch-btns">
					<span class="character-btn character-prev" data-direction="prev">
						<i class="fas fa-chevron-circle-left fa-lg"></i>
					</span>
					<span class="character-btn character-next" data-direction="next">
						<i class="fas fa-chevron-circle-right fa-lg"></i>
					</span>
				</div>
			`: ''}							
			<div class="character-data">
				<div class="character-label">
					<span class="character-title">
						${character.honorific ? character.honorific : ''}
					</span>
					<a href="${character.person_url || '#'}" class="character-name">
						${character.firstname && character.lastname ? character.firstname + ' ' + character.lastname : character.title ? character.title : 'Unknown'}
					</a>
					<span class="character-life">
						${character.dob ? character.dob : ''}
						${character.dob && character.dod ? ' - ' : ''}
						${character.dod ? character.dod : ''}
					</span>
				</div>
				${type !== 'main' ? `
					<span class="character-relationship">
						${type.charAt(0).toUpperCase() + type.substring(1)}
					</span>
				`: ''}
			</div>				
		</div>`;
        return template;
    }

    registerEvents() {
        var instance = this;
        if (!instance.config.disableUserEvents) {
            //Bind Event handler for Spouse Switching
            $(`#${instance.nodes.viewport} .character-btn`).on('click', function (ev) {
                ev.preventDefault();
                var direction = $(ev.currentTarget).data('direction');
                var currentSpouseID = instance.activeSpouse.id || null;
                instance.changeActiveSpouse(currentSpouseID, direction);
                return false;
            })
            //Bind Event handler for character changing
            $(`#${instance.nodes.viewport} .rhea-character-node`).on('click', function (ev) {
                // console.log($(ev.currentTarget).data('character-id'));
                instance.changeActiveChar($(ev.currentTarget).data('character-id'));
                return false;
            })

            //Disable the hyperlinks from triggering re-rendering
            $('.character-name').on('click', function (ev) {
                ev.stopPropagation();
            })
        }
    }

    changeActiveChar(characterID) {
        var instance = this;
        $(`#${this.nodes.viewport}`).addClass('loading');
        // $(`#${this.nodes.scrollContainer}`)
        // .css('transition-duration', '.5s')
        // .css('transform','scale(1,1)');
        // this.setZoom(1).then(function() {
        // 	instance.makeFamilyTree(characterID);
        // }).then(function(){
        // 	instance.centerScrollContainer($(`#${instance.nodes.scrollContainer} [data-character-id="${characterID}"]`).get(0))
        // })
        // console.log($(`#${instance.nodes.scrollContainer} [data-character-id="${characterID}"]`).get(0))
        // instance.centerScrollContainer($(`#${instance.nodes.scrollContainer} [data-character-id="${characterID}"]`).get(0));
        instance.makeFamilyTree(characterID)
    }

    setZoom(scale) {
        var instance = this;
        return new Promise(async function (resolve, reject) {
            var scrollContainer = $(`#${instance.nodes.scrollContainer}`);
            await scrollContainer
                // .css('transform-origin', `${scrollContainer.position().left}px ${scrollContainer.position().top}px`)
                // .delay(1)
                .css('transition-duration', '0s')
                .css('transform', `scale(${scale})`)

            resolve()
        })
    }

    changeActiveSpouse(spouseID, direction) {
        var instance = this;

        if (spouseID) {
            $(`#${instance.nodes.viewport}`).addClass('loading');
            var index = 0;
            var spouses = instance.spouses;

            for (var s = 0; s < spouses.length; s++) {
                if (spouses[s].id === spouseID) {
                    index = s;
                    continue;
                }
            }

            if (direction === 'prev') {
                index -= 1;
                if (index < 0) {
                    index = spouses.length - 1
                }
            }

            if (direction === 'next') {
                index += 1;
                if (index >= spouses.length) {
                    index = 0;
                }
            }

            instance.config.initialSpouse = spouses[index].id;

            instance.makeFamilyTree(instance.activeCharacter.id);
        }
    }

    searchTree(query) {
        var instance = this;
        var minLength = instance.config.minInputLength || 3;
        var worldID = instance.config.worldID;
        var characters = WorldData ? WorldData[worldID] ? WorldData[worldID].characters : null : null;
        var searchFields = instance.config.searchFields ? instance.config.searchFields.split('|') : ['title'];

        if (!query || query.length === 0) {
            var node = $(`#${instance.nodes.main} .main-character`).get(0);
            // console.log('Resetting orientation to ', node)
            instance.centerScrollContainer(node)
        }

        if (query.length < minLength) {
            return false;
        }

        if (!worldID || !characters) {
            console.error('RHEA (BL): Unable to search. Missing either WORLD_ID or character data from world.')
            return false;
        }

        $(`#${instance.nodes.viewport} .rhea-search-result`).removeClass('rhea-search-result');
        searchLoop:
        for (var f = 0; f < searchFields.length; f++) {
            var fieldName = searchFields[f];
            for (var i = 0; i < characters.length; i++) {
                var character = characters[i];
                if (character[fieldName] && character[fieldName].toLowerCase().indexOf(query.toLowerCase()) > -1) {
                    var node = $(`#${instance.nodes.viewport} [data-character-id="${character.id}"]`).get(0);
                    if (node) {
                        // console.log(node);
                        console.log(`RHEA (FT): Search (${fieldName}) found character:`, character);
                        $(node).addClass('rhea-search-result');
                        instance.centerScrollContainer(node);
                        // instance.setZoom(1).then(function() {
                        // 	// setTimeout(function() {
                        // 		$(node).addClass('rhea-search-result');
                        // 		instance.centerScrollContainer(node);
                        // 	// },300)
                        // });

                        break searchLoop;
                    }
                }
            }
        }
    }

    async centerScrollContainer(characterNode = null) {
        var instance = this;
        var scrollContainer = $(`#${instance.nodes.scrollContainer}`);
        var viewport = $(`#${instance.nodes.viewport}`);
        // var currentOrigin = scrollContainer.css('transform-origin'); //Transition Origin
        // console.log('origin',currentOrigin);
        this.setZoom(1).then(function () {
            $(`#${instance.nodes.scrollContainer}`).addClass('scroll-tree');
            //If no element/node is passed, center on origin
            if (!characterNode) {
                scrollContainer.css({
                    left: -(scrollContainer.width() / 2) + (viewport.innerWidth() / 2),
                    top: -(scrollContainer.height() / 2) + (viewport.innerHeight() / 2)
                });
            } else {
                var nodeContainer = $(characterNode).parent().parent();
                var parentNode = $(characterNode).parent();
                // console.log(nodeContainer,characterNode)
                var nodePosition = {
                    // left: -(nodeContainer.position().left + parentNode.position().left + (parentNode.width() / 2)),
                    // top: -(nodeContainer.position().top + parentNode.position().top + (parentNode.width() / 2))
                    left: -(nodeContainer.position().left + parentNode.position().left - (viewport.width() / 2) + (parentNode.width() / 2)),
                    top: -(nodeContainer.position().top + parentNode.position().top - (viewport.height() / 2) + (parentNode.height() / 2))
                }
                // console.log(nodeContainer.position().top, parentNode.position().top, parentNode.height())
                // console.log(nodePosition)
                scrollContainer.css(nodePosition)
                // scrollContainer.css({
                // 	left: -((nodeContainer.position().left) - (parentNode.position().left) - (parentNode.outerWidth() / 2) + (viewport.width() / 2)),
                // 	top: -((nodeContainer.position().top) - parentNode.position().top - (parentNode.outerHeight() / 2) + (viewport.height() / 2))
                // })

            }

            setTimeout(function () {
                // console.log('New Postion', scrollContainer.position())
                // scrollContainer.css('transform-origin', `${scrollContainer.position().left}px ${scrollContainer.position().top}px`);
                $(`#${instance.nodes.scrollContainer}`)
                    // .css('transform-origin', currentOrigin)
                    .removeClass('scroll-tree');
                instance.zoom.level = 1;
                // instance.setZoom(instance.zoom.level)
            }, 800)
            return;
        })
    }

    scrollZoom(event) {
        var target = $(`#${this.nodes.scrollContainer}`);
        var container = $(`#${this.nodes.viewport}`);

        var offset = container.offset();
        this.zoom.point.x = event.pageX - offset.left;
        this.zoom.point.y = event.pageY - offset.top;
        var touchX = event.type === 'touchend' ? event.changedTouches[0].pageX : event.pageX;
        var touchY = event.type === 'touchend' ? event.changedTouches[0].pageY : event.pageY;
        event.preventDefault();

        var delta = event.delta || event.originalEvent.wheelDelta;
        if (delta === undefined) {
            delta = event.originalEvent.detail;
        }
        delta = -Math.max(-1, Math.min(1, delta));
        this.zoom.target.x = (this.zoom.point.x - this.zoom.pos.x) / this.zoom.level;
        this.zoom.target.y = (this.zoom.point.y - this.zoom.pos.y) / this.zoom.level;
        // console.log(target)
        // console.log('Zoom Delta', delta, this.zoom.step, this.zoom.level)
        var scale = delta * this.zoom.step //* this.zoom.level;
        // console.log('New Scale Level', scale)
        this.zoom.level += scale
        if (this.zoom.level > this.zoom.max) {
            // console.log('max:', this.zoom.level, this.zoom.max)
            this.zoom.level = this.zoom.max;
        }
        if (this.zoom.level < this.zoom.min) {
            // console.log('min:', this.zoom.level, this.zoom.min)
            this.zoom.level = this.zoom.min;
        }
        // this.zoom.level += Math.max(this.zoom.min,Math.min(this.zoom.max, scale)); //Adjust the '1' to zoom.min?

        // console.log('New Zoom Level', this.zoom.level)
        this.zoom.pos.x = -this.zoom.target.x * this.zoom.level + this.zoom.point.x;
        this.zoom.pos.y = -this.zoom.target.y * this.zoom.level + this.zoom.point.y;

        if (this.zoom.pos.x > 0) {
            this.zoom.pos.x = 0;
        }
        if (this.zoom.pos.x + this.zoom.size.w * this.zoom.level < this.zoom.size.w) {
            this.zoom.pos.x = -this.zoom.size.w * (this.zoom.level - 1);
        }
        if (this.zoom.pos.y > 0) {
            this.zoom.pos.y = 0;
        }
        if (this.zoom.pos.y + this.zoom.size.h * this.zoom.level < this.zoom.size.h) {
            this.zoom.pos.y = -this.zoom.size.h * (this.zoom.level - 1);
        }
        // target.css({
        // 	transform: `scale(${this.zoom.level},${this.zoom.level})`
        // })
        target.css('transition-timing-function', 'ease-out')
        target.css('transition-duration', '.1s')
        target.css('transform-origin', `${touchX}.px ${touchY}.px`)
        target.css('transform', `scale(${this.zoom.level},${this.zoom.level})`)

        // target.css('transform', `translate(${this.zoom.pos.x}px, ${this.zoom.pos.y}px) scale(${this.zoom.level}, ${this.zoom.level})`);

        setTimeout(function () {
            target.css('transition-duration', '0s');
            target.css('transition-timing-function', 'linear')
        }, 30)
    }

    clearTree() {
        var instance = this;
        return new Promise(function (resolve, reject) {
            console.log('RHEA (FT): Clearing any previous data.');


            //Tree Nodes
            $(`#${instance.nodes.main}`)
                .empty()
            $(`#${instance.nodes.siblings}`)
                .empty()
            $(`#${instance.nodes.parents}`)
                .empty()
            $(`#${instance.nodes.children}`)
                .empty()
            $(`#${instance.nodes.search} input`).val('');

            //Character Data
            instance.activeCharacter = null;

            instance.activeSpouse = null;
            instance.parents = null;
            instance.spouses = null;
            instance.children = null;

            instance.trees = {
                main: null,
                siblings: null,
                parents: null,
                children: null
            }
            // //If we're just changing the spouse, do not change active character, spouse, siblings, parents, or children
            // if(!changingSpouse) {
            // 	instance.activeSpouse = null;
            // }
            //Zoom
            // $(`#${instance.nodes.scrollContainer}`).css({
            // 	transform: 'scale(1,1)'
            // });
            // instance.zoomLevel = 1;
            instance.zoom.level = 1;
            instance.zoom.size = {
                w: (instance.config.initialCanvasSize ? intance.config.initialCanvasSize : 3000),
                h: (instance.config.initialCanvasSize ? instance.config.initialCanvasSize : 3000)
            };
            instance.zoom.pos = { x: 0, y: 0 }
            $(`#${instance.nodes.scrollContainer}`).css('transform', `scale(${instance.zoom.level},${instance.zoom.level})`)
            resolve();
        })
    }

    getCharacterData() {
        var instance = this;
        return new Promise(function (resolve, reject) {
            console.log('RHEA (FT): Loading Character Data.');
            var worldID = instance.config.worldID;
            if (!worldID || typeof RheaDemo !== 'undefined') {
                var apiURL = 'http://localhost:3999/familytree';
            } else {
                var apiURL = `${instance.getBaseURL()}/api/world/${worldID}/relationships.json`;
            }

            if (!WorldData[worldID]) {
                $.ajax({
                    url: apiURL,
                    method: 'GET',
                    useCredentials: true,
                    success: function (data) {
                        //Parse characters and set their parentConnector style (if configured in char object)
                        if (data.characters && data.characters.length > 0) {
                            for (var i = 0; i < data.characters.length; i++) {
                                if (data.characters[i].parentConnector) {
                                    var styleOptions = data.characters[i].parentConnector;
                                    var connectorStyle = {
                                        stroke: styleOptions.color ? styleOptions.color : undefined,
                                        'stroke-dasharray': styleOptions.type ? (styleOptions.type === 'dash' ? '--' : (styleOptions.type === 'dot' ? '.' : undefined)) : undefined,
                                        'stroke-width': styleOptions.width ? styleOptions.width : undefined
                                    };
                                    data.characters[i].parentConnector = {
                                        style: connectorStyle
                                    }
                                }
                            }
                        }
                        WorldData[worldID] = data;
                        // console.log(WorldData);
                        console.log(`RHEA (FT): Successfully retrieved character data from API. Found ${data.characters.length} characters.`);
                        resolve();
                    },
                    error: function (err) {
                        console.warn('RHEA (FT): Error - ', err);
                        reject('Unable To complete');
                    }
                })
            } else {
                console.log(`RHEA (FT): Found pre-existing character data for world: "${worldID}". Found ${WorldData[worldID].characters.length} characters.`);
                resolve()
            }
        })
    }

    makeRandomID(prefix = null) {
        if (prefix) {
            return prefix + '_' + Math.random().toString(36).substr(2, 9);
        }
        return Math.random().toString(36).substr(2, 9);
    }

    constructImageURL(imgPath) {
        if (imgPath && imgPath.length > 0) 
        {
            if (imgPath.startsWith('/'))
            {
                // return 'https://www.worldanvil.com' + imgPath;
                return `${this.getBaseURL()}${imgPath}`;

            }
            else
            {
                return imgPath;
            }
        }
        return false;
    }
    generateCharImage(char = null) {
        if (!char) {
            return 'https://via.placeholder.com/300?text=No+Image'
            // return '/'
        }
    }
}

class Bloodline {
    constructor(opts) {
        this.instanceID = this.makeRandomID();
        this.config = opts.config;
        this.activeCharacter = null;
        this.children = null;
        this.parents = null;
        this.nodes = {
            viewport: this.makeRandomID(this.instanceID),
            scrollContainer: this.makeRandomID(this.instanceID),
            parents: this.makeRandomID(this.instanceID),
            children: this.makeRandomID(this.instanceID),
            spouse: this.makeRandomID(this.instanceID),
            search: this.makeRandomID(this.instanceID)

        }
        this.zoom = {
            level: opts.config.initialZoom ? parseFloat(opts.config.initialZoom / 100) : 1,
            max: (opts.config.maxZoom ? Math.min(opts.config.maxZoom / 100, 5) : 5),
            min: (opts.config.minZoom ? Math.max(opts.config.minZoom / 100, 0.25) : 0.25),
            target: { x: 0, y: 0 },
            point: { x: 0, y: 0 },
            pos: { x: 0, y: 0 },
            step: (opts.config.zoomStep ? Math.min(0.1, opts.config.zoomStep / 100) : 0.1),
            size: {
                w: (opts.config.initialCanvasSize ? opts.config.initialCanvasSize : 3000),
                h: (opts.config.initialCanvasSize ? opts.config.initialCanvasSize : 3000)
            }
        }
        this.dragging = false;
        this.initialize(this.config.initialCharacter)
    }
    initialize(activeCharacter) {
        var instance = this;
        console.log('RHEA (BL): Initializing...');

        instance.createNodes()
            .then(function () {
                return instance.getCharacterData();
            }).then(function () {
                return instance.findActiveCharacter(activeCharacter)
            }).then(function (mainCharacter) {
                instance.activeCharacter = mainCharacter;
                if (instance.config.initialSpouse) {
                    return instance.findActiveCharacter(instance.config.initialSpouse);
                }

            }).then(function (spouse) {
                if (spouse) {
                    console.log('RHEA (BL): Found Spouse: ', spouse)
                    instance.activeSpouse = spouse;
                }
                return instance.findChildren(instance.activeCharacter, true);
            }).then(function (children) {
                console.log(`RHEA (BL): Found Children:`, children)
                
                instance.children = children;
            }).then(function () {
                return instance.findParents(instance.activeCharacter);
            }).then(function (parents) {
                console.log('RHEA (BL): Found Parents: ', parents);
                instance.parents = parents;
                return instance.prepareParentsStructure(parents, false)
            }).then(function (parents) {
                // instance.createNodes();
                if (parents) {
                    // console.log(parents)
                    instance.renderParentsTree(parents);
                }
            }).then(function () {
                if (instance.activeSpouse) {
                    return instance.prepareSpouseStructure(instance.activeSpouse)
                }

            }).then(function (spouseTree) {
                if (instance.activeSpouse) {
                    return instance.renderSpouseTree(spouseTree);
                }

                // return instance.
            }).then(function () {
                return instance.prepareTreeStructure(instance.children);
            }).then(function (children) {
                console.log('RHEA (BL): Child Tree:', children);
                // if(instance.children) {
                return instance.renderChildrenTree(children);
                // }
            }).then(function () {
                return instance.positionMainTree();
            }).then(function () {
                return instance.positionParentsTree();
            }).then(function () {
                return instance.positionSpouseTree();
            }).then(function () {
                return instance.setZoom(instance.zoom.level);
            }).then(function () {
                return instance.setOriginalPosition()
            }).then(function () {
                console.log('RHEA (BL): All done!');
                $(`#${instance.nodes.viewport}`).removeClass('loading');
            }).catch(function (error) {
                console.warn(error)
            })
    }
    //Create the elements and inject them into the origin/root
    createNodes() {
        var instance = this;
        return new Promise(function (resolve, reject) {
            //Viewport - The main container/rootNode
            var viewport = instance.config.originNode;
            $(viewport).attr('id', instance.nodes.viewport).addClass('loading');

            //Loader
            var loader = document.createElement('div');
            // var loaderText = document.createElement('h1');
            $(loader)
                .addClass('loader')
                .html('<div class="rhea-loader-text">Loading Bloodline</div>')
                .appendTo($(viewport));

            //ScrollContainer - The pannable rootNode for containers
            var scrollContainer = document.createElement('div');
            $(scrollContainer)
                .attr('id', instance.nodes.scrollContainer)
                .addClass('scrollable-container')
                // .css('position', 'absolute')
                .appendTo($(`#${instance.nodes.viewport}`));

            //Create Descendants Container - for Active Character and all descendants
            var childrenContainer = document.createElement('div');
            $(childrenContainer)
                .attr('id', instance.nodes.children)
                .addClass('bl-container children-tree')
                .appendTo($(`#${instance.nodes.scrollContainer}`));


            //Create Parents Container - for parents of Active Character
            var parentsContainer = document.createElement('div');
            $(parentsContainer)
                .attr('id', instance.nodes.parents)
                .addClass('bl-container parent-tree')
                .appendTo($(`#${instance.nodes.scrollContainer}`));

            var spouseContainer = document.createElement('div');
            $(spouseContainer)
                .attr('id', instance.nodes.spouse)
                .addClass('bl-container spouse-tree')
                .appendTo($(`#${instance.nodes.scrollContainer}`));

            // Center the ScrollContainer
            // console.log('Centering container',$(viewport).innerWidth(), $(scrollContainer).width())
            $(scrollContainer).css({
                left: -($(scrollContainer).width() / 2) + ($(viewport).innerWidth() / 2),
                top: -($(scrollContainer).height() / 2) + ($(viewport).innerHeight() / 2)
            })

            // Make ScrollContainer pannable
            $(scrollContainer).draggable({
                start: function (event, ui) {
                    instance.dragging = true;
                    instance.zoom.point = {
                        x: (parseInt($(this).css('left'), 10) - ui.position.left),
                        y: (parseInt($(this).css('top'), 10) - ui.position.top)
                    }
                },
                drag: function (event, ui) {
                    var dx = ui.position.left - ui.originalPosition.left;
                    var dy = ui.position.top - ui.originalPosition.top;

                    ui.position.left = ui.originalPosition.left + (dx);
                    ui.position.top = ui.originalPosition.top + (dy);

                    ui.position.left += instance.zoom.point.x;
                    ui.position.top += instance.zoom.point.y;
                },
                stop: function () {
                    setTimeout(function () {
                        instance.dragging = false;
                    }, 300);
                }
            });

            $(scrollContainer).on('mousewheel DOMMouseScroll', function (event) {
                instance.zoomCanvas(event);
            })

            //DEBUG: Show guides
            if (instance.config.debug) {
                var target = document.createElement('div');
                $(target).addClass('debug-target').css({
                    top: ($(scrollContainer).height() / 2) - 5,
                    left: ($(scrollContainer).width() / 2) - 5
                }).appendTo($(`#${instance.nodes.scrollContainer}`));
            }

            // Search feature
            var searchContainer = document.createElement('div');
            var searchInput = document.createElement('input');
            $(searchInput).attr('id', instance.nodes.search).attr('placeholder', 'Search bloodline').appendTo($(searchContainer));
            $(searchContainer).addClass('rhea-bloodline-search').appendTo($(`#${instance.nodes.viewport}`));

            //Zoom Buttons
            if (instance.config.showZoomControls) {
                var btnZoomIn = document.createElement('button');
                var btnZoomOut = document.createElement('button');
                var zoomBtns = document.createElement('div');

                $(btnZoomOut)
                    .attr('zoom-direction', 'out')
                    .html('<i class="fad fa-search-minus fa-lg fa-fw"></i>')
                    .appendTo($(zoomBtns));

                $(btnZoomIn)
                    .attr('zoom-direction', 'in')
                    .html('<i class="fad fa-search-plus fa-lg fa-fw"></i>')
                    .appendTo($(zoomBtns));

                $(zoomBtns)
                    .addClass('rhea-bl-zoom-controls')
                    .appendTo($(searchContainer));


            }

            $(searchInput).on('keyup', function (event) {
                instance.searchBloodline(event.target.value)
            })

            $(`#${instance.nodes.viewport} .rhea-bl-zoom-controls button`).on('click', function (event) {
                var direction = $(event.currentTarget).attr('zoom-direction');
                var step = direction === 'out' ? -instance.zoom.step : instance.zoom.step;
                var currentZoom = instance.zoom.level;
                var newZoom = currentZoom + step;
                // console.log('Min', instance.zoom.min, 'max', instance.zoom.max);
                if (newZoom < instance.zoom.min) {
                    newZoom = instance.zoom.min;
                }
                if (newZoom > instance.zoom.max) {
                    newZoom = instance.zoom.max;
                }
                newZoom = parseFloat(newZoom.toString().substr(0, 3));
                // console.log('Zoom: ', newZoom)
                instance.zoom.level = newZoom;

                instance.setZoom(newZoom);
                // console.log(currentZoom, step)
            })
            resolve();
        })

    }
    getBaseURL() {
        if (this.config.serverURL) {
            return this.config.serverURL;
        }
        console.log('[CLOTHO] No domain registered. Falling back to domain detection');
        var { protocol, host } = window.location;
        return `${protocol}//${host}`
    }
    //Use existing data or get from API if missing
    getCharacterData() {
        var instance = this;
        return new Promise(function (resolve, reject) {
            var worldID = instance.config.worldID;
            if (!worldID || typeof RheaDemo !== 'undefined') {
                var apiURL = 'http://localhost:3999/familytree';
            } else {
                var apiURL = `${instance.getBaseURL()}/api/world/${worldID}/relationships.json`;
            }

            if (!WorldData[worldID]) {
                $.ajax({
                    url: apiURL,
                    method: 'GET',
                    useCredentials: true,
                    success: function (data) {
                        WorldData[worldID] = data;
                        // console.log(WorldData);
                        console.log(`RHEA (BL): Successfully retrieved character data from API. Found ${data.characters.length} characters.`);
                        resolve();
                    },
                    error: function (err) {
                        console.warn('RHEA (BL): Error - ', err);
                        reject('Unable To complete');
                    }
                })
            } else {
                console.log(`RHEA (BL): Found pre-existing character data for world: "${worldID}". Found ${WorldData[worldID].characters.length} characters.`);
                resolve()
            }
        })

    }
    findActiveCharacter(id) {
        var instance = this;
        return new Promise(function (resolve, reject) {
            var mainCharacterID = id || null;
            var worldID = instance.config.worldID;
            // console.log(WorldData)
            if (mainCharacterID) {
                var characters = WorldData[worldID].characters;
                if (characters && characters.length) {
                    characters.filter(function (character) {
                        if (character.id === mainCharacterID) {
                            // instance.activeCharacter = character;
                            console.log('RHEA (BL): Found character ', character)
                            resolve(character);
                        }
                        return false;
                    });
                    // if(!instance.activeCharacter) {
                    // 	console.log(`RHEA (BL): Unable to find character (main) with ID "${mainCharacterID}" in world: "${instance.config.worldID}"`);
                    // 	reject();
                    // }
                } else {
                    console.warn(`RHEA (BL): Error - No characters found for world with ID "${instance.config.worldID}"`);
                    reject('done. findActiveCharacter: No characters')
                }
            } else {
                console.warn(`RHEA (BL): Error - Unable to find character (main) with ID "${mainCharacterID}"`);
                reject('done. findActiveCharacter: No character ID')
            }
        })
    }
    findChildren(character, recursive = true, skipParents = false) {
        var instance = this;
        var ret = [];
        return new Promise(async function (resolve, reject) {
            var worldID = instance.config.worldID;
            // var mainCharacter = instance.activeCharacter;
            if (!WorldData[worldID] || !WorldData[worldID].characters) {
                console.warn(`RHEA (BL): Error - Unable to find character data for world "${worldID}"`);
                reject('Unable to complete (findChildren)');
            }

            // resolve([])
            var characters = WorldData[worldID].characters;
            var parent = character;
            for (var i = 0; i < characters.length; i++) {
                var child = characters[i];
                if (!instance.activeSpouse || skipParents) {

                    if (child.parentBiological1 === parent.id || child.parentBiological2 === parent.id) {
                        // children.push(char);
                        // console.log(`Child of ${parent.title}`, child)
                        // console.log('Child Match!', parent.title, parent.id, 'has child',child.title, child.parentBiological1, child.parentBiological2)
                        var children = await instance.findChildren(child, true, true);
                        // children = children.sort(function (childA, childB) {
                        //     if (childA.dob && parseInt(childA.dob, 10)) {
                        //         if (childB.dob && parseInt(childB.dob, 10)) {
                        //             return parseInt(childA.dob, 10) < parseInt(childB.dob, 10) ? -1 : 1;
                        //         }
                        //     }
                        // });
                        // console.log(children)
                        if (children.length) {
                            child.children = children;
                        }

                        ret.push(child);


                    }
                } else {
                    var spouse = instance.activeSpouse;
                    if (child.parentBiological1 === parent.id || child.parentBiological1 === spouse.id) {
                        if (child.parentBiological2 === parent.id || child.parentBiological2 === spouse.id) {
                            var children = await instance.findChildren(child, true, true);
                            // children = children.sort(function (childA, childB) {
                            //     if (childA.dob && parseInt(childA.dob, 10)) {
                            //         if (childB.dob && parseInt(childB.dob, 10)) {
                            //             return parseInt(childA.dob, 10) < parseInt(childB.dob, 10) ? -1 : 1;
                            //         }
                            //     }
                            // });
                            if (children.length) {
                                child.children = children;
                            }

                            ret.push(child);
                        }
                    }
                }

            }
            // console.log('Children', ret)
            ret = ret.sort(function (childA, childB) {
                if (childA.dob && parseInt(childA.dob, 10)) {
                    if (childB.dob && parseInt(childB.dob, 10)) {
                        return parseInt(childA.dob, 10) < parseInt(childB.dob, 10) ? -1 : 1;
                    }
                    return -1
                }
            });
            resolve(ret);
        })
    }
    findParents(character) {
        var instance = this;
        return new Promise(function (resolve, reject) {
            var worldID = instance.config.worldID;
            var characters = WorldData[worldID].characters;
            var parents = [];
            for (var i = 0; i < characters.length; i++) {
                var parent = characters[i];
                if (parent.id === character.parentBiological1 || parent.id === character.parentBiological2) {
                    parents.push(parent);
                }
            }

            resolve(parents);
        })
    }

    //Tree Rendering - Descendants
    renderChildrenTree(tree) {
        var instance = this;
        return new Promise(function (resolve, reject) {
            new Treant({
                chart: {
                    container: `#${instance.nodes.children}`,
                    rootOrientation: 'NORTH',
                    connectors: {
                        type: 'step'
                    },
                    node: {
                        HTMLclass: 'bl-node'
                    },
                    nodeAlign: 'top',
                    callback: {
                        onTreeLoaded: function () {
                            resolve();
                        }
                    },
                    siblingSeparation: 80,
                    levelSeparation: 100
                },
                nodeStructure: tree,
            })
        })
    }

    renderSpouseTree(spouseTree) {
        var instance = this;
        return new Promise(function (resolve, reject) {
            new Treant({
                chart: {
                    container: `#${instance.nodes.spouse}`,
                    rootOrientation: 'WEST',
                    connectors: {
                        type: 'step'
                    },
                    node: {
                        HTMLclass: 'bl-node'
                    },
                    nodeAlign: 'top',
                    callback: {
                        onTreeLoaded: function () {
                            resolve()
                        }
                    },
                    siblingSeparation: 80,
                    levelSeparation: 60
                },
                nodeStructure: spouseTree,
            })
        })
    }

    renderParentsTree(parents) {
        var instance = this;
        return new Promise(function (resolve, reject) {
            new Treant({
                chart: {
                    container: `#${instance.nodes.parents}`,
                    rootOrientation: 'SOUTH',
                    connectors: {
                        type: 'step'
                    },
                    node: {
                        HTMLclass: 'bl-node'
                    },
                    nodeAlign: 'top',
                    callback: {
                        onTreeLoaded: function () {
                            resolve()
                        }
                    },
                    siblingSeparation: 80,
                    levelSeparation: 80,
                },
                nodeStructure: parents,
            })
        })
    }

    // Helpers
    makeRandomID(prefix = null) {
        if (prefix) {
            return prefix + '_' + Math.random().toString(36).substr(2, 9);
        }
        return Math.random().toString(36).substr(2, 9);
    }

    prepareTreeStructure(characters, recursive = true, nonce = false) {
        //This function will recursively parse the characters array
        // and generate the actual Treant tree to display.
        var tree = [];
        var instance = this;
        return new Promise(async function (resolve, reject) {
            for (var i = 0; i < characters.length; i++) {
                var character = characters[i];
                var characterNode = instance.generateCharacterNode(character);
                if (recursive && character.children && character.children.length) {
                    characterNode.children = await instance.prepareTreeStructure(character.children, true, true);
                }

                tree.push(characterNode);
                // console.log(`Children of ${character.title}`, tree)
            }

            var mainChar = instance.generateCharacterNode(instance.activeCharacter);
            mainChar.children = tree;
            mainChar.text = { 'data-main-character': true };
            mainChar.childrenDropLevel = 0;
            mainChar.HTMLclass = 'main-character';
            if (!nonce) {
                if (instance.parents && instance.parents.length > 0) {
                    var ret = {
                        pseudo: true,
                        text: {
                            name: '',
                            'data-fake-root': true
                        },
                        children: [],
                        childrenDropLevel: 0
                    };
                    ret.children.push(mainChar);

                    resolve(ret);

                }
            }
            if (nonce) {
                // console.log(tree)
                resolve(tree)
            }
            // console.log(tree)
            resolve(mainChar);
        })
    }

    prepareParentsStructure(parents) {
        var tree = [];
        var ret = {};
        var instance = this;
        return new Promise(function (resolve, reject) {
            if (parents && parents.length) {
                for (var i = 0; i < parents.length; i++) {
                    var parent = parents[i];
                    var parentNode = instance.generateCharacterNode(parent);
                    // parentNode.childrenDropLevel = 1;
                    tree.push(parentNode);
                }

                ret = {
                    pseudo: true,
                    text: {
                        'data-fake-root': true
                    },
                    children: tree,
                    childrenDropLevel: 0
                };

            }

            resolve(ret)
        })
    }

    prepareSpouseStructure(spouse) {
        var instance = this;
        return new Promise(function (resolve, reject) {
            if (spouse) {
                var ret = {
                    pseudo: true,
                    text: {
                        'data-fake-root': true
                    },
                    children: []
                }

                ret.children.push(instance.generateCharacterNode(spouse));
                resolve(ret)
            }
            reject('No spouse');
        })
    }

    positionMainTree() {
        var instance = this;
        return new Promise(function (resolve, reject) {
            var scrollContainer = $(`#${instance.nodes.scrollContainer}`);
            var activeCharacterNode = $(`#${instance.nodes.children} [data-character-id="${instance.activeCharacter.id}"]`);
            var coords = {
                top: (scrollContainer.height() / 2) - (activeCharacterNode.outerHeight() / 2),
                // left: (scrollContainer.width() / 2) - (activeCharacterNode.parent().parent().width() / 2)
                left: (scrollContainer.width() / 2) - (activeCharacterNode.parent().position().left) - (activeCharacterNode.width() / 2)
            }
            // console.log('ActiveCharacter container:', activeCharacterNode.parent().parent().width())
            if (instance.parents && instance.parents.length) {
                coords.top += 5
            }
            $(`#${instance.nodes.children}`).css(coords)
            resolve();
        })
    }

    positionParentsTree() {
        var instance = this;
        return new Promise(function (resolve, reject) {
            setTimeout(function () {
                if (instance.parents && instance.parents.length) {
                    var scrollContainer = $(`#${instance.nodes.scrollContainer}`);
                    var activeCharacterContainer = $(`#${instance.nodes.children}`);
                    var parentsTree = $(`#${instance.nodes.parents}`);
                    var coords = {
                        top: (activeCharacterContainer.position().top - parentsTree.innerHeight() + 70),
                        left: (scrollContainer.width() / 2) - (parentsTree.innerWidth() / 2)
                    }
                    $(parentsTree).css(coords);
                }
                resolve();
            }, 500)

        })
    }

    positionSpouseTree() {
        var instance = this;
        return new Promise(function (resolve, reject) {
            var scrollContainer = $(`#${instance.nodes.scrollContainer}`);
            var activeCharacterNode = $(`#${instance.nodes.children} [data-character-id="${instance.activeCharacter.id}"]`);
            var spouseTree = $(`#${instance.nodes.spouse}`);

            var coords = {
                top: scrollContainer.height() / 2,
                left: (scrollContainer.width() / 2) + (activeCharacterNode.parent().outerWidth() / 2) - 20
            }

            if (instance.parents && instance.parents.length) {
                coords.top -= 35;
            }

            $(spouseTree).css(coords);
            resolve();
        })
    }

    setOriginalPosition() {
        var instance = this;
        return new Promise(function (resolve, reject) {
            var viewport = $(`#${instance.nodes.viewport}`);
            var scrollContainer = $(`#${instance.nodes.scrollContainer}`);
            var originalPosition = {
                left: -($(scrollContainer).width() / 2) + ($(viewport).innerWidth() / 2),
                top: -($(scrollContainer).height() / 2) + ($(viewport).innerHeight() / 2)
            }
            // $(scrollContainer).css({
            //     left: -($(scrollContainer).width() / 2) + ($(viewport).innerWidth() / 2),
            //     top: -($(scrollContainer).height() / 2) + ($(viewport).innerHeight() / 2)
            // })
            $(scrollContainer).css(originalPosition);
            resolve();
        })
    }

    generateCharacterNode(character) {
        var instance = this;
        return {
            parentConnector: character.parentConnector || null,
            childrenDropLevel: 0,
            innerHTML: `
			<div class="rhea-character-node" data-character-id="${character.id}">
				<div class="character-portrait">
					<div class="character-portrait-wrapper">
						<img src="${instance.constructImageURL(character.portrait_id) || instance.generateCharImage()}" alt="${character.title} Portrait">
					</div>
				</div>
				<div class="character-data">
					<div class="character-label">
						<span class="character-title">
							${character.honorific ? character.honorific : ''}
						</span>
						<a href="${character.person_url || '#'}" class="character-name">
							${character.firstname && character.lastname ? character.firstname + ' ' + character.lastname : character.title ? character.title : 'Unknown'}
						</a>
						<span class="character-life">
							${character.dob ? character.dob : ''}
							${character.dob && character.dod ? ' - ' : ''}
							${character.dod ? character.dod : ''}
						</span>
					</div>
				</div>
			</div>`
        };
    }

    searchBloodline(query) {
        var instance = this;
        var minLength = instance.config.minInputLength || 3;
        var worldID = instance.config.worldID || null;
        var characters = WorldData ? WorldData[worldID] ? WorldData[worldID].characters : null : null
        var searchFields = instance.config.searchFields ? instance.config.searchFields.split('|') : ['title'];

        //Center back on main character node
        $(`#${instance.nodes.scrollContainer}`).addClass('panning');
        if (query.length === 0) {
            var node = $(`#${instance.nodes.viewport} .main-character .rhea-character-node`).get(0);
            if (node) {
                instance.setZoom(1)
                    .then(function () {
                        instance.centerOnNode(node);
                    })
                    .then(function () {
                        setTimeout(function () {
                            instance.setZoom(instance.zoom.level)
                            $(`#${instance.nodes.scrollContainer}`).removeClass('panning');
                        })
                    })

            }
        }

        if (query.length < minLength) {
            return false;
        }

        if (!worldID || !characters) {
            console.error('RHEA (BL): Unable to search. Missing either WORLD_ID or character data from world.')
            return false;
        }

        $(`#${instance.nodes.viewport} .rhea-search-result`).removeClass('rhea-search-result');
        searchLoop:
        for (var f = 0; f < searchFields.length; f++) {
            var fieldName = searchFields[f];
            for (var i = 0; i < characters.length; i++) {
                var character = characters[i];
                if (character[fieldName] && character[fieldName].toLowerCase().indexOf(query.toLowerCase()) > -1) {
                    var node = $(`#${instance.nodes.viewport} [data-character-id="${character.id}"]`).get(0);
                    if (node) {
                        console.log(node);
                        console.log(`RHEA (BL): Search (${fieldName}) found character:`, character);


                        $(node).addClass('rhea-search-result');
                        instance.setZoom(1)
                            .then(function () {
                                instance.centerOnNode(node);
                            })
                            .then(function () {
                                setTimeout(function () {
                                    instance.setZoom(instance.zoom.level);
                                    $(`#${instance.nodes.scrollContainer}`).removeClass('panning')
                                }, 500)

                            })
                        break searchLoop;
                    }
                }
            }
        }
    }

    centerOnNode(characterNode) {
        var instance = this;
        return new Promise(function (resolve, reject) {
            $(`#${instance.nodes.scrollContainer}`).addClass('scrolling');
            var parentNode = $(characterNode).parent();
            var nodeContainer = $(characterNode).parent().parent();
            var viewport = $(`#${instance.nodes.scrollContainer}`).parent();

            console.log(characterNode, parentNode, nodeContainer)
            $(`#${instance.nodes.scrollContainer}`).css({
                top: -(nodeContainer.position().top) - parentNode.position().top - (parentNode.outerHeight() / 2) + (viewport.height() / 2),
                left: -(nodeContainer.position().left) - (parentNode.position().left) - (parentNode.outerWidth() / 2) + (viewport.width() / 2)
            })
            // console.log($(`#${instance.nodes.scrollContainer}`).css('animation-duration'))
            setTimeout(function () {
                $(`#${instance.nodes.scrollContainer}`).removeClass('scrolling');
                resolve();
            }, 300)

        })


    }

    //Set zoom manually
    setZoom(zoomLevel) {
        var instance = this;
        return new Promise(async function (resolve, reject) {
            console.log(`RHEA (OC): Setting zoom level to ${zoomLevel * 100}%`);
            var canvas = $(`#${instance.nodes.scrollContainer}`);
            if (zoomLevel > instance.zoom.max) {
                zoomLevel = instance.zoom.max;
            }
            if (zoomLevel < instance.zoom.min) {
                zoomLevel = instance.zoom.min;
            }
            canvas.css('transition-timing-function', 'ease-out')
            canvas.css('transition-duration', '.3s')
            await canvas.css({
                transform: `scale(${zoomLevel})`,
                // 'transform-origin': `${pos.x}px ${pos.y}px`
                // left: pos.x,
                // top: pos.y
            })
            setTimeout(function () {
                canvas.css('transition-duration', '0s');
                canvas.css('transition-timing-function', 'linear')
                resolve()
            }, 300)
        });

    }
    //Event Handler: Zoom
    zoomCanvas(event) {
        var canvas = $(`#${this.nodes.scrollContainer}`);
        var viewport = $(`#${this.nodes.viewport}`);

        var offset = viewport.offset(); //This is the viewport's offset from the top of page.

        // console.log('Container Offset:',offset); //

        this.zoom.point = {
            x: (event.pageX - offset.left),
            y: (event.pageY - offset.top)
        }

        // console.log('Mouse Coordinates: ', this.zoom.point);

        var touch = {
            x: event.type === 'touchend' ? event.changedTouches[0].pageX : event.pageX,
            y: event.type === 'touchend' ? event.changedTouches[0].pageY : event.pageY
        }

        // console.log('Page Coords', touch);

        event.preventDefault();

        var delta = event.delta || event.originalEvent.wheelDelta;
        if (delta === undefined) {
            delta = event.originalEvent.detail;
        }
        delta = -(Math.max(-1, Math.min(1, delta)));

        // console.log('Zoom Direction',delta);

        this.zoom.target = {
            x: (this.zoom.point.x - this.zoom.pos.x) / this.zoom.level,
            y: (this.zoom.point.y - this.zoom.pos.y) / this.zoom.level
        }

        // console.log('Zoom Target', this.zoom.target);

        var scale = delta * this.zoom.step; //This is the direction and amount of zoom step

        // console.log('Step', scale);

        this.zoom.level += scale;

        // console.log('New zoom level:', this.zoom.level);

        if (this.zoom.level > this.zoom.max) {
            console.log('Exceeding maximum size. Capping at ', this.zoom.max);
            this.zoom.level = this.zoom.max;
        }

        if (this.zoom.level < this.zoom.min) {
            console.log('Exceeding minimum size. Capping at ', this.zoom.min);
            this.zoom.level = this.zoom.min;
        }

        this.zoom.pos = {
            x: -(this.zoom.target.x * this.zoom.level + this.zoom.point.x),
            y: -(this.zoom.target.y * this.zoom.level + this.zoom.point.y)
        }

        if (this.zoom.pos.x > 0) {
            this.zoom.pos.x = 0;
        }

        if (this.zoom.pos.x + this.zoom.size.w * this.zoom.level < this.zoom.size.w) {
            this.zoom.pos.x = -((this.zoom.size.w / 2) * (this.zoom.level - 1));
        }

        if (this.zoom.pos.y > 0) {
            this.zoom.pos.y = 0;
        }

        if (this.zoom.pos.y + this.zoom.size.h * this.zoom.level < this.zoom.size.h) {
            this.zoom.pos.y = -this.zoom.size.h * (this.zoom.level - 1);
        }
        // console.log('New zoom position',this.zoom.pos);

        var pos = {
            x: canvas.position().left + this.zoom.pos.x,
            y: canvas.position().top + this.zoom.pos.y
        }
        // console.log('Old Canvas Position: ', canvas.position())
        // console.log('New Canvas position', pos);

        canvas.css('transition-timing-function', 'ease-out')
        canvas.css('transition-duration', '.1s')
        canvas.css({
            transform: `scale(${this.zoom.level})`,
            // 'transform-origin': `${pos.x}px ${pos.y}px`
            // left: pos.x,
            // top: pos.y
        })
        setTimeout(function () {
            canvas.css('transition-duration', '0s');
            canvas.css('transition-timing-function', 'linear')
        }, 30)
    }
    constructImageURL(imgPath) {
        if (imgPath && imgPath.length > 0) 
        {
            if (imgPath.startsWith('/'))
            {
                // return 'https://www.worldanvil.com' + imgPath;
                return `${this.getBaseURL()}${imgPath}`;

            }
            else
            {
                return imgPath;
            }
        }
        return false;
    }
    
    generateCharImage(char = null) {
        if (!char) {
            return 'https://via.placeholder.com/300?text=No+Image'
            // return '/'
        }
    }
}