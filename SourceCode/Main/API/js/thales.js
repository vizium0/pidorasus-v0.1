class Thales {
  //Initialize Thales with configuration.
  constructor(props) {
    // console.log(props);

    //Set the root node
    this.rootNode = props.rootNode;
    //Set the view mode ('editor' | 'viewer').
    this.mode = props.mode;
    //Set the desired table's ID.
    this.tableID = props.tableID;
    //Set the world's ID.
    this.worldID = props.worldID;
    //Generate a semi-unique ID to set on the container.
    this.instanceID = this.generateID('instance');
    //Set the environment. Used for fetching/updating data.
    this.env = props.env;
    //Set the instance's server url to use for API calls
    this.serverURL = props.serverURL;
    //List of viewed table IDs. Similar usage to browserhistory - navigating forward or back will modify this.
    this.tableHistory = [];
    //Pointer of current table
    this.historyPointer = 0;
    //Storage for UI Nodes
    this.UI = {
      // container
    };
    //Storage for current table
    this.table = null;

    //Column/Cell types
    this.dataTypes = {
      text: 'Text',
      checkbox: 'Checklist',
      image: 'Image',
      article: 'Article',
      link: 'Link / URL',
      roll: 'Roll',
      rollBtn: 'Dice Button',
      number: 'Number',
      // date: 'Date',
      longText: 'Long Text',
      table: 'Table',
    };

    this.sizes = {
      row: 43,
      height: 51.8,
    };

    //Begin Thales execution.
    this.initialize();
  }

  initialize() {
    var instance = this;
    //First, create the UI.
    instance
      .createEditorPage()
      .then(function () {
        return instance.createUI();
      })
      .then(function () {
        return instance.fetchTables();
      })
      .then(function () {
        //Next, we'll fetch the data.
        return instance.fetchTableData();
      })
      .then(function () {
        instance.makeTable();
      });
  }

  getBaseURL() {
    if (this.serverURL) {
      return this.serverURL;
    }
    // Domain Detection Fallback
    console.log('[THALES] No domain registered. Falling back to domain detection')
    var { protocol, host } = window.location;
    return `${protocol}//${host}`;
  }

  makeTable() {
    var instance = this;

    //Store Current Table in TableHistory.
    instance.tableHistory.push(instance.tableID);
    // console.log('HISTORY', instance.tableHistory)
    instance
      .populateTable()
      .then(function () {
        $(
          `#${instance.instanceID} .thales-splash[data-thales-splash="loader"]`
        ).addClass('thales-ui-hidden');
        return instance.registerEvents();
      })
      .then(function () {
        var maxSize = instance.table.options.maxSize;
        if (maxSize > 0) {
          instance.resetTableHeight(maxSize);
        } else {
          instance.resetTableHeight();
        }
        // console.log(maxSize)
        instance.clearTouchEvents();
        // var tableHeight = $(`#${instance.instanceID} .thales-table`).outerHeight() + 20;
        // $(`#${instance.instanceID} .thales-table-container`).attr('style', `height: ${tableHeight}px;`)
        // console.log(tableHeight)
      })
      .then(function () {
        $(`#${instance.instanceID}`).attr('data-component-loaded', 'true');
      })
      .catch(function (err) {
        console.log('[THALES] Encountered an error:');
        console.error(err);
        console.log('---- THALES DEBUG ----');
        console.log('Table Data:', instance.table);
      });
  }

  //Create Editor Page
  createEditorPage() {
    var instance = this;
    return new Promise(function (resolve, reject) {
      if (instance.mode === 'editor') {
        //Get the ibox parent of the root element
        var ibox = $(instance.rootNode).closest('.ibox');
        //Replace the title (Structure) with a zero-width space (to prevent FOUS);
        $(ibox).find('.ibox-title > .header-title').text('\u200b');
        // console.log('IBOX', ibox.find('.ibox-content'));

        //Store and remove the root element.
        var rootNode = $(instance.rootNode).clone(true, true);
        $(instance.rootNode).remove();

        //We need to create the button-group for Test Roll | Save | Embed
        var row = document.createElement('div');
        $(row)
          .addClass('thales-editor_ui-row')
          .appendTo($(ibox).find('.ibox-content'));

        var btnGrp = document.createElement('div');
        $(btnGrp).addClass('btn-group').attr('role', 'group').appendTo($(row));

        //Test Roll Group
        var testRollGrp = document.createElement('div');
        $(testRollGrp)
          .addClass('btn-group thales-ui-hidden thales-rollBtn-group')
          .attr('role', 'group')
          .html(
            `
            <button type="button" class="btn btn-primary" id="thales-testRoll-btn">
              <i class="fal fa-dice thales-btn-icon"></i> Test Roll
            </button>
            <button type="button" class="btn btn-primary dropdown-toggle dropdown-toggle-split" data-toggle="dropdown" id="thales-testRoll-dropdownToggle">
              <span class="sr-only">Select the column to roll on.</span>
            </button>
            <div class="dropdown-menu dropdown-menu-right" aria-labelledby="thales-testRoll-dropdownToggle"></div>
          `
          )
          .appendTo($(row));

        //Save Table Button
        var saveBtn = document.createElement('button');
        $(saveBtn)
          .addClass('btn btn-primary')
          .attr('type', 'button')
          .attr('id', 'thales-save-btn')
          .html('<i class="fal fa-save thales-btn-icon"></i> Save')
          .appendTo($(btnGrp));

        //Embed Button
        var embedBtn = document.createElement('button');
        $(embedBtn)
          .addClass('btn btn-primary')
          .attr('type', 'button')
          .attr('id', 'thales-embed-btn')
          .html('<i class="fal fa-clipboard thales-btn-icon"></i> Embed')
          .appendTo($(btnGrp));

        //Tab Navigation: Edit - Options
        var subNav = document.createElement('div');
        $(subNav)
          .addClass('')
          .html(
            `
            <div class="col-md-12">
              <div class="ibox mb-3">
                <div class="ibox-content p-0 mt-3 context-menu context-menu-primary">
                  <ul class="nav">
                    <li class="nav-item">
                      <a href="#thales-editTab" class="nav-link active" data-toggle="tab">
                        Edit Table
                      </a>
                    </li>
                    <li class="nav-item">
                      <a href="#thales-optionsTab" class="nav-link" data-toggle="tab">
                        Advanced Options
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          `
          )
          .appendTo($(ibox).find('.ibox-content'));

        //Tab Panes
        var editorPanes = document.createElement('div');
        $(editorPanes)
          .addClass('col-md-12 mt-3')
          .html(
            `
              <div class="tab-content">
                <div class="tab-pane active" role="tabpanel" id="thales-editTab">
                  <div class="thales-search-wrap">
                    <div class="thales-search-box thales-ui-hidden">
                      <i class="fal fa-search" aria-hidden="true"></i>
                      <input class="thales-input thales-search form-control" placeholder="Search" id="thales-editor-search" />
                    </div>
                  </div>
                </div>
                <div class="tab-pane" role="tabpanel" id="thales-optionsTab">
                  <h3 class="tab-section-header">
                    <i class="far fa-cog"></i>
                    General
                  </h3>
                  <div class="row">
                    <div class="col-xs-12 col-md-4">
                      <label for="#thales-ShowHeader" class="thales-setting-label">
                        <span class="thales-setting-help-icon" title="This will determine whether or not to show the table's title." data-toggle="thales-tooltipster">
                          <i class="fal fa-question-circle"></i>
                        </span>
                        Show Title
                      </label>
                    </div>
                    <div class="col-xs-12 col-md-8">
                      <input type="checkbox" id="thales-ShowHeader" name="thales-ShowHeader" />
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-xs-12 col-md-4">
                      <label for="#thales-ShowRoll" class="thales-setting-label">
                        <span class="thales-setting-help-icon" title="This will show a 'Roll' button, allowing the user to roll randomly on the table. If the table has multiple columns, the user will have the option to select which column to use for a roll. In the event there are no rollable columns, a random row will be selected." data-toggle="thales-tooltipster">
                          <i class="fal fa-question-circle"></i>
                        </span>
                        Rollable
                      </label>
                    </div>
                    <div class="col-xs-12 col-md-8">
                      <input type="checkbox" id="thales-ShowRoll" name="thales-ShowRoll" />
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-xs-12 col-md-4">
                      <label for="#thales-ShowSearch" class="thales-setting-label">
                        <span class="thales-setting-help-icon" title="This setting will display a search box the user can use to filter the rows based on their cell contents." data-toggle="thales-tooltipster">
                          <i class="fal fa-question-circle"></i>
                        </span>
                        Enable Search
                      </label>
                    </div>
                    <div class="col-xs-12 col-md-8">
                      <input type="checkbox" id="thales-ShowSearch" name="thales-ShowSearch" />
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-xs-12 col-md-4">
                      <label for="#thales-showDescription">
                        <span class="thales-setting-help-icon" title="This will display the description, and place it directly under the table." data-toggle="thales-tooltipster">
                          <i class="fal fa-question-circle"></i>
                        </span>
                        Show Description
                      </label>
                    </div>
                    <div class="col-xs-12 col-md-8">
                      <input type="checkbox" id="thales-ShowDescription" name="thales-ShowDescription" />
                    </div>
                  </div>
                  <!-- Affix Table Header & Max Size -->
                  <div class="row thales-ui-hidden">
                    <div class="col-xs-12 col-md-4">
                      <label for="#thales-AffixHeader" class="thales-setting-label">
                        <span class="thales-setting-help-icon" title="This will affix the table header, so if the user scrolls down on the table, the header row is always present. Note, this will have no effect if the 'Max Rows' setting is empty or set to 0." data-toggle="thales-tooltipster">
                          <i class="fal fa-question-circle"></i>
                        </span>
                        Affix Table Header
                      </label>
                    </div>
                    <div class="col-xs-12 col-md-8">
                      <input type="checkbox" id="thales-AffixHeader" name="thales-AffixHeader" />
                    </div>
                  </div>
                  <div class="row thales-ui-hidden">
                    <div class="col-xs-12 col-md-4">
                      <label for="#thales-MaxSize" class="thales-setting-label">
                        <span class="thales-setting-help-icon" title="This controls how many rows the table will show at once. Set to 0 to show all rows." data-toggle="thales-tooltipster">
                          <i class="fal fa-question-circle"></i>
                        </span>
                        Max Rows
                      </label>
                    </div>
                    <div class="col-xs-12 col-md-8">
                      <input type="number" id="thales-MaxSize" name="thales-MaxSize" class="form-control" />
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-xs-12 col-md-4">
                      <label for="#thales-EnableCollapse" class="thales-setting-label">
                        <span class="thales-setting-help-icon" title="This will allow the table to collapse, similar to a spoiler." data-toggle="thales-tooltipster">
                          <i class="fal fa-question-circle"></i>
                        </span>
                        Enable Collapse
                      </label>
                    </div>
                    <div class="col-xs-12 col-md-8">
                      <input type="checkbox" id="thales-EnableCollapse" name="thales-AffixHeader" />
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-xs-12 col-md-4">
                      <label for="#thales-StartCollapsed" class="thales-setting-label">
                        <span class="thales-setting-help-icon" title="This will start the table collapsed, showing only a button to expand the table. This requires 'Enable Collapse' to be enabled." data-toggle="thales-tooltipster">
                          <i class="fal fa-question-circle"></i>
                        </span>
                        Start Collapsed
                      </label>
                    </div>
                    <div class="col-xs-12 col-md-8">
                      <input type="checkbox" id="thales-StartCollapsed" name="thales-AffixHeader" />
                    </div>
                  </div>
                  <h3 class="panel-section-header">
                    <i class="far fa-palette"></i>
                    Style
                  </h3>
                  <div class="row">
                    <div class="col-xs-12 col-md-4">
                      <label for="#thales-CustomClass" class="thales-setting-label">
                        <span class="thales-setting-help-icon" title="The class you specify here will be added to the parent wrapper element in presentation view, allowing you to easily style the table with custom CSS. Do not use the words 'script', 'wrapper', 'container' as your custom CSS will have these words removed automatically." data-toggle="thales-tooltipster">
                          <i class="fal fa-question-circle"></i>
                        </span>
                        Custom CSS Class
                      </label>
                    </div>
                    <div class="col-xs-12 col-md-8">
                      <input type="text" id="thales-CustomClass" class="form-control" />
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-xs-12 col-md-4">
                      <label for="#thales-HeaderBG" class="thales-setting-label">
                        <span class="thales-setting-help-icon" title="Select a custom background color to be used for Header cells. You can use hex values (#a83427) or RGB(A) (rgba(227,17,22,1)." data-toggle="thales-tooltipster">
                          <i class="fal fa-question-circle"></i>
                        </span>
                        Heading Background
                      </label>
                    </div>
                    <div class="col-xs-12 col-md-8">
                      <input type="text" id="thales-HeaderBG" class="form-control" />
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-xs-12 col-md-4">
                      <label for="#thales-HeaderTextColor" class="thales-setting-label">
                        <span class="thales-setting-help-icon" title="Select a custom text color to be used for the title of Header cells. You can use hex values (#a83427) or RGB(A) (rgba(227,17,22,1)." data-toggle="thales-tooltipster">
                          <i class="fal fa-question-circle"></i>
                        </span>
                        Header Text Color
                      </label>
                    </div>
                    <div class="col-xs-12 col-md-8">
                      <input type="text" id="thales-HeaderTextColor" class="form-control" />
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-xs-12 col-md-4">
                      <label for="#thales-CellBG" class="thales-setting-label">
                        <span class="thales-setting-help-icon" title="Select a custom background color for the cells in the table. You can use hex values (#a83427) or RGB(A) (rgba(227,17,22,1)." data-toggle="thales-tooltipster">
                          <i class="fal fa-question-circle"></i>
                        </span>
                        Cell Background
                      </label>
                    </div>
                    <div class="col-xs-12 col-md-8">
                      <input type="text" id="thales-CellBG" class="form-control" />
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-xs-12 col-md-4">
                      <label for="#thales-CellTextColor" class="thales-setting-label">
                        <span class="thales-setting-help-icon" title="Select a custom text color for the cells in the table. You can use hex values (#a83427) or RGB(A) (rgba(227,17,22,1)." data-toggle="thales-tooltipster">
                          <i class="fal fa-question-circle"></i>
                        </span>
                        Cell Text Color
                      </label>
                    </div>
                    <div class="col-xs-12 col-md-8">
                      <input type="text" id="thales-CellTextColor" class="form-control" />
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-xs-12 col-md-4">
                      <label for="#thales-BorderColor" class="thales-setting-label">
                        <span class="thales-setting-help-icon" title="Select a custom border color for the cells and headers in the table. You can use hex values (#a83427) or RGB(A) (rgba(227,17,22,1)." data-toggle="thales-tooltipster">
                          <i class="fal fa-question-circle"></i>
                        </span>
                        Border Color
                      </label>
                    </div>
                    <div class="col-xs-12 col-md-8">
                      <input type="text" id="thales-BorderColor" class="form-control" />
                    </div>
                  </div>
                  <h3 class="panel-section-header">
                    <i class="far fa-exclamation-triangle"></i>
                    Caution
                  </h3>
                  <div class="row">
                    <div class="col-xs-12 col-md-4">
                      <label for="#thales-CopyTable" class="thales-setting-label">
                        <span class="thales-setting-help-icon" title="This lets you copy the structure of an existing table." data-toggle="thales-tooltipster">
                          <i class="fal fa-question-circle"></i>
                        </span>
                        Copy Table
                      </label>
                    </div>
                    <div class="col-xs-12 col-md-8">
                      <select id="thales-CopyTable" class="form-control">
                        <option value="null" class="thales-ui-hidden">Select One</option>
                      </select>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-xs-12 col-md-4">
                      <label for="#thales-ImportCSV" class="thales-setting-label">
                        <span class="thales-setting-help-icon" title="This lets you copy the structure of an existing table." data-toggle="thales-tooltipster">
                          <i class="fal fa-question-circle"></i>
                        </span>
                        Import Table (CSV)
                      </label>
                    </div>
                    <div class="col-xs-12 col-md-8">
                      <button class="btn btn-sm btn-danger" id="thales-ImportCSV">
                        <i class="fal fa-file-import"></i>
                        Import from CSV
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            `
          )
          .appendTo($(ibox).find('.ibox-content').first());

        //Re-add the rootNode to new location.
        $(rootNode).appendTo($(editorPanes).find('#thales-editTab'));
        instance.rootNode = rootNode;

        //Create CopyTable Modal
        var copyTableModal = document.createElement('div');
        var html = `
          <div class="modal-dialog thales-modal" role="document">
            <div class="modal-content">
              <form>
                <div class="modal-header">
                  <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
                  <h4 class="modal-title">Copy Table: Confirm</h4>
                </div>
                <div class="modal-body">
                  <div class="alert alert-danger">
                    <i class="fal fa-exclamation-triangle"></i>
                    Copying another table's structure will erase all existing content on this table. This operation can NOT be undone. If you're unsure, it's advised to make a new empty table and perform the operation there. 
                  </div>
                  <div class="modal-text">
                    You're about to copy the structure of table '<span id="copy-table-target"></span>'. Only the table structure (columns) and settings will be applied to this table, meaning the rows/cells of the source table will not be copied over.
                    <br />
                    Do you wish to proceed?
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-default" data-dismiss="modal">
                    Cancel
                  </button>
                  <button type="submit" class="btn btn-danger">
                    Copy Table Structure
                  </button>
                </div>
              </form>
            </div>
          </div>

        `;

        $(copyTableModal)
          .html(html)
          .addClass('modal animated fadeIn thales-modal')
          .attr('tabindex', '-1')
          .attr('id', instance.instanceID + '_copyTableModal')
          .appendTo($('body'));

        var importCSVModal = document.createElement('div');
        html = `
          <div class="modal-dialog thales-modal" role="document">
            <div class="modal-content">
              <form>
                <div class="modal-header">
                  <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
                  <h4 class="modal-title">
                    Import from CSV
                  </h4>
                </div>
                <div class="modal-body">
                  <div class="alert alert-danger">
                    <i class="fal fa-exclamation-triangle"></i>
                    Importing data from a CSV file requires that you first:<br/><br/>
                    <ol>
                      <li>
                        Setup the current table's structure
                        <ul>
                          <li>You MUST setup the columns with the correct types. If in doubt, make sure to set them up as Text columns</li>
                          <li>If you're copying the structure of another Interactive Table, go back and use the Copy Table function to first import the columns from the desired table.</li>
                        </ul>
                      </li>
                      <li>
                        Remove any header row data from the CSV file. This simple importer does not exclude it by default, and will attempt to import such a line as data
                      </li>
                    </ol>
                    <br />
                    NOTE: Importing data will overwrite ALL existing data for this table! This cannot be undone! Once you click 'Import & Overwrite', there is no going back.<br/><br/>
                    If you get an error message during the import process, it is most likely that the number of columns in the table do not match those in the data, the data may be malformed, or the types of cells in the data do not match the table.<br/><br/>
                    Once the process successfully completes, this table will be saved and the page will automatically reload.
                  </div>
                  <div class="form-group">
                    <label for="#thales-CSVData">
                      CSV Data
                    </label>
                    <textarea id="thales-CSVData" class="thales-modal-textarea form-control" rows="10"></textarea>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-default" data-dismiss="modal">
                    Cancel
                  </button>
                  <button type="submit" class="btn btn-danger">
                    Import & Overwrite
                  </button>
                </div>
              </form>
            </div>
          </div>
        `;

        $(importCSVModal)
          .html(html)
          .addClass('modal animated fadeIn thales-modal')
          .attr('tabindex', '-1')
          .attr('id', instance.instanceID + '_importCSVModal')
          .appendTo($('body'));
        // console.log(copyTableModal)
        resolve();
      } else {
        resolve();
      }
    });
  }

  //Fill Table Data
  populateTable() {
    var instance = this;
    var mode = instance.mode;
    console.log(`[THALES] Populating data.`);
    return new Promise(function (resolve, reject) {
      if (!instance.table) {
        console.error(`[THALES] Table data is missing.`);
        reject('Table data is invalid.');
      }

      //Quick Ref Var
      var table = instance.table;
      var options = table.options;
      var columns = table.columns;
      var rows = table.rows;
      //Update Settings/UI: Mode specific
      if (instance.mode === 'editor') {
        //Set Table Name
        $(`#${instance.instanceID}`)
          .closest('.ibox')
          .find('.ibox-title .header-title')
          .html(`<i class="fal fa-table"></div>&nbsp;${table.name}`);

        //Show Roll Button
        if (options.rollable) {
          $(`#${instance.instanceID}`)
            .closest('.ibox')
            .find('#thales-testRoll-btn')
            .parent()
            .removeClass('thales-ui-hidden');
        }

        //Show Table Search
        if (options.search) {
          $(`#${instance.instanceID}`)
            .closest('.ibox')
            .find('input.thales-search')
            .parent()
            .removeClass('thales-ui-hidden');
        }

        //Populate the CopyTable list
        var copyTableList = $(`select#thales-CopyTable`);
        // copyTableList.empty();
        // console.log(copyTableList)
        // console.log('TABLES', instance.worldTables)
        var tableIDs = Object.keys(instance.worldTables);
        for (var t = 0; t < tableIDs.length; t++) {
          // console.log('Table', instance.worldTables[tableIDs[t]])
          var option = document.createElement('option');
          $(option)
            .attr('value', tableIDs[t])
            .text(instance.worldTables[tableIDs[t]])
            .appendTo($(copyTableList));
          // console.log(option)
        }
      } else {
        //Apply Custom CSS class to table
        var customClass = instance.table.options.customClass;
        if (customClass && customClass !== '') {
          $(`#${instance.instanceID}`).addClass(customClass);
        }
        //Table Name
        $(`#${instance.instanceID} .thales-table-title`).text(
          instance.stripHTML(table.name)
        );
        //Table Show Title
        if (options.showTitle) {
          $(`#${instance.instanceID} .thales-table-title`)
            .parent()
            .removeClass('thales-ui-hidden');
        }
        //Table Show Roll Button
        if (options.rollable) {
          $(`#${instance.instanceID} .thales-roll-group`)
            .parent()
            .removeClass('thales-ui-hidden');
        }

        //Table Show Search
        if (options.search) {
          $(`#${instance.instanceID} .thales-search`)
            .parent()
            .removeClass('thales-ui-hidden');
        }

        //Table Show Description
        if (options.showDescription) {
          $(
            `#${instance.instanceID} .thales-description-container`
          ).removeClass('thales-ui-hidden');
          $(`#${instance.instanceID} #thales-description-content`).html(
            instance.parseBBCode(table.description)
          );
        }

        //Table Start Collapse

        if (options.enableCollapse) {
          if (options.startCollapsed) {
            $(`#${instance.instanceID}`).addClass('thales-table-collapsed');
            $(`#${instance.instanceID} button#thales-expand`).removeClass(
              'thales-ui-hidden'
            );
          } else {
            $(`#${instance.instanceID} button#thales-collapse`).removeClass(
              'thales-ui-hidden'
            );
          }
        }
      }

      //Table Affix Header Row
      if (options.affixHeaderRow) {
        $(`#${instance.instanceID} .thales-table`).addClass(
          'thales-affix-header'
        );
      }

      //Set configured table settings.
      if (mode === 'editor') {
        //General Settings
        $(`#thales-optionsTab input[name="thales-ShowHeader"]`).attr(
          'checked',
          instance.table.options.showTitle
        );
        $(`#thales-optionsTab input[name="thales-ShowRoll"]`).attr(
          'checked',
          instance.table.options.rollable
        );
        $(`#thales-optionsTab input[name="thales-ShowSearch"]`).attr(
          'checked',
          instance.table.options.search
        );
        $(`#thales-optionsTab input[name="thales-AffixHeader"]`).attr(
          'checked',
          instance.table.options.affixHeaderRow
        );
        // $(`#thales-optionsTab input[name="showHeaderRow"]`).attr('checked', instance.table.options.showHeaderRow);
        $(`#thales-optionsTab input[name="thales-MaxSize"]`).val(
          instance.table.options.maxSize
        );
        $(`#thales-optionsTab input[name="thales-ShowDescription"]`).attr(
          'checked',
          instance.table.options.showDescription
        );
        $(`#thales-optionsTab input#thales-EnableCollapse`).attr(
          'checked',
          instance.table.options.enableCollapse
        );
        $(`#thales-optionsTab input#thales-StartCollapsed`).attr(
          'checked',
          instance.table.options.startCollapsed
        );
        //Style Settings
        $(`#thales-optionsTab input#thales-CustomClass`).val(
          instance.table.options.customClass
        );
        var headerBG = instance.table.options.headerBG;
        if (headerBG && headerBG !== '') {
          if (headerBG.indexOf('rgb') < 0) {
            headerBG = '#' + headerBG;
          }
        }
        $(`#thales-optionsTab input#thales-HeaderBG`).val(headerBG);

        var headerTextColor = instance.table.options.headerTextColor;
        if (headerTextColor && headerTextColor !== '') {
          if (headerTextColor.indexOf('rgb') < 0) {
            headerTextColor = '#' + headerTextColor;
          }
        }
        $(`#thales-optionsTab input#thales-HeaderTextColor`).val(
          headerTextColor
        );

        var cellBG = instance.table.options.cellBG;
        if (cellBG && cellBG !== '') {
          if (cellBG.indexOf('rgb') < 0) {
            cellBG = '#' + cellBG;
          }
        }
        $(`#thales-optionsTab input#thales-CellBG`).val(cellBG);

        var cellTextColor = instance.table.options.cellTextColor;
        if (cellTextColor && cellTextColor !== '') {
          if (cellTextColor.indexOf('rgb') < 0) {
            cellTextColor = '#' + cellTextColor;
          }
        }
        $(`#thales-optionsTab input#thales-CellTextColor`).val(cellTextColor);

        var borderColor = instance.table.options.borderColor;
        if (borderColor && borderColor !== '') {
          if (borderColor.indexOf('rgb') < 0) {
            borderColor = '#' + borderColor;
          }
        }
        $(`#thales-optionsTab input#thales-BorderColor`).val(borderColor);
        //...other settings
      }

      //Create THEAD row based on columns.
      var tr = document.createElement('tr');

      //Editor: Create column for row-controls
      if (instance.mode === 'editor') {
        var column = document.createElement('th');
        $(column)
          .addClass('thales-options-column')
          .text('\u200b')
          .appendTo($(tr));

        var headerBG = instance.table.options.headerBG;
        if (headerBG && headerBG !== '') {
          if (headerBG.indexOf('rgb') < 0) {
            headerBG = '#' + headerBG;
          }
          $(column).css('background-color', headerBG);
        }

        var headerTextColor = instance.table.options.headerTextColor;
        if (headerTextColor && headerTextColor !== '') {
          if (headerTextColor.indexOf('rgb') < 0) {
            headerTextColor = '#' + headerTextColor;
          }
          $(column).css('color', headerTextColor);
        }

        var borderColor = instance.table.options.borderColor;
        if (borderColor && borderColor !== '') {
          if (borderColor.indexOf('rgb') < 0) {
            borderColor = '#' + borderColor;
          }
          $(column)
            .css('border-bottom-color', `${borderColor} !important`)
            .css('border-right-color', `${borderColor} !important`);
        }
      }

      //Create a column if none is supplied.
      if (columns.length === 0) {
        if (instance.mode === 'editor') {
          //Generate an ID and accessor
          var columnID = instance.generateID('column');

          //Default Starting Column.
          var column = {
            _id: columnID,
            header: true,
            title: 'Column Name',
            width: 140,
            accessor: columnID,
            order: 1,
            type: 'text',
            sort: true,
            hidden: false,
          };

          //Add to the instance's table
          instance.table.columns.push(column);
        } else {
          //Show error message
          reject(
            "Unable to display table. Either there are missing columns/rows or the table's data is invalid."
          );
        }
      }

      for (var c = 0; c < columns.length; c++) {
        //We need to loop through the columns to set the attributes for each TH.
        var column = columns[c];

        var html = '';
        // console.log(column.title,column.sortDir)
        if (mode === 'editor') {
          //Set the HTML to show title and column config button.
          html = `<div class="thales-column-title-container">
                    <i class="fal fa-ellipsis-v thales-column-handle"></i>
                    <span class="thales-column-title">
                      ${instance.stripHTML(column.title)}
                    </span>
                    ${
                      column.sort
                        ? `<span class="thales-column-sort" data-thales-sort-direction="${
                            column.sortDir && column.sortDir !== null
                              ? column.sortDir
                              : 'asc'
                          }">
                          <i class="fal fa-sort"></i>
                        </span>`
                        : ''
                    }
                    <span class="thales-column-config btn btn-primary btn-sm">
                      <i class="fal fa-wrench"></i>
                    </span>
                  </div>`;
        } else {
          //Set the HTML to only show the title.
          html = `<div class="thales-column-title-container">
                    <span class="thales-column-title">
                      ${instance.stripHTML(column.title)}
                    </span>
                    ${
                      column.sort
                        ? `<span class="thales-column-sort">
                            <i class="fal fa-sort"></i>
                          </span>`
                        : ''
                    }
                  </div>`;
        }

        //Check if column type is roll, add entry to dropdown menu on roll button.
        if (column.type === 'roll') {
          var rollColumnOption = document.createElement('button');
          $(rollColumnOption)
            .attr('type', 'button')
            .addClass('thales-roll-column-select dropdown-item')
            .attr('data-thales-column-id', column._id)
            .html(
              `<span class="thales-column-name">${instance.stripHTML(
                column.title
              )}</span>`
            );

          if (instance.mode === 'editor') {
            $('#thales-testRoll-btn')
              .parent()
              .find('.dropdown-menu')
              .append($(rollColumnOption));
          } else {
            $(
              `#${instance.instanceID} .thales-roll-group .dropdown-menu`
            ).append($(rollColumnOption));
          }
        }
        //Create each TH element and add it to the TR.
        var th = document.createElement('th');
        var style = { width: column.width ? column.width : '' };
        // var paddingLeft = { paddingLeft: (mode === 'editor' && c === 0 ? 40 : 0) }
        $(th)
          .addClass('thales-column')
          .attr('thales-column-type', column.type)
          .attr('id', column._id)
          .attr('style', `width: ${style.width}px !important;`)
          .html(html)
          .appendTo($(tr));

        var headerBG = instance.table.options.headerBG;
        if (headerBG && headerBG !== '') {
          if (headerBG.indexOf('rgb') < 0) {
            headerBG = '#' + headerBG;
          }
          $(th).css('background-color', headerBG);
        }

        var headerTextColor = instance.table.options.headerTextColor;
        if (headerTextColor && headerTextColor !== '') {
          if (headerTextColor.indexOf('rgb') < 0) {
            headerTextColor = '#' + headerTextColor;
          }
          $(th).css('color', headerTextColor + ' !important');
          $(th)
            .find('.thales-column-sort > i')
            .css('color', headerTextColor + ' !important');
        }
        var borderColor = instance.table.options.borderColor;
        if (borderColor && borderColor !== '') {
          if (borderColor.indexOf('rgb') < 0) {
            borderColor = '#' + borderColor;
          }
          $(th)
            .css('border-bottom-color', `${borderColor} !important`)
            .css('border-right-color', `${borderColor} !important`);
        }

        if (instance.mode !== 'editor') {
          $(th).attr('thales-hidden-column', column.hidden);
        }
      }

      //Add the TR to the THEAD.
      $(tr).appendTo($(`${instance.UI.table} thead`));

      //Hide the header row if option is set (Viewer only)
      if (!options.showHeaderRow && mode !== 'editor') {
        $(tr).parent().addClass('thales-ui-hidden');
      }

      //Process rows.
      for (var r = 0; r < rows.length; r++) {
        //We'll loop through each row to generate the cells.
        var row = rows[r];

        instance.generateRow(row);
      }

      //Set table height
      if (options.maxSize > 0) {
        instance.resetTableHeight(options.maxSize);
      }

      //Remove the dropdown if there are less than 2 roll-columns (Viewer Only)
      if (instance.mode !== 'editor') {
        var rollColOptions = $(
          `#${instance.instanceID} .thales-roll-menu .dropdown-item`
        );
        if (rollColOptions.length < 2) {
          $(
            `#${instance.instanceID} .thales-roll-group button.dropdown-toggle`
          ).addClass('thales-ui-hidden');
          $(`#${instance.instanceID} .thales-roll-group`).removeClass(
            'btn-group'
          );
        }
      }
      //Done. Continue execution.
      if (instance.mode !== 'editor') {
        $('[thales-hidden-column="true"]').remove();
      }
      resolve();
    });
  }

  //Event Registration
  registerEvents() {
    var instance = this;
    var mode = instance.mode;
    console.log(`[THALES] Registering events.`);
    return new Promise(function (resolve, reject) {
      //Editor Events
      if (mode === 'editor') {
        //Add New Column Handler
        $(`#${instance.instanceID} .thales-add-column button`)
          .off('click')
          .on('click', function (event) {
            //Get the appropriate modal.
            var modal = $('#' + instance.instanceID + '_add-column-modal');
            //Handle the submission of the form.
            modal
              .find('form')
              .off('submit')
              .on('submit', function (event) {
                //Prevent page navigation.
                event.preventDefault();
                //Update Table data (rows and new col).
                var success = instance.createNewColumn(modal);

                //Clean up the modal on success.
                if (success) {
                  //Reset the modal
                  modal.find('input#colName').val('');
                  modal.find('selected#colType').val('');
                  modal.find('select#colType option').removeAttr('selected');
                  modal
                    .find('select#colType option[value="text"]')
                    .attr('selected', 'selected');
                  modal.find('.alert').addClass('hidden');

                  //Hide the modal.
                  modal.modal('hide');
                }
              });

            //Show the modal.
            modal.modal('show');
          });

        $(`#${instance.instanceID} thead .thales-column-config`)
          .off('click')
          .on('click', function (event) {
            instance.displayEditColumnModal(event);
          });

        //Handle Delete Row
        $(`#${instance.instanceID} .thales-row-delete`)
          .off('click')
          .on('click', function () {
            //Get the actual row.
            var el = $(this).closest('.thales-row');
            //Get the ID we're going to remove from state.
            var id = $(el).attr('id');

            instance.deleteRow(id);
          });

        $(`#${instance.instanceID} .thales-row-select`)
          .off('change')
          .on('change', function (event) {
            //Get number of checked rows.
            var checkedRows = $(
              `#${instance.instanceID} tbody .thales-row-select[type="checkbox"]:checked`
            ).length;
            //Toggle display of "Delete Multiple" button
            if (checkedRows > 0) {
              $(`#${instance.instanceID} .thales-delete-row-multiple`)
                .html(
                  `<i class="fal fa-trash"></i>&nbsp;Delete ${checkedRows} Rows`
                )
                .removeClass('thales-ui-hidden');
            } else {
              $(`#${instance.instanceID} .thales-delete-row-multiple`).addClass(
                'thales-ui-hidden'
              );
            }
          });

        //Add New Row Handler
        $(`#${instance.instanceID} .thales-add-row button`)
          .off('click')
          .on('click', function (event) {
            instance.createNewRow();
            instance.resetTableHeight();
          });

        instance.registerSettings();

        //Suppress Link Navigation (to prevent headaches)
        $(`#${instance.instanceID} .thales-cell .thales-cell-link a`)
          .off('click')
          .on('click', function (event) {
            event.preventDefault();
            instance.showFlash(
              'info',
              'Navigation was prevented in Editor mode. It should work fine when the table is displayed though!'
            );

            console.log(`[THALES] Navigation suppressed in Editor mode.`);
          });

        //Force class addition to backdrop of Thales' modals
        $('.thales-modal').on('show.bs.modal', function (e) {
          setTimeout(function () {
            $('.modal-backdrop').addClass('thales-modal-backdrop');
            clearTimeout();
          }, 100);
        });

        //Register Save handler.
        $(`#thales-save-btn`)
          .off('click')
          .on('click', function () {
            instance.saveTable();
          });

        //Delete Multiple Rows
        $(`#${instance.instanceID} button.thales-delete-row-multiple`)
          .off('click')
          .on('click', function (event) {
            //Get list of rowIDs to delete
            var rowIDs = [];

            $(
              `#${instance.instanceID} .thales-row-controls input[type="checkbox"]:checked`
            ).each(function (i, el) {
              var rowID = $(el).closest('tr.thales-row').attr('id');
              rowIDs.push(rowID);
            });

            //Delete the rows
            for (var r = 0; r < rowIDs.length; r++) {
              instance.deleteRow(rowIDs[r]);
            }

            //Reset table height
            //...

            //Hide the button
            $(this).addClass('thales-ui-hidden');
          });

        //Copy to clipboard
        $(`#thales-embed-btn`)
          .off('click')
          .on('click', function (event) {
            event.preventDefault();

            var embedText = `[itable:${instance.tableID}]`;
            // console.log(embedText.val())
            var temp = document.createElement('textarea');
            $(temp)
              .val(embedText)
              .attr('readonly', '')
              .css({ position: 'absolute', left: '-9999px' })
              .appendTo($('body'));

            var selected =
              document.getSelection().rangeCount > 0
                ? document.getSelection().getRangeAt(0)
                : false;

            $(temp).get(0).select();

            document.execCommand('copy');

            $(temp).remove();

            if (selected) {
              document.getSelection().removeAllRanges();
              document.getSelection().addRange(selected);
            }

            instance.showFlash(
              'success',
              'Copied! Just Ctrl+V or right-click and paste anywhere you want to embed the table!'
            );
          });

        //Handle Search - Not in the instance node, so it needs to be bound in either mode.
        $('#thales-editor-search')
          .off('keyup')
          .on('keyup', function (event) {
            //Get the value of the input box.
            var value = $(event.target).val();

            //Clear Search Results if 'ESC' is pressed
            if (event.originalEvent && event.originalEvent.key === 'Escape') {
              $(event.target).val('');
              value = '';
            }

            //Handle Search.
            instance.searchTable(value.toLowerCase());
          });

        //Handle Roll
        $(
          `#thales-testRoll-btn, .thales-rollBtn-group .dropdown-menu .thales-roll-column-select`
        )
          .off('click')
          .on('click', function (event) {
            if ($(event.currentTarget).hasClass('.thales-roll-column-select')) {
              instance.roll(
                $(event.currentTarget).attr('data-thales-column-id')
              );
            } else {
              instance.roll();
            }
          });

        //Overwrite existing save to use THALES' POST
        $('input#chartbundle_inttable__token')
          .siblings('input[type="submit"]')
          .off('click')
          .on('click', function (event) {
            // event.preventDefault();

            instance.saveTable();
          });

        //DragonDrop: Rows
        $(`#${instance.instanceID} tbody`)
          .sortable({
            axis: 'y',
            items: '> tr.thales-row',
            placeholder: 'thales-ui-placeholder-row',
            handle: '.thales-row-move',
            forcePlaceholderSize: true,
            forceHelperSize: true,
            tolerance: 'pointer',
            // helper: function (e, ui) {
            //   console.log(ui, e)
            //   // ui.children().each(function () {
            //   //   $(this).width($(this).width());
            //   // });
            //   return ui;
            // },
            sort: function (event, ui) {
              $(ui.placeholder).css('width', `${$(ui.item).width()}px`);
              // console.log($(ui.placeholder).css())
            },
            containment: `#${instance.instanceID} tbody`,
            update: function (event, ui) {
              //Update table state with new order
              $(`#${instance.instanceID} tbody tr.thales-row`).each(function (
                i,
                e
              ) {
                if (instance.mode === 'editor') {
                  instance.updateRow($(e).attr('id'), { _order: i });
                }
              });
            },
          })
          .disableSelection();

        //DragonDrop: Columns
        $(`#${instance.instanceID} thead tr`).sortable({
          axis: 'x',
          items: '> th.thales-column',
          handle: '.thales-column-handle',
          placeholder: 'thales-ui-placeholder-column',
          forcePlaceholderSize: true,
          forceHelperSize: true,
          tolerance: 'pointer',
          // revert: true,
          // scroll: true,
          // helper: 'clone',
          // helper: function (e, ui) {
          //   console.log(ui)
          //   var colWidth = ui.width();
          //   // console.log(colWidth)
          //   var th = document.createElement('th');

          //   $(th)
          //     .text('\u200b')
          //     .addClass('thales-column-helper')
          //     .css('width', `${colWidth}px !important;`)
          //   return th;
          // },
          sort: function (event, ui) {
            // console.log(ui)
            $(ui.placeholder).css('width', `${$(ui.item).width()}px`);
          },
          update: function (event, ui) {
            //Check if item has moved to beginning
            // console.log(ui)
            // if(ui.position.left < 60) {
            //   ui.sender
            // }
            //Update table state with column order
            $(`#${instance.instanceID} thead tr th`).each(function (i, e) {
              if (i !== 0) {
                instance.updateColumn($(e).attr('id'), { order: i });
              }
            });
            //Sort the Columns in state.
            var columns = instance.table.columns.sort(function (a, b) {
              return a.order - b.order;
            });
            console.log(columns);
            //Update the order of cells in the rows.
            $(`#${instance.instanceID} tbody tr.thales-row`).each(function (
              i,
              e
            ) {
              var children = $(e).children().clone(true, true);
              var newChildren = [];
              for (var c = 0; c < columns.length; c++) {
                children.each(function (i, el) {
                  if (i !== 0) {
                    if ($(el).attr('data-thales-column') === columns[c]._id) {
                      newChildren.push(el);
                    }
                  }
                });
              }
              // console.log(newChildren)
              $(e).find('.thales-cell').remove();
              $(e).append(newChildren);
            });
          },
        });

        //Copy Table Modal
        $('select#thales-CopyTable')
          .off('change')
          .on('change', function (event) {
            var select = event.target;

            var modal = $(`#${instance.instanceID}_copyTableModal`);
            modal
              .find('#copy-table-target')
              .text(instance.worldTables[$(select).val()]);
            modal.modal('show');

            modal
              .find('form')
              .off('submit')
              .on('submit', function (event) {
                event.preventDefault();
                console.log('Copying Table Structure from: ' + $(select).val());
                instance.copyTableStructure($(select).val()).then(function () {
                  modal.modal('hide');
                  $('select#thales-CopyTable').val('null');
                  instance.showFlash('success', 'Copied the table structure!');
                  instance.makeTable();
                });
              });
          });

        //Import CSV Modal
        $('button#thales-ImportCSV')
          .off('click')
          .on('click', function (event) {
            var modal = $(`#${instance.instanceID}_importCSVModal`);
            modal.modal('show');

            modal
              .find('form')
              .off('submit')
              .on('submit', function (event) {
                event.preventDefault();
                var value = modal.find('textarea#thales-CSVData').val();
                instance
                  .importCSV(value)
                  .then(function () {
                    modal.modal('hide');
                    instance.showFlash(
                      'success',
                      'Importing done. The Table will now save and the page will refresh.'
                    );
                    instance.saveTable();
                  })
                  .then(function () {
                    //Reload Page
                    setTimeout(function () {
                      window.location.href = window.location.href;
                    }, 2000);
                  })
                  .catch(function (error) {
                    console.error(error);
                    instance.showFlash('danger', error);
                  });
              });
          });
      }

      if (instance.mode !== 'editor') {
        $(`#${instance.instanceID} button#thales-collapse`)
          .off('click')
          .on('click', function (event) {
            $(`#${instance.instanceID} button#thales-collapse`).addClass(
              'thales-ui-hidden'
            );
            $(`#${instance.instanceID} button#thales-expand`).removeClass(
              'thales-ui-hidden'
            );
            $(`#${instance.instanceID}`).addClass('thales-table-collapsed');
          });
        $(`#${instance.instanceID} button#thales-expand`)
          .off('click')
          .on('click', function (event) {
            $(`#${instance.instanceID} button#thales-expand`).addClass(
              'thales-ui-hidden'
            );
            $(`#${instance.instanceID} button#thales-collapse`).removeClass(
              'thales-ui-hidden'
            );
            $(`#${instance.instanceID}`).removeClass('thales-table-collapsed');
            instance.resetTableHeight();
          });
        //Forward and Back Navigation
        $(`#${instance.instanceID} .thales-nav-button`)
          .off('click')
          .on('click', function (event) {
            var direction = $(event.currentTarget).attr(
              'data-thales-nav-direction'
            );
            instance.navigateToTable(direction);
          });

        //Handle Viewer Search
        $(`#${instance.instanceID} input.thales-search`)
          .off('keyup')
          .on('keyup', function (event) {
            //Get the value of the input box.
            var value = $(event.target).val();

            //Clear Search Results if 'ESC' is pressed
            if (event.originalEvent && event.originalEvent.key === 'Escape') {
              $(event.target).val('');
              value = '';
            }

            //Handle Search.
            instance.searchTable(value.toLowerCase());
          });

        //Handle Roll
        $(
          `#${instance.instanceID} .thales-roll-button, #${instance.instanceID} .thales-roll-column-select`
        )
          .off('click')
          .on('click', function (event) {
            if ($(event.currentTarget).hasClass('.thales-roll-column-select')) {
              instance.roll(
                $(event.currentTarget).attr('data-thales-column-id')
              );
            } else {
              instance.roll();
            }
          });

        //Display Image Viewer
        $(`#${instance.instanceID} .thales-cell-image`)
          .off('click')
          .on('click', function (event) {
            var title = $(event.target).attr('data-thales-image-title');
            var src = $(event.target).attr('data-thales-image-src');
            var imageBox = $(`#${instance.instanceID}_imageBox`);
            // console.log(imageBox, title, src)
            // console.log(src !== 'undefined' ? true : false)
            if (src !== 'undefined') {
              imageBox.find('img').attr('src', src);
              imageBox.find('.thales-image-title-container').text(title);

              imageBox.removeClass('thales-ui-hidden');
            }
          });

        $(
          `#${instance.instanceID}_imageBox, #${instance.instanceID}_imageBox .thales-image-box-close`
        )
          .off('click')
          .on('click', function (event) {
            $(`#${instance.instanceID}_imageBox`).addClass('thales-ui-hidden');
          });

        //Navigate to article
        $(`#${instance.instanceID} .thales-cell-article`)
          .off('click')
          .on('click', function (event) {
            var link = $(event.currentTarget).attr('data-thales-article-link');
            var url = `${window.location.origin}${link}`;
            if (link.indexOf('function link()') === -1) {
              window.location.href = url;
            }
          });
      }

      //Bind Column Sort Event
      $(`#${instance.instanceID} thead th.thales-column`)
        .find('.thales-column-sort')
        .off('click')
        .on('click', function (event) {
          instance.handleColumnSort(event);
        });

      //Resize Columns.
      $(
        `#${instance.instanceID} .thales-table thead th.thales-column`
      ).resizable({
        handles: 'e',
        autoHide: true,
        stop: function (event, ui) {
          if (mode === 'editor') {
            var id = $(ui.element).attr('id');
            var width = ui.size.width;

            // console.log(`Updating column ${id} width to ${width}`);

            instance.updateColumn(id, { width: width });
          }
        },
        resize: function (event, ui) {
          // console.log(ui.originalElement)
          var colID = $(event.target).attr('id');
          var width = ui.size.width;
          var css = $(
            `#${instance.instanceID} tbody td.thales-cell[data-thales-column="${colID}"]`
          ).css([
            'background-color',
            'color',
            'border-bottom-color',
            'border-right-color',
          ]);
          $(
            `#${instance.instanceID} tbody td.thales-cell[data-thales-column="${colID}"]`
          )
            .attr('style', `width: ${width}px !important;`)
            .css(css);
        },
      });

      //Bind Tooltip (Bootstrap)
      $('[data-toggle="thales-tooltipster"]').tooltipster({
        multiple: true,
        functionReady: function (instance, helper) {
          // console.log(instance, helper);
          $(helper).addClass('thales-tooltip');
        },
      });

      // instance.sizes = {
      // row: $(`#${instance.instanceID} .thales-table tbody tr`).outerHeight(),
      // header: $(`#${instance.instanceID} .thales-table thead tr`).outerHeight()
      // }
      if (instance.mode !== 'editor') {
        var rollOptions = $(
          `#${instance.instanceID} .thales-roll-menu > .thales-roll-column-select`
        );
        if (rollOptions.length >= 2) {
          $(`#${instance.instanceID} .thales-roll-group`).addClass('btn-group');
          $(
            `#${instance.instanceID} .thales-roll-group button.dropdown-toggle`
          ).removeClass('thales-ui-hidden');
        }
      }

      resolve();
    });
  }

  //Settings Events
  registerSettings() {
    var instance = this;

    $(`#thales-optionsTab input[name="thales-ShowHeader"]`)
      .off('change')
      .on('change', function (event) {
        var checked = $(this).is(':checked');
        instance.table.options.showTitle = checked;
      });

    $(`#thales-optionsTab input[name="thales-ShowDescription"]`)
      .off('change')
      .on('change', function (event) {
        var checked = $(this).is(':checked');
        instance.table.options.showDescription = checked;
      });

    $(`#thales-optionsTab input[name="thales-ShowRoll"]`)
      .off('change')
      .on('change', function (event) {
        var checked = $(this).is(':checked');
        instance.table.options.rollable = checked;

        //update the TestRoll Group display
        if (checked) {
          $(`#thales-testRoll-btn`).parent().removeClass('thales-ui-hidden');
        } else {
          $(`#thales-testRoll-btn`).parent().addClass('thales-ui-hidden');
        }
      });

    $(`#thales-optionsTab input[name="thales-ShowSearch"]`)
      .off('change')
      .on('change', function (event) {
        var checked = $(this).is(':checked');
        instance.table.options.search = checked;

        //update the search display
        if (checked) {
          $(`.thales-search-box`).removeClass('thales-ui-hidden');
        } else {
          $(`.thales-search-box`).addClass('thales-ui-hidden');
        }
      });

    $(`#thales-optionsTab input[name="thales-AffixHeader"]`)
      .off('change')
      .on('change', function (event) {
        var checked = $(this).is(':checked');
        instance.table.options.affixHeaderRow = checked;

        //update the table
        if (checked) {
          $(`#${instance.instanceID} .thales-table`).addClass(
            'thales-affix-header'
          );
        } else {
          $(`#${instance.instanceID} .thales-table`).removeClass(
            'thales-affix-header'
          );
        }
      });

    $(`#thales-optionsTab input[name="thales-MaxSize"]`)
      .off('change')
      .on('change', function (event) {
        var value = parseInt($(this).val(), 10);

        if (!isNaN(value)) {
          instance.table.options.maxSize = value;
          if (value === 0) {
            //remove max size for tbody
            instance.resetTableHeight();
          } else {
            //calculate and set max size for tbody
            console.log(value);
            instance.resetTableHeight(value);
          }
        } else {
          instance.showFlash(
            'warning',
            `There was a problem setting the maximum number of rows to display. "${$(
              this
            ).val()}" couldn't be set correctly.`
          );
          //handle fallback? could remove this value and set it back to 0...
        }
      });

    $(`#thales-optionsTab input#thales-CustomClass`)
      .off('change')
      .on('change', function (event) {
        var value = $(this).val().trim();
        value = value.replace(/\.|\,\"|\<|\>/gim, '');
        value = value.replace(/\s/gim, '-');
        value = value.replace(/container|script|wrapper/gim, '');
        instance.table.options.customClass = value;
        $(this).val(value);
        // console.log('Custom Class Value', value);
      });

    $(`#thales-optionsTab input#thales-HeaderBG`)
      .off('change')
      .on('change', function (event) {
        var value = $(this).val().trim();
        value = value.replace(/\.|\"|\<|\>/gim, '');
        // value = value.replace(/\./igm, '');
        $(this).val(value);
        //Cleanup for storage
        var parsedValue = value.replace(/\#/gim, '');
        instance.table.options.headerBG = parsedValue;
        //Apply to elements
        $(`th.thales-column,th.thales-options-column`).css(
          'background-color',
          value + ' !important'
        );
      });

    $(`#thales-optionsTab input#thales-HeaderTextColor`)
      .off('change')
      .on('change', function (event) {
        var value = $(this).val().trim();
        value = value.replace(/\.|\"|\<|\>/gim, '');
        // value = value.replace(/\./igm, '');
        $(this).val(value);
        //Cleanup for storage
        var parsedValue = value.replace(/\#/gim, '');
        instance.table.options.headerTextColor = parsedValue;
        //Apply to elements
        $(`th.thales-column,th.thales-options-column`).css(
          'color',
          value + ' !important'
        );
      });

    $(`#thales-optionsTab input#thales-CellBG`)
      .off('change')
      .on('change', function (event) {
        var value = $(this).val().trim();
        value = value.replace(/\.|\"|\<|\>/gim, '');
        // value = value.replace(/\./igm, '');
        $(this).val(value);
        //Cleanup for storage
        var parsedValue = value.replace(/\#/gim, '');
        instance.table.options.cellBG = parsedValue;
        //Apply to elements
        $(`td.thales-cell,td.thales-row-controls-cell`).css(
          'background-color',
          value + ' !important'
        );
      });

    $(`#thales-optionsTab input#thales-CellTextColor`)
      .off('change')
      .on('change', function (event) {
        var value = $(this).val().trim();
        value = value.replace(/\.|\"|\<|\>/gim, '');
        // value = value.replace(/\./igm, '');
        $(this).val(value);
        //Cleanup for storage
        var parsedValue = value.replace(/\#/gim, '');
        instance.table.options.cellTextColor = parsedValue;
        //Apply to elements
        $(
          `td.thales-cell,td.thales-row-controls-cell,td.thales-cell .thales-cell-link a`
        ).css('color', value + ' !important');
      });

    $(`#thales-optionsTab input#thales-BorderColor`)
      .off('change')
      .on('change', function (event) {
        var value = $(this).val().trim();
        value = value.replace(/\.|\"|\<|\>/gim, '');
        // value = value.replace(/\./igm, '');
        $(this).val(value);
        //Cleanup for storage
        var parsedValue = value.replace(/\#/gim, '');
        instance.table.options.borderColor = parsedValue;
        //Apply to elements
        $(`td.thales-cell,td.thales-row-controls-cell`).css(
          'border-right-color',
          value + ' !important'
        );
        $(`td.thales-cell,td.thales-row-controls-cell`).css(
          'border-bottom-color',
          value + ' !important'
        );
        $(`th.thales-column,th.thales-options-column`).css(
          'border-right-color',
          value + ' !important'
        );
        $(`th.thales-column,th.thales-options-column`).css(
          'border-bottom-color',
          value + ' !important'
        );
      });

    //Enable Collapse
    $(`#thales-optionsTab input#thales-EnableCollapse`)
      .off('change')
      .on('change', function (event) {
        var checked = $(this).is(':checked');
        instance.table.options.enableCollapse = checked;
      });

    //Start Collapsed
    $(`#thales-optionsTab input#thales-StartCollapsed`)
      .off('change')
      .on('change', function (event) {
        var checked = $(this).is(':checked');
        instance.table.options.startCollapsed = checked;
      });
  }

  //UI Creation
  createUI() {
    var instance = this;
    console.log(`[THALES] Rendering UI.`);
    return new Promise(function (resolve, reject) {
      //Determine which view mode to present (viewer or editor).
      var mode = instance.mode;
      var row = null;
      var col = null;

      //First, set some attributes on the root node
      var root = instance.rootNode;
      $(root).addClass('thales-wrapper').attr('id', instance.instanceID);

      if (instance.mode === 'editor') {
      } else {
        //Table Title
        var tableTitle = document.createElement('div');
        $(tableTitle)
          .addClass('thales-ux-row thales-ui-hidden') //add .hidden class!
          .html(
            `
            <h2 class="thales-table-title">
            </h2>
         `
          )
          .appendTo($(`#${instance.instanceID}`));
        var tableCollapse = document.createElement('div');
        $(tableCollapse)
          .addClass('thales-ux-row thales-collapse-box')
          .html(
            `
            <button class="btn btn-primary thales-ui-hidden" id="thales-collapse">
              <i class="fal fa-minus"></i>
              Collapse Table
            </button>
            <button class="btn btn-primary thales-ui-hidden" id="thales-expand">
              <i class="fal fa-plus"></i>
              Expand Table
            </button>
          `
          )
          .appendTo($(`#${instance.instanceID}`));

        //Table Navigation
        var tableNavigation = document.createElement('div');
        $(tableNavigation)
          .addClass('row mt-1 mb-3 thales-navigation-toolbar-navs')
          .attr('id', 'thales-navigation-toolbar')
          .html(
            `
            <div class="thales-table-nav">
              <div class="thales-table-nav-wrapper thales-ui-hidden">
                <button type="button" class="btn btn-primary thales-nav-button" data-thales-nav-direction="back">
                  <i class="fal fa-chevron-left" aria-hidden="true"></i>
                  <span class="thales-nav-text" id="thales-prev-table">
                  Table 2 Electric Boogaloo
                  </span>
                </button>
              </div>
            </div>
            <div class="thales-table-nav">
              <div class="thales-table-nav-wrapper thales-ui-hidden">
                <button type="button" class="btn btn-primary thales-nav-button" data-thales-nav-direction="next">
                  <span class="thales-nav-text" id="thales-next-table">
                  Random Desert Encounter
                  </span>
                  <i class="fal fa-chevron-right" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          `
          )
          .appendTo($(`#${instance.instanceID}`));

        //Table Features (Roll, Search)
        var tableFeatures = document.createElement('div');
        $(tableFeatures)
          .addClass('thales-ui-features')
          .html(
            `
            <div class="thales-ui-feature" id="thales-roll">
              <div class="thales-ui-feature-wrapper thales-ui-hidden">
                <div class="btn btn-group thales-roll-group" role="group">
                  <button type="button" class="btn btn-primary thales-roll-button">
                    <i class="fal fa-dice thales-btn-icon"></i>
                    Roll
                  </button>
                  <button type="button" class="btn btn-primary dropdown-toggle dropdown-toggle-split" data-toggle="dropdown">
                    <span class="sr-only">Select Column to roll on.</span>
                    <i class="fas fa-caret-down"></i>
                  </button>
                  <div class="dropdown-menu thales-roll-menu">
                  </div>
                </div>
              </div>
            </div>
            <div class="thales-ui-feature" id="thales-search">
              <div class="thales-ui-feature-wrapper thales-ui-hidden">
                <i class="fal fa-search" aria-hidden="true"></i>
                <input class="thales-input thales-search form-control" placeholder="Search" id="thales-viewer-search" />
              </div>
            </div>
          `
          )
          .appendTo($(`#${instance.instanceID}`));
      }

      //Create Table Container
      row = document.createElement('div');
      $(row).addClass('thales-ui-row').appendTo($(root));
      col = document.createElement('div');
      $(col).addClass('thales-table-ui-col').appendTo($(row));

      var tableContainer = document.createElement('div');
      $(tableContainer).addClass('thales-table-container').appendTo($(col));

      if (instance.mode === 'editor') {
        $(tableContainer).addClass('thales-table-editor');
      }
      // $(tableContainer).slimscroll({
      //   axis: 'both',
      //   positionX: 'bottom',
      //   distance: 2,
      //   // height: 'auto',
      //   width: 'auto'
      // })

      var loadingSplash = document.createElement('div');
      $(loadingSplash)
        .addClass('thales-splash thales-component-splash')
        .attr('data-thales-splash', 'loader')
        .html(
          `
          <div class="thales-splash-content">
            <h3 class="thales-splash-title">
              Loading Table
            </h3>
            <div class="thales-splash-spinner">
              <i class="fal fa-spinner fa-spin fa-4x"></i>
            </div>
          </h2>
        `
        )
        .appendTo($(tableContainer));
      if (mode === 'editor') {
        //Create the 'add column' button
        var addColumn = document.createElement('div');
        $(addColumn)
          .addClass('thales-table-edit thales-add-column')
          .html(
            '<button type="button" class="btn btn-default" data-toggle="thales-tooltipster" data-placement="top" title="Add Column"><i class="fal fa-plus"></i></button>'
          )
          .appendTo($(col));

        //Create the 'add row' button
        var addRow = document.createElement('div');
        $(addRow)
          .addClass('thales-table-edit thales-add-row')
          .html(
            '<button type="button" class="btn btn-default" data-toggle="thales-tooltipster" data-placement="top" title="Add Row"><i class="fal fa-plus"></i></button>'
          )
          .appendTo($(row));

        row = document.createElement('div');
        $(row).addClass('thales-ui-row').appendTo($(root));
        col = document.createElement('div');
        $(col).addClass('thales-ui-col').appendTo($(row));
        var deleteMultipleRows = document.createElement('button');
        $(deleteMultipleRows)
          .attr('type', 'button')
          .addClass(
            'thales-delete-row-multiple btn btn-danger thales-ui-hidden'
          )
          .html('Delete Rows')
          .appendTo($(col));

        //Create 'add column' modal
        var addColModal = document.createElement('div');
        var html = `<div class="modal-dialog thales-modal" role="document">
                      <div class="modal-content">
                        <form>
                          <div class="modal-header">
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                              <span aria-hidden="true">&times;</span>
                            </button>
                            <h4 class="modal-title">Add Column</h4>
                          </div>
                          <div class="modal-body">
                            <div class="alert alert-danger thales-ui-hidden">
                              <i class="fal fa-exclamation-triangle"></i>
                              <span id="form-error"></span>
                            </div>
                            <div class="form-group">
                              <label for="colName">Column Name</label>
                              <input type="text" class="form-control" name="colName" id="colName"/>
                            </div>
                            <div class="form-group">
                              <label for="colType">Column Type</label>
                              <select name="colType" id="colType" class="form-control">
                              </select>
                          </div>
                          <div class="modal-footer">
                            <button type="button" class="btn btn-default" data-dismiss="modal">
                              Close
                            </button>
                            <button type="submit" class="btn btn-primary">
                              Add Column
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>`;
        $(addColModal)
          .html(html)
          .addClass('modal animated fadeIn thales-modal')
          .attr('tabindex', '-1')
          .attr('id', instance.instanceID + '_add-column-modal')
          .appendTo($(root));

        //Populate column type selection
        var typeKeys = Object.keys(instance.dataTypes);
        for (var t = 0; t < typeKeys.length; t++) {
          var type = typeKeys[t];
          //Create the 'option'.
          var option = document.createElement('option');
          $(option).attr('value', type).text(instance.dataTypes[type]);

          //Set 'Text' as the default.
          if (type === 'text') {
            $(option).attr('selected', 'selected');
          }

          //Append the 'option' to the select element.
          $(addColModal).find('select#colType').append($(option));
        }

        var flashMessage = document.createElement('div');
        $(flashMessage)
          .addClass('thales-flash-message alert alert-info animated')
          // .addClass('thales-ui-hidden')
          .html(
            '<div class="thales-flash-icon"><i class="fal fa-info-circle"></i></div><div class="thales-flash-text"></div>'
          )
          .prependTo($(root));

        // //Get page form
        // var form = $('form[name="chartbundle_inttable"]');
        // if (form.length > 0) {
        //   var input = form.find('input[name="chartbundle_inttable[payload]"]');
        //   if (input.length === 0) {
        //     input = document.createElement('input')
        //     $(input)
        //       .attr('name', 'chartbundle_inttable[payload]')
        //       .attr('type', 'hidden')
        //       .appendTo($(form))
        //   }
        // } else {
        //   return reject('Unable to find default form!');
        // }

        //Create the Edit Column modal
        var editColumnModal = document.createElement('div');
        var html = `
          <div class="modal-dialog thales-modal" role="document" data-thales-column="">
            <div class="modal-content">
              <form>
                <div class="modal-header">
                  <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
                  <h4 class="modal-title">Edit Column</h4>
                </div>
                <div class="modal-body">
                  <div class="form-group">
                    <label for="type">Column Type</label>
                    <input  type="text" name="type" id="type" disabled="disabled" class="form-control disabled"/>
                  </div>
                  <div class="form-group">
                    <label for="title">Column Title</label>
                    <input type="title" name="title" id="title" class="form-control" />
                  </div>
                  <div class="form-group">
                    <label for="sort">Enable Sorting</label>
                    <input type="checkbox" name="sort" id="sort" />
                  </div>
                  <div class="form-group">
                    <label for="sortDir">Default Sort Direction</label>
                    <select name="sortDir" id="sortDir" class="form-control">
                      <option value="asc" selected="selected">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="hide">Hide in Presentation</label>
                    <input type="checkbox" name="hide" id="hide" />
                  </div>
                  <div class="form-group">
                    <label>Delete Column</label><br />
                    <button class="btn btn-danger deleteColBtn" type="button">
                      <i class="fal fa-trash"></i>
                      &nbsp;
                      Delete Column
                    </button>
                    <div class="thales-help">
                      Deleting this column will remove ALL data for this column for each row. This can NOT be undone!
                    </div>
                  </div>
                  
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-default" data-dismiss="modal">
                    Close
                  </button>
                  <button type="submit" class="btn btn-primary">
                    Save Column
                  </button>
                </div>
              </form>
            </div>
          </div>
        `;
        $(editColumnModal)
          .html(html)
          .addClass('modal animated fadeIn faster thales-modal')
          .attr('id', instance.instanceID + '_edit-column_modal')
          .appendTo($(root));
      }

      var descriptionContainer = document.createElement('div');
      var html = `
          <div class="thales-description-content" id="thales-description-content">
          </div>
        `;

      $(descriptionContainer)
        .html(html)
        .addClass('thales-ui-row thales-description-container thales-ui-hidden')
        .appendTo($(root));

      //Create 'edit cell' modal
      var editCellModal = document.createElement('div');
      var html = `<div class="modal-dialog thales-modal" role="document" data-thales-cell-type="">
                    <div class="modal-content">
                      <form>
                        <div class="modal-header">
                          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                          </button>
                          <h4 class="modal-title">Edit Cell</h4>
                        </div>
                        <div class="modal-body">
                          
                        </div>
                        <div class="modal-footer">
                          
                        </div>
                      </form>
                    </div>
                  </div>`;
      $(editCellModal)
        .html(html)
        .addClass('modal animated fadeIn faster thales-modal')
        .attr('tabindex', '-1')
        .attr('id', instance.instanceID + '_edit-cell_modal')
        // .appendTo('body');
        .appendTo($(root));

      //Create Table
      instance.UI.table = '#' + instance.generateID('thales-table');
      var table = document.createElement('table');
      $(table)
        .addClass('thales-table')
        .attr('id', instance.UI.table.substr(1))
        .html('<thead></thead><tbody></tbody><tfoot></tfoot>')
        .appendTo($(tableContainer));

      var imageBox = document.createElement('div');
      var imageBoxContainer = $('.user-css-vignette');
      if (imageBoxContainer.length === 0) {
        imageBoxContainer = $('body');
      }
      $(imageBox)
        .attr('id', instance.instanceID + '_imageBox')
        .addClass('thales-image-box thales-ui-hidden')
        .html(
          '<div class="thales-image-viewer"><img src="" alt="" /><div class="thales-image-title-container"></div></div><span class="thales-image-box-close">Close &times;</span>'
        )
        .appendTo(imageBoxContainer);

      resolve();
    });
  }

  //Utility Functions
  generateID(prefix) {
    return (
      'thales_' +
      (prefix ? prefix + '_' : '') +
      Math.random().toString(36).substr(2, 9)
    );
  }

  updateTitle(newTitle) {
    $(this.UI.titleContainer + ' h2').text(newTitle);
  }

  showFormError(formContainer, msg) {
    $(formContainer).find('#form-error').text(msg);
    $(formContainer).find('.alert').removeClass('thales-ui-hidden');
  }

  //Create New Table Column
  createNewColumn(modal) {
    var instance = this;
    var name = modal.find('input#colName').val();
    var type = modal.find('select#colType').val();
    // var tableWidth = $(`#${instance.instanceID} .thales-table`).width();
    // console.log('newColType',type);
    // return false;
    // console.log(name)
    if (name.length === 0) {
      instance.showFormError(modal, 'You need to give the column a name.');
      return false;
    }
    var newCol = {
      _id: instance.generateID('column'),
      header: true,
      title: name,
      width: 100,
      accessor: '',
      order: instance.table.columns.length,
      type: type,
      hidden: false,
    };

    newCol.accessor = newCol._id;

    // console.log(newCol)
    instance.table.columns.push(newCol);

    //If the new column is rollable, add an entry to the Column Select dropdown.
    if (newCol.type === 'roll') {
      var rollColumnOption = document.createElement('button');
      $(rollColumnOption)
        .attr('type', 'button')
        .addClass('thales-roll-column-select dropdown-item')
        .attr('data-thales-column-id', newCol._id)
        .html(`<span class="thales-column-name">${newCol.title}</span>`);

      $(`#thales-testRoll-btn`)
        .parent()
        .find('.dropdown-menu')
        .append($(rollColumnOption));

      //Bind roll event to new option
      $(rollColumnOption)
        .off('click')
        .on('click', function () {
          instance.roll(newCol._id);
        });
    }

    //Update the rows with the new column's accessor.
    for (var r = 0; r < instance.table.rows.length; r++) {
      var row = instance.table.rows[r];
      if (!row[newCol.accessor]) {
        if (newCol.type !== 'roll') {
          row[newCol.accessor] = '';
        } else {
          row[newCol.accessor] = { min: null, max: null };
        }
      }
      var newCell = document.createElement('td');
      var cellContent = document.createElement('div');
      $(cellContent)
        .addClass('thales-cell-content')
        .attr('data-thales-cell-type', type);
      var html = ``;
      switch (type) {
        case 'table':
          html =
            '<span class="thales-cell-table" data-thales-table-id=""><i class="fal fa-table thales-cell-icon"></i>Choose Table</span>';
          break;
        case 'date':
          html = `<span class="thales-cell-date">Choose Date</span>`;
          break;
        case 'number':
          html = `<input class="thales-cell-input" type="number"/>`;
          break;
        case 'roll':
          html = `<span class="thales-roll-values"><input class="thales-cell-input" data-thales-roll="min" placeholder="Min" type="number"/><input class="thales-cell-input" data-thales-roll="max" placeholder="Max" type="number"/></span>`;
          break;
        case 'roll':
          html = `<span class="thales-cell-rollBtn btn btn-primary btn-block"></span>`;
          break;
        case 'longText':
          html = `<span class="thales-cell-longtext"></span>`;
          break;
        case 'link':
          html = `<span class="thales-cell-link" data-thales-link=""><a href="#"><i class="fal fa-link thales-cell-icon"></i>Configure Link</a></span>`;
          break;
        case 'image':
          html = `<span class="thales-cell-image"><i class="fal fa-image thales-cell-icon"></i>Configure Image</span>`;
          break;
        case 'article':
          html = `<span class="thales-cell-article"><i class="fal fa-file-alt thales-cell-icon"></i>Configure Article</span>`;
          break;
        case 'checkbox':
          html = `<label><input type="checkbox" class="thales-cell-checkbox" type="checkbox" /><div class="thales-cell-custom-checkbox"></div></label>`;
          break;
        case 'text':
        default:
          html = `<input type="text" class="thales-cell-input" value=""/>`;
          break;
      }
      $(cellContent).html(html).appendTo($(newCell));
      $(newCell)
        .addClass('thales-cell')
        .attr('data-thales-column', newCol._id)
        .attr('style', `width: ${newCol.width}px;`);
      var cellBG = instance.table.options.cellBG;
      if (cellBG && cellBG !== '') {
        if (cellBG.indexOf('rgb') < 0) {
          cellBG = '#' + cellBG;
        }
        $(newCell).css('background-color', cellBG);
      }
      var cellTextColor = instance.table.options.cellTextColor;
      if (cellTextColor && cellTextColor !== '') {
        if (cellTextColor.indexOf('rgb') < 0) {
          cellTextColor = '#' + cellTextColor;
        }
        $(newCell).css('color', cellTextColor);
        $(newCell).find('.thales-cell-link > a').css('color', cellTextColor);
      }
      var borderColor = instance.table.options.borderColor;
      if (borderColor && borderColor !== '') {
        if (borderColor.indexOf('rgb') < 0) {
          borderColor = '#' + borderColor;
        }
        $(newCell)
          .css('border-bottom-color', `${borderColor} !important`)
          .css('border-right-color', `${borderColor} !important`);
      }

      $(`#${instance.instanceID} tbody tr#${row._id}`).append(newCell);

      //Register Cell Events
      $(cellContent)
        .find('.thales-cell-input')
        .off('keyup change')
        .on('keyup change', function (event) {
          console.log('bound edit cell ahndler');
          var excludedKeys = ['Shift', 'Control', 'Alt', 'Meta'];
          if (excludedKeys.indexOf(event.originalEvent.key) === -1) {
            instance.editCell($(this));
          }

          if (event.originalEvent.key && event.originalEvent.key === 'Enter') {
            // instance.editCell($(this));
            $(this).blur();
          }
        });

      $(cellContent)
        .find('.thales-cell-checkbox')
        .off('click')
        .on('click', function (event) {
          if (instance.mode === 'editor') {
            instance.updateChecklist($(this));
          }
        });

      $(cellContent)
        .find('.thales-cell-longtext')
        .off('click')
        .on('click', function (event) {
          // event.preventDefault();
          return instance.displayCellEditModal(event, 'longtext');
        });

      $(newCell)
        .find('.thales-cell-link')
        .off('click')
        .on('click', function (event) {
          event.preventDefault();
          console.log('calling editCellModal');
          instance.displayCellEditModal(event, 'link');
        });

      $(cellContent)
        .find('.thales-cell-date')
        .off('click')
        .on('click', function (event) {
          instance.displayCellEditModal(event, 'date');
        });

      $(cellContent)
        .find('.thales-cell-table')
        .off('click')
        .on('click', function (event) {
          instance.displayCellEditModal(event, 'table');
        });

      $(cellContent)
        .find('.thales-cell-image')
        .off('click')
        .on('click', function (event) {
          instance.displayCellEditModal(event, 'image');
        });

      $(cellContent)
        .find('.thales-cell-article')
        .off('click')
        .on('click', function (event) {
          instance.displayCellEditModal(event, 'article');
        });
      $(cellContent)
        .find('.thales-cell-rollBtn')
        .off('click')
        .on('click', function (event) {
          instance.displayCellEditModal(event, 'rollBtn');
        });
    }
    // console.log(instance.table.columns);

    var th = document.createElement('th');
    var html = `<div class="thales-column-title-container">
                  <i class="fal fa-ellipsis-v thales-column-handle"></i>
                  <span class="thales-column-title">
                    ${name}
                  </span>
                  <span class="thales-column-config btn btn-primary btn-sm">
                    <i class="fal fa-wrench"></i>
                  </span>
                </div>`;

    $(th)
      .addClass('thales-column')
      .attr('thales-column-type', type)
      .attr('id', newCol._id)
      .attr('style', `width: ${newCol.width}px !important;`)
      .html(html)
      .appendTo($(`#${instance.instanceID} thead tr`));
    var headerBG = instance.table.options.headerBG;
    if (headerBG && headerBG !== '') {
      if (headerBG.indexOf('rgb') < 0) {
        headerBG = '#' + headerBG;
      }
      $(th).css('background-color', headerBG);
    }

    var headerTextColor = instance.table.options.headerTextColor;
    if (headerTextColor && headerTextColor !== '') {
      if (headerTextColor.indexOf('rgb') < 0) {
        headerTextColor = '#' + headerTextColor;
      }
      $(th).css('color', headerTextColor + ' !important');
      $(th)
        .find('.thales-column-sort > i')
        .css('color', headerTextColor + ' !important');
    }
    var borderColor = instance.table.options.borderColor;
    if (borderColor && borderColor !== '') {
      if (borderColor.indexOf('rgb') < 0) {
        borderColor = '#' + borderColor;
      }
      $(th)
        .css('border-bottom-color', borderColor + ' !important')
        .css('border-right-color', borderColor + ' !important');
    }

    //Bind Column resize
    $(th).resizable({
      handles: 'e',
      autoHide: true,
      stop: function (event, ui) {
        if (instance.mode === 'editor') {
          var id = $(ui.element).attr('id');
          var width = ui.size.width;

          console.log(`Updating column ${id} width to ${width}`);

          instance.updateColumn(id, { width: width });
        }
      },
      resize: function (event, ui) {
        var colID = $(event.target).attr('id');
        var width = ui.size.width;
        var css = $(
          `#${instance.instanceID} tbody td.thales-cell[data-thales-column="${colID}"]`
        ).css([
          'background-color',
          'color',
          'border-bottom-color',
          'border-right-color',
        ]);
        $(
          `#${instance.instanceID} tbody td.thales-cell[data-thales-column="${colID}"]`
        )
          .attr('style', `width: ${width}px !important;`)
          .css(css);
      },
    });

    //Bind Column Config Event
    $(th)
      .find('.thales-column-config')
      .off('click')
      .on('click', function (event) {
        instance.displayEditColumnModal(event);
      });

    //Bind Column Sort Event
    $(th)
      .find('.thales-column-sort')
      .off('click')
      .on('click', function (event) {
        instance.handleColumnSort(event);
      });

    // console.log('El styles', $(`#${instance.instanceID} .thales-table-editor`).closest('.slimScrollDiv').attr('style'))
    // console.log(th)
    var target = $(th).position().left + $(th).width();
    var containerWidth = Math.ceil(
      $(`#${instance.instanceID} .thales-table-container`).width()
    );
    // console.log(target, tableWidth, containerWidth)
    setTimeout(function () {
      $(`#${instance.instanceID} .thales-table-container`).scrollLeft(target);
    }, 100);
    //Creation success.
    return true;
  }

  generateRow(row) {
    var instance = this;
    var columns = instance.table.columns;
    // console.log(columns)
    //Create the TR.
    var tr = document.createElement('tr');

    //Editor Mode: Add first cell for row options
    if (instance.mode === 'editor') {
      var html = `
                  <span class="thales-row-controls">
                    <i class="fal fa-grip-lines-vertical thales-row-move thales-row-control"></i>
                    <i class="fal fa-trash thales-row-delete thales-row-control"></i>
                    <input type="checkbox" class="thales-row-control thales-row-select"/>
                  </span>
                `;
      var cell = document.createElement('td');
      $(cell).addClass('thales-row-controls-cell').html(html).appendTo($(tr));
      var cellBG = instance.table.options.cellBG;
      if (cellBG && cellBG !== '') {
        if (cellBG.indexOf('rgb') < 0) {
          cellBG = '#' + cellBG;
        }
        $(cell).css('background-color', cellBG);
      }
      var cellTextColor = instance.table.options.cellTextColor;
      if (cellTextColor && cellTextColor !== '') {
        if (cellTextColor.indexOf('rgb') < 0) {
          cellTextColor = '#' + cellTextColor;
        }
        $(cell).css('color', cellTextColor);
        $(cell).find('.thales-cell-link > a').css('color', cellTextColor);
      }
      var borderColor = instance.table.options.borderColor;
      if (borderColor && borderColor !== '') {
        if (borderColor.indexOf('rgb') < 0) {
          borderColor = '#' + borderColor;
        }
        $(cell)
          .css('border-bottom-color', `${borderColor} !important`)
          .css('border-right-color', `${borderColor} !important`);
      }
    }

    for (var c = 0; c < columns.length; c++) {
      //Now we loop through the columns to create the individual TDs.
      var column = columns[c];

      var cell = instance.createCell(column, row);

      //Set the TD content and append to the TR.
      $(cell).appendTo($(tr));

      var cellBG = instance.table.options.cellBG;
      if (cellBG && cellBG !== '') {
        if (cellBG.indexOf('rgb') < 0) {
          cellBG = '#' + cellBG;
        }
        $(cell).css('background-color', cellBG + ' !important');
      }
      var cellTextColor = instance.table.options.cellTextColor;
      if (cellTextColor && cellTextColor !== '') {
        if (cellTextColor.indexOf('rgb') < 0) {
          cellTextColor = '#' + cellTextColor;
        }
        $(cell).css('color', cellTextColor + ' !important');
        $(cell).find('.thales-cell-link > a').css('color', cellTextColor);
      }
      var borderColor = instance.table.options.borderColor;
      if (borderColor && borderColor !== '') {
        if (borderColor.indexOf('rgb') < 0) {
          borderColor = '#' + borderColor;
        }
        $(cell)
          .css('border-bottom-color', `${borderColor} !important`)
          .css('border-right-color', `${borderColor} !important`);
      }

      if (instance.mode !== 'editor') {
        if (column.hidden) {
          $(cell).attr('thales-hidden-column', 'true');
        }
      }
    }

    //Configure the TR's attributes and append to the TBODY.
    $(tr)
      .attr('id', row._id)
      .addClass('thales-row')
      .appendTo($(`${instance.UI.table} tbody`));
    var borderColor = instance.table.options.borderColor;
    if (borderColor && borderColor !== '') {
      if (borderColor.indexOf('rgb') < 0) {
        borderColor = '#' + borderColor;
      }
      $(tr).css('border-bottom-color', `${borderColor} !important`);
    }

    //Bind Delete handler to new button (if present)
    if (instance.mode === 'editor') {
      $(tr)
        .find('.thales-row-delete')
        .off('click')
        .on('click', function () {
          //Get the actual row.
          var el = $(this).closest('.thales-row');
          //Get the ID we're going to remove from state.
          var id = $(el).attr('id');
          instance.deleteRow(id);
        });

      $(tr)
        .find(`.thales-row-select`)
        .off('change')
        .on('change', function (event) {
          //Get number of checked rows.
          var checkedRows = $(
            `#${instance.instanceID} tbody .thales-row-select[type="checkbox"]:checked`
          ).length;
          //Toggle display of "Delete Multiple" button
          if (checkedRows > 0) {
            $(`#${instance.instanceID} .thales-delete-row-multiple`)
              .html(
                `<i class="fal fa-trash"></i>&nbsp;Delete ${checkedRows} Rows`
              )
              .removeClass('thales-ui-hidden');
          } else {
            $(`#${instance.instanceID} .thales-delete-row-multiple`).addClass(
              'thales-ui-hidden'
            );
          }
        });

      // $(tr).find('.thales-row-move')
    }
  }

  createCell(column, row) {
    var instance = this;
    var mode = instance.mode;
    var value = row[column.accessor];
    //Create the Cell element and base contents
    var cell = document.createElement('td');
    $(cell).addClass('thales-cell').attr('data-thales-column', column._id);
    var cellBG = instance.table.options.cellBG;
    if (cellBG && cellBG !== '') {
      if (cellBG.indexOf('rgb') < 0) {
        cellBG = '#' + cellBG;
      }
      $(cell).css('background-color', cellBG);
    }
    var cellTextColor = instance.table.options.cellTextColor;
    if (cellTextColor && cellTextColor !== '') {
      if (cellTextColor.indexOf('rgb') < 0) {
        cellTextColor = '#' + cellTextColor;
      }
      $(cell).css('color', cellTextColor);
      $(cell).find('.thales-cell-link > a').css('color', cellTextColor);
    }
    var borderColor = instance.table.options.borderColor;
    if (borderColor && borderColor !== '') {
      if (borderColor.indexOf('rgb') < 0) {
        borderColor = '#' + borderColor;
      }
      $(cell)
        .css('border-bottom-color', `${borderColor} !important`)
        .css('border-right-color', `${borderColor} !important`);
    }
    if (column.width > 0) {
      var css = {
        width: column.width,
      };

      $(cell).attr('style', `width: ${css.width}px !important;`);
    }

    var cellContent = document.createElement('div');
    $(cellContent)
      .addClass('thales-cell-content')
      .attr('data-thales-cell-type', column.type)
      .appendTo($(cell));

    switch (column.type) {
      //NUMBER
      case 'number':
        if (mode === 'editor') {
          var html = `<input type="number" class="thales-cell-input" value="${instance.stripHTML(
            value
          )}" />`;
        } else {
          var html = `<span class="thales-rendered-number">${instance.stripHTML(
            value
          )}</span>`;
        }
        break;

      case 'checkbox':
        if (mode === 'editor') {
          var html = `<label><input type="checkbox" class="thales-cell-checkbox" type="checkbox" ${
            value === true ? 'checked' : ''
          }/><div class="thales-cell-custom-checkbox"></div></label>`;
        } else {
          var html = `<label><input type="checkbox" class="thales-cell-checkbox" type="checkbox" ${
            value === true ? 'checked' : ''
          } disabled /><div class="thales-cell-custom-checkbox"></div></label>`;
        }
        break;
      //STRING
      case 'string':
      case 'text':
        if (mode === 'editor') {
          var html = `<input type="text" class="thales-cell-input" value="${instance.stripHTML(
            value
          )}" />`;
        } else {
          var html = `<span class="thales-rendered-text">${instance.stripHTML(
            value
          )}</span>`;
        }
        break;

      //ROLL
      case 'roll':
        // console.log(row)
        var min = row[column.accessor]
          ? row[column.accessor].min && row[column.accessor].min !== null
            ? row[column.accessor].min
            : null
          : null;
        var max = row[column.accessor]
          ? row[column.accessor].max && row[column.accessor].max !== null
            ? row[column.accessor].max
            : null
          : null;
        if (row[column.accessor]) {
          if (row[column.accessor].min === 0) {
            min = 0;
          }
          if (row[column.accessor].max === 0) {
            max = 0;
          }
          if (mode === 'editor') {
            // console.log(min, max, row[column.accessor])
            var html = `<span class="thales-roll-values">
                        <input class="thales-cell-input" data-thales-roll="min" placeholder="Min" type="number" value="${
                          min !== null ? min : ''
                        }" />
                        <input class="thales-cell-input" data-thales-roll="max" placeholder="Max" type="number" value="${
                          max !== null ? max : ''
                        }" />
                      </span>`;
          } else {
            var html = `<span class="thales-rendered-roll">${
              min !== null ? instance.stripHTML(min) : ''
            } ${max !== null ? '- ' + instance.stripHTML(max) : ''}</span>`;
          }
        }
        // console.log('HERE', html)
        break;
      //ROLL BTN
      case 'rollBtn':
        var classList = 'thales-cell-rollBtn';
        if (value && value !== '') {
          classList = classList + ' btn btn-primary btn-block';
        } else {
          if (instance.mode === 'editor') {
            value =
              '<i class="fal fa-dice thales-cell-icon"></i>Configure Dice';
          }
        }
        var html = `
          <span class="${classList}">${value}</span>
        `;
        break;
      //LONGTEXT
      case 'longText':
        var html = `<span class="thales-cell-longtext">${instance.stripHTML(
          value
        )}</span>`;
        break;

      //DATE
      case 'date':
        var html = `<span class="thales-cell-date">${instance.stripHTML(
          value
        )}</span>`;
        break;

      //TABLE
      case 'table':
        var tableID = row[column.accessor].id;
        var navigate = row[column.accessor].navigate;

        if (instance.mode === 'editor') {
          var tableName = instance.worldTables[tableID] || 'Choose Table';
          var tableIcon = '<i class="fal fa-table thales-cell-icon"></i>';
        } else {
          var tableName = instance.worldTables[tableID] || '';
          var tableIcon =
            tableName === ''
              ? ''
              : '<i class="fal fa-table thales-cell-icon"></i>';
        }

        var html = `<span class="thales-cell-table" data-thales-table-id="${tableID}" data-thales-table-navigate="${navigate}">
                      ${tableIcon}${instance.stripHTML(tableName)}
                    </span>`;
        break;

      //Link
      case 'link':
        var text = value.text && value.text !== null ? value.text : value.url;
        var url = value.url;

        text = instance.stripHTML(text);
        var linkIcon = '<i class="fal fa-link thales-cell-icon"></i>';
        if (instance.mode === 'editor') {
          if (text.length === 0) {
            text = `${linkIcon}Configure Link`;
          } else {
            text = `${linkIcon}${text}`;
          }
        } else {
          if (text.length > 0) {
            text = `${linkIcon}${text}`;
          }
        }
        var html = `<span class="thales-cell-link" data-thales-link="${
          value.navigate
        }"><a href="${url}" ${
          value.newTab ? ' target="_blank" ' : ''
        }>${text}</a></span>`;
        break;

      //Image
      case 'image':
        var title = value.title && value.title !== null ? value.title : '';
        var url = value.url;
        var navigate = value.navigate;
        // var imgID = value.imgID;
        // console.log(value)

        var text = instance.stripHTML(title);
        var imgIcon = `<i class="fal fa-image thales-cell-icon"></i>`;
        if (instance.mode === 'editor') {
          // console.log('text', text)
          if ((text && text.length === 0) || !text) {
            text = `${imgIcon}Configure Image`;
          } else {
            text = `${imgIcon}${text}`;
          }
        } else {
          if (text && text.length > 0) {
            text = `${imgIcon}${text}`;
          } else {
            text = '';
          }
        }
        var html = `<span class="thales-cell-image" data-thales-image-title="${title}" data-thales-image-src="${url}" data-thales-image-navigate="${navigate}">${text}</span>`;
        break;

      //Article
      case 'article':
        var title = value.title && value.title !== null ? value.title : '';
        var url = value.link;
        var navigate = value.navigate;

        var text = instance.stripHTML(title);
        var articleIcon = `<i class="fal fa-file-alt thales-cell-icon"></i>`;

        if (instance.mode === 'editor') {
          if ((text && text.length === 0) || !text) {
            text = `${articleIcon}Configure Article`;
          } else {
            text = `${articleIcon}${text}`;
          }
        } else {
          if (text && text.length > 0) {
            text = `${articleIcon}${text}`;
          } else {
            text = '';
          }
        }
        console.log(value);
        var html = `<span class="thales-cell-article" data-thales-article-link="${url}" data-thales-article-navigate="${navigate}" data-thales-article-title="${title}">${text}</span>`;
        break;
    }
    // console.log(html);
    $(cellContent).html(html);

    // console.log(cellContent)
    $(cellContent)
      .find('.thales-cell-input')
      .off('keyup change')
      .on('keyup change', function (event) {
        var excludedKeys = ['Shift', 'Control', 'Alt', 'Meta'];
        if (excludedKeys.indexOf(event.originalEvent.key) === -1) {
          instance.editCell($(this));
        }

        if (event.originalEvent.key && event.originalEvent.key === 'Enter') {
          // instance.editCell($(this));
          $(this).blur();
        }
      });

    $(cellContent)
      .find('.thales-cell-checkbox')
      .off('click')
      .on('click', function (event) {
        if (instance.mode === 'editor') {
          instance.updateChecklist($(this));
        }
      });

    $(cellContent)
      .find('.thales-cell-rollBtn')
      .off('click')
      .on('click', function (event) {
        if (instance.mode === 'editor') {
          return instance.displayCellEditModal(event, 'rollBtn');
        } else {
          // console.log('NEED TO IMPLEMENT DICE ROLLER');
          var expression = $(event.target).text();
          if (expression !== '') {
            instance.rollDiceExpression(expression);
          }
        }
      });

    $(cellContent)
      .find('.thales-cell-longtext')
      .off('click')
      .on('click', function (event) {
        // event.preventDefault();
        return instance.displayCellEditModal(event, 'longtext');
      });
    $(cellContent)
      .find('.thales-cell-link')
      .off('click')
      .on('click', function (event) {
        if (instance.mode === 'editor') {
          instance.displayCellEditModal(event, 'link');
        }
      });
    $(cellContent)
      .find('.thales-cell-table')
      .off('click')
      .on('click', function (event) {
        if (instance.mode === 'editor') {
          instance.displayCellEditModal(event, 'table');
        } else {
          var tableID = $(event.currentTarget).attr('data-thales-table-id');
          // console.log(event, tableID)
          if (tableID !== '' && tableID !== 'undefined') {
            instance.historyPointer++;
            instance.updateNavButtons();
            instance.changeTable(tableID);
            // instance.navigateToTable('next');
          }
        }
      });
    $(cellContent)
      .find('.thales-cell-image')
      .off('click')
      .on('click', function (event) {
        if (instance.mode === 'editor') {
          instance.displayCellEditModal(event, 'image');
        }
      });
    $(cellContent)
      .find('.thales-cell-article')
      .off('click')
      .on('click', function (event) {
        if (instance.mode === 'editor') {
          instance.displayCellEditModal(event, 'article');
        }
      });
    return cell;
  }

  displayEditColumnModal(event) {
    var instance = this;
    // console.log(event);
    //Get the Edit Column modal element
    var modal = $(`#${instance.instanceID}_edit-column_modal`);
    var col = $(event.currentTarget).closest('th');
    var colType = $(col).attr('thales-column-type');
    var colID = $(col).attr('id');
    var title = $(col).find('.thales-column-title').text().trim();
    var colSort = $(col).find('.thales-column-sort').length > 0;
    var sortDir = $(col)
      .find('.thales-column-sort')
      .attr('data-thales-sort-direction');
    var hideCol = $(col).attr('thales-hidden-column') === 'true' ? true : false;

    // console.log(colSort, sortDir)

    //Set modal content.
    $(modal).find('input#type').val(instance.dataTypes[colType]);
    $(modal).find('input#title').val(title);
    $(modal).find('input#sort').prop('checked', colSort);
    $(modal)
      .find('select#sortDir option')
      .removeAttr('selected')
      .each(function (i, el) {
        // console.log(i, el, sortDir)
        if ($(el).val() === sortDir) {
          $(el).attr('selected', 'selected');
        }
      });
    $(modal).find('input#hide').prop('checked', hideCol);
    //Delete Column Handler
    $(modal)
      .find('.deleteColBtn')
      .off('click')
      .on('click', function (event) {
        $(`#${instance.instanceID} th#${colID}`).remove();
        instance.deleteColumn(colID);
        modal.modal('hide');
        return;
      });

    //Bind Modal form handler
    $(modal)
      .find('form')
      .off('submit')
      .on('submit', function (event) {
        //Disable default form submit handler.
        event.preventDefault();
        event.stopPropagation();

        for (var c = 0; c < instance.table.columns.length; c++) {
          if (instance.table.columns[c]._id === colID) {
            var formData = {
              title: instance.stripHTML($(modal).find('input#title').val()),
              sort: $(modal).find('input#sort').is(':checked'),
              sortDir: instance.stripHTML(
                $(modal).find('select#sortDir').val()
              ),
              hidden: $(modal).find('input#hide').is(':checked'),
            };
            console.log(formData);

            instance.updateColumn(colID, formData);
            // console.log(instance.table.columns);
          }
        }

        //Update Column Element
        $(col).find('.thales-column-title').text(formData.title);
        if (formData.sort) {
          if ($(col).find('.thales-column-sort').length > 0) {
            $(col)
              .find('.thales-column-sort')
              .attr('data-thales-sort-direction', formData.sortDir);
          } else {
            var columnSortEl = document.createElement('span');
            $(columnSortEl)
              .attr('data-thales-sort-direction', formData.sortDir)
              .addClass('thales-column-sort')
              .html('<i class="fal fa-sort"></i>');
            $(col).find('.thales-column-title').after($(columnSortEl));
            var headerTextColor = instance.table.options.headerTextColor;
            if (headerTextColor && headerTextColor !== '') {
              if (headerTextColor.indexOf('rgb') < 0) {
                headerTextColor = '#' + headerTextColor;
              }
              $(col)
                .find('.thales-column-sort > i')
                .css('color', headerTextColor + ' !important');
            }
          }

          //Bind Sort handler
          $(columnSortEl)
            .off('click')
            .on('click', function (event) {
              instance.handleColumnSort(event);
            });
        } else {
          $(col).find('.thales-column-sort').remove();
        }

        $(col).attr('thales-hidden-column', formData.hidden);

        //Hide Modal
        $(modal).modal('hide');
      });

    //Show modal
    $(modal).modal('show');
  }

  displayCellEditModal(event, type) {
    event.preventDefault();
    console.log('called editCellModal', type);
    var instance = this;
    // console.log(event)
    var columnID = $(event.currentTarget)
      .closest('.thales-cell')
      .attr('data-thales-column');
    var rowID = $(event.currentTarget).closest('.thales-row').attr('id');
    var modal = $(`#${instance.instanceID}_edit-cell_modal`);
    var cell = $(event.currentTarget);
    var cellType = $(cell)
      .closest('.thales-cell-content')
      .attr('data-thales-cell-type');
    var value = instance.stripHTML($(event.currentTarget).text());
    // console.log(cellType)

    var headerTitle =
      instance.mode === 'editor' ? 'Editing Details' : 'Details';
    var bodyHtml = ``;

    if (type === 'table') {
      if (instance.mode === 'editor') {
        bodyHtml = `
          <div class="form-group">
            <label for="tableID">Select Table</label>
            <select id="tableID" name="table" class="form-control">
            </select>
          </div>
          <div class="form-group">
            <label for="navigate">
              Display on roll?
              <input type="checkbox" id="navigate" name="navigate" />
            </label>
            <div class="thales-form-help-text">
              If checked, when a user rolls on the table and gets the row for this image, the image viewer will open and display the image automatically.
              <span class="thales-form-note">
                Note: Only the first 'automatic' cell in a row will register. For example, if you have both a Link and then a Table cell both set to automatically trigger, the Link will navigate and the embedded Table will not automatically display.
              </span>
            </div>
          </div>
        `;
      }
    }

    if (type === 'rollBtn') {
      bodyHtml = `
        <div class="form-group">
          <label for="diceExp">Dice Expression</label>
          <input id="diceExp" name="diceExp" type="text" class="form-control" />
          <div class="thales-form-help-text">
            This is a Dice Expression, similar to the [roll] BBCode. You can supply a basic expression like '1d20+4' or more complex ones like '8dF.2 - 3'. For more information on how to format your dice expressions, <a target="_blank" href="https://greenimp.github.io/rpg-dice-roller/guide/notation/">click here</a> (opens in new tab)
          </div>
        </div
      `;
    }

    if (type === 'longtext') {
      if (instance.mode === 'editor') {
        bodyHtml = `
          <textarea class="form-control thales-longtext-editor">${value}</textarea>
        `;
      } else {
        bodyHtml = `
          <div class="thales-longtext-viewer">${value}</div>
        `;
      }
    }

    if (type === 'link') {
      if (instance.mode === 'editor') {
        bodyHtml = `
          <div class="form-group">
            <label for="url">Link Target</label>
            <input id="url" name="url" type="text" class="form-control" />
            <div class="thales-form-help-text">
              This should be a url (http://example.com/) that you want the link to navigate to.
            </div>
          </div>
          <div class="form-group">
            <label for="text">Link Text</label>
            <input id="text" name="text" type="text" class="form-control"  />
            <div class="thales-form-help-text">
              This will define the text that is displayed in the table. If not set, the link's url will be used instead.
            </div>
          </div>
          <div class="form-group">
            <label for="newTab">Open in New Tab?</label>
            <input id="newTab" name="newTab" type="checkbox" />
            <div class="thales-form-help-text">
              It is recommended (unless otherwise desired) to check this so that the user will not be redirected away from the current page.
            </div>
          </div>
          <div class="form-group">
            <label for="navigate">Automatically Navigate?</label>
            <input id="navigate" name="navigate" type="checkbox" />
            <div class="thales-form-help-text">
              If the table is rollable and the row this link is in gets selected as the "winning" result, the user will be directed to the link url automatically (there will be a short delay so the user has a chance to see this result).<br />
              <span class="thales-form-note">
                Note: Only the first 'automatic' cell in a row will register. For example, if you have both a Link and then a Table cell both set to automatically trigger, the Link will navigate and the embedded Table will not automatically display.
              </span>
            </div>
          </div>
        `;
      }
    }

    if (type === 'image') {
      if (instance.mode === 'editor') {
        bodyHtml = `
          <div class="form-group">
            <label for="query">Search</label>
            <input id="query" name="query" type="text" class="form-control" />
            <div class="thales-form-help-text">
              Search for an image to add, then adjust the properties below.
            </div>
          </div>
          <div class="thales-image-search-results" id="results"></div>
          <div class="form-group">
            <label for="name">Display Name</label>
            <input id="name" name="name" class="form-control" />
            <div class="thales-form-help-text">
              The text to display in the table. When someone clicks on this text, they will see the image.
            </div>
          </div>
          <div class="form-group">
            <label for="navigate">
              Display on roll?
              <input type="checkbox" name="navigate" id="navigate" />
            </label>
            <div class="thales-form-help-text">
              If this is checked, the Table will open the Image Viewer automatically when the user rolls and selects the row that contains this cell.
              <span class="thales-form-note">
                Note: Only the first 'automatic' cell in a row will register. For example, if you have both a Link and then a Table cell both set to automatically trigger, the Link will navigate and the embedded Table will not automatically display.
              </span>
            </div>
          </div>
          <input id="imgID" name="imgID" type="text" class="thales-ui-hidden" />
          <input id="url" name="url" type="text" class="thales-ui-hidden" />
        `;
      }
    }

    if (type === 'article') {
      if (instance.mode === 'editor') {
        bodyHtml = `
          <div class="form-group">
            <label for="query">Search</label>
            <input id="query" name="query" type="text" class="form-control" />
            <div class="thales-form-help-text">
              Search for an article to link, then configure the settings below.
            </div>
          </div>
          <div class="thales-article-search-results" id="results"></div>
          <div class="form-group">
            <label for="name">Display Name</label>
            <input id="name" name="name" class="form-control" />
            <div class="thales-form-help-text">
              The text to display in the table. When someone clicks on this text, they will be directed to the article.
            </div>
          </div>
          <div class="form-group">
            <label for="navigate">
              Navigate on Roll?
              <input id="navigate" name="navigate" type="checkbox" />
            </label>
            <div class="thales-form-help-text">
              If the table is rollable and the row this entry is in is the "winner", the user will automatically be redirected to the article after a short delay.
              <span class="thales-form-note">
                Note: Only the first 'automatic' cell in a row will register. For example, if you have both a Link and then a Table cell both set to automatically trigger, the Link will navigate and the embedded Table will not automatically display.
              </span>
            </div>
          </div>
          <input id="link" name="link" class="thales-ui-hidden"/>
        `;
      }
    }

    var footerHtml = ``;
    if (instance.mode === 'editor') {
      footerHtml = `
        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
        <button type="submit" class="btn btn-primary">Update</button>
      `;
    } else {
      footerHtml = `
        <button type="button" class="btn btn-primary" data-dismiss="modal">Close</button>
      `;
    }

    $(modal).find('.modal-dialog').attr('data-thales-cell-type', cellType);
    $(modal).find('.modal-title').html(headerTitle);
    $(modal).find('.modal-body').html(bodyHtml);
    $(modal).find('.modal-footer').html(footerHtml);
    $(modal)
      .find('form')
      .off('submit')
      .on('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (instance.mode === 'editor') {
          if (cellType === 'longText') {
            var text = instance.stripHTML($(modal).find('textarea').val());
            var data = {};
            data[columnID] = text;
            instance.updateRow(rowID, data);
            $(cell).text(text);
          }
          if (cellType === 'link') {
            //Get new data from form.
            var formData = {
              url: $(modal).find('input#url').val(),
              text: instance.stripHTML($(modal).find('input#text').val()),
              navigate: $(modal).find('input#navigate').prop('checked')
                ? 'navigate'
                : '',
              newTab: $(modal).find('input#newTab').prop('checked'),
            };
            if (formData['url'] === '') {
              formData['url'] = '#';
            }

            //Set the display text to the url if none is provided.
            if (formData['text'].length === 0) {
              formData['text'] = formData['url'];
            }

            //Update the row in the table's state.
            var data = {};
            data[columnID] = formData;
            instance.updateRow(rowID, data);

            //Update the cell content.
            $(cell).find('a').attr('href', formData['url']);
            $(cell)
              .find('a')
              .html(
                `<i class="fal fa-link thales-cell-icon"></i> ${instance.stripHTML(
                  formData['text']
                )}`
              );

            if (formData['navigate'] === 'navigate') {
              $(cell).attr('data-thales-link', 'navigate');
            } else {
              $(cell).removeAttr('data-thales-link');
            }

            if (formData['newTab']) {
              $(cell).find('a').attr('target', '_blank');
            } else {
              $(cell).find('a').removeAttr('target');
            }
          }

          if (cellType === 'table') {
            var formData = {
              id: $(modal).find('select#tableID').val(),
              name: '',
              navigate: $(modal).find('input#navigate').is(':checked'),
            };
            formData.name = $(modal)
              .find(`select option[value="${formData.id}"]`)
              .text();

            var data = {};
            data[columnID] = formData;
            instance.updateRow(rowID, data);
            console.log(instance.table.rows);
            var html = `<i class="fal fa-table"></i> ${instance.stripHTML(
              formData.name
            )}`;
            $(cell)
              .attr('data-thales-table-id', formData.id)
              .attr('data-thales-table-navigate', formData.navigate)
              .html(html);
          }

          if (cellType === 'image') {
            var formData = {
              title:
                $(modal).find(`input#name`).val() ||
                $(modal).find(`input#imgID`).val() ||
                'Image',
              url:
                $(modal).find(`input#url`).val() ||
                'https://via.placeholder.com/300.png?text=Image',
              navigate: $(modal).find('input#navigate').is(':checked'),
            };

            var data = {};
            data[columnID] = formData;
            instance.updateRow(rowID, data);

            //Update the cell content
            var html = `<i class="fal fa-image thales-cell-icon"></i> ${instance.stripHTML(
              formData.title
            )}`;
            $(cell)
              .attr(
                'data-thales-image-title',
                instance.stripHTML(formData.title)
              )
              .attr('data-thales-image-navigate', formData.navigate)
              .attr('data-thales-image-src', formData.url)
              .html(html);
          }

          if (cellType === 'article') {
            var formData = {
              title: $(modal).find('input#name').val() || 'Article',
              link: $(modal).find('input#link').val(),
              navigate: $(modal).find('input#navigate').is(':checked'),
            };

            var data = {};
            data[columnID] = formData;
            instance.updateRow(rowID, data);

            var html = `<i class="fal fa-file-alt thales-cell-icon"></i> ${instance.stripHTML(
              formData.title
            )}`;
            $(cell)
              .attr('data-thales-article-link', formData.link)
              .attr('data-thales-article-navigate', formData.navigate)
              .attr('data-thales-article-title', formData.title)
              .html(html);
          }

          if (cellType === 'rollBtn') {
            if (instance.mode === 'editor') {
              var value = $(modal).find('input#diceExp').val();

              var data = {};
              data[columnID] = value;
              instance.updateRow(rowID, data);

              if (!value || value === '') {
                $(cell).removeClass('btn btn-primary btn-block');
              } else {
                $(cell).addClass('btn btn-primary btn-block');
              }
              if (!value || value === '') {
                value =
                  '<i class="fal fa-dice thales-cell-icon"></i>Configure Dice';
              }
              $(cell).html(value);
            }
          }
          // console.log(instance.table)
          // console.log($(cell), $(cell).closest('.thales-cell-content'));
          // console.log(instance.table.rows)
        }
        $(modal).modal('hide');
        return false;
      });

    //Post Rendering Final Touches
    if (instance.mode === 'editor') {
      if (cellType === 'link') {
        var link = $(cell).find('a');
        var url = $(link).attr('href');
        var newTab = $(link).attr('target');
        var navigate = $(cell).attr('data-thales-link');
        var text = instance.stripHTML($(link).text());

        console.log(url, newTab, navigate, text);
        if (url === '#' || url === 'undefined') {
          url = '';
        }
        if (text === 'Configure Link') {
          text = '';
        }
        $(modal).find('input#url').val(url);
        $(modal).find('input#text').val(text);
        if (newTab) {
          $(modal).find('input#newTab').prop('checked', true);
        }
        if (navigate === 'navigate') {
          $(modal).find('input#navigate').prop('checked', true);
        }
      }
      if (cellType === 'rollBtn') {
        var value = $(cell).text();
        if (value.indexOf('Configure Dice') > -1) {
          value = '';
        }
        // console.log('YUP', value, cell);
        $(modal).find('input#diceExp').val(value);
      }
      if (cellType === 'table') {
        var tableIDs = Object.keys(instance.worldTables);
        var navigate = $(cell).attr('data-thales-table-navigate') === 'true';
        for (var i = 0; i < tableIDs.length; i++) {
          var id = tableIDs[i];
          var tableName = instance.worldTables[id];

          var option = document.createElement('option');
          $(option)
            .attr('value', id)
            .text(instance.stripHTML(tableName))
            .appendTo($(modal).find('select#tableID'));
        }
        $(modal).find('#navigate').attr('checked', navigate);
        $(modal).find('#tableID').val($(cell).attr('data-thales-table-id'));
      }
      if (cellType === 'image') {
        if (cell.attr('data-thales-image-title')) {
          var title = cell.attr('data-thales-image-title');
          var src = cell.attr('data-thales-image-src');
          var navigate = cell.attr('data-thales-image-navigate') === 'true';
          var result = document.createElement('div');
          $(result)
            .addClass('thales-image-search-result thales-search-image-select')
            .attr('data-thales-image-result-title', title)
            .attr('data-thales-image-result-src', cell)
            .html(`<img src="${src}" alt="${title}" class="thales-image" />`)
            .appendTo($(`.thales-image-search-results`));

          $(modal).find('#imgID, #query').val(title);
          $(modal).find('#url').val(src);
          $(modal).find('#navigate').attr('checked', navigate);
        }
        //Bind the search behavior to the query input
        $(modal)
          .find('input#query')
          .off('keyup')
          .on('keyup', function (event) {
            var query = $(event.target).val();
            console.log('Searching Images for: ', query);
            var waURL = `${instance.getBaseURL()}/api/mention/bbcode.json?q=`;

            $('.thales-image-search-results').empty();
            $.ajax({
              url: waURL + query, //PRODUCTION
              // url: 'https://jsonplaceholder.typicode.com/posts', //LOCAL TESTING
              method: 'GET',
              useCredentials: true,
              success: function (data) {
                //Sample data override for local testing
                // data = [
                //   {
                //     title: 'Dwarves',
                //     url: 'https://i0.wp.com/doe.horus.ninja/wp-content/uploads/2019/01/Dwarves1080_608-1024x576.jpg?resize=1024%2C576&ssl=1'
                //   },
                //   {
                //     title: 'Dwarven Forges',
                //     url: 'https://i.pinimg.com/originals/05/03/37/05033773eeb6a182627bfd83c1d8b71f.jpg'
                //   },
                //   {
                //     title: 'Dwarven Craftsmanship',
                //     url: 'https://db4sgowjqfwig.cloudfront.net/campaigns/205170/assets/957725/Dwarf.jpg?1554071167'
                //   },
                //   {
                //     title: 'Dwarven Battlehammer',
                //     url: 'https://media-waterdeep.cursecdn.com/avatars/thumbnails/7/200/1000/1000/636284730109658206.jpeg'
                //   }
                // ]
                if (data) {
                  // console.log('here')
                  if (data.length > 0) {
                    for (var i = 0; i < data.length; i++) {
                      if (data[i].type === 'image') {
                        var title = data[i].title || 'Image';
                        var src =
                          data[i].url ||
                          'https://via.placeholder.com/300.png?text=Image';
                        var result = document.createElement('div');
                        $(result)
                          .addClass('thales-image-search-result')
                          .attr('data-thales-image-result-title', title)
                          .attr('data-thales-image-result-src', src)
                          .html(
                            `<img src="${src}" alt="${title}" class="thales-image" />`
                          )
                          .appendTo($(`.thales-image-search-results`));
                      }
                    }
                  }
                }

                $('.thales-image-search-results .thales-image-search-result')
                  .off('click')
                  .on('click', function (event) {
                    var img = $(event.target).parent();
                    var url = img.attr('data-thales-image-result-src');
                    var title = img.attr('data-thales-image-result-title');

                    $(
                      '.thales-image-search-results .thales-image-search-result img'
                    ).removeClass('thales-search-image-select');
                    img.find('img').addClass('thales-search-image-select');

                    $(modal).find('#url').val(url);
                    $(modal).find('#imgID, #name').val(title);
                  });
              },
            });
          });
      }

      if (cellType === 'article') {
        if (cell.attr('data-thales-article-title')) {
          console.log('EDIT ARTICLE');
          var title = cell.attr('data-thales-article-title');
          var link = cell.attr('data-thales-article-link');
          var navigate = cell.attr('data-thales-article-navigate') === 'true';
          console.log(title, link, navigate, cell);
          var result = document.createElement('div');
          $(result)
            .addClass(
              'thales-article-search-result thales-article-search-select'
            )
            .attr('data-thales-article-title', title)
            .attr('data-thales-article-link', link)
            // .attr('data-thales-article-navigate', navigate)
            .html(`<span class="thales-article-search-title">${title}</span>`)
            .appendTo($('.thales-article-search-results'));

          $(modal).find('#link').val(link);
          $(modal).find('#query,#name').val(title);
          $(modal).find('#navigate').attr('checked', navigate);
        }

        //Bind the search behavior to the query input
        $(modal)
          .find('input#query')
          .off('keyup')
          .on('keyup', function (event) {
            var query = $(event.target).val();
            console.log('Searching Articles for: ', query);

            var waURL = `${instance.getBaseURL()}/api/article/bbcode.json?q=`;
            $('.thales-article-search-results').empty();
            $.ajax({
              url: waURL + query, //PRODUCTION
              // url: 'https://jsonplaceholder.typicode.com/posts', //LOCAL TESTING
              useCredentials: true,
              method: 'GET',
              success: function (data) {
                //Example data override for local testing
                // data = [
                //   {
                //     title: 'Dwarves (Species)',
                //     url: '/w/WORLD/dwarves-article--xuroth'
                //   },
                //   {
                //     title: 'Dwarven Tactics (Military)',
                //     url: '/w/WORLD/dwarves-tactics-article--xuroth'
                //   },
                //   {
                //     title: 'Dwarven Mating Rituals (Ritual)',
                //     url: '/w/WORLD/dwarves-in-love-article--xuroth'
                //   },
                //   {
                //     title: 'Dwarven Language (Language)',
                //     url: '/w/WORLD/dwarf-speak-article--xuroth'
                //   },
                //   {
                //     title: 'Dwarfest Dwarf (Prose)',
                //     url: '/w/WORLD/biggest-dwarf-article--xuroth'
                //   },
                //   {
                //     title: 'Dwarven Brigade (Prose)',
                //     url: '/w/WORLD/gutbusters-article--xuroth'
                //   }

                // ]

                if (data) {
                  if (data.length > 0) {
                    for (var i = 0; i < data.length; i++) {
                      var title = data[i].title || 'Article';
                      var link = data[i].url;
                      var result = document.createElement('div');

                      $(result)
                        .addClass('thales-article-search-result')
                        .attr('data-thales-article-result-title', title)
                        .attr('data-thales-article-result-link', link)
                        .html(
                          `<span class="thales-article-search-title">${title}</span>`
                        )
                        .appendTo($(`.thales-article-search-results`));
                    }
                  }
                }

                $(
                  '.thales-article-search-results .thales-article-search-result'
                )
                  .off('click')
                  .on('click', function (event) {
                    var title = $(event.currentTarget).attr(
                      'data-thales-article-result-title'
                    );
                    var link = $(event.currentTarget).attr(
                      'data-thales-article-result-link'
                    );
                    console.log(event.currentTarget);
                    $(
                      '.thales-article-search-results .thales-article-search-result'
                    ).removeClass('thales-article-search-select');
                    $(event.currentTarget).addClass(
                      'thales-article-search-select'
                    );

                    $(modal).find('input#link').val(link);
                    $(modal).find('input#name').val(title);
                  });
              },
            });
          });
      }
    }
    if (instance.mode !== 'editor') {
      if (cellType === 'longText') {
        if (value && value !== '') {
          $(modal).modal('show');
        }
      }
    } else {
      $(modal).modal('show');
      if (cellType === 'longText') {
        // console.log('here', $(modal).find('textarea'))
        $(modal).find('textarea').focus();
      }
    }

    return;
  }

  copyTableStructure(targetID) {
    var instance = this;
    return new Promise(function (resolve, reject) {
      $.ajax({
        url: `${instance.getBaseURL()}/api/inttable/${targetID}`,
        method: 'GET',
        useCredentials: true,
        success: function (targetData) {
          console.log(
            `[THALES] Successfully retrieved table data for "${targetID}"`,
            targetData
          );

          instance.table.rows = [];
          instance.table.columns = targetData.table.payload.columns;
          instance.table.options = targetData.table.payload.options;
          instance.resetTableHeight();
          instance.resetTableViewport();
          instance.sizes = {
            row: 43,
            header: 51,
          };
          // instance.makeTable();
          // console.log(instance.table)
          resolve();
        },
      });
    });
  }

  deleteRow(id) {
    console.log(`[THALES] Removing row "${id}"`);
    var instance = this;
    for (var r = 0; r < instance.table.rows.length; r++) {
      if (instance.table.rows[r]._id === id) {
        instance.table.rows.splice(r, 1);
        break;
      }
    }

    $(`#${instance.instanceID} tbody tr#${id}`).remove();

    //Resize Table Container
    instance.resetTableHeight();
    // var tableHeight = $(`#${instance.instanceID} .thales-table`).height() + 20;
    // $(`#${instance.instanceID} .thales-table-container`).attr('style', `height: ${tableHeight}px;`);
  }

  deleteColumn(id) {
    console.log(`[THALES] Removing column "${id}"`);
    var instance = this;

    //Remove from state
    for (var c = 0; c < instance.table.columns.length; c++) {
      var column = instance.table.columns[c];
      if (column._id === id) {
        instance.table.columns.splice(c, 1);

        $(`.thales-rollBtn-group .dropdown-menu`)
          .find(`[data-thales-column-id="${column._id}"]`)
          .remove();
      }
    }

    // console.log(instance.table.columns)
    for (var r = 0; r < instance.table.rows.length; r++) {
      if (instance.table.rows[r][id]) {
        instance.table.rows[r][id] = undefined;
      }
    }

    //Remove column cell from all rows
    $(`#${instance.instanceID} tbody tr.thales-row`).each(function (i, row) {
      //Get handles
      var handles = $(row).find('.thales-row-handles');

      $(row).find(`td[data-thales-column="${id}"]`).remove();
      if ($(row).find('.thales-row-handles').length === 0) {
        $(row).first('td').prepend(handles);
      }
    });
    //replace handles on first td
  }

  createNewRow() {
    var instance = this;

    //Create base row data.
    var newRow = {
      _id: instance.generateID('row'),
      _roll: {
        min: null,
        max: null,
      },
      _order: instance.table.rows.length,
    };

    //Set all column accessors on the row.
    for (var c = 0; c < instance.table.columns.length; c++) {
      var column = instance.table.columns[c];
      newRow[column.accessor] = '';
      if (column.type === 'link') {
        newRow[column.accessor] = {
          url: '#',
          text: 'Configure Link',
          navigate: null,
          newTab: true,
        };
      }
      if (column.type === 'roll') {
        newRow[column.accessor] = { min: null, max: null };
      }
    }

    //Update Table State.
    instance.table.rows.push(newRow);

    //Render Row.
    instance.generateRow(newRow);

    //Scroll to new row
    var renderedRow = $(`#${instance.instanceID} tr#${newRow._id}`);
    // instance.scrollTo(renderedRow, 'row');
    // console.log(renderedRow.position())
    var target = renderedRow.position().top;
    // console.log($(`#${instance.instanceID} .thales-table-container`))
    // $(`#${instance.instanceID} .thales-table-container`).slimscroll({ scrollToY: `${target}px` })
    //Resize Table Container
    // if (instance.table.options.maxSize > 0) {
    // instance.resetTableHeight(instance.table.options.maxSize);
    // }
    instance.resetTableHeight();
    instance.clearTouchEvents();
    // var tableHeight = $(`#${instance.instanceID} .thales-table`).height() + 20;
    // $(`#${instance.instanceID} .thales-table-container`).attr('style', `height: ${tableHeight}px;`);
  }

  editCell(cell) {
    var instance = this;
    var columnID = $(cell).closest('.thales-cell').attr('data-thales-column');
    var rowID = $(cell).closest('.thales-row').attr('id');
    var cellType = $(cell)
      .closest('.thales-cell-content')
      .attr('data-thales-cell-type');
    console.log('Editing Cell', cell, cellType, columnID);
    for (var r = 0; r < instance.table.rows.length; r++) {
      if (instance.table.rows[r]._id === rowID) {
        if (cellType !== 'roll') {
          console.log('here', columnID, instance.table.rows[r]);
          if (instance.table.rows[r].hasOwnProperty(columnID)) {
            instance.table.rows[r][columnID] = instance.stripHTML(
              $(cell).val()
            );
            // instance.table.rows[r][columnID] = $(cell).val();
            console.log(
              `Updated cell property "${columnID}" in row "${rowID}"`
            );
            console.log(instance.table.rows[r]);
            return;
          }
        } else {
          console.log('Editing roll columns', columnID, instance.table.rows[r]);
          if (instance.table.rows[r].hasOwnProperty(columnID)) {
            //Roll type: 'min' or 'max'.
            var roll = $(cell).attr('data-thales-roll');
            //Get the value as a number.
            var val = parseInt($(cell).val(), 10);

            //If the column.accessor on 'row' is set incorrectly, fix it.
            if (typeof instance.table.rows[r][columnID] === 'string') {
              instance.table.rows[r][columnID] = { min: null, max: null };
            }
            // console.log(val)

            //Update the sub-property (min || max) for the roll.
            instance.table.rows[r][columnID][roll] = isNaN(val) ? null : val;
            // console.log(instance.table.rows[r][columnID]);
          }
        }
      }
    }
  }

  scrollTo(node, type) {
    // console.log(node,type)
    node.get(0).scrollIntoView();
  }

  updateColumn(id, data) {
    for (var c = 0; c < this.table.columns.length; c++) {
      if (this.table.columns[c]._id === id) {
        Object.assign(this.table.columns[c], data);
      }
    }
    // console.log(this.table.columns);
  }

  updateRow(id, data) {
    for (var r = 0; r < this.table.rows.length; r++) {
      if (this.table.rows[r]._id === id) {
        Object.assign(this.table.rows[r], data);
      }
    }
  }

  searchTable(str) {
    if (str.length === 0) {
      $(`#${this.instanceID} table tr.thales-row`).removeClass(
        'thales-ui-hidden'
      );
      return;
    }

    var matches = [];
    for (var r = 0; r < this.table.rows.length; r++) {
      var row = this.table.rows[r];
      var rowKeys = Object.keys(row);
      var excludedKeys = ['_order', '_roll', '_id'];
      var rowMatch = false;
      for (var k = 0; k < rowKeys.length; k++) {
        var key = rowKeys[k];
        if (excludedKeys.indexOf(key) > -1) {
          continue;
        }
        if (typeof row[key] === 'string') {
          if (row[key].toLowerCase().indexOf(str) > -1) {
            rowMatch = true;
          }
        } else {
          if (row[key].text) {
            if (row[key].text.toLowerCase().indexOf(str) > -1) {
              rowMatch = true;
            }
          } else {
            if (row[key].title) {
              if (row[key].title.toLowerCase().indexOf(str) > -1) {
                rowMatch = true;
              }
            } else {
              if (row[key].name) {
                if (row[key].name.toLowerCase().indexOf(str) > -1) {
                  rowMatch = true;
                }
              }
            }
          }
        }
      }

      if (rowMatch) {
        matches.push(row._id);
      }
    }
    // console.log('Rows containing matches', matches)

    //Hide all non-matching rows.
    $(`#${this.instanceID} table tr.thales-row`).addClass('thales-ui-hidden');

    for (var m = 0; m < matches.length; m++) {
      $(`#${this.instanceID} tr#${matches[m]}`).removeClass('thales-ui-hidden');
    }
  }

  handleColumnSort(event) {
    var instance = this;
    // console.log(`[THALES] Sorting columns.`);
    // console.log(event);

    var column = $(event.currentTarget).closest('.thales-column');
    var columnType = $(column).attr('thales-column-type');
    var sortDir = $(event.currentTarget).attr('data-thales-sort-direction');
    var colID = $(column).attr('id');
    // console.log(column, sortDir);

    //Switch sort direction
    if (sortDir === 'desc') {
      sortDir = 'asc';
    } else {
      sortDir = 'desc';
    }

    //Change Sort Icon
    $(`#${instance.instanceID} thead th.thales-column .thales-column-sort i`)
      .removeClass('fa-sort-up fa-sort-down')
      .addClass('fa-sort');
    $(event.currentTarget).attr('data-thales-sort-direction', sortDir);
    $(event.currentTarget)
      .find('i')
      .removeClass('fa-sort fa-sort-up fa-sort-down')
      .addClass(sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
    // console.log('sorting ', sortDir, columnType);

    var $tbody = $(`#${instance.instanceID} tbody`);

    //Sort the rows
    $tbody
      .find('.thales-row')
      .sort(function (rowA, rowB) {
        // console.log(rowA)
        var cellA = $(rowA).find(`td[data-thales-column="${colID}"]`);
        var cellB = $(rowB).find(`td[data-thales-column="${colID}"]`);

        //Cell is Text
        if (columnType === 'text') {
          //Set the comparision vars depending on Thales' mode.
          if (instance.mode === 'editor') {
            var a = $(cellA).find('.thales-cell-input').val();
            var b = $(cellB).find('.thales-cell-input').val();
          } else {
            var a = $(cellA).find('.thales-rendered-text').text().trim();
            var b = $(cellB).find('.thales-rendered-text').text().trim();
          }
        }

        //Cell is Number
        if (columnType === 'number') {
          if (instance.mode === 'editor') {
            var a = parseInt($(cellA).find('.thales-cell-input').val(), 10);
            var b = parseInt($(cellB).find('.thales-cell-input').val(), 10);
          } else {
            var a = parseInt(
              $(cellA).find('.thales-rendered-number').text(),
              10
            );
            var b = parseInt(
              $(cellB).find('.thales-rendered-number').text(),
              10
            );
          }

          if (isNaN(a)) {
            a = sortDir === 'asc' ? 99999999 : -99999999;
          }
          if (isNaN(b)) {
            b = sortDir === 'asc' ? 99999999 : -99999999;
          }
        }

        //Cell is LongText (don't need to check mode as both have identical HTML)
        if (columnType === 'longText') {
          var a = $(cellA).find('.thales-cell-longtext').text().trim();
          var b = $(cellB).find('.thales-cell-longtext').text().trim();
        }

        //Cell is Link (don't need to check mode as both have identical HTML)
        if (columnType === 'link') {
          var a = $(cellA).find('.thales-cell-link a').text().trim();
          var b = $(cellB).find('.thales-cell-link a').text().trim();
        }

        //Cell is Roll
        if (columnType === 'roll') {
          if (instance.mode === 'editor') {
            var a = parseInt(
              $(cellA).find('.thales-cell-input[data-thales-roll="min"]').val(),
              10
            );
            var b = parseInt(
              $(cellB).find('.thales-cell-input[data-thales-roll="min"]').val(),
              10
            );

            if (isNaN(a)) {
              a = sortDir === 'asc' ? 999999999 : -999999999;
            }
            if (isNaN(b)) {
              b = sortDir === 'asc' ? 999999999 : -999999999;
            }
          } else {
            var a = $(cellA).find('.thales-rendered-roll').text().trim();
            var b = $(cellB).find('.thales-rendered-roll').text().trim();

            // a = a.substr()
            if (a.indexOf(' -') > -1) {
              a = a.substr(0, a.indexOf(' -'));
            }

            if (b.indexOf(' -') > -1) {
              b = b.substr(0, b.indexOf(' -'));
            }

            a = parseInt(a, 10);
            b = parseInt(b, 10);

            if (isNaN(a)) {
              a = sortDir === 'asc' ? 999999999 : -999999999;
            }
            if (isNaN(b)) {
              b = sortDir === 'asc' ? 999999999 : -999999999;
            }
          }
        }

        //Cell is Table
        if (columnType === 'table') {
          var a = $(cellA).find('.thales-cell-table').text().trim();
          var b = $(cellB).find('.thales-cell-table').text().trim();

          if (a === 'Choose Table') {
            a = '';
          }
          if (b === 'Choose Table') {
            b = '';
          }
        }

        //Cell is Article
        if (columnType === 'article') {
          var a = $(cellA).find('.thales-cell-article').text().trim();
          var b = $(cellB).find('.thales-cell-article').text().trim();

          if (a === 'Configure Article') {
            a = '';
          }
          if (b === 'Configure Article') {
            b = '';
          }
        }

        //Cell is Image
        if (columnType === 'image') {
          var a = $(cellA).find('.thales-cell-image').text().trim();
          var b = $(cellB).find('.thales-cell-image').text().trim();

          if (a === 'Configure Image') {
            a = '';
          }
          if (b === 'Configure Image') {
            b = '';
          }
        }

        // console.log('a', a)
        // console.log('b', b)

        //Sort based on direction
        if (typeof a === 'string') {
          if (sortDir === 'asc') {
            // return a > b ? 1 : a < b ? -1 : 0;
            return !a ? 1 : !b ? -1 : a.localeCompare(b);
          }
          // return b > a ? 1 : b < a ? -1 : 0;
          return !b ? -1 : !a ? 1 : b.localeCompare(a);
        } else {
          if (sortDir === 'asc') {
            return a > b ? 1 : a < b ? -1 : 0;
            // return !a ? 1 : (!b ? -1 : (a.localeCompare(b)));
          }
          return b > a ? 1 : b < a ? -1 : 0;
          // return !b ? -1 : (!a ? 1 : (b.localeCompare(a)))
        }
      })
      .appendTo($tbody);
  }

  roll(columnID) {
    var instance = this;
    //Set a quick ref.
    var table = instance.table;

    console.log(`[THALES] Rolling on table "${table.name}"\r\nGood Luck!`);

    // console.log(table)

    //Remove any prior roll-results.
    $('.thales-roll-result').removeClass('thales-roll-result');

    //Only roll if table is rollable.
    if (instance.table.options.rollable) {
      var min = null;
      var max = null;
      var rollColumn = false;
      var noColumnFound = false;

      for (var c = 0; c < instance.table.columns.length; c++) {
        //Only process if the column is a roll column
        if (instance.table.columns[c].type === 'roll') {
          if (columnID && columnID !== '') {
            if (instance.table.columns[c]._id === columnID) {
              rollColumn = instance.table.columns[c];
              break;
            } else {
              continue;
            }
          } else {
            columnID = instance.table.columns[c]._id;
            rollColumn = instance.table.columns[c];
            break;
          }
        }
      }

      if (rollColumn) {
        //Set the minimum and maximum range for the random roll.
        for (var r = 0; r < table.rows.length; r++) {
          var row = table.rows[r];
          //Only factor in rows that have a _roll property. This is set when a row is
          // created and a column has the type 'roll', or when a new 'roll' column is created.
          if (row.hasOwnProperty(columnID)) {
            //Set the minimum of the range.
            if (min !== null) {
              //Compare this row's minimum to the existing one.
              if (row[columnID].min === null) {
                continue;
              }
              min = row[columnID].min < min ? row[columnID].min : min;
            } else {
              //No minimum has been set yet, so use this row's.
              // console.log('here', row[columnID]);
              min = row[columnID].min;
            }

            //Set the maximum of the range
            if (row[columnID].max) {
              //Use the `max` property if present. A row that is just a single number
              // instead of a range will not have a `max`.
              if (max !== null) {
                //Compare this row's max to the existing one.
                max = row[columnID].max > max ? row[columnID].max : max;
              } else {
                //No maximum set yet, so we'll use this row's.
                max = row[columnID].max;
              }
            } else {
              //This row doesn't have a `max` property, so we'll use it's minimum instead.
              //We compare the `min` to the existing max and adjust if it's greater.
              max = row[columnID].min > max ? row[columnID].min : max;
            }
          }
        }
        if (min === null || max === null) {
          // console.log('here')
          if (instance.mode === 'editor') {
            instance.showFlash(
              'warning',
              `The table couldn't find any values set in the rows for the column "${rollColumn.title}". Switching to roll a random row instead. <br/><br/><span class="text-muted">This notice will not show in Viewer mode.</span>`
            );
          }
          noColumnFound = true;
          min = 1;
          max = instance.table.rows.length;
        }
      } else {
        //If Thales can't find a rollable column, then just roll across all rows.
        console.log('No column found');
        min = 1;
        max = instance.table.rows.length;
        noColumnFound = true;
      }

      // console.log('min', min);
      // console.log('max', max);

      //Generate a random number between the two constraints, inclusive.
      var rollResult = Math.floor(Math.random() * (max - min + 1)) + min;
      console.log(`[THALES] Roll result: ${rollResult}`);
      if (rollResult == 0) {
        if (instance.mode === 'editor' && !noColumnFound) {
          instance.showFlash(
            'warning',
            `The result of the Test Roll was '0'. This could mean the table couldn't find any of the values, or did you mean to start the roll values at '0'? <br/><br/><span class="text-muted">Note: This alert will not show in the Viewer mode.</span>`,
            5000
          );
        }
        console.log('Roll Range', { min, max });
      } else {
        instance.showFlash(
          'info',
          `Rolled a <span class="thales-roll-result">${rollResult}</span>!`
        );
      }
      //Placeholder for the _id of the selected row.
      var rolledRow = null;

      //Almost done. We now need to re-loop through the rows to find the one that matches
      // the result.
      if (rollColumn) {
        for (var r = 0; r < table.rows.length; r++) {
          var row = table.rows[r];

          //Only use rows that have `_roll`.
          if (row.hasOwnProperty(columnID)) {
            if (row[columnID].min !== null && row[columnID].max !== null) {
              //Check if the rollResult is between or part of the _roll range.
              if (
                rollResult >= row[columnID].min &&
                rollResult <= row[columnID].max
              ) {
                //Set this row as the 'winner' and break out of the loop.
                rolledRow = row._id;
                break;
              }
            } else {
              //This row only has a single number instead of a range
              if (row[columnID].min) {
                //Check if the rollResult is equal to the row's value.
                if (rollResult === row[columnID].min) {
                  //Set this row as the winner and break out of the loop.
                  rolledRow = row._id;
                  break;
                }
              }
            }
          }
        }

        //Update the rendered table to show the winning row.
        if (!noColumnFound) {
          var resultRow = $(`#${instance.instanceID} tbody tr#${rolledRow}`);
        } else {
          var resultRow = $(
            $(`#${instance.instanceID} tbody tr.thales-row`)[rollResult - 1]
          );
          // console.log(resultRow)
        }
      } else {
        var resultRow = $(
          $(`#${instance.instanceID} tbody tr.thales-row`)[rollResult - 1]
        );
        // console.log(resultRow)
      }
      // console.log(resultRow)
      if (resultRow.length === 0) {
        console.log(
          '[THALES] Unable to locate row during roll. Likely this means that the column used for rolling has a gap in the min/max ranges. Double check the cells for the column in each row and ensure there are no gaps.'
        );
        if (instance.mode === 'editor') {
          instance.showFlash(
            'warning',
            `The roll was a <span class="thales-roll-result-text">${rollResult}</span>, but the table was unable to find a row that has this between the min/max values for "${rollColumn.title}". Double check if this is intended. <br/><br/><span class="text-muted">This message will not be shown in the Viewer mode.</span>`
          );
        }
      }
      resultRow.addClass('thales-roll-result');
      var navCells = resultRow.find(
        '.thales-cell-table, .thales-cell-link, .thales-cell-article, .thales-cell-image'
      );

      for (var c = 0; c < navCells.length; c++) {
        var cell = navCells[c];
        // console.log(cell)
        if ($(cell).hasClass('thales-cell-table')) {
          var tableID = $(cell).attr('data-thales-table-id');
          var navigate = $(cell).attr('data-thales-table-navigate') === 'true';
          // console.log(tableID)
          if (instance.mode !== 'editor' && tableID && tableID !== '') {
            if (navigate) {
              setTimeout(function () {
                instance.historyPointer++;
                instance.updateNavButtons();
                instance.changeTable(tableID);
                console.log('[THALES] Navigating to new table.');
              }, 2000);
              break;
            }
          }
        }

        if ($(cell).hasClass('thales-cell-link')) {
          var link = $(cell).find('a');
          // console.log(cell)
          if (instance.mode !== 'editor') {
            if (
              link.length === 1 &&
              $(cell).attr('data-thales-link') === 'navigate'
            ) {
              setTimeout(function () {
                // console.log('LINK CLICKED')
                link.get(0).click();
              }, 2000);
              break;
            }
          }
        }

        if ($(cell).hasClass('thales-cell-article')) {
          var link = $(cell).attr('data-thales-article-link');
          var navigate =
            $(cell).attr('data-thales-article-navigate') === 'true';
          console.log(cell, link, navigate);
          if (navigate) {
            if (link && link.length > 0) {
              setTimeout(function () {
                var url = `${window.location.origin}${link}`;
                window.location.href = url;
              }, 2000);
              break;
            }
          }
        }

        if ($(cell).hasClass('thales-cell-image')) {
          var title = $(cell).attr('data-thales-image-title');
          var src = $(cell).attr('data-thales-image-src');
          var imageBox = $(`#${instance.instanceID}_imageBox`);
          var navigate = $(cell).attr('data-thales-image-navigate') === 'true';
          // console.log(imageBox, title, src)
          if (navigate) {
            imageBox.find('img').attr('src', src);
            imageBox.find('.thales-image-title-container').text(title);
            $(
              `#${instance.instanceID}_imageBox, #${instance.instanceID}_imageBox .thales-image-box-close`
            )
              .off('click')
              .on('click', function (event) {
                $(`#${instance.instanceID}_imageBox`).addClass(
                  'thales-ui-hidden'
                );
              });
            setTimeout(function () {
              imageBox.removeClass('thales-ui-hidden');
            }, 2000);
            break;
          }
        }
      }
      //...should scrollIntoView in case the body is scrollable.
    } else {
      //Easter egg if someone tries to force a roll. This method (roll()) is not protected,
      // but just uses a simple condition prior to executing.
      console.error('[THALES] I saw that.');
    }
  }

  changeTable(newTableID) {
    var instance = this;
    console.log('[THALES] Loading table for ' + newTableID);

    $(
      `#${instance.instanceID} .thales-splash[data-thales-splash="loader"]`
    ).removeClass('thales-ui-hidden');
    instance.tableID = newTableID;

    // Reset HTML (remove table rows)
    instance.resetTableViewport();

    //Fetch data for new world (sets instance data)
    instance.fetchTableData().then(function () {
      instance.makeTable();
    });

    //Reregister events.

    return false;
  }

  resetTableViewport() {
    var instance = this;

    //Hide roll and search
    $(`#${instance.instanceID}`)
      .find('.thales-roll-group, .thales-search')
      .parent()
      .addClass('thales-ui-hidden');

    //Remove rollable columns from Column Select (Roll Button Group)
    $(
      `#${instance.instanceID} .thales-roll-group .dropdown-menu .thales-roll-column-select`
    ).remove();
    //Hide Table header and rows
    $(`#${instance.instanceID} tr`).remove();
  }

  navigateToTable(direction) {
    console.log('going ' + direction);
    var instance = this;
    var prevButton = $(
      `#${instance.instanceID} .thales-nav-button[data-thales-nav-direction="back"]`
    );
    var nextButton = $(
      `#${instance.instanceID} .thales-nav-button[data-thales-nav-direction="next"]`
    );
    // if (direction === 'next') {
    //   console.log('[THALES] Navigating forward to next table.');
    //   instance.historyPointer++;
    //   if (instance.historyPointer >= instance.tableHistory.length - 1) {
    //     instance.historyPointer = instance.tableHistory.length - 1;
    //     nextButton.addClass('thales-ui-hidden');
    //   } else {
    //     nextButton.removeClass('thales-ui-hidden');
    //   }

    //   prevButton.removeClass('thales-ui-hidden')
    //   console.log(instance.historyPointer)
    //   console.log(instance.tableHistory, instance.worldTables)
    //   var prevTableID = instance.tableID;
    //   var nextTableID = instance.tableHistory[instance.historyPointer];

    //   $(prevButton).find('.thales-nav-text')
    //   .text(instance.worldTables[prevTableID]);
    //   $(nextButton).find('.thales-nav-text')
    //   .text(instance.worldTables[nextTableID]);

    //   instance.changeTable(nextTableID);

    //   return;
    // }

    if (direction === 'back') {
      console.log('[THALES] Navigating back to previous table.');
      instance.historyPointer--;
      if (instance.historyPointer <= 0) {
        instance.historyPointer = 0;
        prevButton.parent().addClass('thales-ui-hidden');
      } else {
        prevButton.parent().removeClass('thales-ui-hidden');
      }
      // nextButton.removeClass('thales-ui-hidden')
      console.log(instance.tableHistory, instance.worldTables);
      var prevTableID = instance.tableHistory[instance.historyPointer];
      var nextTableID = instance.tableID;

      $(prevButton)
        .find('.thales-nav-text')
        .text(instance.worldTables[prevTableID]);
      $(nextButton)
        .find('.thales-nav-text')
        .text(instance.worldTables[nextTableID]);
      console.log('previous: ' + prevTableID, 'next: ' + nextTableID);

      instance.changeTable(prevTableID);

      return;
    }
  }

  updateChecklist(checkbox) {
    var newVal = checkbox.is(':checked');
    var colID = checkbox.closest('td.thales-cell').attr('data-thales-column');
    var rowID = checkbox.closest('tr.thales-row').attr('id');
    var data = {};
    data[colID] = newVal;
    this.updateRow(rowID, data);
  }

  rollDiceExpression(expression) {
    var instance = this;
    if (rpgDiceRoller) {
      var roller = new rpgDiceRoller.DiceRoller();
      var roll = roller.roll(expression);
      instance.showFlash(
        'info',
        `You rolled a ${roll.total}!<br />Expression ${roll.output}`
      );
    } else {
      instance.showFlash(
        'warning',
        'Hmm... Looks like the Dice Roll library was not found. This could be a bug.'
      );
    }
  }

  importCSV(data) {
    var instance = this;
    return new Promise(function (resolve, reject) {
      console.log('Importing Data (CSV)');
      data = data.trim();
      data = data.split('\n');
      console.log(data);

      var columns = instance.table.columns;
      var rows = [];
      for (var r = 0; r < data.length; r++) {
        var dataCells = data[r].trim().split(',');
        if (dataCells.length !== columns.length) {
          // instance.showFlash('danger', `There is an error`)
          reject(
            `Error during import.\r\nThe number of cells in row ${r + 1} (${
              dataCells.length
            }) is not equal to the number of columns in the table (${
              columns.length
            })\r\nPlease check your data and the table structure, then try again.`
          );
        }
        var row = {
          _id: instance.generateID('row'),
        };

        for (var c = 0; c < columns.length; c++) {
          var column = columns[c];
          var colID = column._id;
          var colType = column.type;
          var cell = dataCells[c];

          //Sanitize Cell
          cell = instance.stripHTML(cell);

          switch (colType) {
            case 'roll':
              var spread = '-';
              var min = cell.split(spread)[0] || null;
              var max = cell.split(spread)[1] || null;

              if (min !== null) {
                min = parseInt(min, 10);
                if (isNaN(min)) {
                  reject(
                    `The data in Column ${c + 1} Row ${r + 1} (${
                      cell.split(spread)[0]
                    }) is not a valid number.`
                  );
                }
              }

              if (max !== null) {
                max = parseInt(max, 10);
                if (isNaN(max)) {
                  reject(
                    `The data in Column ${c + 1} Row ${r + 1} (${
                      cell.split(spread)[1] ? cell.split(spread)[1] : ' '
                    }) is not a valid number.`
                  );
                }
              }

              row[colID] = { min, max };
              break;
            case 'number':
              var num = parseInt(cell, 10);
              if (isNaN(num)) {
                num = null;
              }
              row[colID] = num;
              break;
            case 'link':
              // console.log(cell)
              var params = cell.split('|');
              var link = params[0] || null;
              var title = params[1] || link;
              var newTab =
                params[2] && params[2].toLowerCase() === 'tab' ? true : false;
              var nextArgIndex = newTab === true ? 3 : 2;
              var navigate =
                params[nextArgIndex] && params[nextArgIndex] === 'navigate'
                  ? true
                  : false;
              navigate = navigate ? 'navigate' : '';
              row[colID] = { url: link, text: title, navigate, newTab };
              // console.log(cell, row[colID])
              break;
            case 'article':
              var params = cell.split('|');
              var link = params[0] || null;
              var title = params[1] || link;
              var navigate = params[2] === 'navigate' ? true : false;

              row[colID] = { link, title, navigate };
              break;
            case 'image':
              var params = cell.split('|');
              var url = params[0] || null;
              var title = params[1] || url;
              if (url !== null && title !== null) {
                row[colID] = { url, title };
              } else {
                reject(
                  `The data in Column ${c + 1} Row ${
                    r + 1
                  } (${cell}) is not formatted correctly. Please adjust the content or empty this cell, and try again.`
                );
              }
              break;
            case 'table':
              var regex =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
              if (cell.match(regex)) {
                var id = cell.split('|')[0];
                var name = cell.split('|')[1] || null;
                var navigate = cell.split('|')[2] === 'navigate' ? true : false;
                if (instance.worldTables[id]) {
                  if (name === null) {
                    name = instance.worldTables[id];
                  }
                } else {
                  reject(
                    `The supplied Table ID (${id}) does not match any existing tables in the current active world.`
                  );
                }
                row[colID] = { id, name, navigate };
              } else {
                reject(
                  `The supplied Table ID (${id}) does not appear to a valid ID. Please double check the value in Column ${
                    c + 1
                  }, Row ${r + 1}`
                );
              }
              break;
            case 'longtext':
              var content = cell;
              row[colID] = content;
              break;
            case 'text':
            default:
              var content = cell;
              row[colID] = content;
              break;
          }
        }

        rows.push(row);
      }

      // console.log(rows);
      instance.table.rows = rows;
      resolve();
    });
  }

  updateNavButtons() {
    var instance = this;
    var prevButton = $(
      `#${instance.instanceID} .thales-nav-button[data-thales-nav-direction="back"]`
    );
    // var nextButton = $(`#${instance.instanceID} .thales-nav-button[data-thales-nav-direction="next"]`);

    var prevTableID = instance.tableID;
    // var nextTableID = "";
    $(prevButton).parent().removeClass('thales-ui-hidden');
    $(prevButton)
      .find('.thales-nav-text')
      .text(instance.worldTables[prevTableID]);
    // $(nextButton).find('.thales-nav-text')
    //   .text(instance.worldTables[nextTableID]);
  }

  resetTableHeight(value) {
    var instance = this;
    //Set Table's maximum height if configured.
    if (value !== undefined && value > 0) {
      // console.log(value)
      // var row = $(`#${instance.instanceID} .thales-table tbody tr`).innerHeight();
      // var header = $(`#${instance.instanceID} .thales-table thead tr`).innerHeight();
      var row = instance.sizes.row;
      var header = instance.sizes.header;
      // console.log(row, header)
      var tableHeight = row * value + header + 20;
      // var tableHeight = (row * value) + 20;
      console.log('Setting Table container height', tableHeight);
      $(`#${instance.instanceID} .thales-table-container`).addClass(
        'thales-header-affixed'
      );
      // var styles = $(`#${instance.instanceID} .thales-table-container`).closest('.slimScrollDiv').attr('style').split('; ');
      // console.log(styles)
      // for (var s = 0; s < styles.length; s++) {
      //   if (styles[s].indexOf('height') === 0) {
      //     styles[s] = `height: ${tableHeight - 20}px`;
      //   }
      // }
      // $(`#${instance.instanceID} .thales-table-container`).closest('.slimScrollDiv').addClass('test').attr('style', styles.join('; '))

      // console.log(row)
      // $(`#${instance.instanceID} .thales-table tbody`).attr('style', `height: ${height}px; `);
      // console.log('Adjusting table!')
      // var css = {
      //   maxHeight: $(`#${instance.instanceID} .thales-table tbody tr`).height() * value
      // };

      // $(`#${instance.instanceID} .thales-table tbody`).css(css);
    } else {
      //Resize Table Container
      // var tableHeight = $(`#${instance.instanceID} .thales-table`).height() + 20;
      // var tableHeight = instance.sizes.row * instance.table.rows.length + instance.sizes.header + 20;
      var tableHeight =
        $(
          `#${instance.instanceID} .thales-table-container tbody`
        ).outerHeight() +
        $(
          `#${instance.instanceID} .thales-table-container thead`
        ).outerHeight() +
        30;
      // console.log(tableHeight);
      $(`#${instance.instanceID} .thales-table-container`).attr(
        'style',
        `height: ${tableHeight}px;`
      );
      // console.log(tableHeight, instance.sizes.row, instance.table.rows.length, instance.sizes.header)
      $(`#${instance.instanceID} .thales-table-container`).removeClass(
        'thales-header-affixed'
      );
      // var styles = $(`#${instance.instanceID} .thales-table-container`).closest('.slimScrollDiv').attr('style').split('; ');
      // console.log(styles)
      // for (var s = 0; s < styles.length; s++) {
      //   if (styles[s].indexOf('height') === 0) {
      //     styles[s] = `height: ${tableHeight - 20}px`;
      //   }
      // }
      // $(`#${instance.instanceID} .thales-table-container`).closest('.slimScrollDiv').addClass('test').attr('style', styles.join('; '))
    }
  }

  showFlash(type, message, duration) {
    var instance = this;

    if (!duration) {
      duration = 3000;
    }

    if (typeof toastr !== 'undefined') {
      //Use toastr, if available.
      toastr[type](message, instance.table.name, { timeOut: duration });
    } else {
      //Use built-in fallback (can't show concurrent messages!)
      var msgType = 'alert-' + type;
      $(`#${instance.instanceID} .thales-flash-message`)
        .find('.thales-flash-text')
        .html(message);
      $(`#${instance.instanceID} .thales-flash-message`)
        .removeClass(
          'alert-danger alert-info alert-warning alert-success alert-primary'
        )
        .addClass(msgType)
        .addClass('animated fadeIn')
        // .removeClass('thales-ui-hidden')
        .removeClass('fadeOut');

      setTimeout(function () {
        $(`#${instance.instanceID} .thales-flash-message`)
          .removeClass('fadeIn')
          .addClass('fadeOut');
        // .addClass('thales-ui-hidden');
      }, duration);
    }
  }

  fetchTables() {
    var instance = this;
    console.log('[THALES] Retrieving Table list.');
    return new Promise(function (resolve, reject) {
      var url = `${instance.getBaseURL()}/api/world/${instance.worldID}/inttables`;

      $.ajax({
        url: url,
        method: 'GET',
        useCredentials: true,
        success: function (data) {
          instance.worldTables = {};

          for (var t = 0; t < data.tables.length; t++) {
            instance.worldTables[data.tables[t].id] = data.tables[t].title;
          }
          // console.log(instance.worldTables);
          resolve();
        },
        error: function (err) {
          console.error(err);
          reject();
        },
      });
    });
  }

  stripHTML(str) {
    if (str === undefined || str === null || str.length === 0) {
      return '';
    }
    if (typeof str === 'number') {
      return str;
    }
    str = str.replace(/(<([^>]+)>)/gim, '');
    str = str.replace(/[<>]/gim, function (i) {
      return '&#' + i.charCodeAt(0) + ';';
    });
    return str;
  }

  clearTouchEvents() {
    var instance = this;
    $('.thales-cell-input').off('touchend');
  }

  fetchTableData() {
    var instance = this;
    console.log(`[THALES] - Retrieving data.`);
    return new Promise(function (resolve, reject) {
      var historyEnabled = false;
      //Check if data has already been loaded previously. Prevents needing another fetch request.
      if (typeof ThalesTables !== 'undefined') {
        historyEnabled = true;
        if (ThalesTables[instance.tableID]) {
          var data = ThalesTables[instance.tableID];
          //Return saved data
          console.log(`[THALES] - Found existing data.`);
          //Set instance data.
          instance.table = data;
          resolve();
        }
      }

      //If no saved data was found, go ahead and fetch the table's data.
      var url = ``;
      //For Development, use sample data
      if (instance.env === 'dev') {
        url = `http://localhost:5500/modules/thales/js/thales-demo.json`;
        console.log('getting data from sample');
      } else if (instance.env === 'prod') {
        //Abort if the table ID is not supplied
        if (!instance.tableID || instance.tableID.length === 0) {
          return reject('Unable to fetch data.');
        } else {
          url = `${instance.getBaseURL()}/api/inttable/${instance.tableID}`;
          console.log('[THALES] Fetching data from API.');
        }
      }

      $.ajax({
        url: url,
        method: 'GET',
        useCredentials: true,
        success: function (data) {
          console.log(
            `[THALES] Retrieved table data for "${instance.tableID}":`,
            data
          );

          //If the saved tables object exists, store the data (overwriting).
          if (historyEnabled) {
            ThalesTables[instance.tableID] = data;
          }

          if (typeof ENV === 'undefined') {
            var table = {
              id: data.table.id,
              description: data.table.description,
              name: data.table.title,
              options: {},
              columns: [],
              rows: [],
            };

            if (data.table.payload) {
              if (data.table.payload.options) {
                table.options = data.table.payload.options;
              }
              if (data.table.payload.columns) {
                table.columns = data.table.payload.columns;
              }
              if (data.table.payload.rows) {
                table.rows = data.table.payload.rows;
                // console.log(data.table.payload.rows)
              }
            } else {
              table.options = {
                showTitle: true,
                rollable: true,
                search: true,
                maxSize: 0,
                showHeaderRow: true,
                affixHeaderRow: false,
                showDescription: false,
              };
            }

            //Sort the rows based on their order.
            table.rows.sort(function (a, b) {
              var ret = 0;
              if (a._order > b._order) {
                ret = 1;
              } else if (a._order < b._order) {
                ret = -1;
              }
              return ret;
            });

            //Set instance data.
            instance.table = table;
          } else {
            instance.table = data;
          }

          //Add reference to the table to the instance's history.
          // instance.tableHistory.push(instance.tableID);

          //Continue execution.
          resolve();
        },
        error: function (error) {
          console.error(
            `[THALES] Unable to retrieve data for "${instance.tableID}":`,
            error
          );

          //End execution, giving a reason that will be presented to the user.
          reject(
            'Unable to retrieve table data. Please ensure the TABLE_ID is correct.'
          );
        },
      });
    });
  }

  saveTable() {
    var instance = this;
    return new Promise(function (resolve, reject) {
      //Clean up rows > cells
      var columnIDs = [];
      for (var c = 0; c < instance.table.columns.length; c++) {
        columnIDs.push(instance.table.columns[c]._id);
      }

      for (var r = 0; r < instance.table.rows.length; r++) {
        var keys = Object.keys(instance.table.rows[r]);
        for (var k = 0; k < keys.length; k++) {
          var key = keys[k];
          //Exclude all private properties (except _roll as it's obsolete);
          if (key.charAt(0) === '_') {
            if (key !== '_roll') {
              continue;
            }
          }
          //If the key (columnID) is not found in the list of column IDs, remove it.
          if (columnIDs.indexOf(key) === -1) {
            // console.log('Keys to remove', key);
            delete instance.table.rows[r][key];
          }
        }
      }

      // console.log(instance.table.rows)

      //Retrieve Table Title and Description
      var title = $('#chartbundle_inttable_title').val();
      var description = $('#chartbundle_inttable_description').val();
      // var viewStatus = $('#chartbundle_inttable_state').val();
      // var subGroups = $('#chartbundle_inttable_subscribergroups').val();

      // console.log(title)
      // console.log(description)
      // console.log(viewStatus)
      // console.log(subGroups)
      //Generate base 'payload' to save.
      var payload = {
        options: instance.table.options,
        columns: instance.table.columns,
        rows: instance.table.rows,
      };

      // console.log(payload)
      // Generate formdata with table data!
      var formData = new FormData();
      formData.append('payload', JSON.stringify(payload));
      formData.append('title', title);
      formData.append('description', description);

      //Debug: Show formdata that's sent to the server.
      // for (var key of formData.entries()) {
      //   console.log(key[0], key[1]);
      // }

      //Send the formatted data to the server.
      $.ajax({
        url: `${instance.getBaseURL()}/api/inttable/${instance.tableID}`,
        method: 'POST',
        useCredentials: true,
        data: formData,
        processData: false,
        contentType: false,
        success: function () {
          instance.showFlash('success', 'Table saved successfully!');
          // console.log('SUCCESS'); //Should use a visual representation (like a toast?)
          resolve();
        },
        error: function (error) {
          instance.showFlash(
            'danger',
            'Encountered an error while saving. Check the console for details (F12).'
          );
          console.error(`[THALES] Error during save:`, error); //Should display an error (if possible) via flash.
          reject(error);
        },
      });
    });
  }

  parseBBCode(str) {
    if (!str || str === null) return null;
    let tagsBBCode = [
      '[b]',
      '[/b]',
      '[i]',
      '[/i]',
      '[u]',
      '[/u]',
      '[s]',
      '[/s]',
      '[small]',
      '[/small]',
      '[sup]',
      '[/sup]',
      '[sub]',
      '[/sub]',
      '[p]',
      '[/p]',
      '[ul]',
      '[/ul]',
      '[ol]',
      '[/ol]',
      '[li]',
      '[/li]',
      '[br]',
      '[h1]',
      '[/h1]',
      '[h2]',
      '[/h2]',
      '[h3]',
      '[/h3]',
      '[h4]',
      '[/h4]',
    ];

    let tagsHTML = [
      '<strong>',
      '</strong>',
      '<em>',
      '</em>',
      '<u>',
      '</u>',
      '<del>',
      '</del>',
      '<small>',
      '</small>',
      '<sup>',
      '</sup>',
      '<sub>',
      '</sub>',
      '<p>',
      '</p>',
      '<ul>',
      '</ul>',
      '<ol>',
      '</ol>',
      '<li>',
      '</li>',
      '<br />',
      '<h2>',
      '</h2>',
      '<h3>',
      '</h3>',
      '<h4>',
      '</h4>',
      '<h5>',
      '</h5>',
    ];

    for (var i = 0; i < tagsBBCode.length; i++) {
      // let regex = new RegExp(tagsBBCode[i], 'ig');
      // str = str.replace(regex, tagsHTML[i]);
      str = str.replaceAll(tagsBBCode[i], tagsHTML[i]);
    }

    return str;
  }
}
