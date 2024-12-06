//  _____  _                   ____             _____ _                _
// |  __ \| |                 / __ \           / ____| |              | |
// | |__) | |__   ___  __ _  | |  | |_ __ __ _| |    | |__   __ _ _ __| |_ ___
// |  _  /| '_ \ / _ \/ _` | | |  | | '__/ _` | |    | '_ \ / _` | '__| __/ __|
// | | \ \| | | |  __/ (_| | | |__| | | | (_| | |____| | | | (_| | |  | |_\__ \
// |_|  \_\_| |_|\___|\__,_|  \____/|_|  \__, |\_____|_| |_|\__,_|_|   \__|___/
//                                        __/ |
//                                       |___/
class OrgChart {
  constructor(opts) {
    console.log('RHEA (OC): Initializing...', opts);
    this.config = opts.config;
    this.instanceID = this.makeRandomID();
    this.nodes = {
      viewport: '#' + this.makeRandomID(this.instanceID),
      canvas: '#' + this.makeRandomID(this.instanceID),
      title: '#' + this.makeRandomID(this.instanceID),
      treeContainer: '#' + this.makeRandomID(this.instanceID),
    };

    this.zoom = {
      level: opts.config.initialZoom
        ? parseFloat(opts.config.initialZoom / 100)
        : 1,
      max: opts.config.maxZoom ? Math.min(opts.config.maxZoom / 100, 5) : 5,
      min: opts.config.minZoom
        ? Math.max(opts.config.minZoom / 100, 0.25)
        : 0.25,
      target: { x: 0, y: 0 },
      point: { x: 0, y: 0 },
      pos: { x: 0, y: 0 },
      step: opts.config.zoomStep
        ? Math.min(0.1, opts.config.zoomStep / 100)
        : 0.1,
      size: {
        w: opts.config.initialCanvasSize ? opts.config.initialCanvasSize : 3000,
        h: opts.config.initialCanvasSize ? opts.config.initialCanvasSize : 3000,
      },
    };
    this.dragging = false;
    this.initialize();
  }

  initialize() {
    var instance = this;
    this.createNodes().then(function () {
      instance.makeChart();
    });
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
      //Setup the Viewport
      var viewport = instance.config.rootNode;
      $(viewport)
        .attr('id', instance.nodes.viewport.substr(1))
        .addClass('loading');

      //Create Loader splashscreen
      var splashscreen = document.createElement('div');
      $(splashscreen)
        .addClass('rhea-loader-splash')
        .html('<h1 class="rhea-loader-text">Loading Chart</h1>')
        .appendTo($(viewport));

      //Create Titlebox
      var titleboxWrapper = document.createElement('div');
      var titlebox = document.createElement('div');
      var titleText = document.createElement('h2');

      $(titleText)
        .addClass('rhea-oc-title-text')
        .text('Org Chart')
        .appendTo($(titlebox));

      $(titlebox).addClass('rhea-oc-title').appendTo($(titleboxWrapper));

      $(titleboxWrapper)
        .addClass('rhea-oc-title-wrapper')
        .appendTo($(viewport));

      //Create the 'canvas' element
      var canvas = document.createElement('div');
      $(canvas)
        .addClass('rhea-canvas')
        .attr('id', instance.nodes.canvas.substr(1))
        .appendTo($(viewport));

      //Create tree's container
      var container = document.createElement('div');
      $(container)
        .addClass('rhea-oc-tree')
        .attr('id', instance.nodes.treeContainer.substr(1))
        .appendTo($(canvas));

      var searchContainer = document.createElement('div');
      var searchWrapper = document.createElement('div');
      $(searchWrapper)
        .addClass('rhea-oc-search-wrapper')
        .html(
          `
            <input type="text" placeholder="Search Chart" id="rhea-oc-search-input"/>
            <span class="clearSearch">
                <i class="fal fa-times"></i>
            </span>
          `
        )
        .appendTo($(searchContainer));

      //TODO: Zoom Buttons
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
          .addClass('rhea-oc-zoom-controls')
          .appendTo($(searchContainer));
      }

      $(searchContainer).addClass('rhea-oc-search').appendTo($(viewport));

      //DEBUG: Show Guides
      if (instance.config.debug) {
        //Canvas Center Guide
        var canvasTarget = document.createElement('div');
        $(canvasTarget)
          .addClass('debug-target target-canvas')
          .css({
            left: $(canvas).width() / 2 - 5.5,
            top: $(canvas).height() / 2 - 5.5,
          })
          .appendTo($(canvas));

        //Viewport Center Guide
        var viewportTarget = document.createElement('div');
        $(viewportTarget)
          .addClass('debug-target target-viewport')
          .css({
            left: $(viewport).innerWidth() / 2 - 5.5,
            top: $(viewport).innerHeight() / 2 - 5.5,
          })
          .appendTo($(viewport));

        //Viewport Axis X
        var axisX = document.createElement('div');
        $(axisX)
          .addClass('debug-axis axis-x')
          .css({
            top: $(viewport).innerHeight() / 2 - 1,
          })
          .appendTo($(viewport));

        //Viewport Axis Y
        var axisX = document.createElement('div');
        $(axisX)
          .addClass('debug-axis axis-y')
          .css({
            left: $(viewport).innerWidth() / 2 - 1,
          })
          .appendTo($(viewport));
      }

      //Bind UI Events

      //Canvas: Pan
      $(canvas).draggable({
        start: function (event, ui) {
          instance.dragging = true;
          instance.zoom.point = {
            x: parseInt($(this).css('left'), 10) - ui.position.left,
            y: parseInt($(this).css('top'), 10) - ui.position.top,
          };
        },
        drag: function (event, ui) {
          var dx = ui.position.left - ui.originalPosition.left;
          var dy = ui.position.top - ui.originalPosition.top;

          ui.position.left = ui.originalPosition.left + dx;
          ui.position.top = ui.originalPosition.top + dy;

          ui.position.left += instance.zoom.point.x;
          ui.position.top += instance.zoom.point.y;
        },
        stop: function () {
          setTimeout(function () {
            instance.dragging = false;
          }, 300);
        },
      });
      //Canvas: Zoom
      $(canvas).on('mousewheel DOMMouseScroll', function (event) {
        instance.zoomCanvas(event);
      });

      //Search: Input
      $(`${instance.nodes.viewport} #rhea-oc-search-input`).on(
        'keyup',
        function (event) {
          var searchStr = $(this).val();
          instance.searchChart(searchStr);
        }
      );

      //Search: Clear
      $(`${instance.nodes.viewport} .clearSearch i`).on('click', function () {
        $(`${instance.nodes.viewport} #rhea-oc-search-input`).val('');
      });

      //Zoom Buttons
      $(`${instance.nodes.viewport} .rhea-oc-zoom-controls button`).on(
        'click',
        function (event) {
          var direction = $(event.currentTarget).attr('zoom-direction');
          var step =
            direction === 'out' ? -instance.zoom.step : instance.zoom.step;
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
        }
      );
      resolve();
    });
  }

  makeChart() {
    var instance = this;
    instance
      .getChartData(instance.config.chartID)
      .then(function () {
        instance.updateTitle();
      })
      .then(function () {
        return instance.prepareTreeStructure();
      })
      .then(function (treeStructure) {
        var treeConfig = {
          chart: {
            container: instance.nodes.treeContainer,
            rootOrientation: instance.config.chartOrientation,
            connectors: {
              type: 'step',
            },
            node: {
              HTMLclass: 'oc-node',
              collapsable: true,
            },
            nodeAlign: 'top',
            hideRootNode: true,
            siblingSeparation: 80,
            levelSeparation: 60,
          },
        };
        return instance.renderTree(treeConfig, treeStructure);
      })
      .then(function () {
        return instance.positionTree();
      })
      .then(function () {
        console.log('RHEA (OC): Positioning Canvas');
        instance.centerCanvas();
      })
      .then(function () {
        instance.registerNodeEvents();
      })
      .then(function () {
        $(instance.nodes.viewport).removeClass('loading');
        var zoomLevel = parseInt(instance.config.initialZoom, 10) / 100;
        instance.zoom.level = zoomLevel;
        instance.setZoom(zoomLevel);
      });
  }

  prepareTreeStructure() {
    var instance = this;
    return new Promise(async function (resolve, reject) {
      if (!instance.chartData || instance.chartData.length === 0) {
        reject('RHEA (OC): No chart items to display.');
      }

      var items = await instance.findChildren('');

      // console.log(items);
      resolve(items);
    });
  }

  async findChildren(itemID) {
    var instance = this;
    var items = instance.chartData;
    var ret = [];
    return new Promise(async function (resolve, reject) {
      parseloop: for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (item.parent === itemID) {
          if (itemID === '') {
            item.isParent = true;
          }
          var children = await instance.findChildren(item.id);
          var itemNode = await instance.generateNode(item);
          var childrenNodes = [];
          if (children.length && children.length > 0) {
            for (var c = 0; c < children.length; c++) {
              var child = children[c];

              childrenNodes.push(child);
            }
            childrenNodes.sort(function (a, b) {
              if (!a.position || !b.position) {
                return -1;
              }
              return a.position > b.position;
            });
            itemNode.children = childrenNodes;
          }
          // console.log(itemNode)
          ret.push(itemNode);
        }
      }
      ret.sort(function (a, b) {
        if (!a.position || !b.position) {
          return -1;
        }
        return a.position > b.position;
      });
      resolve(ret);
    });
  }

  renderTree(config, nodes) {
    var instance = this;
    return new Promise(function (resolve, reject) {
      console.log('RHEA (OC): Rendering Chart');
      config.chart.callback = {
        onTreeLoaded: function () {
          resolve();
        },
      };
      config.chart.scrollbar = 'none';

      new Treant({
        chart: config.chart,
        nodeStructure: {
          pseudo: true,
          children: nodes,
        },
      });
    });
  }

  positionTree() {
    var instance = this;
    return new Promise(function (resolve, reject) {
      var canvas = $(instance.nodes.canvas);
      var viewport = $(instance.nodes.viewport);
      var tree = $(instance.nodes.treeContainer);
      var rootNode = $(
        instance.nodes.treeContainer + ' [data-root-node="true"]'
      ).first();
      console.log(rootNode.position());
      var origin = {
        top: canvas.height() / 2,
        left: canvas.width() / 2,
      };

      tree.css({
        top: origin.top - 15 - rootNode.parent().height() / 2,
        left:
          origin.left -
          rootNode.parent().position().left -
          rootNode.outerWidth() / 2,
      });

      resolve();
    });
  }

  centerCanvas() {
    var instance = this;
    return new Promise(function (resolve, reject) {
      var canvas = $(instance.nodes.canvas);
      var viewport = $(instance.nodes.viewport);

      canvas.css({
        top: -(canvas.height() / 2 - viewport.innerHeight() / 2),
        left: -(canvas.width() / 2 - viewport.innerWidth() / 2),
      });
      resolve();
    });
  }

  registerNodeEvents() {
    var instance = this;
    return new Promise(function (resolve, reject) {
      $(`${instance.nodes.canvas} .rhea-oc-node`).each(function (i, node) {
        $(node).on('click', function (ev) {
          if (!instance.dragging) {
            ev.preventDefault();
            var url = $(this).data('rhea-article-link');
            if (url && url.length > 0) {
              window.location = url;
            }
          }
        });
      });
    });
  }
  //  _   _ _   _ _ _ _          __  __     _   _            _
  // | | | | |_(_) (_) |_ _  _  |  \/  |___| |_| |_  ___  __| |___
  // | |_| |  _| | | |  _| || | | |\/| / -_)  _| ' \/ _ \/ _` (_-<
  //  \___/ \__|_|_|_|\__|\_, | |_|  |_\___|\__|_||_\___/\__,_/__/
  //                      |__/

  //Generate Item Node
  generateNode(item) {
    var instance = this;
    var template = `
        <div class="rhea-oc-node" data-item-id="${item.id}" data-root-node="${
      item.isParent ? 'true' : 'false'
    }" data-rhea-article-link="${instance.constructURL(item.article_url)}">
            <div class="rhea-ocnode-cover">
                <div class="rhea-ocnode-cover-wrapper">
                    <img src="${
                      instance.constructImageURL(item.cover_url) ||
                      instance.generateItemImage()
                    }" alt="${item.title}"/>
                </div>
            </div>
            ${
              (item.description && item.description.length > 0) ||
              item.article_url.length > 0 ||
              (item.title && item.title.length > 0)
                ? `
            <div class="rhea-ocnode-description">
                <h4 class="rhea-ocnode-title">${
                  item.title ? item.title : ''
                }</h4>
                <p class="rhea-ocnode-description-text">
                    <span class="rhea-ocnode-text-wrap">
                    ${item.description ? item.description : ''}
                    </span>
                    
                </p>
            </div>
            `
                : ''
            }
        </div>
        `;
    //${item.article_url.length > 0 ? `<a href="${item.article_url}" class="rhea-ocnod-description-link">Read More</a>`:''}
    console.log('DEBUG: Rhea (OC) > \nConstructing Item node:', item, template);
    return {
      collapsed: item.startCollapsed ? true : false,
      innerHTML: template,
      parentConnector: item.parentConnector || null,
    };
  }

  //Generate Item Image
  generateItemImage() {
    return 'https://via.placeholder.com/300?text=No+Image';
  }

  constructImageURL(imgPath) 
  {
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
  //Generate semi-unique string for instance and nodes
  makeRandomID(str = null) {
    return (str ? str + '_' : '') + Math.random().toString(36).substr(2, 9);
  }

  //Retrieve the chart's data from API
  getChartData(chartID) {
    var instance = this;
    return new Promise(function (resolve, reject) {
      console.log(`RHEA (OC): Getting Chart Data for chart "${chartID}"`);
      var apiURL = `${instance.getBaseURL()}/api/orgchart/${chartID}`;

      $.ajax({
        url: apiURL,
        method: 'GET',
        useCredentials: true,
        success: function (data) {
          instance.chartMeta = data.chart;
          instance.chartData = data.items ? data.items : [];

          if (instance.chartData.length > 0) {
            for (var i = 0; i < instance.chartData.length; i++) {
              if (instance.chartData[i].parentConnector) {
                var styleOptions = instance.chartData[i].parentConnector;
                var connectorStyle = {
                  stroke: styleOptions.color ? styleOptions.color : undefined,
                  'stroke-dasharray': styleOptions.type
                    ? styleOptions.type === 'dash'
                      ? '--'
                      : styleOptions.type === 'dot'
                      ? '.'
                      : undefined
                    : undefined,
                  'stroke-width': styleOptions.width
                    ? styleOptions.width
                    : undefined,
                };
                instance.chartData[i].parentConnector = {
                  style: connectorStyle,
                };
                // console.log(instance.chartData[i])
              }
            }
            // instance.chartData[1].connector = {
            //     style: {
            //         stroke: 'red'
            //     }
            // }
          }
          console.log(
            `RHEA (OC): Successfully retrieved chart "${
              data.chart.title ? data.chart.title : chartID
            }"`,
            instance.config.debug ? data : ''
          );
          resolve();
        },
        error: function (err) {
          console.log(
            `RHEA (OC): Unable to retrieve chart data for "${chartID}"`,
            err
          );
          reject(err);
        },
      });
    });
  }

  //Format the links as full URLS
  constructURL(uri) {
    if (uri && uri.length > 0) {
      // return 'https://www.worldanvil.com' + uri;
      return `${this.getBaseURL()}${uri}`
    }
    return '';
  }

  //Update Viewport Title
  updateTitle() {
    var instance = this;
    return new Promise(function (resolve, reject) {
      var title =
        instance.chartMeta.title && instance.chartMeta.title.length > 0
          ? instance.chartMeta.title
          : 'Org Chart';
      $(`${instance.nodes.viewport} .rhea-oc-title-text`).text(title);
      resolve();
    });
  }

  //Set zoom manually
  setZoom(zoomLevel) {
    var instance = this;
    return new Promise(async function (resolve, reject) {
      console.log(`RHEA (OC): Setting zoom level to ${zoomLevel * 100}%`);
      var canvas = $(instance.nodes.canvas);
      if (zoomLevel > instance.zoom.max) {
        zoomLevel = instance.zoom.max;
      }
      if (zoomLevel < instance.zoom.min) {
        zoomLevel = instance.zoom.min;
      }
      canvas.css('transition-timing-function', 'ease-out');
      canvas.css('transition-duration', '.3s');
      await canvas.css({
        transform: `scale(${zoomLevel})`,
        // 'transform-origin': `${pos.x}px ${pos.y}px`
        // left: pos.x,
        // top: pos.y
      });
      setTimeout(function () {
        canvas.css('transition-duration', '0s');
        canvas.css('transition-timing-function', 'linear');
        resolve();
      }, 300);
    });
  }

  //Pan to given node
  panToNode(node) {
    var instance = this;
    return new Promise(async function (resolve, reject) {
      if (!node) {
        reject();
      }

      var canvas = $(instance.nodes.canvas);

      canvas.css({
        left: -(
          $(node).parent().position().left +
          $(node).parent().parent().position().left +
          $(node).parent().outerWidth() / 2 -
          $(instance.nodes.viewport).width() / 2
        ),
        top: -(
          $(node).parent().position().top +
          $(node).parent().parent().position().top +
          $(node).parent().outerHeight() / 2 -
          $(instance.nodes.viewport).height() / 2
        ),
      });

      setTimeout(function () {
        resolve();
      }, 300);
    });
  }

  //Event Handler: Search
  searchChart(str = '') {
    var instance = this;
    var minLength = instance.config.minSearchLength || 3;
    var searchFields = instance.config.searchFields
      ? instance.config.searchFields.split('|')
      : ['title', 'id'];

    if (str.length === 0 || !str) {
      var rootNode = $(
        instance.nodes.treeContainer + ' [data-root-node="true"]'
      ).get(0);
      //Center on main node
      $(instance.nodes.canvas).addClass('panning');
      instance
        .setZoom(1)
        .then(function () {
          instance.panToNode(rootNode);
        })
        .then(function () {
          setTimeout(function () {
            instance.setZoom(instance.zoom.level);
            $(instance.nodes.canvas).removeClass('panning');
          }, 500);
        });
    }

    if (str.length >= minLength) {
      var query = str.toLowerCase();
      console.log(`RHEA (OC): Searching chart for "${str}"`);
      searchLoop: for (var f = 0; f < searchFields.length; f++) {
        var field = searchFields[f];
        for (var i = 0; i < instance.chartData.length; i++) {
          var item = instance.chartData[i];
          if (item[field] && item[field].toLowerCase().indexOf(query) > -1) {
            $(instance.nodes.canvas).addClass('panning');
            // Center on Node
            var node = $(
              `${instance.nodes.viewport} [data-item-id="${item.id}"]`
            ).get(0);
            // console.log('RHEA (OC): Search Result - ', item);
            instance
              .setZoom(1)
              .then(function () {
                // setTimeout(function() {
                instance.panToNode(node);
                // },300)
              })
              // instance.panToNode(node)
              .then(function () {
                setTimeout(function () {
                  instance.setZoom(instance.zoom.level);
                  $(instance.nodes.canvas).removeClass('panning');
                }, 1000);
              });
            break searchLoop;
          }
        }
      }
    } else {
      return;
    }
  }

  //Event Handler: Zoom
  zoomCanvas(event) {
    var canvas = $(this.nodes.canvas);
    var viewport = $(this.nodes.viewport);

    var offset = viewport.offset(); //This is the viewport's offset from the top of page.

    // console.log('Container Offset:',offset); //

    this.zoom.point = {
      x: event.pageX - offset.left,
      y: event.pageY - offset.top,
    };

    // console.log('Mouse Coordinates: ', this.zoom.point);

    var touch = {
      x:
        event.type === 'touchend' ? event.changedTouches[0].pageX : event.pageX,
      y:
        event.type === 'touchend' ? event.changedTouches[0].pageY : event.pageY,
    };

    // console.log('Page Coords', touch);

    event.preventDefault();

    var delta = event.delta || event.originalEvent.wheelDelta;
    if (delta === undefined) {
      delta = event.originalEvent.detail;
    }
    delta = -Math.max(-1, Math.min(1, delta));

    // console.log('Zoom Direction',delta);

    this.zoom.target = {
      x: (this.zoom.point.x - this.zoom.pos.x) / this.zoom.level,
      y: (this.zoom.point.y - this.zoom.pos.y) / this.zoom.level,
    };

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
      y: -(this.zoom.target.y * this.zoom.level + this.zoom.point.y),
    };

    if (this.zoom.pos.x > 0) {
      this.zoom.pos.x = 0;
    }

    if (
      this.zoom.pos.x + this.zoom.size.w * this.zoom.level <
      this.zoom.size.w
    ) {
      this.zoom.pos.x = -((this.zoom.size.w / 2) * (this.zoom.level - 1));
    }

    if (this.zoom.pos.y > 0) {
      this.zoom.pos.y = 0;
    }

    if (
      this.zoom.pos.y + this.zoom.size.h * this.zoom.level <
      this.zoom.size.h
    ) {
      this.zoom.pos.y = -this.zoom.size.h * (this.zoom.level - 1);
    }
    // console.log('New zoom position',this.zoom.pos);

    var pos = {
      x: canvas.position().left + this.zoom.pos.x,
      y: canvas.position().top + this.zoom.pos.y,
    };
    // console.log('Old Canvas Position: ', canvas.position())
    // console.log('New Canvas position', pos);

    canvas.css('transition-timing-function', 'ease-out');
    canvas.css('transition-duration', '.1s');
    canvas.css({
      transform: `scale(${this.zoom.level})`,
      // 'transform-origin': `${pos.x}px ${pos.y}px`
      // left: pos.x,
      // top: pos.y
    });
    setTimeout(function () {
      canvas.css('transition-duration', '0s');
      canvas.css('transition-timing-function', 'linear');
    }, 30);
  }
}
