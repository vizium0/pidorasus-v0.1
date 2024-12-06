class Clotho {
  constructor(props) {
    this.config = {
      displayType: props.displayType,
      mode: props.mode || 'default',
      rootElement: props.rootElement,
      initialID: props.initialID,
      worldID: props.worldID,
      breakpoint: props.breakpoint,
      breakpointZoom: props.breakpointZoom,
      breakpointSpace: props.breakpointSpace,
      serverURL: props.serverURL,
      gradientColors: ['red', 'orangered', 'darkorange', 'orange', 'yellow', 'yellowgreen', 'greenyellow', 'lightgreen', 'green', 'forestgreen']
    }

    this.itemList = [];
    this.relationList = [];
    this.relatedItems = [];
    this.activeItem = null;
    this.activeID = props.initialID;
    this.activeTag = null;
    this.UINodes = {
      container: '#' + this.generateID('container'),
      title: '#' + this.generateID('title'),
      canvas: '#' + this.generateID('canvas'),
      viewport: '#' + this.generateID('viewport')
    }

    this.zoom = {
      level: 1,
      max: (props.zoom.max ? Math.min(props.zoom.max / 100, 5) : 5),
      min: (props.zoom.min ? Math.max(props.zoom.min / 100, 0.25) : 0.25),
      target: { x: 0, y: 0 },
      point: { x: 0, y: 0 },
      pos: { x: 0, y: 0 },
      step: (props.zoom.step ? Math.min(0.1, props.zoom.step / 100) : 0.1),
      invertControls: props.zoom.invertControls,
      showControls: props.zoom.showControls,
      size: {
        w: (props.initialCanvasSize ? props.initialCanvasSize : 3000),
        h: (props.initialCanvasSize ? props.initialCanvasSize : 3000)
      }
    }

    this.dragging = false;
    this.initialize();
  }

  initialize() {
    var instance = this;
    console.log(`[CLOTHO] Component Loading.`)
    console.log(`[CLOTHO] Component Config:`, this.config);
    this.gradient = new GradientRainbow();
    if (this.config.displayType !== 'diplomacy') {
      this.gradient.setNumberRange(-5, 5)
    } else {
      this.gradient.setNumberRange(-100, 100);
    }
    this.gradient.setSpectrum(this.config.gradientColors);
    // console.log(this.activeID)

    // var regex = new RegExp(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    var match = this.activeID.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    if (!match) {
      this.config.mode = 'tag';
      this.activeTag = this.activeID;
      this.activeID = '';

      console.log(`[CLOTHO] Switching to TAG mode`);
    } else {
      console.log(`[CLOTHO] Running in default mode.`);
    }
    // return;
    // if (this.activeID.charAt(0) === '#') {

    //   this.config.mode = 'tag';
    //   this.activeTag = this.activeID.substr(1);
    //   this.activeID = '';
    // }

    // if (this.config.mode === 'tag') {
    //   console.log('[CLOTHO] Switching to #TAG mode');
    // }
    this.createUI()
      .then(function () {
        return instance.centerCanvas()
      })
      .then(function () {
        instance.makeGraph()
      })
  }

  createUI() {
    var instance = this;
    console.log(`[CLOTHO] Building Base UI`)
    return new Promise(function (resolve, reject) {
      var viewport = instance.config.rootElement;
      $(viewport)
        .addClass('clotho-box')
        .attr('id', instance.UINodes.viewport.substr(1));

      var canvas = document.createElement('div')
      $(canvas)
        .addClass('clotho-canvas')
        .attr('id', instance.UINodes.canvas.substr(1))
        .appendTo($(viewport))
      //Container
      var container = document.createElement('div');
      $(container)
        .addClass('clotho-wrapper clotho-box-content')
        .attr('id', instance.UINodes.container.substr(1))

        .appendTo($(canvas))
        .svg();

      $(container)
        .css({
          top: (($(canvas).innerHeight() / 2) - ($(container).height() / 2)),
          left: (($(canvas).innerWidth() / 2) - ($(container).width() / 2))
        })
      //Bottom Title
      var titleContainer = document.createElement('div');
      $(titleContainer)
        .addClass('clotho-title-container')
        .attr('id', instance.UINodes.title.substr(1))
        .appendTo($(viewport))

      var titleNodeA = document.createElement('div');
      $(titleNodeA)
        .addClass('clotho-title-item')
        .attr('id', 'clothoDisplayA')
        .appendTo($(titleContainer));

      var titleNodeAImg = document.createElement('img');
      $(titleNodeAImg)
        .addClass('clotho-title-image')
        .appendTo($(titleNodeA));
      // var titleNodeAText = document.createElement('h3');
      // $(titleNodeAText)
      //   .addClass('clotho-title-text')
      //   .appendTo($(titleNodeA));

      var titleArrows = document.createElement('div');
      $(titleArrows)
        .addClass('clotho-title-arrows')
        .appendTo($(titleContainer))
      // .svg()

      var titleNodeB = document.createElement('div');
      $(titleNodeB)
        .addClass('clotho-title-item')
        .attr('id', 'clothoDisplayB')
        .appendTo($(titleContainer));
      var titleNodeBImg = document.createElement('img');
      $(titleNodeBImg)
        .addClass('clotho-title-image')
        .appendTo($(titleNodeB));
      // var titleNodeBText = document.createElement('h3');
      // $(titleNodeBText)
      //   .addClass('clotho-title-text')
      //   .appendTo($(titleNodeB));

      var errorBox = document.createElement('div');
      var errorTitle = document.createElement('h3');
      var errorText = document.createElement('div');

      $(errorTitle)
        .text('Error')
        .addClass('clotho-error-title')
        .appendTo($(errorBox));

      $(errorText)
        .addClass('clotho-error-details')
        .appendTo($(errorBox));

      $(errorBox)
        .addClass('clotho-error clotho-hidden')
        .appendTo($(viewport))


      //Canvas: Pan
      $(canvas).draggable({
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

      //Canvas: Zoom
      $(canvas).on('mousewheel DOMMouseScroll', function (event) {
        instance.zoomCanvas(event);
      })
      resolve();
    })
  }

  makeGraph() {
    var instance = this;
    // console.log(this.activeID)
    instance.fetchData()
      .then(function () {
        return instance.prepareGraphStructure();
      })
      .then(function () {
        return instance.renderItems();
      })
      .then(function () {
        var node = $('.clotho-node').get(0)
        var delay = parseFloat(getComputedStyle(node)['transitionDuration']) * 1000;
        // console.log(delay)
        setTimeout(function () {
          return instance.drawRelationships();
        }, delay)
      })
      .then(function () {
        return instance.registerEvents();
      })
      .then(function () {
        var zoom = 1;
        if (instance.config.mode === 'default') {
          if (instance.relatedItems.length > instance.config.breakpoint) {
            var diff = instance.relatedItems.length - instance.config.breakpoint;
            zoom -= (diff * instance.config.breakpointZoom);
          }
        } else {
          if (instance.relatedItems.length > instance.config.breakpoint) {
            var diff = instance.relatedItems.length - instance.config.breakpoint;
            zoom -= (diff * instance.config.breakpointZoom);
          }
        }

        // if(instance.itemList.length > instance.config.breakpoint) {
        //   var diff = instance.itemList.length - instance.config.breakpoint;
        //   zoom -= (diff * instance.config.breakpointZoom );
        // }
        // console.log(instance.itemList.length, instance.config.breakpoint)
        // console.log('zoom', zoom)
        setTimeout(function () {

          return instance.setZoom(zoom)
        }, 750)
      })
      .then(function () {
        return console.log(`[CLOTHO] Done Processing!`)
      })
      .catch(function (err) {
        console.error(`[CLOTHO] Error: ${err}\n[CLOTHO] Done Processing!`);
        $(`${instance.UINodes.viewport} .clotho-error-details`).text(err);
        $(`${instance.UINodes.viewport} .clotho-error`).removeClass('clotho-hidden');
      })
  }

  prepareGraphStructure() {
    var instance = this;
    console.log(`[CLOTHO] Generating Graph Structure`)
    return new Promise(function (resolve, reject) {
      if (instance.config.displayType === 'diplomacy') {
        if (instance.config.mode === 'default') {
          var activeItem = instance.itemList.filter(function (item) {
            return item.id === instance.activeID
          })[0];

          activeItem.relations = [];

          var validRelations = instance.relationList.filter(function (relation) {
            return (activeItem.id === relation.organization1) || (activeItem.id === relation.organization2);
          });

          let relatedItems = [];

          for (var i = 0; i < validRelations.length; i++) {
            var relation = validRelations[i];
            if (activeItem.id === relation.organization1) {
              //Get Item
              var item = instance.getItem(relation.organization2);
              if (!item) {
                console.log(`[CLOTHO] Skipping Relation for "${relation.organization2}"\r\nArticle is likely private.`)
                continue;
              }
              //Add relation to activeItem
              activeItem.relations.push({ target: relation.organization2, score: relation.party1score, diplomacyStatus: relation.diplomaticstatus || '' })
              item.activeItemScore = relation.party2score;
              item.diplomacyStatus = relation.diplomaticstatus || '';
              //Set Item rel
              relatedItems.push(item);
            }

            if (activeItem.id === relation.organization2) {
              //Get Item
              var item = instance.getItem(relation.organization1);
              // console.log(item)
              if (!item) {
                console.log(`[CLOTHO] Skipping Relation for "${relation.organization1}"\r\nArticle is likely private.`)
                continue;
              }
              activeItem.relations.push({ target: relation.organization1, score: relation.party2score, diplomacyStatus: relation.diplomaticstatus || '' })
              item.activeItemScore = relation.party1score;
              item.diplomacyStatus = relation.diplomaticstatus || '';
              relatedItems.push(item);
            }
          }

          instance.activeItem = activeItem;
          instance.relatedItems = relatedItems;
        } else {

          //Find all articles that have tags
          var taggedArticles = instance.itemList.filter(function (item) {
            if (item.tags && item.tags !== '') {
              var tags = item.tags.toLowerCase().split(',');
              if (tags.indexOf(instance.activeTag.toLowerCase()) > -1) {
                return true;
              }
            }

            return false;
          })
          var removedArticles = [];
          for (var i = 0; i < taggedArticles.length; i++) {
            var article = taggedArticles[i];
            article.relations = [];
            for (var r = 0; r < instance.relationList.length; r++) {
              var relation = instance.relationList[r];

              if (relation.organization2 === article.id) {
                var itemRelation = {
                  target: relation.organization1,
                  score: relation.party2score,
                  note: relation.notes,
                  diplomacyStatus: relation.diplomaticstatus
                };

                article.relations.push(itemRelation);
              } else if (relation.organization1 === article.id) {
                var itemRelation = {
                  target: relation.organization2,
                  score: relation.party1score,
                  note: relation.notes,
                  diplomacyStatus: relation.diplomaticstatus
                };

                article.relations.push(itemRelation);
              }
            }

            if (article.relations.length === 0) {
              removedArticles.push(article.id)
            }


          }

          taggedArticles = taggedArticles.filter(function (article) {
            return removedArticles.indexOf(article.id) === -1
          })

          if (taggedArticles.length === 0) {
            throw `Unable to Render. No articles found with tag "${instance.activeTag}"`
          }

          instance.relatedItems = taggedArticles;
        }

      } else if (instance.config.displayType === 'relationships') {
        console.log(`[CLOTHO] Switching to Character Relationships mode`);
        var activeCharacter = instance.itemList.filter(function (character) {
          return character.id === instance.activeID;
        })[0];

        if (!activeCharacter) reject(`"${instance.activeID}" does not seem to match any characters in the current world.`);
        // console.log(activeCharacter)
        var validRelations = instance.relationList.filter(function (relation) {
          if (relation.isHidden) {
            return false;
          }
          if (relation.subtype && relation.subtype !== 'diplomacy') {
            return false;
          }
          return (activeCharacter.id === relation.character1 || activeCharacter.id === relation.character2)
        })

        if (!validRelations || validRelations.length === 0) {
          reject(`Character "${activeCharacter.title}" doesn't have any valid relationships defined.`)
        }
        var relatedItems = [];
        activeCharacter.relations = [];
        for (var r = 0; r < validRelations.length; r++) {
          var relation = validRelations[r];
          if (activeCharacter.id === relation.character1) {
            var rel = {
              target: instance.getItem(relation.character2),
              dispositionType: relation.showActual ? 'actual' : 'displayed',
              disposition: relation.showActual ? relation.opinionActual1 : relation.opinionDisplayed1,
              targetDisposition: relation.showActual ? relation.opinionActual2 : relation.opinionDisplayed2,
              startYear: relation.startYear,
              endYear: relation.endYear,
              relType: relation.type1,
              targetRelType: relation.type2,
            }

            if (rel.target) {
              rel.target.disposition = rel.targetDisposition;
              rel.target.dispositionType = rel.dispositionType;
              rel.target.relType = rel.targetRelType;
              relatedItems.push(rel.target);
              activeCharacter.relations.push(rel);
            }
          }
          if (activeCharacter.id === relation.character2) {
            var rel = {
              target: instance.getItem(relation.character1),
              dispositionType: relation.showActual ? 'actual' : 'displayed',
              disposition: relation.showActual ? relation.opinionActual2 : relation.opinionDisplayed2,
              targetDisposition: relation.showActual ? relation.opinionActual1 : relation.opinionDisplayed1,
              startYear: relation.startYear,
              endYear: relation.endYear,
              relType: relation.type2,
              targetRelType: relation.type1,
            }

            if (rel.target) {
              rel.target.disposition = rel.targetDisposition;
              rel.target.dispositionType = rel.dispositionType;
              rel.target.relType = rel.targetRelType;
              relatedItems.push(rel.target);
              activeCharacter.relations.push(rel)
            }
          }
        }

        instance.activeItem = activeCharacter;
        instance.relatedItems = relatedItems;



        // console.log(`[CLOTHO] Found Initial Character: ${activeCharacter.title}`)

      }
      resolve();
    })
  }

  renderItems() {
    var instance = this;
    console.log(`[CLOTHO] Rendering Items`)
    return new Promise(function (resolve, reject) {
      var container = $(instance.UINodes.container);
      var containerWidth = container.innerWidth();
      var containerHeight = container.innerHeight();
      var angle = 0;
      var step = (2 * Math.PI) / instance.relatedItems.length;
      var radius = (container.innerWidth() / 4); //Need to calculate min-max values

      if (instance.config.mode === 'default') {
        if (instance.relatedItems.length > instance.config.breakpoint) {
          var diff = instance.relatedItems.length - instance.config.breakpoint;
          radius += (diff * instance.config.breakpointSpace);
        }
      } else {
        if (instance.relatedItems.length > instance.config.breakpoint) {
          var diff = instance.relatedItems.length - instance.config.breakpoint;
          radius += (diff * instance.config.breakpointSpace);
        }
      }

      instance.radius = radius;

      if (instance.config.displayType === 'diplomacy') {
        if (instance.config.mode === 'default') {
          var activeNode = $.parseHTML(instance.createNode(instance.activeItem))[1];

          $(activeNode).attr('data-clotho-node-type', 'active');
          $(activeNode).appendTo($(container));


        }
      } else if (instance.config.displayType === 'relationships') {
        var activeNode = $.parseHTML(instance.createNode(instance.activeItem))[1];

        $(activeNode).attr('data-clotho-node-type', 'active');
        $(activeNode).appendTo($(container));
      }
      var nodeWidth = $(`${instance.UINodes.container} .clotho-node`).css('width');
      var nodeHeight = $(`${instance.UINodes.container} .clotho-node`).css('height');

      if (nodeWidth && nodeHeight) {
        nodeWidth = parseInt(nodeWidth.slice(0, -2), 10);
        nodeHeight = parseInt(nodeHeight.slice(0, -2), 10);
      }
      // console.log(nodeHeight, nodeWidth)
      for (var i = 0; i < instance.relatedItems.length; i++) {
        var relatedNode = $.parseHTML(instance.createNode(instance.relatedItems[i]))[1];
        $(relatedNode).attr('data-clotho-node-type', 'related');
        $(relatedNode).attr('data-clotho-node-angle', angle);
        $(relatedNode).appendTo($(instance.UINodes.container));


        var coords = {
          top: Math.round(containerHeight / 2 + radius * Math.sin(angle) - (!isNaN(nodeHeight) ? nodeHeight : $(relatedNode).height()) / 2),
          left: Math.round(containerWidth / 2 + radius * Math.cos(angle) - (!isNaN(nodeWidth) ? nodeWidth : $(relatedNode).width()) / 2)
        }

        $(relatedNode).css(coords);

        angle += step;
      }

      resolve();
    })
  }

  drawRelationships() {
    var instance = this;
    console.log(`[CLOTHO] Drawing Relationships`)
    return new Promise(function (resolve, reject) {
      //Create SVG container
      var svg = $(instance.UINodes.container).svg('get');
      var lineOffset = 5;

      if (instance.config.displayType === 'relationships') {
        var activeItem = instance.activeItem;
        for (var r = 0; r < activeItem.relations.length; r++) {
          var relation = activeItem.relations[r];

          var originNode = $(`${instance.UINodes.container} [data-clotho-node-id="${instance.activeItem.id}"]`);
          var targetNode = $(`${instance.UINodes.container} [data-clotho-node-id="${relation.target.id}"]`);

          if (!targetNode || targetNode.length === 0) {
            continue;
          }
          if (!originNode || originNode.length === 0) {
            continue;
          }

          var targetX = (targetNode.position().left + targetNode.width() / 2);
          var targetY = (targetNode.position().top + targetNode.height() / 2);

          var originX = (originNode.position().left + originNode.width() / 2);
          var originY = (originNode.position().top + originNode.height() / 2);

          var innerHeight1 = (Math.max(targetY, originY) - Math.min(targetY, originY))
          var innerWidth1 = (Math.max(targetX, originX) - Math.min(targetX, originX))

          var innerHeight2 = (targetY - originY)
          var innerWidth2 = (targetX - originX)

          var lineOff = Math.max(Math.tan(innerHeight1 / innerWidth1) * lineOffset, lineOffset);
          var lineOffHorizontal = Math.max(Math.tan(innerHeight2 / innerWidth2) * lineOffset, lineOffset);

          if (Math.abs(innerWidth1) < lineOffset) {
            lineOffHorizontal = 0;
          }
          if (Math.abs(innerHeight1) < lineOffset) {
            lineOff = 0;
          }

          var box = document.createElement('div');

          // var radius = instance.radius;
          var angle = Math.atan(innerHeight2 / innerWidth2);
          angle = angle * 180 / Math.PI;

          if (innerWidth2 < 1 && innerHeight2 < 1) {
            angle = 180 + angle;
          }
          else if (innerWidth2 < 1 && innerHeight2 > 1) {
            angle = 180 + angle;
          }
          if (innerWidth2 == 0) {
            angle = 180 + angle;
          }

          // console.log('origin', item.title, '\ntarget', instance.getItem(relation.target).title, '\niheight', innerHeight2, '\niwidth', innerWidth2, '\nangleRad', angle)
          var css = {
            width: Math.sqrt(innerWidth1 * innerWidth1 + innerHeight1 * innerHeight1),
            height: lineOffset,
            position: 'absolute',
            top: originY + 'px',
            left: originX + 'px',
            transform: `rotate(${angle}deg)`,
            // border: '1px solid white',
            borderBottom: '2px solid #' + instance.gradient.colourAt(relation.disposition),
            transformOrigin: 'top left'
          }
          // console.log(item)
          $(box).addClass('clotho-line')
            .attr('data-clotho-origin', activeItem.id)
            .attr('data-clotho-target', relation.target.id)
            .attr('data-clotho-line', activeItem.id)
            .css(css)
            .appendTo($(instance.UINodes.container))
          // console.log(css)
        }
        for (var i = 0; i < instance.relatedItems.length; i++) {
          var item = instance.relatedItems[i];
          var originNode = $(`${instance.UINodes.container} [data-clotho-node-id="${item.id}"]`);
          // var angle = originNode.attr('data-clotho-node-angle');
          var targetNode = $(`${instance.UINodes.container} [data-clotho-node-id="${instance.activeItem.id}"]`);

          if (!targetNode || targetNode.length === 0) {
            continue;
          }
          if (!originNode || originNode.length === 0) {
            continue;
          }

          var targetX = (targetNode.position().left + targetNode.width() / 2);
          var targetY = (targetNode.position().top + targetNode.height() / 2);

          var originX = (originNode.position().left + originNode.width() / 2);
          var originY = (originNode.position().top + originNode.height() / 2);

          var innerHeight1 = (Math.max(targetY, originY) - Math.min(targetY, originY))
          var innerWidth1 = (Math.max(targetX, originX) - Math.min(targetX, originX))

          var innerHeight2 = (targetY - originY)
          var innerWidth2 = (targetX - originX)

          var lineOff = Math.max(Math.tan(innerHeight1 / innerWidth1) * lineOffset, lineOffset);
          var lineOffHorizontal = Math.max(Math.tan(innerHeight2 / innerWidth2) * lineOffset, lineOffset);

          if (Math.abs(innerWidth1) < lineOffset) {
            lineOffHorizontal = 0;
          }
          if (Math.abs(innerHeight1) < lineOffset) {
            lineOff = 0;
          }

          var box = document.createElement('div');

          // var radius = instance.radius;
          var angle = Math.atan(innerHeight2 / innerWidth2);
          angle = angle * 180 / Math.PI;

          if (innerWidth2 < 1 && innerHeight2 < 1) {
            angle = 180 + angle;
          }
          else if (innerWidth2 < 1 && innerHeight2 > 1) {
            angle = 180 + angle;
          }
          if (innerWidth2 == 0) {
            angle = 180 + angle;
          }

          // console.log('origin', item.title, '\ntarget', instance.getItem(relation.target).title, '\niheight', innerHeight2, '\niwidth', innerWidth2, '\nangleRad', angle)
          var css = {
            width: Math.sqrt(innerWidth1 * innerWidth1 + innerHeight1 * innerHeight1),
            height: lineOffset,
            position: 'absolute',
            top: originY + 'px',
            left: originX + 'px',
            transform: `rotate(${angle}deg)`,
            // border: '1px solid white',
            borderBottom: '2px solid #' + instance.gradient.colourAt(item.disposition),
            transformOrigin: 'top left'
          }
          // console.log(item)
          $(box).addClass('clotho-line')
            .attr('data-clotho-origin', item.id)
            .attr('data-clotho-target', instance.activeItem.id)
            .attr('data-clotho-line', item.id)
            .css(css)
            .appendTo($(instance.UINodes.container))
          // console.log(css)
        }
      }
      if (instance.config.displayType === 'diplomacy') {
        if (instance.config.mode === 'default') {
          var activeItem = instance.activeItem;
          var originNode = $(`${instance.UINodes.container} [data-clotho-node-id="${instance.activeItem.id}"]`);
          //Draw lines for Related item nodes

          //Draw Line from activeItem to all other items
          for (var i = 0; i < instance.activeItem.relations.length; i++) {
            var relation = instance.activeItem.relations[i];
            var targetNode = $(`${instance.UINodes.container} [data-clotho-node-id="${relation.target}"]`);

            if (!targetNode || targetNode.length === 0) {
              continue;
            }
            if (!originNode || originNode.length === 0) {
              continue;
            }

            var targetX = (targetNode.position().left + targetNode.width() / 2);
            var targetY = (targetNode.position().top + targetNode.height() / 2);

            var originX = (originNode.position().left + originNode.width() / 2);
            var originY = (originNode.position().top + originNode.height() / 2);

            var innerHeight1 = (Math.max(targetY, originY) - Math.min(targetY, originY))
            var innerWidth1 = (Math.max(targetX, originX) - Math.min(targetX, originX))

            var innerHeight2 = (targetY - originY)
            var innerWidth2 = (targetX - originX)

            var lineOff = Math.max(Math.tan(innerHeight1 / innerWidth1) * lineOffset, lineOffset);
            var lineOffHorizontal = Math.max(Math.tan(innerHeight2 / innerWidth2) * lineOffset, lineOffset);

            if (Math.abs(innerWidth1) < lineOffset) {
              lineOffHorizontal = 0;
            }
            if (Math.abs(innerHeight1) < lineOffset) {
              lineOff = 0;
            }

            var box = document.createElement('div');

            // var radius = instance.radius;
            var angle = Math.atan(innerHeight2 / innerWidth2);
            angle = angle * 180 / Math.PI;

            if (innerWidth2 < 1 && innerHeight2 < 1) {
              angle = 180 + angle;
            }
            else if (innerWidth2 < 1 && innerHeight2 > 1) {
              angle = 180 + angle;
            }
            if (innerWidth2 == 0) {
              angle = 180 + angle;
            }

            // console.log('origin', item.title, '\ntarget', instance.getItem(relation.target).title, '\niheight', innerHeight2, '\niwidth', innerWidth2, '\nangleRad', angle)
            var css = {
              width: Math.sqrt(innerWidth1 * innerWidth1 + innerHeight1 * innerHeight1),
              height: lineOffset,
              position: 'absolute',
              top: originY + 'px',
              left: originX + 'px',
              transform: `rotate(${angle}deg)`,
              // border: '1px solid white',
              borderBottom: '2px solid #' + instance.gradient.colourAt(relation.score),
              transformOrigin: 'top left'
            }
            // console.log(item)
            $(box).addClass('clotho-line')
              .attr('data-clotho-origin', activeItem.id)
              .attr('data-clotho-target', relation.target)
              .attr('data-clotho-line', activeItem.id)
              .css(css)
              .appendTo($(instance.UINodes.container))
            // console.log(css)
            // var angle = target.attr('data-clotho-node-angle');
            // console.log(angle)
            // if (targetNode && targetNode.length) {

            //   console.log(target, relation)
            //   // lineOffset = 5;
            //   // var line = svg.line(
            //   //   null,
            //   //   (activeNode.position().left + activeNode.width() / 2) - Math.max(lineOffset * (angle / 360), 7),
            //   //   (activeNode.position().top + activeNode.height() / 2) - Math.max(lineOffset * (angle / 360), 7),
            //   //   (target.position().left + target.width() / 2) - Math.max(lineOffset * (angle / 360), 7),
            //   //   (target.position().top + target.height() / 2) - Math.max(lineOffset * (angle / 360), 7),
            //   //   {
            //   //     strokeWidth: 2,
            //   //     stroke: '#' + instance.gradient.colourAt(relation.score)
            //   //   }
            //   // )
            //   // $(line).attr('data-clotho-line', relation.target);

            // }

          }


        } else if (instance.config.mode === 'tag') {
          // var container = $(instance.UINodes.container);
          for (var n = 0; n < instance.relatedItems.length; n++) {

            var item = instance.relatedItems[n];
            var originNode = $(`${instance.UINodes.container} [data-clotho-node-id="${item.id}"]`);
            var angle = originNode.attr('data-clotho-node-angle');
            lineOffset = 5;
            // console.log(angle)
            for (var r = 0; r < item.relations.length; r++) {
              // lineOffset = (n % 2 === 1 ? lineOffset : lineOffset * -1);

              var relation = item.relations[r];
              var targetNode = $(`${instance.UINodes.container} [data-clotho-node-id="${relation.target}"]`);
              if (!targetNode || targetNode.length === 0) {
                continue;
              }
              var targetX = (targetNode.position().left + targetNode.width() / 2);
              var targetY = (targetNode.position().top + targetNode.height() / 2);

              var originX = (originNode.position().left + originNode.width() / 2);
              var originY = (originNode.position().top + originNode.height() / 2);

              var innerHeight1 = (Math.max(targetY, originY) - Math.min(targetY, originY))
              var innerWidth1 = (Math.max(targetX, originX) - Math.min(targetX, originX))

              // var innerHeight2 = (originY - targetY)
              var innerHeight2 = (targetY - originY)
              var innerWidth2 = (targetX - originX)
              // var innerWidth2 = (originX - targetX)
              // console.log('starting for ' + item.title, innerWidth1, innerHeight1)

              // if the height difference == 0, then offset = lineOffset / 2 => HORIZONTAL offset = 0;
              // if height difference > 0, then offset = 1/ lineOffset * tan(difference);

              var lineOff = Math.max(Math.tan(innerHeight1 / innerWidth1) * lineOffset, lineOffset);
              var lineOffHorizontal = Math.max(Math.tan(innerHeight2 / innerWidth2) * lineOffset, lineOffset);

              if (Math.abs(innerWidth1) < lineOffset) {
                lineOffHorizontal = 0;
              }
              if (Math.abs(innerHeight1) < lineOffset) {
                lineOff = 0;
              }

              // console.log('line - offset', lineOff)
              // console.log('offsetH parts', lineOffHorizontal, innerHeight, innerWidth);

              var box = document.createElement('div');

              // var radius = instance.radius;
              var angle = Math.atan(innerHeight2 / innerWidth2);
              angle = angle * 180 / Math.PI;

              if (innerWidth2 < 1 && innerHeight2 < 1) {
                angle = 180 + angle;
              }
              else if (innerWidth2 < 1 && innerHeight2 > 1) {
                angle = 180 + angle;
              }
              if (innerWidth2 == 0) {
                angle = 180 + angle;
              }

              // console.log('origin', item.title, '\ntarget', instance.getItem(relation.target).title, '\niheight', innerHeight2, '\niwidth', innerWidth2, '\nangleRad', angle)
              var css = {
                width: Math.sqrt(innerWidth1 * innerWidth1 + innerHeight1 * innerHeight1),
                height: lineOffset,
                position: 'absolute',
                top: originY + 'px',
                left: originX + 'px',
                transform: `rotate(${angle}deg)`,
                // border: '1px solid white',
                borderBottom: '2px solid #' + instance.gradient.colourAt(relation.score),
                transformOrigin: 'top left'
              }
              // console.log(item)
              $(box).addClass('clotho-line')
                .attr('data-clotho-origin', item.id)
                .attr('data-clotho-target', instance.getItem(relation.target).id)
                .attr('data-clotho-line', item.id)
                .css(css)
                .appendTo($(instance.UINodes.container))
              // console.log(css)

            }
          }
        }
      }



      resolve();
    })
  }

  registerEvents() {
    var instance = this;
    console.log(`[CLOTHO] Registering UI Events`)
    return new Promise(function (resolve, reject) {
      var relatedNodes = $(`${instance.UINodes.container} [data-clotho-node-type="related"]`);

      relatedNodes.each(function (i, node) {
        $(node).on('mouseenter mouseleave click', function (ev) {
          var thisID = $(node).attr('data-clotho-node-id');
          if (ev.type === 'mouseenter') {
            $(this).addClass('hover');
            if (instance.config.mode === 'default') {
              if (instance.config.displayType === 'diplomacy') {
                // console.log(this)
                $(`${instance.UINodes.container} [data-clotho-node-type="related"], ${instance.UINodes.container} .clotho-line`).each(function (i, elem) {
                  if ($(elem).attr('data-clotho-node-id') !== thisID && $(elem).attr('data-clotho-target') !== thisID) {
                    $(elem).addClass('notHovered');
                  }
                })

                var itemB = instance.relatedItems.filter(function (item) {
                  return item.id === thisID;
                })[0];

                var itemA = instance.activeItem;

                instance.updateTitles(itemA, itemB);
                $(instance.UINodes.title).addClass('show');
              } else {
                var item = instance.getItem($(this).attr('data-clotho-node-id'));

                var relatedNodes = [];
                var nodes = $(`${instance.UINodes.container} [data-clotho-origin="${item.id}"], ${instance.UINodes.container} [data-clotho-target="${item.id}"]`);
                relatedNodes.push(nodes);

                // for (var r = 0; r < item.relations.length; r++) {
                //   var relation = item.relations[r];
                //   var nodes = $(`${instance.UINodes.container} [data-clotho-node-id="${relation.target}"], ${instance.UINodes.container} [data-clotho-origin="${item.id}"], ${instance.UINodes.container} [data-clotho-target="${item.id}"]`);
                //   // console.log(nodes)
                //   if (nodes && nodes.length > 0) {

                //     relatedNodes.push(nodes)
                //   }

                // }

                // console.log(nodes)
                $(`${instance.UINodes.container} .clotho-node, ${instance.UINodes.container} .clotho-line`).addClass('notHovered');
                $(this).removeClass('notHovered');

                for (var n = 0; n < relatedNodes.length; n++) {
                  // console.log(relatedNodes[n])
                  $(relatedNodes[n]).removeClass('notHovered');
                }

                var itemB = item;

                var itemA = instance.activeItem;

                instance.updateTitles(itemA, itemB);
                $(instance.UINodes.title).addClass('show');
              }

            } else if (instance.config.mode === 'tag') {

              var item = instance.getItem($(this).attr('data-clotho-node-id'));
              var relatedNodes = [];
              for (var r = 0; r < item.relations.length; r++) {
                var relation = item.relations[r];
                var nodes = $(`${instance.UINodes.container} [data-clotho-node-id="${relation.target}"], ${instance.UINodes.container} [data-clotho-origin="${item.id}"], ${instance.UINodes.container} [data-clotho-target="${item.id}"]`);
                // console.log(nodes)
                if (nodes && nodes.length > 0) {

                  relatedNodes.push(nodes)
                }

              }
              $(`${instance.UINodes.container} .clotho-node, ${instance.UINodes.container} .clotho-line`).addClass('notHovered');
              $(this).removeClass('notHovered');

              for (var n = 0; n < relatedNodes.length; n++) {
                // console.log(relatedNodes[n])
                $(relatedNodes[n]).removeClass('notHovered');
              }
            }

          }
          if (ev.type === 'mouseleave') {
            $(this).removeClass('hover');
            if (instance.config.mode === 'default') {
              $(`${instance.UINodes.container} .clotho-node, ${instance.UINodes.container} .clotho-line`).removeClass('notHovered');
              // relatedNodes.removeClass('notHovered');
              // $("line").removeClass('notHovered')
              $(instance.UINodes.title).removeClass('show');
            } else {
              $(`${instance.UINodes.container} .clotho-node, ${instance.UINodes.container} .clotho-line`).removeClass('notHovered');

            }

          }
          if (ev.type === 'click') {
            if (instance.config.mode !== 'tag') {
              instance.reRender(thisID);
            }
          }
        })
      })
      resolve();
    })
  }


  zoomCanvas(event) {
    var canvas = $(this.UINodes.canvas);
    var viewport = $(this.UINodes.viewport);

    var offset = viewport.offset();

    this.zoom.point = {
      x: (event.pageX - offset.left),
      y: (event.pageY - offset.top)
    };

    event.preventDefault();

    var delta = event.delta || event.originalEvent.wheelDelta;
    //FF fix
    if (delta === undefined) {
      delta = event.originalEvent.detail;
    }

    //Set wheel scroll direction
    delta = (Math.max(-1, Math.min(1, delta)));

    if (this.zoom.invertControls) {
      delta = -1 * delta;
    }

    this.zoom.target = {
      x: (this.zoom.point.x - this.zoom.pos.x) / this.zoom.level,
      y: (this.zoom.point.y - this.zoom.pos.y) / this.zoom.level
    }

    //set new scale
    var scale = delta * this.zoom.step;

    this.zoom.level += scale;

    if (this.zoom.level > this.zoom.max) {
      this.zoom.level = this.zoom.max;
    }

    if (this.zoom.level < this.zoom.min) {
      this.zoom.level = this.zoom.min;
    }

    this.zoom.pos = {
      x: -(this.zoom.target.x * this.zoom.level + this.zoom.point.x),
      y: -(this.zoom.target.y * this.zoom.level + this.zoom.point.y)
    };

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

    canvas.css('transition-timing-function', 'ease-out');
    canvas.css('transition-duration', '.1s');
    canvas.css({
      transform: `scale(${this.zoom.level})`
    });

    setTimeout(function () {
      canvas.css('transition-duration', '0s');
      canvas.css('transition-timing-function', 'linear');
    }, 30);
  }
  updateTitles(itemA, itemB) {
    var instance = this;
    // console.log(itemA)
    // console.log(itemB)

    $(`${instance.UINodes.title} .clotho-rel-text`).remove();
    if (instance.config.displayType === 'diplomacy') {

      $(`${instance.UINodes.title} #clothoDisplayA img`)
        .attr('src', instance.generateImageURL(itemA.flag_id))
      // $(`${instance.UINodes.title} #clothoDisplayA h3`)
      //   .text(itemA.title);
      $(`${instance.UINodes.title} #clothoDisplayB img`)
        .attr('src', instance.generateImageURL(itemB.flag_id))
      // $(`${instance.UINodes.title} #clothoDisplayB h3`)
      //   .text(itemB.title)
    } else {
      $(`${instance.UINodes.title} #clothoDisplayA img`)
        .attr('src', instance.generateImageURL(itemA.portrait_id))
      // $(`${instance.UINodes.title} #clothoDisplayA h3`)
      //   .text(itemA.title);
      $(`${instance.UINodes.title} #clothoDisplayB img`)
        .attr('src', instance.generateImageURL(itemB.portrait_id))
      // $(`${instance.UINodes.title} #clothoDisplayB h3`)
      //   .text(itemB.title)
    }

    var arrowContainer = $(`${instance.UINodes.title} .clotho-title-arrows`);
    arrowContainer.children('.clotho-line').remove();
    // arrowContainer.children('svg').children('line').remove();
    arrowContainer.children('svg').remove();
    arrowContainer.removeClass('hasSVG')
    arrowContainer.children('.clotho-arrow-end').remove();
    arrowContainer.children('.clotho-disposition-container').remove();
    arrowContainer.svg();
    var svg = arrowContainer.svg('get');
    var itemALineColor = ''
    var itemAStatus = ''

    var itemADisposition = '';
    var itemBDisposition = '';
    // console.log(itemB)
    for (var i = 0; i < itemA.relations.length; i++) {
      var relation = itemA.relations[i];
      // console.log(relation)
      if (instance.config.displayType === 'diplomacy') {
        if (relation.target === itemB.id) {
          itemAStatus = relation.diplomacyStatus;
          itemALineColor = '#' + instance.gradient.colourAt(relation.score)
          itemADisposition = relation.score;
          itemBDisposition = itemB.activeItemScore;
          continue;
        }

      } else if (instance.config.displayType === 'relationships') {
        if (relation.target.id === itemB.id) {
          itemAStatus = '';
          itemALineColor = '#' + instance.gradient.colourAt(relation.disposition);
          itemADisposition = relation.disposition;
          itemBDisposition = itemB.disposition;
          continue;
        }
      }
    }
    // console.log(itemADisposition)
    // console.log(itemBDisposition)
    var dispositionContainer = document.createElement('div');
    $(dispositionContainer)
      .addClass('clotho-disposition-container')
      .appendTo($(arrowContainer))

    var itemADispositionEl = document.createElement('div');
    $(itemADispositionEl)
      .addClass('clotho-disposition clotho-disp-a')
      .css({ color: `#${instance.gradient.colourAt(itemADisposition)}` })
      .text(itemADisposition)
      .appendTo($(dispositionContainer));

    var itemBDispositionEl = document.createElement('div');
    $(itemBDispositionEl)
      .addClass('clotho-disposition clotho-disp-b')
      .css({ color: `#${instance.gradient.colourAt(itemBDisposition)}` })
      .text(itemBDisposition)
      .appendTo($(dispositionContainer))

    // console.log('title line A color', itemALineColor)

    var lineAtoB = svg.line(
      0,
      (arrowContainer.height() / 2) - 5,
      (arrowContainer.width()),
      (arrowContainer.height() / 2) - 5,
      {
        stroke: itemALineColor,
        strokeWidth: 2,
      }
    );

    $(lineAtoB).addClass('clotho-line');

    var lineAtoBText = document.createElement('div')
    var itemBLineColor = '';
    if (instance.config.displayType === 'diplomacy') {
      itemBLineColor = '#' + instance.gradient.colourAt(itemB.activeItemScore)
    } else {
      itemBLineColor = '#' + instance.gradient.colourAt(itemB.disposition)
    }
    $(lineAtoBText)
      .addClass('clotho-rel-text clotho-a-b')
      .text(itemAStatus)
      .appendTo(arrowContainer);

    var lineBtoA = svg.line(
      (arrowContainer.width()),
      (arrowContainer.height() / 2) + 15,
      0,
      (arrowContainer.height() / 2) + 15,
      {
        stroke: itemBLineColor,
        strokeWidth: 2
      }
    )

    $(lineBtoA).addClass('clotho-line')

    var arrowEndA = instance.createArrowCap(itemALineColor)

    var styleA = {
      height: '10px',
      position: 'absolute',
      top: arrowContainer.height() / 2 - 11,
      left: arrowContainer.width() - 2
    }
    $(arrowEndA).addClass('clotho-arrow-end').css(styleA).appendTo($(arrowContainer));

    var arrowEndB = instance.createArrowCap(itemBLineColor)

    var styleB = {
      height: '10px',
      position: 'absolute',
      top: arrowContainer.height() / 2 + 11,
      left: 3,
      transform: 'rotate(180deg)'
    }
    $(arrowEndB).addClass('clotho-arrow-end').css(styleB).appendTo($(arrowContainer));

  }

  generateID(prefix) {
    return (prefix ? prefix + '_' : '') + '_' + Math.random().toString(36).substr(2, 9);
  }

  getBaseURL() {
    if (this.config.serverURL) {
      return this.config.serverURL;
    }
    // domain detection?
    console.log('[CLOTHO] No domain registered. Falling back to domain detection');
    var { protocol, host } = window.location;
    return `${protocol}//${host}`
    // Perhaps we want to offer a final fallback?
  }

  constructArticleURL(uri) {
    if (uri && uri.length > 0) {
      // return 'https://www.worldanvil.com' + uri;
      return `${this.getBaseURL()}${uri}`;
    }
    return '#';
  }

  generateImageURL(uri) {
    if (uri && uri.length > 0) {
      console.log('Generating Image URL!')
      if (uri.toLocaleLowerCase().startsWith('https://')) {
        return `${uri}`;
      }
      return `${this.getBaseURL()}${uri}`;
    }
    return `https://via.placeholder.com/300?text=No+Image`;
  }

  createArrowCap(color) {
    var arrowCap = document.createElement('div');
    var segmentA = document.createElement('div');
    var segmentB = document.createElement('div');

    $(segmentA)
      .addClass('clotho-arrow-segment')
      .css('top', '5px')
      .css('transform', 'rotate(30deg)')
      .css('background-color', color)
      .appendTo($(arrowCap));

    $(segmentB)
      .addClass('clotho-arrow-segment')
      .css('bottom', '3px')
      .css('transform', 'rotate(330deg)')
      .css('background-color', color)
      .appendTo($(arrowCap))
    return arrowCap;
  }

  createNode(item) {
    var instance = this;
    if (instance.config.displayType === 'diplomacy') {
      var node = `
      <div class="clotho-node clotho-organization-node" data-clotho-node-id="${item.id}" id="${instance.generateID('node')}">
        <div class="clotho-portrait-frame">
          <img src="${instance.generateImageURL(item.flag_id)}" class="clotho-portrait"/>
        </div>
        <div class="clotho-text-frame">
          <div class="clotho-label">
            <a class="clotho-title" href="${instance.getBaseURL()}${item.organization_url}">
              ${item.title}
            </a>
          </div>
        </div>
        <div class="clotho-target"></div>
      </div>`;
      return node;
    }
    if (instance.config.displayType === 'relationships') {
      var node = `
      <div class="clotho-node clotho-character-node" data-clotho-node-id="${item.id}" id="${instance.generateID('node')}">
        <div class="clotho-portrait-frame">
          <img src="${instance.generateImageURL(item.portrait_id)}" class="clotho-portrait"/>
        </div>
        <div class="clotho-text-frame">
          <div class="clotho-label">
            <a class="clotho-title" href="${instance.getBaseURL()}${item.person_url}">
              ${item.title}
            </a>
          </div>
        </div>
        <div class="clotho-target"></div>
      </div>`;
      return node;
    }
  }
  getItem(id) {
    var instance = this;
    if (instance.itemList && instance.itemList.length > 0) {
      for (var i = 0; i < instance.itemList.length; i++) {
        var item = instance.itemList[i];

        if (item.id === id) {
          return item;
        }
      }
    }
  }
  fetchData() {
    var instance = this;
    console.log(`[CLOTHO] Retrieving Data.`)
    return new Promise(function (resolve, reject) {
      var filename = '';
      var storeKey = '';
      if (instance.config.displayType === 'diplomacy') {
        filename = 'diplomacy';
        storeKey = 'organizations';
      } else {
        filename = 'relationships';
        storeKey = 'characters';
      }

      if (!ClothoData || !ClothoData[instance.config.worldID]) {
        console.log(`[CLOTHO] No prior data saved. Fetching.`)
        // var apiURL = `https://www.worldanvil.com/api/world/${instance.config.worldID}/${filename}.json`;
        var apiURL = `${instance.getBaseURL()}/api/world/${instance.config.worldID}/${filename}.json`;

        $.ajax({
          url: apiURL,
          method: 'GET',
          useCredentials: true,
          success: function (data) {
            console.log(`[CLOTHO] Fetch Success.`, data);
            if (ClothoData) {
              ClothoData[instance.config.worldID] = data;
            }
            instance.itemList = data[storeKey];
            instance.relationList = data.relations;
            resolve();
          },
          error: function (err) {
            console.log(`[CLOTHO] Fetch Error:`, err)
            reject();
          }
        })
      } else {
        console.log(`[CLOTHO] Found Existing Data. Aborting Fetch.`);
        instance.itemList = ClothoData[instance.config.worldID][storeKey];
        instance.relationList = ClothoData[instance.config.worldID].relations
        resolve();
      }
    })
  }

  centerCanvas() {
    var instance = this;
    return new Promise(function (resolve, reject) {
      var canvas = $(instance.UINodes.canvas);
      var viewport = $(instance.UINodes.viewport);

      $(canvas).css({
        top: -((canvas.height() / 2) - (viewport.innerHeight() / 2)),
        left: -((canvas.width() / 2) - (viewport.innerWidth() / 2))
      });

      resolve();
    })
  }

  setZoom(zoomLevel) {
    var instance = this;
    return new Promise(async function (resolve, reject) {
      var canvas = $(instance.UINodes.canvas);

      if (zoomLevel > instance.zoom.max) {
        zoomLevel = instance.zoom.max;
      }
      if (zoomLevel < instance.zoom.min) {
        zoomLevel = instance.zoom.min;
      }

      canvas.css('transition-timing-function', 'ease-out');
      canvas.css('transition-duration', '.3s');

      await canvas.css({
        transform: `scale(${zoomLevel})`
      });

      setTimeout(function () {
        canvas.css('transition-duration', '0s');
        canvas.css('transition-timing-function', 'linear');
        // console.log('returning')
        resolve();
      }, 350)
    })
  }

  reRender(newID) {
    var instance = this;

    instance.resetGraph()
      .then(function () {
        return instance.setZoom(1)
      })
      .then(async function () {
        instance.activeID = newID;
        await instance.makeGraph()
      })
    // .then(function () {
    //   setTimeout(function () {
    //     instance.setZoom(instance.zoom.level);
    //   }, 750)

    // });
  }

  resetGraph() {
    var instance = this;
    return new Promise(function (resolve, reject) {
      instance.activeItem = null;
      instance.relatedItems = [];
      $(instance.UINodes.title).removeClass('show');

      $(instance.UINodes.viewport).find('.clotho-node, .clotho-line').remove();

      resolve();
    })
  }
}