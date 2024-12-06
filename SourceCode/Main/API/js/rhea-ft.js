//Initialize worldData object (to prevent multiple searches)
var WorldData = {};
var dragging = false;
$(document).ready(function () {
  //Get all "familytree" elements
  $('.rhea-family-tree').each(function (i, treeNode) {
    //For each familytree element (treeNode), extract character/spouse/world data
    var initialCharId = $(treeNode).data('initial-char') || null;
    var initialSpouseId = $(treeNode).data('initial-spouse') || null;
    var worldId = $(treeNode).data('world-id');
    var disableEvents =
      $(treeNode).data('nochange') === 'nochange' ? true : false;
    var direction = $(treeNode).data('tree-direction') || 'default';
    var initialZoom = $(treeNode).data('initial-zoom') || 110;
    // Create a new FamilyTree Instance
    var familyTree = new FamilyTree({
      //This is the initial starting data
      config: {
        // Allow system to override internal server url
        serverURL: $(treeNode).attr('data-server-url') || undefined,
        //ftRoot is the starting div Rhea will inject with the tree
        ftRoot: treeNode,
        //initialWorld is the id of the world the character exists in
        initialWorld: worldId || 'demo', //OBSOLETE
        worldID: worldId,
        //initialChar is the starting active character
        initialChar: initialCharId, //OBSOLETE
        initialCharacter: initialCharId,
        //initialSpouse (optional) is the starting spouse
        initialSpouse: initialSpouseId,
        //Define the minimum amount of characters needed to search the tree
        minInputLength: 3,
        //Search Fields, in order of priority (first is highest),
        searchFields: 'firstname|title|honorific|nickname|lastname|middlename',
        // Reset tree position if search input is cleared
        resetTreeOnSearchClear: true,
        disableUserEvents: disableEvents,
        // Show alignment guide (to center elements - used for Development)
        showGuide: false, //OBSOLETE
        // debug: true,
        debug: false,
        maxParentLevels: 3, //OBSOLETE
        maxChildrenLevels: 2, //OBSOLETE
        headers: {
          show: true,
          prependFamilyName: false, //Not implemented
          characterColumnText: null, //null means 'Family Tree'
          characterColumnType: 'h3', //The type of element to use for column header (character)
          childrenColumnText: null, //null means 'Family Tree'
          childrenColumnType: 'h3', //The type of element to use for column header (character)
          grandChildrenColumnText: null, //null means 'Family Tree'
          grandChildrenColumnType: 'h3', //The type of element to use for column header (character)
          parentColumnText: null, //null means 'Family Tree'
          parentColumnType: 'h3', //The type of element to use for column header (character)
          grandParentColumnText: null, //null means 'Family Tree'
          grandParentColumnType: 'h3', //The type of element to use for column header (character)
          greatGrandParentColumnText: null, //null means 'Family Tree'
          greatGrandParentColumnType: 'h3', //The type of element to use for column header (character)
          unifyChildrenLabels: false, //Will hide the grandchildren label and only show the children label
          unifyParentLabels: false, //Will hide the grandparent and greatparent labels, showing only the parent label
        },
        //Zoom (Sizes are in percent: 100% = 100)
        initialZoom: initialZoom,
        maxZoom: 150,
        minZoom: 20,
        zoomStep: 20, //This controls how much to zoom each time the wheel is scrolled
        showZoomControls: true,
        //TreeDirection
        treeDirection: direction,
        //RECURSION LIMIT
        recursionMax: 200, //This controls how many times Rhea will search through children loops. Intended to prevent infinite loop when a character is their own ancestor.
      },
      //This is general config options (Treant) that will be passed to the graph initializer (not in use currently)
      treeConfig: {
        //OBSOLETE
      },
    });
  });

  // Bloodlines

  $('.rhea-bloodline').each(function (i, node) {
    var initialCharID = $(node).data('character') || null;
    var spouse = $(node).data('spouse') || null;
    var worldID = $(node).data('world') || null;
    var disableEvents = $(node).data('nochange') === 'nochange' ? true : false;
    var initialZoom = $(node).data('initial-zoom') || 110;

    var bloodline = new Bloodline({
      config: {
        serverURL: $(node).attr('data-server-url') || undefined,
        originNode: node,
        worldID: worldID,
        initialCharacter: initialCharID,
        initialSpouse: spouse,
        disableEvents: disableEvents,
        //Define the minimum amount of characters needed to search the tree
        minInputLength: 3,
        //Search Fields, in order of priority (first is highest),
        searchFields: 'firstname|title|honorific|nickname|lastname|middlename',
        // debug: true,
        initialZoom: initialZoom,
        maxZoom: 150,
        minZoom: 20,
        zoomStep: 20, //This controls how much to zoom each time the wheel is scrolled
        showZoomControls: true,
      },
    });
  });

  $('.rhea-org-chart').each(function (i, node) {
    var chartID = $(node).data('chart-id') || null;
    var initialZoom = $(node).data('initial-zoom') || 120;

    var chart = new OrgChart({
      config: {
        serverURL: $(node).attr('data-server-url') || undefined,
        chartID: chartID,
        rootNode: node,
        debug: false,
        chartOrientation: 'NORTH',
        initialZoom: initialZoom,
        maxZoom: 150,
        minZoom: 20,
        zoomStep: 20, //This controls how much to zoom each time the wheel is scrolled
        showZoomControls: true,
        searchFields: 'title|description|id',
      },
    });
  });
});
