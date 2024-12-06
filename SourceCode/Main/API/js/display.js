/* =============================================================
 * bootstrap3-typeahead.js v4.0.2
 * https://github.com/bassjobsen/Bootstrap-3-Typeahead
 * =============================================================
 * Original written by @mdo and @fat
 * =============================================================
 * Copyright 2014 Bass Jobsen @bassjobsen
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */


(function (root, factory) {

  'use strict';

  // CommonJS module is defined
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('jquery'));
  }
  // AMD module is defined
  else if (typeof define === 'function' && define.amd) {
    define(['jquery'], function ($) {
      return factory ($);
    });
  } else {
    factory(root.jQuery);
  }

}(this, function ($) {

  'use strict';
  // jshint laxcomma: true


 /* TYPEAHEAD PUBLIC CLASS DEFINITION
  * ================================= */

  var Typeahead = function (element, options) {
    this.$element = $(element);
    this.options = $.extend({}, Typeahead.defaults, options);
    this.matcher = this.options.matcher || this.matcher;
    this.sorter = this.options.sorter || this.sorter;
    this.select = this.options.select || this.select;
    this.autoSelect = typeof this.options.autoSelect == 'boolean' ? this.options.autoSelect : true;
    this.highlighter = this.options.highlighter || this.highlighter;
    this.render = this.options.render || this.render;
    this.updater = this.options.updater || this.updater;
    this.displayText = this.options.displayText || this.displayText;
    this.itemLink = this.options.itemLink || this.itemLink;
    this.itemTitle = this.options.itemTitle || this.itemTitle;
    this.followLinkOnSelect = this.options.followLinkOnSelect || this.followLinkOnSelect;
    this.source = this.options.source;
    this.delay = this.options.delay;
    this.theme = this.options.theme && this.options.themes && this.options.themes[this.options.theme] || Typeahead.defaults.themes[Typeahead.defaults.theme];
    this.$menu = $(this.options.menu || this.theme.menu);
    this.$appendTo = this.options.appendTo ? $(this.options.appendTo) : null;
    this.fitToElement = typeof this.options.fitToElement == 'boolean' ? this.options.fitToElement : false;
    this.shown = false;
    this.listen();
    this.showHintOnFocus = typeof this.options.showHintOnFocus == 'boolean' || this.options.showHintOnFocus === "all" ? this.options.showHintOnFocus : false;
    this.afterSelect = this.options.afterSelect;
    this.afterEmptySelect = this.options.afterEmptySelect;
    this.addItem = false;
    this.value = this.$element.val() || this.$element.text();
    this.keyPressed = false;
    this.focused = this.$element.is( ":focus" );
  };

  Typeahead.prototype = {

    constructor: Typeahead,


    setDefault: function (val) {
      // var val = this.$menu.find('.active').data('value');
      this.$element.data('active', val);
      if (this.autoSelect || val) {
        var newVal = this.updater(val);
        // Updater can be set to any random functions via "options" parameter in constructor above.
        // Add null check for cases when updater returns void or undefined.
        if (!newVal) {
          newVal = '';
        }
        this.$element
          .val(this.displayText(newVal) || newVal)
          .text(this.displayText(newVal) || newVal)
          .change();
        this.afterSelect(newVal);
      }
      return this.hide();
    },

    select: function () {
        var val = this.$menu.find('.active').data('value');

        this.$element.data('active', val);
        if (this.autoSelect || val) {
            var newVal = this.updater(val);
            // Updater can be set to any random functions via "options" parameter in constructor above.
            // Add null check for cases when updater returns void or undefined.
            if (!newVal) {
              newVal = '';
            }
            this.$element
              .val(this.displayText(newVal) || newVal)
              .text(this.displayText(newVal) || newVal)
              .change();
            this.afterSelect(newVal);
            if(this.followLinkOnSelect && this.itemLink(val)) {
                document.location = this.itemLink(val);
                this.afterSelect(newVal);
            } else if(this.followLinkOnSelect && !this.itemLink(val)) {
                this.afterEmptySelect(newVal);
            } else {
                this.afterSelect(newVal);
            }
        } else {
            this.afterEmptySelect(newVal);
        }

        return this.hide();
    },

    updater: function (item) {
      return item;
    },

    setSource: function (source) {
      this.source = source;
    },

    show: function () {
      var pos = $.extend({}, this.$element.position(), {
        height: this.$element[0].offsetHeight
      });

      var scrollHeight = typeof this.options.scrollHeight == 'function' ?
          this.options.scrollHeight.call() :
          this.options.scrollHeight;

      var element;
      if (this.shown) {
        element = this.$menu;
      } else if (this.$appendTo) {
        element = this.$menu.appendTo(this.$appendTo);
        this.hasSameParent = this.$appendTo.is(this.$element.parent());
      } else {
        element = this.$menu.insertAfter(this.$element);
        this.hasSameParent = true;
      }      
      
      if (!this.hasSameParent) {
          // We cannot rely on the element position, need to position relative to the window
          element.css("position", "fixed");
          var offset = this.$element.offset();
          pos.top =  offset.top;
          pos.left = offset.left;
      }
      // The rules for bootstrap are: 'dropup' in the parent and 'dropdown-menu-right' in the element.
      // Note that to get right alignment, you'll need to specify `menu` in the options to be:
      // '<ul class="typeahead dropdown-menu" role="listbox"></ul>'
      var dropup = $(element).parent().hasClass('dropup');
      var newTop = dropup ? 'auto' : (pos.top + pos.height + scrollHeight);
      var right = $(element).hasClass('dropdown-menu-right');
      var newLeft = right ? 'auto' : pos.left;
      // it seems like setting the css is a bad idea (just let Bootstrap do it), but I'll keep the old
      // logic in place except for the dropup/right-align cases.
      element.css({ top: newTop, left: newLeft }).show();

      if (this.options.fitToElement === true) {
          element.css("width", this.$element.outerWidth() + "px");
      }
    
      this.shown = true;
      return this;
    },

    hide: function () {
      this.$menu.hide();
      this.shown = false;
      return this;
    },

    lookup: function (query) {
      var items;
      if (typeof(query) != 'undefined' && query !== null) {
        this.query = query;
      } else {
        this.query = this.$element.val();
      }

      if (this.query.length < this.options.minLength && !this.options.showHintOnFocus) {
        return this.shown ? this.hide() : this;
      }

      var worker = $.proxy(function () {

        // Bloodhound (since 0.11) needs three arguments. 
        // Two of them are callback functions (sync and async) for local and remote data processing
        // see https://github.com/twitter/typeahead.js/blob/master/src/bloodhound/bloodhound.js#L132
        if ($.isFunction(this.source) && this.source.length === 3) {
          this.source(this.query, $.proxy(this.process, this), $.proxy(this.process, this));
        } else if ($.isFunction(this.source)) {
          this.source(this.query, $.proxy(this.process, this));
        } else if (this.source) {
          this.process(this.source);
        }
      }, this);

      clearTimeout(this.lookupWorker);
      this.lookupWorker = setTimeout(worker, this.delay);
    },

    process: function (items) {
      var that = this;

      items = $.grep(items, function (item) {
        return that.matcher(item);
      });

      items = this.sorter(items);

      if (!items.length && !this.options.addItem) {
        return this.shown ? this.hide() : this;
      }

      if (items.length > 0) {
        this.$element.data('active', items[0]);
      } else {
        this.$element.data('active', null);
      }

      if (this.options.items != 'all') {
        items = items.slice(0, this.options.items);
      }

      // Add item
      if (this.options.addItem){
        items.push(this.options.addItem);
      }

      return this.render(items).show();
    },

    matcher: function (item) {
      var it = this.displayText(item);
      return ~it.toLowerCase().indexOf(this.query.toLowerCase());
    },

    sorter: function (items) {
      var beginswith = [];
      var caseSensitive = [];
      var caseInsensitive = [];
      var item;

      while ((item = items.shift())) {
        var it = this.displayText(item);
        if (!it.toLowerCase().indexOf(this.query.toLowerCase())) beginswith.push(item);
        else if (~it.indexOf(this.query)) caseSensitive.push(item);
        else caseInsensitive.push(item);
      }

      return beginswith.concat(caseSensitive, caseInsensitive);
    },

    highlighter: function (item) {
      var text = this.query;
      if(text===""){
        return item;
      }
      var matches = item.match(/(>)([^<]*)(<)/g);
      var first = [];
      var second = [];
      var i;
      if(matches && matches.length){
        //html
        for (i = 0; i < matches.length; ++i) {
          if (matches[i].length > 2) {//escape '><'
            first.push(matches[i]);
          }
        }
      }else{
        //text
        first = [];
        first.push(item);
      }
      text = text.replace((/[\(\)\/\.\*\+\?\[\]]/g), function(mat) {
          return '\\' + mat;
      });
      var reg = new RegExp(text, "g");
      var m;
      for (i = 0; i < first.length; ++i) {
        m = first[i].match(reg);
        if(m && m.length>0){//find all text nodes matches
          second.push(first[i]);
        }
      }
      for (i = 0; i < second.length; ++i) {
        item = item.replace(second[i],second[i].replace(reg, '<strong>$&</strong>'));
      }
      return item;
    },

    render: function (items) {
      var that = this;
      var self = this;
      var activeFound = false;
      var data = [];
      var _category = that.options.separator;

      $.each(items, function (key,value) {
        // inject separator
        if (key > 0 && value[_category] !== items[key - 1][_category]){
          data.push({
            __type: 'divider'
          });
        }

        // inject category header
        if (value[_category] && (key === 0 || value[_category] !== items[key - 1][_category])){
          data.push({
            __type: 'category',
            name: value[_category]
          });
        }
        data.push(value);
      });

      items = $(data).map(function (i, item) {
        if ((item.__type || false) == 'category'){
          return $(that.options.headerHtml || that.theme.headerHtml).text(item.name)[0];
        }

        if ((item.__type || false) == 'divider'){
          return $(that.options.headerDivider || that.theme.headerDivider)[0];
        }

        var text = self.displayText(item);
        i = $(that.options.item || that.theme.item).data('value', item);
        i.find(that.options.itemContentSelector || that.theme.itemContentSelector)
         .addBack(that.options.itemContentSelector || that.theme.itemContentSelector)
         .html(that.highlighter(text, item));
        if(this.followLinkOnSelect) {
            i.find('a').attr('href', self.itemLink(item));
        }
        i.find('a').attr('title', self.itemTitle(item));
        if (text == self.$element.val()) {
          i.addClass('active');
          self.$element.data('active', item);
          activeFound = true;
        }
        return i[0];
      });

      if (this.autoSelect && !activeFound) {
        items.filter(':not(.dropdown-header)').first().addClass('active');
        this.$element.data('active', items.first().data('value'));
      }
      this.$menu.html(items);
      return this;
    },

    displayText: function (item) {
      return typeof item !== 'undefined' && typeof item.name != 'undefined' ? item.name : item;
    },

    itemLink: function (item) {
      return null;
    },

    itemTitle: function (item) {
      return null;
    },

    next: function (event) {
      var active = this.$menu.find('.active').removeClass('active');
      var next = active.next();

      if (!next.length) {
        next = $(this.$menu.find($(this.options.item || this.theme.item).prop('tagName'))[0]);
      }

      next.addClass('active');
      // added for screen reader
      var newVal = this.updater(next.data('value'));
      this.$element.val(this.displayText(newVal) || newVal);
    },

    prev: function (event) {
      var active = this.$menu.find('.active').removeClass('active');
      var prev = active.prev();

      if (!prev.length) {
        prev = this.$menu.find($(this.options.item || this.theme.item).prop('tagName')).last();
      }

      prev.addClass('active');
      // added for screen reader
      var newVal = this.updater(prev.data('value'));
      this.$element.val(this.displayText(newVal) || newVal);
    },

    listen: function () {
      this.$element
        .on('focus.bootstrap3Typeahead',    $.proxy(this.focus, this))
        .on('blur.bootstrap3Typeahead',     $.proxy(this.blur, this))
        .on('keypress.bootstrap3Typeahead', $.proxy(this.keypress, this))
        .on('propertychange.bootstrap3Typeahead input.bootstrap3Typeahead',    $.proxy(this.input, this))
        .on('keyup.bootstrap3Typeahead',    $.proxy(this.keyup, this));

      if (this.eventSupported('keydown')) {
        this.$element.on('keydown.bootstrap3Typeahead', $.proxy(this.keydown, this));
      }

      var itemTagName = $(this.options.item || this.theme.item).prop('tagName')
      if ('ontouchstart' in document.documentElement) {
        this.$menu
          .on('touchstart', itemTagName, $.proxy(this.touchstart, this))
          .on('touchend', itemTagName, $.proxy(this.click, this));
      } else {
        this.$menu
          .on('click', $.proxy(this.click, this))
          .on('mouseenter', itemTagName, $.proxy(this.mouseenter, this))
          .on('mouseleave', itemTagName, $.proxy(this.mouseleave, this))
          .on('mousedown', $.proxy(this.mousedown,this));
      }
    },

    destroy : function () {
      this.$element.data('typeahead',null);
      this.$element.data('active',null);
      this.$element
        .unbind('focus.bootstrap3Typeahead')
        .unbind('blur.bootstrap3Typeahead')
        .unbind('keypress.bootstrap3Typeahead')
        .unbind('propertychange.bootstrap3Typeahead input.bootstrap3Typeahead')
        .unbind('keyup.bootstrap3Typeahead');

      if (this.eventSupported('keydown')) {
        this.$element.unbind('keydown.bootstrap3-typeahead');
      }

      this.$menu.remove();
      this.destroyed = true;
    },

    eventSupported: function (eventName) {
      var isSupported = eventName in this.$element;
      if (!isSupported) {
        this.$element.setAttribute(eventName, 'return;');
        isSupported = typeof this.$element[eventName] === 'function';
      }
      return isSupported;
    },

    move: function (e) {
      if (!this.shown) return;

      switch (e.keyCode) {
        case 9: // tab
        case 13: // enter
        case 27: // escape
          e.preventDefault();
          break;

        case 38: // up arrow
          // with the shiftKey (this is actually the left parenthesis)
          if (e.shiftKey) return;
          e.preventDefault();
          this.prev();
          break;

        case 40: // down arrow
          // with the shiftKey (this is actually the right parenthesis)
          if (e.shiftKey) return;
          e.preventDefault();
          this.next();
          break;
      }
    },

    keydown: function (e) {
      /**
       * Prevent to make an ajax call while copying and pasting.
       *
       * @author Simone Sacchi
       * @version 2018/01/18
       */
      if (e.keyCode === 17) { // ctrl
        return;
      }
      this.keyPressed = true;
      this.suppressKeyPressRepeat = ~$.inArray(e.keyCode, [40,38,9,13,27]);
      if (!this.shown && e.keyCode == 40) {
        this.lookup();
      } else {
        this.move(e);
      }
    },

    keypress: function (e) {
      if (this.suppressKeyPressRepeat) return;
      this.move(e);
    },

    input: function (e) {
      // This is a fixed for IE10/11 that fires the input event when a placehoder is changed
      // (https://connect.microsoft.com/IE/feedback/details/810538/ie-11-fires-input-event-on-focus)
      var currentValue = this.$element.val() || this.$element.text();
      if (this.value !== currentValue) {
        this.value = currentValue;
        this.lookup();
      }
    },

    keyup: function (e) {
      if (this.destroyed) {
        return;
      }
      switch (e.keyCode) {
        case 40: // down arrow
        case 38: // up arrow
        case 16: // shift
        case 17: // ctrl
        case 18: // alt
          break;

        case 9: // tab
          if (!this.shown || (this.showHintOnFocus && !this.keyPressed)) return;
          this.select();
          break;
        case 13: // enter
          if (!this.shown) return;
          this.select();
          break;

        case 27: // escape
          if (!this.shown) return;
          this.hide();
          break;
      }

    },

    focus: function (e) {
      if (!this.focused) {
        this.focused = true;
        this.keyPressed = false;
        if (this.options.showHintOnFocus && this.skipShowHintOnFocus !== true) {
          if(this.options.showHintOnFocus === "all") {
            this.lookup(""); 
          } else {
            this.lookup();
          }
        }
      }
      if (this.skipShowHintOnFocus) {
        this.skipShowHintOnFocus = false;
      }
    },

    blur: function (e) {
      if (!this.mousedover && !this.mouseddown && this.shown) {
        this.select();
        this.hide();
        this.focused = false;
        this.keyPressed = false;
      } else if (this.mouseddown) {
        // This is for IE that blurs the input when user clicks on scroll.
        // We set the focus back on the input and prevent the lookup to occur again
        this.skipShowHintOnFocus = true;
        this.$element.focus();
        this.mouseddown = false;
      } 
    },

    click: function (e) {
      e.preventDefault();
      this.skipShowHintOnFocus = true;
      this.select();
      this.$element.focus();
      this.hide();
    },

    mouseenter: function (e) {
      this.mousedover = true;
      this.$menu.find('.active').removeClass('active');
      $(e.currentTarget).addClass('active');
    },

    mouseleave: function (e) {
      this.mousedover = false;
      if (!this.focused && this.shown) this.hide();
    },

   /**
     * We track the mousedown for IE. When clicking on the menu scrollbar, IE makes the input blur thus hiding the menu.
     */
    mousedown: function (e) {
      this.mouseddown = true;
      this.$menu.one("mouseup", function(e){
        // IE won't fire this, but FF and Chrome will so we reset our flag for them here
        this.mouseddown = false;
      }.bind(this));
    },

    touchstart: function (e) {
      e.preventDefault();
      this.$menu.find('.active').removeClass('active');
      $(e.currentTarget).addClass('active');
    },

    touchend: function (e) {
      e.preventDefault();
      this.select();
      this.$element.focus();
    }

  };


  /* TYPEAHEAD PLUGIN DEFINITION
   * =========================== */

  var old = $.fn.typeahead;

  $.fn.typeahead = function (option) {
    var arg = arguments;
    if (typeof option == 'string' && option == 'getActive') {
      return this.data('active');
    }
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('typeahead');
      var options = typeof option == 'object' && option;
      if (!data) $this.data('typeahead', (data = new Typeahead(this, options)));
      if (typeof option == 'string' && data[option]) {
        if (arg.length > 1) {
          data[option].apply(data, Array.prototype.slice.call(arg, 1));
        } else {
          data[option]();
        }
      }
    });
  };

  Typeahead.defaults = {
    source: [],
    items: 8,
    minLength: 1,
    scrollHeight: 0,
    autoSelect: true,
    afterSelect: $.noop,
    afterEmptySelect: $.noop,
    addItem: false,
    followLinkOnSelect: false,
    delay: 0,
    separator: 'category',
    theme: "bootstrap3",
    themes: {
      bootstrap3: {
        menu: '<ul class="typeahead dropdown-menu" role="listbox"></ul>',
        item: '<li><a class="dropdown-item" href="#" role="option"></a></li>',
        itemContentSelector: "a",
        headerHtml: '<li class="dropdown-header"></li>',
        headerDivider: '<li class="divider" role="separator"></li>'
      },     
      bootstrap4: {
        menu: '<div class="typeahead dropdown-menu" role="listbox"></div>',
        item: '<button class="dropdown-item" role="option"></button>',
        itemContentSelector: '.dropdown-item',
        headerHtml: '<h6 class="dropdown-header"></h6>',
        headerDivider: '<div class="dropdown-divider"></div>'
      } 
    }
  };

  $.fn.typeahead.Constructor = Typeahead;

 /* TYPEAHEAD NO CONFLICT
  * =================== */

  $.fn.typeahead.noConflict = function () {
    $.fn.typeahead = old;
    return this;
  };


 /* TYPEAHEAD DATA-API
  * ================== */

  $(document).on('focus.typeahead.data-api', '[data-provide="typeahead"]', function (e) {
    var $this = $(this);
    if ($this.data('typeahead')) return;
    $this.typeahead($this.data());
  });

}));
var cookiedGlobalAnnouncements = getCookie("cookiedGlobalAnnouncements");

function toggleGlobalAnnouncements() {
    var cookiedGlobalAnnouncements  = getCookie("cookiedGlobalAnnouncements");
    if (cookiedGlobalAnnouncements  ===  "active") {
        $('.global-announcement-wrapper').hide();
    } else {
        $('.global-announcement-wrapper').show();
    }
}



function loadImageSelector( source, destination, target ) {
    // Search images
    console.log('Searching images...');
    $( source ).keyup(
        delay(function (e) {
            thatcontext = $(e.target);
            that = this;
            if (that.value.length > 2) {
                $.ajax({
                    url: thatcontext.attr('data-url'),
                    type: "GET",
                    data: {
                        'term': thatcontext.val(),
                        'type': thatcontext.attr('data-type')
                    },
                    dataType: "json",
                    async: true,
                    success: function (data) {
                        $( destination ).html('');
                        images = data.results;
                        if ( images.length > 0 ) {
                            for ( i  in images ) {
                                $( destination ).append( '<div class="col-3 mb-1 cursor-pointer">' +
                                    '<img data-type="'+ data.type  +'" data-url="'+ target  + '?imageId='+ data.results[ i ].id  +'"   src="'+  data.results[ i ].path +  '/'+  data.results[ i ].filename +  '" title="'+  data.results[ i ].title +  '" article-image-dataid="'+  data.results[ i ].id +  '" class="img-fluid article-'+ thatcontext.attr('data-type')  +'-select" /></div>' );
                            }
                        }
                    }
                });
            } else {
                $( source ).html('');
                $( destination ).html('');
            }
        }, 450)
    );
}



function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function delay(callback, ms) {
    console.log('delay: initialised');
    var timer = 0;
    return function() {
        console.log('delay: activated');
        var context = this, args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () {
            callback.apply(context, args);
        }, ms || 0);
    };
}

function loadContent( location, url ) {
    console.log('initiating loading of content...');
    if (location.length > 0 && url.length > 0) {
        $(location).html(`<div class="m-3">Loading...</div>`);
        $.ajax({
            url: url,
            type: "GET",
            dataType: "json",
            async: true,
            success: function (data) {
                $( location ).children().remove();
                $( location ).html(data.contents);

                loadSearchModules();

                if ( data.editor ) {
                    loadEditor('#homer-part-content', true);
                    loadUtilities();
                    bindtooltipster();
                }
            },
            error: function (data) {
                $( location ).html('');
            }
        });
    }
};


$(document).on('click', '#worldSwitcherTrigger', function( event){
    $('#worldSwitcher').toggle("fast");
});

$(document).on('click', '.dismiss-message', function( event){
    that = $(this);
    // that.closest('.ibox').hide();
    $.ajax({
        url: urls.dismissal + '?key=' + that.attr('data-message-id'),
        type: "GET",
        dataType: "json",
        async: true,
        success: function (data)
        {
            that.closest('.ibox').remove();
        }
    });
    event.preventDefault();
});

$(document).on('click', '.block-copy', function( event){
    event.preventDefault();
    that = $( this );
    url = that.attr('href');
    $.ajax({
        url: url,
        type: "GET",
        async: true,
        success: function (data)
        {
            toastr.success('Block Copied.');
        }
    });
});


$(document).on('click', 'a.delete-trigger', function( event ){
    event.preventDefault();
    $(this).hide();
    $(this).siblings('.delete-action').toggleClass('d-none');
    $(this).siblings('.delete-cancel').toggleClass('d-none');
});

$(document).on('click', 'a.delete-cancel', function( event ){
    event.preventDefault();
    $(this).siblings('.delete-action').toggleClass('d-none');
    $(this).toggleClass('d-none');
    $(this).siblings('.delete-trigger').show();
});

function saveIndicator() {
    if ( showSaveIndicator == 1 ) {
        console.log('indicating saving of items.');
        $('.save-indicator').show().delay(2000).fadeOut( 2000 );
    } else {
        console.log('indicating saving of items is disabled.');
    }

}


$(document).ready(function() {

    toggleGlobalAnnouncements();
    $(document).on('click', '.global-announcement-toggle', function(){
        console.log('Global announcements cookie assignment');
        setCookie('cookiedGlobalAnnouncements','active',0.2);
        $('.global-announcement-wrapper').toggle();
    });



    // Set state of sidebar
    // $('body').addClass( miniNavbar );
    if (typeof themeClass !== 'undefined') {
        $('.wrapper').addClass(themeClass);
    }

    var readabilityContainer = $('.homer-part-content');
    if (readabilityContainer) {
        $(".b-o-w").click(function () {
            readabilityContainer.parent().removeClass("bow");
            readabilityContainer.parent().addClass("wob");
        });

        $(".w-o-b").click(function () {
            readabilityContainer.parent().removeClass("wob");
            readabilityContainer.parent().addClass("bow");
        });

        $(".fontIncrease").click(function () {
            var fontSize = parseInt(readabilityContainer.css("font-size"));
            fontSize = fontSize + 2 + "px";
            readabilityContainer.css({'font-size': fontSize});
        });
        $(".fontDecrease").click(function () {
            var fontSize = parseInt(readabilityContainer.css("font-size"));
            fontSize = fontSize - 2 + "px";
            readabilityContainer.css({'font-size': fontSize});
        });
    }

    $('.number-transformer').each(function (index, element) {
        var text = $(element).text();
        var num = text.match(/^[0-9]*/)[0];
        if (num) {
            text = text.substring(num.length);
            var numText = numberFormatter(num, 2);
            $(element).text(numText + text);
        }
        function numberFormatter(num, digits = 1) {
            //Add more to this array as needed for Billions, etc.
            var si = [
                { value: 1, symbol: "" },
                { value: 1E3, symbol: "k" },
                { value: 1E6, symbol: "M" },
            ];
            var regex = /\.0+$|(\.[0-9]*[1-9])0+$/;
            var i;
            for (i = si.length - 1; i > 0; i--) {
                if (num >= si[i].value) {
                    break;
                }
            }
            return (num / si[i].value).toFixed(digits).replace(regex, "$1") + si[i].symbol;
        }
    });

    $('.global-super-search').keyup(
        delay(function (e) {
            console.log('Loading Global Super  Search');
            that = this;

            thatcontext = $(e.target);
            if (that.value.length >= 3) {
                $('#global-super-search-results').show();
                $('#global-super-search-results').html(`<div class="loader sk-folding-cube">
                        <div class="sk-cube1 sk-cube"></div>
                        <div class="sk-cube2 sk-cube"></div>
                        <div class="sk-cube4 sk-cube"></div>
                        <div class="sk-cube3 sk-cube"></div>
                    </div>
                `);
                $.ajax({
                    url: thatcontext.attr('href') + '?mode=global&term=' + that.value,
                    type: "GET",
                    dataType: "json",
                    async: true,
                    success: function (data) {
                        $('#global-super-search-results').show();
                        $('#global-super-search-results').html('<div class="card"><div class="card-body">' + data.contents + '</div></div>');
                    }
                });
            } else {
                $('#global-super-search-results').hide();
            }
        }, 850)
    );

    $(document).on('click', '.subscribergroups-trigger', function( event ){
        that = $(this);
        event.preventDefault();
        console.log('sub group addition triggered #1234');
        console.log(  $('.subscribergroups-results').html().length  );
        if (  that.siblings('.subscribergroups-results').html().length > 0  ) {
            that.siblings('.subscribergroups-results').html('');
        } else {
            console.log('loading groups');
            $.ajax({
                url: $(this).attr('data-url'),
                type: "GET",
                dataType: "json",
                async: true,
                success: function (data) {
                    that.siblings('.subscribergroups-results').html(data.contents);
                }
            });
        }
    });

    $(document).on('click', '.subscribergroups-add', function( event ){
        that = $(this);
        console.log('triggered subgroup add');
        event.preventDefault();
        $.ajax({
            url: $(this).attr('data-url'),
            type: "GET",
            dataType: "json",
            async: true,
            success: function (data) {
                console.log('added');
                toastr.success('Subscriber Group added.' );
                that.closest('.subscribergroups-results').siblings('.subscribergroups-list').append(data.contents);
                that.closest('.subscribergroups-results').html('');
            }
        });
    });

    $(document).on('click', '.subscribergroups-remove', function( event ){
        that = $(this);
        event.preventDefault();
        $.ajax({
            url: $(this).attr('data-url'),
            type: "GET",
            dataType: "json",
            async: true,
            success: function (data) {
                toastr.success('Subscriber Group removed from Article' );
                that.remove();
            }
        });
    });
});


(function(e){typeof define=="function"&&define.amd?define(["jquery"],e):typeof module=="object"&&module.exports?module.exports=function(t,n){return n===undefined&&(typeof window!="undefined"?n=require("jquery"):n=require("jquery")(t)),e(n),n}:e(jQuery)})(function(e){function A(t,n,i){typeof i=="string"&&(i={className:i}),this.options=E(w,e.isPlainObject(i)?i:{}),this.loadHTML(),this.wrapper=e(h.html),this.options.clickToHide&&this.wrapper.addClass(r+"-hidable"),this.wrapper.data(r,this),this.arrow=this.wrapper.find("."+r+"-arrow"),this.container=this.wrapper.find("."+r+"-container"),this.container.append(this.userContainer),t&&t.length&&(this.elementType=t.attr("type"),this.originalElement=t,this.elem=N(t),this.elem.data(r,this),this.elem.before(this.wrapper)),this.container.hide(),this.run(n)}var t=[].indexOf||function(e){for(var t=0,n=this.length;t<n;t++)if(t in this&&this[t]===e)return t;return-1},n="notify",r=n+"js",i=n+"!blank",s={t:"top",m:"middle",b:"bottom",l:"left",c:"center",r:"right"},o=["l","c","r"],u=["t","m","b"],a=["t","b","l","r"],f={t:"b",m:null,b:"t",l:"r",c:null,r:"l"},l=function(t){var n;return n=[],e.each(t.split(/\W+/),function(e,t){var r;r=t.toLowerCase().charAt(0);if(s[r])return n.push(r)}),n},c={},h={name:"core",html:'<div class="'+r+'-wrapper">\n	<div class="'+r+'-arrow"></div>\n	<div class="'+r+'-container"></div>\n</div>',css:"."+r+"-corner {\n	position: fixed;\n	margin: 5px;\n	z-index: 3000;\n}\n\n."+r+"-corner ."+r+"-wrapper,\n."+r+"-corner ."+r+"-container {\n	position: relative;\n	display: block;\n	height: inherit;\n	width: inherit;\n	margin: 3px;\n}\n\n."+r+"-wrapper {\n	z-index: 1;\n	position: absolute;\n	display: inline-block;\n	height: 0;\n	width: 0;\n}\n\n."+r+"-container {\n	display: none;\n	z-index: 1;\n	position: absolute;\n}\n\n."+r+"-hidable {\n	cursor: pointer;\n}\n\n[data-notify-text],[data-notify-html] {\n	position: relative;\n}\n\n."+r+"-arrow {\n	position: absolute;\n	z-index: 2;\n	width: 0;\n	height: 0;\n}"},p={"border-radius":["-webkit-","-moz-"]},d=function(e){return c[e]},v=function(e){if(!e)throw"Missing Style name";c[e]&&delete c[e]},m=function(t,i){if(!t)throw"Missing Style name";if(!i)throw"Missing Style definition";if(!i.html)throw"Missing Style HTML";var s=c[t];s&&s.cssElem&&(window.console&&console.warn(n+": overwriting style '"+t+"'"),c[t].cssElem.remove()),i.name=t,c[t]=i;var o="";i.classes&&e.each(i.classes,function(t,n){return o+="."+r+"-"+i.name+"-"+t+" {\n",e.each(n,function(t,n){return p[t]&&e.each(p[t],function(e,r){return o+="	"+r+t+": "+n+";\n"}),o+="	"+t+": "+n+";\n"}),o+="}\n"}),i.css&&(o+="/* styles for "+i.name+" */\n"+i.css),o&&(i.cssElem=g(o),i.cssElem.attr("id","notify-"+i.name));var u={},a=e(i.html);y("html",a,u),y("text",a,u),i.fields=u},g=function(t){var n,r,i;r=x("style"),r.attr("type","text/css"),e("head").append(r);try{r.html(t)}catch(s){r[0].styleSheet.cssText=t}return r},y=function(t,n,r){var s;return t!=="html"&&(t="text"),s="data-notify-"+t,b(n,"["+s+"]").each(function(){var n;n=e(this).attr(s),n||(n=i),r[n]=t})},b=function(e,t){return e.is(t)?e:e.find(t)},w={clickToHide:!0,autoHide:!0,autoHideDelay:5e3,arrowShow:!0,arrowSize:5,breakNewLines:!0,elementPosition:"bottom",globalPosition:"top right",style:"bootstrap",className:"error",showAnimation:"slideDown",showDuration:400,hideAnimation:"slideUp",hideDuration:200,gap:5},E=function(t,n){var r;return r=function(){},r.prototype=t,e.extend(!0,new r,n)},S=function(t){return e.extend(w,t)},x=function(t){return e("<"+t+"></"+t+">")},T={},N=function(t){var n;return t.is("[type=radio]")&&(n=t.parents("form:first").find("[type=radio]").filter(function(n,r){return e(r).attr("name")===t.attr("name")}),t=n.first()),t},C=function(e,t,n){var r,i;if(typeof n=="string")n=parseInt(n,10);else if(typeof n!="number")return;if(isNaN(n))return;return r=s[f[t.charAt(0)]],i=t,e[r]!==undefined&&(t=s[r.charAt(0)],n=-n),e[t]===undefined?e[t]=n:e[t]+=n,null},k=function(e,t,n){if(e==="l"||e==="t")return 0;if(e==="c"||e==="m")return n/2-t/2;if(e==="r"||e==="b")return n-t;throw"Invalid alignment"},L=function(e){return L.e=L.e||x("div"),L.e.text(e).html()};A.prototype.loadHTML=function(){var t;t=this.getStyle(),this.userContainer=e(t.html),this.userFields=t.fields},A.prototype.show=function(e,t){var n,r,i,s,o;r=function(n){return function(){!e&&!n.elem&&n.destroy();if(t)return t()}}(this),o=this.container.parent().parents(":hidden").length>0,i=this.container.add(this.arrow),n=[];if(o&&e)s="show";else if(o&&!e)s="hide";else if(!o&&e)s=this.options.showAnimation,n.push(this.options.showDuration);else{if(!!o||!!e)return r();s=this.options.hideAnimation,n.push(this.options.hideDuration)}return n.push(r),i[s].apply(i,n)},A.prototype.setGlobalPosition=function(){var t=this.getPosition(),n=t[0],i=t[1],o=s[n],u=s[i],a=n+"|"+i,f=T[a];if(!f||!document.body.contains(f[0])){f=T[a]=x("div");var l={};l[o]=0,u==="middle"?l.top="45%":u==="center"?l.left="45%":l[u]=0,f.css(l).addClass(r+"-corner"),e("body").append(f)}return f.prepend(this.wrapper)},A.prototype.setElementPosition=function(){var n,r,i,l,c,h,p,d,v,m,g,y,b,w,E,S,x,T,N,L,A,O,M,_,D,P,H,B,j;H=this.getPosition(),_=H[0],O=H[1],M=H[2],g=this.elem.position(),d=this.elem.outerHeight(),y=this.elem.outerWidth(),v=this.elem.innerHeight(),m=this.elem.innerWidth(),j=this.wrapper.position(),c=this.container.height(),h=this.container.width(),T=s[_],L=f[_],A=s[L],p={},p[A]=_==="b"?d:_==="r"?y:0,C(p,"top",g.top-j.top),C(p,"left",g.left-j.left),B=["top","left"];for(w=0,S=B.length;w<S;w++)D=B[w],N=parseInt(this.elem.css("margin-"+D),10),N&&C(p,D,N);b=Math.max(0,this.options.gap-(this.options.arrowShow?i:0)),C(p,A,b);if(!this.options.arrowShow)this.arrow.hide();else{i=this.options.arrowSize,r=e.extend({},p),n=this.userContainer.css("border-color")||this.userContainer.css("border-top-color")||this.userContainer.css("background-color")||"white";for(E=0,x=a.length;E<x;E++){D=a[E],P=s[D];if(D===L)continue;l=P===T?n:"transparent",r["border-"+P]=i+"px solid "+l}C(p,s[L],i),t.call(a,O)>=0&&C(r,s[O],i*2)}t.call(u,_)>=0?(C(p,"left",k(O,h,y)),r&&C(r,"left",k(O,i,m))):t.call(o,_)>=0&&(C(p,"top",k(O,c,d)),r&&C(r,"top",k(O,i,v))),this.container.is(":visible")&&(p.display="block"),this.container.removeAttr("style").css(p);if(r)return this.arrow.removeAttr("style").css(r)},A.prototype.getPosition=function(){var e,n,r,i,s,f,c,h;h=this.options.position||(this.elem?this.options.elementPosition:this.options.globalPosition),e=l(h),e.length===0&&(e[0]="b");if(n=e[0],t.call(a,n)<0)throw"Must be one of ["+a+"]";if(e.length===1||(r=e[0],t.call(u,r)>=0)&&(i=e[1],t.call(o,i)<0)||(s=e[0],t.call(o,s)>=0)&&(f=e[1],t.call(u,f)<0))e[1]=(c=e[0],t.call(o,c)>=0)?"m":"l";return e.length===2&&(e[2]=e[1]),e},A.prototype.getStyle=function(e){var t;e||(e=this.options.style),e||(e="default"),t=c[e];if(!t)throw"Missing style: "+e;return t},A.prototype.updateClasses=function(){var t,n;return t=["base"],e.isArray(this.options.className)?t=t.concat(this.options.className):this.options.className&&t.push(this.options.className),n=this.getStyle(),t=e.map(t,function(e){return r+"-"+n.name+"-"+e}).join(" "),this.userContainer.attr("class",t)},A.prototype.run=function(t,n){var r,s,o,u,a;e.isPlainObject(n)?e.extend(this.options,n):e.type(n)==="string"&&(this.options.className=n);if(this.container&&!t){this.show(!1);return}if(!this.container&&!t)return;s={},e.isPlainObject(t)?s=t:s[i]=t;for(o in s){r=s[o],u=this.userFields[o];if(!u)continue;u==="text"&&(r=L(r),this.options.breakNewLines&&(r=r.replace(/\n/g,"<br/>"))),a=o===i?"":"="+o,b(this.userContainer,"[data-notify-"+u+a+"]").html(r)}this.updateClasses(),this.elem?this.setElementPosition():this.setGlobalPosition(),this.show(!0),this.options.autoHide&&(clearTimeout(this.autohideTimer),this.autohideTimer=setTimeout(this.show.bind(this,!1),this.options.autoHideDelay))},A.prototype.destroy=function(){this.wrapper.data(r,null),this.wrapper.remove()},e[n]=function(t,r,i){return t&&t.nodeName||t.jquery?e(t)[n](r,i):(i=r,r=t,new A(null,r,i)),t},e.fn[n]=function(t,n){return e(this).each(function(){var i=N(e(this)).data(r);i&&i.destroy();var s=new A(e(this),t,n)}),this},e.extend(e[n],{defaults:S,addStyle:m,removeStyle:v,pluginOptions:w,getStyle:d,insertCSS:g}),m("bootstrap",{html:"<div>\n<span data-notify-text></span>\n</div>",classes:{base:{"font-weight":"bold",padding:"8px 15px 8px 14px","text-shadow":"0 1px 0 rgba(255, 255, 255, 0.5)","background-color":"#fcf8e3",border:"1px solid #fbeed5","border-radius":"4px","white-space":"nowrap","padding-left":"25px","background-repeat":"no-repeat","background-position":"3px 7px"},error:{color:"#B94A48","background-color":"#F2DEDE","border-color":"#EED3D7","background-image":"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAtRJREFUeNqkVc1u00AQHq+dOD+0poIQfkIjalW0SEGqRMuRnHos3DjwAH0ArlyQeANOOSMeAA5VjyBxKBQhgSpVUKKQNGloFdw4cWw2jtfMOna6JOUArDTazXi/b3dm55socPqQhFka++aHBsI8GsopRJERNFlY88FCEk9Yiwf8RhgRyaHFQpPHCDmZG5oX2ui2yilkcTT1AcDsbYC1NMAyOi7zTX2Agx7A9luAl88BauiiQ/cJaZQfIpAlngDcvZZMrl8vFPK5+XktrWlx3/ehZ5r9+t6e+WVnp1pxnNIjgBe4/6dAysQc8dsmHwPcW9C0h3fW1hans1ltwJhy0GxK7XZbUlMp5Ww2eyan6+ft/f2FAqXGK4CvQk5HueFz7D6GOZtIrK+srupdx1GRBBqNBtzc2AiMr7nPplRdKhb1q6q6zjFhrklEFOUutoQ50xcX86ZlqaZpQrfbBdu2R6/G19zX6XSgh6RX5ubyHCM8nqSID6ICrGiZjGYYxojEsiw4PDwMSL5VKsC8Yf4VRYFzMzMaxwjlJSlCyAQ9l0CW44PBADzXhe7xMdi9HtTrdYjFYkDQL0cn4Xdq2/EAE+InCnvADTf2eah4Sx9vExQjkqXT6aAERICMewd/UAp/IeYANM2joxt+q5VI+ieq2i0Wg3l6DNzHwTERPgo1ko7XBXj3vdlsT2F+UuhIhYkp7u7CarkcrFOCtR3H5JiwbAIeImjT/YQKKBtGjRFCU5IUgFRe7fF4cCNVIPMYo3VKqxwjyNAXNepuopyqnld602qVsfRpEkkz+GFL1wPj6ySXBpJtWVa5xlhpcyhBNwpZHmtX8AGgfIExo0ZpzkWVTBGiXCSEaHh62/PoR0p/vHaczxXGnj4bSo+G78lELU80h1uogBwWLf5YlsPmgDEd4M236xjm+8nm4IuE/9u+/PH2JXZfbwz4zw1WbO+SQPpXfwG/BBgAhCNZiSb/pOQAAAAASUVORK5CYII=)"},success:{color:"#468847","background-color":"#DFF0D8","border-color":"#D6E9C6","background-image":"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAutJREFUeNq0lctPE0Ecx38zu/RFS1EryqtgJFA08YCiMZIAQQ4eRG8eDGdPJiYeTIwHTfwPiAcvXIwXLwoXPaDxkWgQ6islKlJLSQWLUraPLTv7Gme32zoF9KSTfLO7v53vZ3d/M7/fIth+IO6INt2jjoA7bjHCJoAlzCRw59YwHYjBnfMPqAKWQYKjGkfCJqAF0xwZjipQtA3MxeSG87VhOOYegVrUCy7UZM9S6TLIdAamySTclZdYhFhRHloGYg7mgZv1Zzztvgud7V1tbQ2twYA34LJmF4p5dXF1KTufnE+SxeJtuCZNsLDCQU0+RyKTF27Unw101l8e6hns3u0PBalORVVVkcaEKBJDgV3+cGM4tKKmI+ohlIGnygKX00rSBfszz/n2uXv81wd6+rt1orsZCHRdr1Imk2F2Kob3hutSxW8thsd8AXNaln9D7CTfA6O+0UgkMuwVvEFFUbbAcrkcTA8+AtOk8E6KiQiDmMFSDqZItAzEVQviRkdDdaFgPp8HSZKAEAL5Qh7Sq2lIJBJwv2scUqkUnKoZgNhcDKhKg5aH+1IkcouCAdFGAQsuWZYhOjwFHQ96oagWgRoUov1T9kRBEODAwxM2QtEUl+Wp+Ln9VRo6BcMw4ErHRYjH4/B26AlQoQQTRdHWwcd9AH57+UAXddvDD37DmrBBV34WfqiXPl61g+vr6xA9zsGeM9gOdsNXkgpEtTwVvwOklXLKm6+/p5ezwk4B+j6droBs2CsGa/gNs6RIxazl4Tc25mpTgw/apPR1LYlNRFAzgsOxkyXYLIM1V8NMwyAkJSctD1eGVKiq5wWjSPdjmeTkiKvVW4f2YPHWl3GAVq6ymcyCTgovM3FzyRiDe2TaKcEKsLpJvNHjZgPNqEtyi6mZIm4SRFyLMUsONSSdkPeFtY1n0mczoY3BHTLhwPRy9/lzcziCw9ACI+yql0VLzcGAZbYSM5CCSZg1/9oc/nn7+i8N9p/8An4JMADxhH+xHfuiKwAAAABJRU5ErkJggg==)"},info:{color:"#3A87AD","background-color":"#D9EDF7","border-color":"#BCE8F1","background-image":"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3QYFAhkSsdes/QAAA8dJREFUOMvVlGtMW2UYx//POaWHXg6lLaW0ypAtw1UCgbniNOLcVOLmAjHZolOYlxmTGXVZdAnRfXQm+7SoU4mXaOaiZsEpC9FkiQs6Z6bdCnNYruM6KNBw6YWewzl9z+sHImEWv+vz7XmT95f/+3/+7wP814v+efDOV3/SoX3lHAA+6ODeUFfMfjOWMADgdk+eEKz0pF7aQdMAcOKLLjrcVMVX3xdWN29/GhYP7SvnP0cWfS8caSkfHZsPE9Fgnt02JNutQ0QYHB2dDz9/pKX8QjjuO9xUxd/66HdxTeCHZ3rojQObGQBcuNjfplkD3b19Y/6MrimSaKgSMmpGU5WevmE/swa6Oy73tQHA0Rdr2Mmv/6A1n9w9suQ7097Z9lM4FlTgTDrzZTu4StXVfpiI48rVcUDM5cmEksrFnHxfpTtU/3BFQzCQF/2bYVoNbH7zmItbSoMj40JSzmMyX5qDvriA7QdrIIpA+3cdsMpu0nXI8cV0MtKXCPZev+gCEM1S2NHPvWfP/hL+7FSr3+0p5RBEyhEN5JCKYr8XnASMT0xBNyzQGQeI8fjsGD39RMPk7se2bd5ZtTyoFYXftF6y37gx7NeUtJJOTFlAHDZLDuILU3j3+H5oOrD3yWbIztugaAzgnBKJuBLpGfQrS8wO4FZgV+c1IxaLgWVU0tMLEETCos4xMzEIv9cJXQcyagIwigDGwJgOAtHAwAhisQUjy0ORGERiELgG4iakkzo4MYAxcM5hAMi1WWG1yYCJIcMUaBkVRLdGeSU2995TLWzcUAzONJ7J6FBVBYIggMzmFbvdBV44Corg8vjhzC+EJEl8U1kJtgYrhCzgc/vvTwXKSib1paRFVRVORDAJAsw5FuTaJEhWM2SHB3mOAlhkNxwuLzeJsGwqWzf5TFNdKgtY5qHp6ZFf67Y/sAVadCaVY5YACDDb3Oi4NIjLnWMw2QthCBIsVhsUTU9tvXsjeq9+X1d75/KEs4LNOfcdf/+HthMnvwxOD0wmHaXr7ZItn2wuH2SnBzbZAbPJwpPx+VQuzcm7dgRCB57a1uBzUDRL4bfnI0RE0eaXd9W89mpjqHZnUI5Hh2l2dkZZUhOqpi2qSmpOmZ64Tuu9qlz/SEXo6MEHa3wOip46F1n7633eekV8ds8Wxjn37Wl63VVa+ej5oeEZ/82ZBETJjpJ1Rbij2D3Z/1trXUvLsblCK0XfOx0SX2kMsn9dX+d+7Kf6h8o4AIykuffjT8L20LU+w4AZd5VvEPY+XpWqLV327HR7DzXuDnD8r+ovkBehJ8i+y8YAAAAASUVORK5CYII=)"},warn:{color:"#C09853","background-color":"#FCF8E3","border-color":"#FBEED5","background-image":"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAMAAAC6V+0/AAABJlBMVEXr6eb/2oD/wi7/xjr/0mP/ykf/tQD/vBj/3o7/uQ//vyL/twebhgD/4pzX1K3z8e349vK6tHCilCWbiQymn0jGworr6dXQza3HxcKkn1vWvV/5uRfk4dXZ1bD18+/52YebiAmyr5S9mhCzrWq5t6ufjRH54aLs0oS+qD751XqPhAybhwXsujG3sm+Zk0PTwG6Shg+PhhObhwOPgQL4zV2nlyrf27uLfgCPhRHu7OmLgAafkyiWkD3l49ibiAfTs0C+lgCniwD4sgDJxqOilzDWowWFfAH08uebig6qpFHBvH/aw26FfQTQzsvy8OyEfz20r3jAvaKbhgG9q0nc2LbZxXanoUu/u5WSggCtp1anpJKdmFz/zlX/1nGJiYmuq5Dx7+sAAADoPUZSAAAAAXRSTlMAQObYZgAAAAFiS0dEAIgFHUgAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfdBgUBGhh4aah5AAAAlklEQVQY02NgoBIIE8EUcwn1FkIXM1Tj5dDUQhPU502Mi7XXQxGz5uVIjGOJUUUW81HnYEyMi2HVcUOICQZzMMYmxrEyMylJwgUt5BljWRLjmJm4pI1hYp5SQLGYxDgmLnZOVxuooClIDKgXKMbN5ggV1ACLJcaBxNgcoiGCBiZwdWxOETBDrTyEFey0jYJ4eHjMGWgEAIpRFRCUt08qAAAAAElFTkSuQmCC)"}}}),e(function(){g(h.css).attr("id","core-notify"),e(document).on("click","."+r+"-hidable",function(t){e(this).trigger("notify-hide")}),e(document).on("notify-hide","."+r+"-wrapper",function(t){var n=e(this).data(r);n&&n.show(!1)})})})
// Image

$( document ).ready(function() {
    $('#super-image-button-menu').hide();
});

$(document).on('click', '#super-image-button', function(){
    $('#super-image-button-menu').toggle();
});


// Menu

$( document ).ready(function() {
    $('#super-button-menu').hide();
});

$(document).on('click', '#super-button', function(){
    $('#super-button-menu').toggle();
});


// Article

$( document ).ready(function() {
    $('#super-article-button-menu').hide();
});

$(document).on('click', '#super-article-button', function(){
	if ( $('#super-article-button-menu').css('display') == 'none' ) {
		quickMenuLoader( $('#super-article-button-menu') );
	    $.ajax({
	        url: $(this).attr('data-url'),
	        type: "POST",
	        dataType: "json",
	        async: true,
	        success: function (data)
	        {
	            quickMenuPrepare( data );
	            $('.quick-container-article').show( data );
	        }
	    });
	}
    $('#super-article-button-menu').toggle();
});


$(document).on('click','.quick-container-change', function( event) {
	console.log( $(this).attr('id') + ' clicked.');
	if ( $('.quick-container-alert')[0] ) {
		$('.quick-container-alert').remove();
	}
	$('.quick-container').hide();
	switch ( $(this).attr('id') ) {
		case 'quick-container-change-article':  
			$('.quick-container-article').show();
			break;
		case 'quick-container-change-category':
			$('.quick-container-category').show();
			break;
		case 'quick-container-change-event':
			$('.quick-container-event').show();
			break;
		case 'quick-container-change-note':
			$('.quick-container-note').show();
			break;
		case 'quick-container-change-secret':
			$('.quick-container-secret').show();
			break;
		case 'quick-container-change-todo':
			$('.quick-container-todo').show();
			break;
	}	

});

$(document).on('click','#super-article-submit', function( event ){
	quickMenuLoader( $(this ));
	if ( $('#super-article-draft').is(":checked") ) {
		var draftIsChecked = 1;
		console.log('it is checked');
	} else {
		var draftIsChecked = 0;
		console.log('it is NOT  checked');
	}
	if ( $('#super-article-title').val().length > 0  ) {
		console.log('saving quick article (super-button.js)');
		$.ajax({
			url: $(this).attr('data-url'),
			type: "POST",
			data: {
				'title': $('#super-article-title').val(),
				'template': $('#super-article-template').val(),
				'vignette': $('#super-article-vignette').val(),
				'seeded': $('#super-article-seeded').val(),
				'state': $('#super-article-state').val(),
				'categoryId': $('#super-article-categoryId').val(),
				'isDraft': draftIsChecked,
				'tags': $('#super-article-tags').val(),
			},
			dataType: "json",
			title: $('#super-article-title').val(),
			template: $('#super-article-template').val(),
			async: true,
			success: function (data) {
				quickMenuPrepare(data);

				var dataString = '&title=' + this.title + '&template=' + this.template + '&importance=1';

				$.ajax({
					url: '/world/todo/new',
					type: "GET",
					data: dataString,
					dataType: "json",
					async: true,
					success: function (data) {
						todoListRefresh();
					}
				});
			}
		});
	} else {
		alert('You might want to add a title to this! :) ')
	}
});

$(document).on('click','#super-category-submit', function( event ){
	quickMenuLoader( $(this ));
	$.ajax({
	    url: $(this).attr('data-url'),
	    type: "GET",
	    data: {
	    	'super-category-title': $('#super-category-title').val(), 
	    	'super-category-categoryId': $('#super-category-categoryId').val(), 
	    	'super-category-excerpt': $('#super-category-excerpt').val(),
    	},
	    dataType: "json",
	    async: true,
	    success: function (data)
	    {
	    	quickMenuPrepare( data );
	    }
	});	
});

$(document).on('click','#super-event-submit', function( event ){
	quickMenuLoader( $(this ));
	$.ajax({
	    url: $(this).attr('data-url'),
	    type: "GET",
	    data: {
	    	'super-event-title': $('#super-event-title').val(), 
	    	'super-event-timeline': $('#super-event-timeline').val(), 
	    	'super-event-year': $('#super-event-year').val(), 
	    	'super-event-month': $('#super-event-month').val(), 
	    	'super-event-day': $('#super-event-day').val(), 
	    	'super-event-significance': $('#super-event-significance').val(), 
	    	'super-event-category': $('#super-event-category').val(), 
	    	'super-event-content': $('#super-event-content').val(),  
	    	'super-event-state': $('#super-event-state').val(),  
	    	'super-event-subscribergroup': $('#super-event-subscribergroup').val(), 
    	},
	    dataType: "json",
	    async: true,
	    success: function (data)
	    {
	    	quickMenuPrepare( data );
	    }
	});	
});

$(document).on('click','#super-note-submit', function( event ){
	quickMenuLoader( $(this ));
	$.ajax({
	    url: $(this).attr('data-url'),
	    type: "GET",
	    data: {
	    	'super-note-title': $('#super-note-title').val(), 
	    	'super-note-tags': $('#super-note-tags').val(), 
	    	'super-note-content': $('#super-note-content').val(),
	    	'super-note-sectionId': $('#super-note-sectionId').val(),
    	},
	    dataType: "json",
	    async: true,
	    success: function (data)
	    {
	    	quickMenuPrepare( data );
	    }
	});	
});


$(document).on('click','#super-secret-submit', function( event ){
	quickMenuLoader( $(this ));
	$.ajax({
	    url: $(this).attr('data-url'),
	    type: "GET",
	    data: {
	    	'super-secret-title': $('#super-secret-title').val(), 
	    	'super-secret-subscribergroup': $('#super-secret-subscribergroup').val(), 
	    	'super-secret-content': $('#super-secret-content').val(),
    	},
	    dataType: "json",
	    async: true,
	    success: function (data)
	    {
	    	quickMenuPrepare( data );
	    }
	});	
});


$(document).on('click','#super-todo-submit', function( event ){
	quickMenuLoader( $(this ));
	$.ajax({
	    url: $(this).attr('data-url'),
	    type: "GET",
	    data: {
	    	'super-todo-title': $('#super-todo-title').val(), 
	    	'super-todo-task': $('#super-todo-task').val(), 
	    	'super-todo-template': $('#super-todo-template').val(),
    	},
	    dataType: "json",
	    async: true,
	    success: function (data)
	    {
	    	quickMenuPrepare( data );
	    }
	});	
});



function quickMenuLoader( element ) {
	element.html('<div class="fa-2x text-center"><i class="fas fa-spinner fa-spin"></i></div><div class="p-1 text-center"><em>Loading...</em></div>');
}

function quickMenuPrepare( data ) {
    $('#super-article-button-menu').html( data.html );
    bindselect2('#super-article-categoryId','Select Category');
    bindselect2('#super-category-categoryId','Select Parent');

    bindselect2('#super-article-template','Select Template');
    bindselect2('#super-todo-template','Select Template');

    bindselect2('#super-secret-subscribergroup','Select Subscriber Group');
    bindselect2('#super-event-subscribergroup','Select Subscriber Group');

    bindselect2('#super-event-timeline','Select Timeline');
    bindselect2('#super-event-significance','Select Event Significance');
    bindselect2('#super-event-category','Select Event Type');

    bindselect2('#super-article-state','Select Template');
    bindselect2('#super-event-state','Select Template');


    bindselect2('#super-note-sectionId','Select Notebook Section');
    $('.quick-container').hide();
}
$( document ).ready(function() {

	$(document).on('click', '.css-palette-trigger', function( event){
		$('#hidden-sidebar').toggle();
		$('#hidden-sidebar').toggleClass('sidebar-panel-open');
		$(this).toggleClass('css-palette-trigger-pushed');
	});

	$(document).on('change', '#theme-selector', function( event){

		var attr =$('option:selected', this).attr('data-identifier');


		if ( typeof attr !== 'undefined' && attr !== false ) {
			$('#world-theme').attr('href','/themes/'+ $('option:selected', this).attr('data-identifier') +'/css/style.css');
		} else {
			$('#world-theme').attr('href',' ');
		}
		$('#world-theme').append('<style>#full-layout div.user-css-viewer { background: none; }</style>');
	});


	$('#world-css-editor').keyup(function() {
	    var keyed = $(this).val();
	    $("#world-css").html(keyed);
	});

	

	$(document).on('click', '#css-palette-save', function( event){
		that = $( this );
	    $.ajax({
	        url: '/api/world/'+ that.attr('data-world-id') +'/update',
	        type: "POST",
	        data: {'css': $('#world-css-editor').val(), 'theme': $('#theme-selector').val() },
	        dataType: "json",
	        async: true,
	        success: function (data)
	        {
                $.notify("Saved", {
                    globalPosition: 'top <right></right>',
                    autoHide: false,
                    className: 'roller-success',
                    showAnimation: 'slideDown'
                });
	        }
	    });
	    event.preventDefault();
	});

});
$( document ).ready(function() {

    $(document).on('click', '.world-navigation-palette-trigger-inactive', function( event){
        $('#world-navigation-sidebar').show();
        $('#world-navigation-sidebar').addClass('sidebar-panel-open');
        // $('#world-navigation-sidebar').addClass('col-sm-2');
        // $('#visual-container').removeClass('col-sm-12');
        // $('#visual-container').addClass('col-sm-10');
        $( this ).addClass('world-navigation-palette-trigger-active');
        $( this ).removeClass('world-navigation-palette-trigger-inactive');
    });

    $(document).on('click', '.world-navigation-palette-trigger-active', function( event){
        $('#world-navigation-sidebar').hide();
        $('#world-navigation-sidebar').removeClass('sidebar-panel-open');
        // $('#world-navigation-sidebar').removeClass('col-sm-2');
        // $('#visual-container').addClass('col-sm-12');
        // $('#visual-container').removeClass('col-sm-10');
        $( this ).addClass('world-navigation-palette-trigger-inactive');
        $( this ).removeClass('world-navigation-palette-trigger-active');
    });


});
function bindTrackable() {
    console.log('trackable events bound');
    $(".trackable").submit(function(event) {

        console.log('saving trackable data');

        event.preventDefault(); 

    	that = $(this);
        url = '/world/block/' + that.attr('data-block') +'/trackable';

        $.ajax({
            url: url,
            type: "POST",
            dataType: "json",
            data: {
                "data": that.serialize(),
            },
            success: function (response_data) {
                reloadSheet();
            },
            error: function (xhr, ajaxOptions, thrownError) {
                console.log(xhr.status," - ",thrownError);
            }
        });

    });
}

function reloadSheet()
{
    if ( $('.ajax-sheet-container').length ) {
        url_sheet = '/sheet/' + $('.ajax-sheet-container').attr('block-id') + '/render';

        console.log("reaching for sheet reload");
        $.ajax({
            url: url_sheet,
            type: "GET",
            dataType: "html",
            async: true,
            success: function (data_sheet) {
                //console.log("request content: " + data_sheet);
                $('.ajax-sheet-container').html(data_sheet);
                console.log("Sheet Reloader: Success");
                binddiceroller();
                console.log("Sheet Reloader: Dice Roller bound.");
            },
            error: function (xhr, ajaxOptions, thrownError) {
                console.log(xhr.status, " - ", thrownError);
            }
        });
    }
}

$(document).ready(function() {
    reloadSheet();
});
/*! tooltipster v4.2.6 */!function(a,b){"function"==typeof define&&define.amd?define(["jquery"],function(a){return b(a)}):"object"==typeof exports?module.exports=b(require("jquery")):b(jQuery)}(this,function(a){function b(a){this.$container,this.constraints=null,this.__$tooltip,this.__init(a)}function c(b,c){var d=!0;return a.each(b,function(a,e){return void 0===c[a]||b[a]!==c[a]?(d=!1,!1):void 0}),d}function d(b){var c=b.attr("id"),d=c?h.window.document.getElementById(c):null;return d?d===b[0]:a.contains(h.window.document.body,b[0])}function e(){if(!g)return!1;var a=g.document.body||g.document.documentElement,b=a.style,c="transition",d=["Moz","Webkit","Khtml","O","ms"];if("string"==typeof b[c])return!0;c=c.charAt(0).toUpperCase()+c.substr(1);for(var e=0;e<d.length;e++)if("string"==typeof b[d[e]+c])return!0;return!1}var f={animation:"fade",animationDuration:350,content:null,contentAsHTML:!1,contentCloning:!1,debug:!0,delay:300,delayTouch:[300,500],functionInit:null,functionBefore:null,functionReady:null,functionAfter:null,functionFormat:null,IEmin:6,interactive:!1,multiple:!1,parent:null,plugins:["sideTip"],repositionOnScroll:!1,restoration:"none",selfDestruction:!0,theme:[],timer:0,trackerInterval:500,trackOrigin:!1,trackTooltip:!1,trigger:"hover",triggerClose:{click:!1,mouseleave:!1,originClick:!1,scroll:!1,tap:!1,touchleave:!1},triggerOpen:{click:!1,mouseenter:!1,tap:!1,touchstart:!1},updateAnimation:"rotate",zIndex:9999999},g="undefined"!=typeof window?window:null,h={hasTouchCapability:!(!g||!("ontouchstart"in g||g.DocumentTouch&&g.document instanceof g.DocumentTouch||g.navigator.maxTouchPoints)),hasTransitions:e(),IE:!1,semVer:"4.2.6",window:g},i=function(){this.__$emitterPrivate=a({}),this.__$emitterPublic=a({}),this.__instancesLatestArr=[],this.__plugins={},this._env=h};i.prototype={__bridge:function(b,c,d){if(!c[d]){var e=function(){};e.prototype=b;var g=new e;g.__init&&g.__init(c),a.each(b,function(a,b){0!=a.indexOf("__")&&(c[a]?f.debug&&console.log("The "+a+" method of the "+d+" plugin conflicts with another plugin or native methods"):(c[a]=function(){return g[a].apply(g,Array.prototype.slice.apply(arguments))},c[a].bridged=g))}),c[d]=g}return this},__setWindow:function(a){return h.window=a,this},_getRuler:function(a){return new b(a)},_off:function(){return this.__$emitterPrivate.off.apply(this.__$emitterPrivate,Array.prototype.slice.apply(arguments)),this},_on:function(){return this.__$emitterPrivate.on.apply(this.__$emitterPrivate,Array.prototype.slice.apply(arguments)),this},_one:function(){return this.__$emitterPrivate.one.apply(this.__$emitterPrivate,Array.prototype.slice.apply(arguments)),this},_plugin:function(b){var c=this;if("string"==typeof b){var d=b,e=null;return d.indexOf(".")>0?e=c.__plugins[d]:a.each(c.__plugins,function(a,b){return b.name.substring(b.name.length-d.length-1)=="."+d?(e=b,!1):void 0}),e}if(b.name.indexOf(".")<0)throw new Error("Plugins must be namespaced");return c.__plugins[b.name]=b,b.core&&c.__bridge(b.core,c,b.name),this},_trigger:function(){var a=Array.prototype.slice.apply(arguments);return"string"==typeof a[0]&&(a[0]={type:a[0]}),this.__$emitterPrivate.trigger.apply(this.__$emitterPrivate,a),this.__$emitterPublic.trigger.apply(this.__$emitterPublic,a),this},instances:function(b){var c=[],d=b||".tooltipstered";return a(d).each(function(){var b=a(this),d=b.data("tooltipster-ns");d&&a.each(d,function(a,d){c.push(b.data(d))})}),c},instancesLatest:function(){return this.__instancesLatestArr},off:function(){return this.__$emitterPublic.off.apply(this.__$emitterPublic,Array.prototype.slice.apply(arguments)),this},on:function(){return this.__$emitterPublic.on.apply(this.__$emitterPublic,Array.prototype.slice.apply(arguments)),this},one:function(){return this.__$emitterPublic.one.apply(this.__$emitterPublic,Array.prototype.slice.apply(arguments)),this},origins:function(b){var c=b?b+" ":"";return a(c+".tooltipstered").toArray()},setDefaults:function(b){return a.extend(f,b),this},triggerHandler:function(){return this.__$emitterPublic.triggerHandler.apply(this.__$emitterPublic,Array.prototype.slice.apply(arguments)),this}},a.tooltipster=new i,a.Tooltipster=function(b,c){this.__callbacks={close:[],open:[]},this.__closingTime,this.__Content,this.__contentBcr,this.__destroyed=!1,this.__$emitterPrivate=a({}),this.__$emitterPublic=a({}),this.__enabled=!0,this.__garbageCollector,this.__Geometry,this.__lastPosition,this.__namespace="tooltipster-"+Math.round(1e6*Math.random()),this.__options,this.__$originParents,this.__pointerIsOverOrigin=!1,this.__previousThemes=[],this.__state="closed",this.__timeouts={close:[],open:null},this.__touchEvents=[],this.__tracker=null,this._$origin,this._$tooltip,this.__init(b,c)},a.Tooltipster.prototype={__init:function(b,c){var d=this;if(d._$origin=a(b),d.__options=a.extend(!0,{},f,c),d.__optionsFormat(),!h.IE||h.IE>=d.__options.IEmin){var e=null;if(void 0===d._$origin.data("tooltipster-initialTitle")&&(e=d._$origin.attr("title"),void 0===e&&(e=null),d._$origin.data("tooltipster-initialTitle",e)),null!==d.__options.content)d.__contentSet(d.__options.content);else{var g,i=d._$origin.attr("data-tooltip-content");i&&(g=a(i)),g&&g[0]?d.__contentSet(g.first()):d.__contentSet(e)}d._$origin.removeAttr("title").addClass("tooltipstered"),d.__prepareOrigin(),d.__prepareGC(),a.each(d.__options.plugins,function(a,b){d._plug(b)}),h.hasTouchCapability&&a(h.window.document.body).on("touchmove."+d.__namespace+"-triggerOpen",function(a){d._touchRecordEvent(a)}),d._on("created",function(){d.__prepareTooltip()})._on("repositioned",function(a){d.__lastPosition=a.position})}else d.__options.disabled=!0},__contentInsert:function(){var a=this,b=a._$tooltip.find(".tooltipster-content"),c=a.__Content,d=function(a){c=a};return a._trigger({type:"format",content:a.__Content,format:d}),a.__options.functionFormat&&(c=a.__options.functionFormat.call(a,a,{origin:a._$origin[0]},a.__Content)),"string"!=typeof c||a.__options.contentAsHTML?b.empty().append(c):b.text(c),a},__contentSet:function(b){return b instanceof a&&this.__options.contentCloning&&(b=b.clone(!0)),this.__Content=b,this._trigger({type:"updated",content:b}),this},__destroyError:function(){throw new Error("This tooltip has been destroyed and cannot execute your method call.")},__geometry:function(){var b=this,c=b._$origin,d=b._$origin.is("area");if(d){var e=b._$origin.parent().attr("name");c=a('img[usemap="#'+e+'"]')}var f=c[0].getBoundingClientRect(),g=a(h.window.document),i=a(h.window),j=c,k={available:{document:null,window:null},document:{size:{height:g.height(),width:g.width()}},window:{scroll:{left:h.window.scrollX||h.window.document.documentElement.scrollLeft,top:h.window.scrollY||h.window.document.documentElement.scrollTop},size:{height:i.height(),width:i.width()}},origin:{fixedLineage:!1,offset:{},size:{height:f.bottom-f.top,width:f.right-f.left},usemapImage:d?c[0]:null,windowOffset:{bottom:f.bottom,left:f.left,right:f.right,top:f.top}}};if(d){var l=b._$origin.attr("shape"),m=b._$origin.attr("coords");if(m&&(m=m.split(","),a.map(m,function(a,b){m[b]=parseInt(a)})),"default"!=l)switch(l){case"circle":var n=m[0],o=m[1],p=m[2],q=o-p,r=n-p;k.origin.size.height=2*p,k.origin.size.width=k.origin.size.height,k.origin.windowOffset.left+=r,k.origin.windowOffset.top+=q;break;case"rect":var s=m[0],t=m[1],u=m[2],v=m[3];k.origin.size.height=v-t,k.origin.size.width=u-s,k.origin.windowOffset.left+=s,k.origin.windowOffset.top+=t;break;case"poly":for(var w=0,x=0,y=0,z=0,A="even",B=0;B<m.length;B++){var C=m[B];"even"==A?(C>y&&(y=C,0===B&&(w=y)),w>C&&(w=C),A="odd"):(C>z&&(z=C,1==B&&(x=z)),x>C&&(x=C),A="even")}k.origin.size.height=z-x,k.origin.size.width=y-w,k.origin.windowOffset.left+=w,k.origin.windowOffset.top+=x}}var D=function(a){k.origin.size.height=a.height,k.origin.windowOffset.left=a.left,k.origin.windowOffset.top=a.top,k.origin.size.width=a.width};for(b._trigger({type:"geometry",edit:D,geometry:{height:k.origin.size.height,left:k.origin.windowOffset.left,top:k.origin.windowOffset.top,width:k.origin.size.width}}),k.origin.windowOffset.right=k.origin.windowOffset.left+k.origin.size.width,k.origin.windowOffset.bottom=k.origin.windowOffset.top+k.origin.size.height,k.origin.offset.left=k.origin.windowOffset.left+k.window.scroll.left,k.origin.offset.top=k.origin.windowOffset.top+k.window.scroll.top,k.origin.offset.bottom=k.origin.offset.top+k.origin.size.height,k.origin.offset.right=k.origin.offset.left+k.origin.size.width,k.available.document={bottom:{height:k.document.size.height-k.origin.offset.bottom,width:k.document.size.width},left:{height:k.document.size.height,width:k.origin.offset.left},right:{height:k.document.size.height,width:k.document.size.width-k.origin.offset.right},top:{height:k.origin.offset.top,width:k.document.size.width}},k.available.window={bottom:{height:Math.max(k.window.size.height-Math.max(k.origin.windowOffset.bottom,0),0),width:k.window.size.width},left:{height:k.window.size.height,width:Math.max(k.origin.windowOffset.left,0)},right:{height:k.window.size.height,width:Math.max(k.window.size.width-Math.max(k.origin.windowOffset.right,0),0)},top:{height:Math.max(k.origin.windowOffset.top,0),width:k.window.size.width}};"html"!=j[0].tagName.toLowerCase();){if("fixed"==j.css("position")){k.origin.fixedLineage=!0;break}j=j.parent()}return k},__optionsFormat:function(){return"number"==typeof this.__options.animationDuration&&(this.__options.animationDuration=[this.__options.animationDuration,this.__options.animationDuration]),"number"==typeof this.__options.delay&&(this.__options.delay=[this.__options.delay,this.__options.delay]),"number"==typeof this.__options.delayTouch&&(this.__options.delayTouch=[this.__options.delayTouch,this.__options.delayTouch]),"string"==typeof this.__options.theme&&(this.__options.theme=[this.__options.theme]),null===this.__options.parent?this.__options.parent=a(h.window.document.body):"string"==typeof this.__options.parent&&(this.__options.parent=a(this.__options.parent)),"hover"==this.__options.trigger?(this.__options.triggerOpen={mouseenter:!0,touchstart:!0},this.__options.triggerClose={mouseleave:!0,originClick:!0,touchleave:!0}):"click"==this.__options.trigger&&(this.__options.triggerOpen={click:!0,tap:!0},this.__options.triggerClose={click:!0,tap:!0}),this._trigger("options"),this},__prepareGC:function(){var b=this;return b.__options.selfDestruction?b.__garbageCollector=setInterval(function(){var c=(new Date).getTime();b.__touchEvents=a.grep(b.__touchEvents,function(a,b){return c-a.time>6e4}),d(b._$origin)||b.close(function(){b.destroy()})},2e4):clearInterval(b.__garbageCollector),b},__prepareOrigin:function(){var a=this;if(a._$origin.off("."+a.__namespace+"-triggerOpen"),h.hasTouchCapability&&a._$origin.on("touchstart."+a.__namespace+"-triggerOpen touchend."+a.__namespace+"-triggerOpen touchcancel."+a.__namespace+"-triggerOpen",function(b){a._touchRecordEvent(b)}),a.__options.triggerOpen.click||a.__options.triggerOpen.tap&&h.hasTouchCapability){var b="";a.__options.triggerOpen.click&&(b+="click."+a.__namespace+"-triggerOpen "),a.__options.triggerOpen.tap&&h.hasTouchCapability&&(b+="touchend."+a.__namespace+"-triggerOpen"),a._$origin.on(b,function(b){a._touchIsMeaningfulEvent(b)&&a._open(b)})}if(a.__options.triggerOpen.mouseenter||a.__options.triggerOpen.touchstart&&h.hasTouchCapability){var b="";a.__options.triggerOpen.mouseenter&&(b+="mouseenter."+a.__namespace+"-triggerOpen "),a.__options.triggerOpen.touchstart&&h.hasTouchCapability&&(b+="touchstart."+a.__namespace+"-triggerOpen"),a._$origin.on(b,function(b){!a._touchIsTouchEvent(b)&&a._touchIsEmulatedEvent(b)||(a.__pointerIsOverOrigin=!0,a._openShortly(b))})}if(a.__options.triggerClose.mouseleave||a.__options.triggerClose.touchleave&&h.hasTouchCapability){var b="";a.__options.triggerClose.mouseleave&&(b+="mouseleave."+a.__namespace+"-triggerOpen "),a.__options.triggerClose.touchleave&&h.hasTouchCapability&&(b+="touchend."+a.__namespace+"-triggerOpen touchcancel."+a.__namespace+"-triggerOpen"),a._$origin.on(b,function(b){a._touchIsMeaningfulEvent(b)&&(a.__pointerIsOverOrigin=!1)})}return a},__prepareTooltip:function(){var b=this,c=b.__options.interactive?"auto":"";return b._$tooltip.attr("id",b.__namespace).css({"pointer-events":c,zIndex:b.__options.zIndex}),a.each(b.__previousThemes,function(a,c){b._$tooltip.removeClass(c)}),a.each(b.__options.theme,function(a,c){b._$tooltip.addClass(c)}),b.__previousThemes=a.merge([],b.__options.theme),b},__scrollHandler:function(b){var c=this;if(c.__options.triggerClose.scroll)c._close(b);else if(d(c._$origin)&&d(c._$tooltip)){var e=null;if(b.target===h.window.document)c.__Geometry.origin.fixedLineage||c.__options.repositionOnScroll&&c.reposition(b);else{e=c.__geometry();var f=!1;if("fixed"!=c._$origin.css("position")&&c.__$originParents.each(function(b,c){var d=a(c),g=d.css("overflow-x"),h=d.css("overflow-y");if("visible"!=g||"visible"!=h){var i=c.getBoundingClientRect();if("visible"!=g&&(e.origin.windowOffset.left<i.left||e.origin.windowOffset.right>i.right))return f=!0,!1;if("visible"!=h&&(e.origin.windowOffset.top<i.top||e.origin.windowOffset.bottom>i.bottom))return f=!0,!1}return"fixed"==d.css("position")?!1:void 0}),f)c._$tooltip.css("visibility","hidden");else if(c._$tooltip.css("visibility","visible"),c.__options.repositionOnScroll)c.reposition(b);else{var g=e.origin.offset.left-c.__Geometry.origin.offset.left,i=e.origin.offset.top-c.__Geometry.origin.offset.top;c._$tooltip.css({left:c.__lastPosition.coord.left+g,top:c.__lastPosition.coord.top+i})}}c._trigger({type:"scroll",event:b,geo:e})}return c},__stateSet:function(a){return this.__state=a,this._trigger({type:"state",state:a}),this},__timeoutsClear:function(){return clearTimeout(this.__timeouts.open),this.__timeouts.open=null,a.each(this.__timeouts.close,function(a,b){clearTimeout(b)}),this.__timeouts.close=[],this},__trackerStart:function(){var a=this,b=a._$tooltip.find(".tooltipster-content");return a.__options.trackTooltip&&(a.__contentBcr=b[0].getBoundingClientRect()),a.__tracker=setInterval(function(){if(d(a._$origin)&&d(a._$tooltip)){if(a.__options.trackOrigin){var e=a.__geometry(),f=!1;c(e.origin.size,a.__Geometry.origin.size)&&(a.__Geometry.origin.fixedLineage?c(e.origin.windowOffset,a.__Geometry.origin.windowOffset)&&(f=!0):c(e.origin.offset,a.__Geometry.origin.offset)&&(f=!0)),f||(a.__options.triggerClose.mouseleave?a._close():a.reposition())}if(a.__options.trackTooltip){var g=b[0].getBoundingClientRect();g.height===a.__contentBcr.height&&g.width===a.__contentBcr.width||(a.reposition(),a.__contentBcr=g)}}else a._close()},a.__options.trackerInterval),a},_close:function(b,c,d){var e=this,f=!0;if(e._trigger({type:"close",event:b,stop:function(){f=!1}}),f||d){c&&e.__callbacks.close.push(c),e.__callbacks.open=[],e.__timeoutsClear();var g=function(){a.each(e.__callbacks.close,function(a,c){c.call(e,e,{event:b,origin:e._$origin[0]})}),e.__callbacks.close=[]};if("closed"!=e.__state){var i=!0,j=new Date,k=j.getTime(),l=k+e.__options.animationDuration[1];if("disappearing"==e.__state&&l>e.__closingTime&&e.__options.animationDuration[1]>0&&(i=!1),i){e.__closingTime=l,"disappearing"!=e.__state&&e.__stateSet("disappearing");var m=function(){clearInterval(e.__tracker),e._trigger({type:"closing",event:b}),e._$tooltip.off("."+e.__namespace+"-triggerClose").removeClass("tooltipster-dying"),a(h.window).off("."+e.__namespace+"-triggerClose"),e.__$originParents.each(function(b,c){a(c).off("scroll."+e.__namespace+"-triggerClose")}),e.__$originParents=null,a(h.window.document.body).off("."+e.__namespace+"-triggerClose"),e._$origin.off("."+e.__namespace+"-triggerClose"),e._off("dismissable"),e.__stateSet("closed"),e._trigger({type:"after",event:b}),e.__options.functionAfter&&e.__options.functionAfter.call(e,e,{event:b,origin:e._$origin[0]}),g()};h.hasTransitions?(e._$tooltip.css({"-moz-animation-duration":e.__options.animationDuration[1]+"ms","-ms-animation-duration":e.__options.animationDuration[1]+"ms","-o-animation-duration":e.__options.animationDuration[1]+"ms","-webkit-animation-duration":e.__options.animationDuration[1]+"ms","animation-duration":e.__options.animationDuration[1]+"ms","transition-duration":e.__options.animationDuration[1]+"ms"}),e._$tooltip.clearQueue().removeClass("tooltipster-show").addClass("tooltipster-dying"),e.__options.animationDuration[1]>0&&e._$tooltip.delay(e.__options.animationDuration[1]),e._$tooltip.queue(m)):e._$tooltip.stop().fadeOut(e.__options.animationDuration[1],m)}}else g()}return e},_off:function(){return this.__$emitterPrivate.off.apply(this.__$emitterPrivate,Array.prototype.slice.apply(arguments)),this},_on:function(){return this.__$emitterPrivate.on.apply(this.__$emitterPrivate,Array.prototype.slice.apply(arguments)),this},_one:function(){return this.__$emitterPrivate.one.apply(this.__$emitterPrivate,Array.prototype.slice.apply(arguments)),this},_open:function(b,c){var e=this;if(!e.__destroying&&d(e._$origin)&&e.__enabled){var f=!0;if("closed"==e.__state&&(e._trigger({type:"before",event:b,stop:function(){f=!1}}),f&&e.__options.functionBefore&&(f=e.__options.functionBefore.call(e,e,{event:b,origin:e._$origin[0]}))),f!==!1&&null!==e.__Content){c&&e.__callbacks.open.push(c),e.__callbacks.close=[],e.__timeoutsClear();var g,i=function(){"stable"!=e.__state&&e.__stateSet("stable"),a.each(e.__callbacks.open,function(a,b){b.call(e,e,{origin:e._$origin[0],tooltip:e._$tooltip[0]})}),e.__callbacks.open=[]};if("closed"!==e.__state)g=0,"disappearing"===e.__state?(e.__stateSet("appearing"),h.hasTransitions?(e._$tooltip.clearQueue().removeClass("tooltipster-dying").addClass("tooltipster-show"),e.__options.animationDuration[0]>0&&e._$tooltip.delay(e.__options.animationDuration[0]),e._$tooltip.queue(i)):e._$tooltip.stop().fadeIn(i)):"stable"==e.__state&&i();else{if(e.__stateSet("appearing"),g=e.__options.animationDuration[0],e.__contentInsert(),e.reposition(b,!0),h.hasTransitions?(e._$tooltip.addClass("tooltipster-"+e.__options.animation).addClass("tooltipster-initial").css({"-moz-animation-duration":e.__options.animationDuration[0]+"ms","-ms-animation-duration":e.__options.animationDuration[0]+"ms","-o-animation-duration":e.__options.animationDuration[0]+"ms","-webkit-animation-duration":e.__options.animationDuration[0]+"ms","animation-duration":e.__options.animationDuration[0]+"ms","transition-duration":e.__options.animationDuration[0]+"ms"}),setTimeout(function(){"closed"!=e.__state&&(e._$tooltip.addClass("tooltipster-show").removeClass("tooltipster-initial"),e.__options.animationDuration[0]>0&&e._$tooltip.delay(e.__options.animationDuration[0]),e._$tooltip.queue(i))},0)):e._$tooltip.css("display","none").fadeIn(e.__options.animationDuration[0],i),e.__trackerStart(),a(h.window).on("resize."+e.__namespace+"-triggerClose",function(b){var c=a(document.activeElement);(c.is("input")||c.is("textarea"))&&a.contains(e._$tooltip[0],c[0])||e.reposition(b)}).on("scroll."+e.__namespace+"-triggerClose",function(a){e.__scrollHandler(a)}),e.__$originParents=e._$origin.parents(),e.__$originParents.each(function(b,c){a(c).on("scroll."+e.__namespace+"-triggerClose",function(a){e.__scrollHandler(a)})}),e.__options.triggerClose.mouseleave||e.__options.triggerClose.touchleave&&h.hasTouchCapability){e._on("dismissable",function(a){a.dismissable?a.delay?(m=setTimeout(function(){e._close(a.event)},a.delay),e.__timeouts.close.push(m)):e._close(a):clearTimeout(m)});var j=e._$origin,k="",l="",m=null;e.__options.interactive&&(j=j.add(e._$tooltip)),e.__options.triggerClose.mouseleave&&(k+="mouseenter."+e.__namespace+"-triggerClose ",l+="mouseleave."+e.__namespace+"-triggerClose "),e.__options.triggerClose.touchleave&&h.hasTouchCapability&&(k+="touchstart."+e.__namespace+"-triggerClose",l+="touchend."+e.__namespace+"-triggerClose touchcancel."+e.__namespace+"-triggerClose"),j.on(l,function(a){if(e._touchIsTouchEvent(a)||!e._touchIsEmulatedEvent(a)){var b="mouseleave"==a.type?e.__options.delay:e.__options.delayTouch;e._trigger({delay:b[1],dismissable:!0,event:a,type:"dismissable"})}}).on(k,function(a){!e._touchIsTouchEvent(a)&&e._touchIsEmulatedEvent(a)||e._trigger({dismissable:!1,event:a,type:"dismissable"})})}e.__options.triggerClose.originClick&&e._$origin.on("click."+e.__namespace+"-triggerClose",function(a){e._touchIsTouchEvent(a)||e._touchIsEmulatedEvent(a)||e._close(a)}),(e.__options.triggerClose.click||e.__options.triggerClose.tap&&h.hasTouchCapability)&&setTimeout(function(){if("closed"!=e.__state){var b="",c=a(h.window.document.body);e.__options.triggerClose.click&&(b+="click."+e.__namespace+"-triggerClose "),e.__options.triggerClose.tap&&h.hasTouchCapability&&(b+="touchend."+e.__namespace+"-triggerClose"),c.on(b,function(b){e._touchIsMeaningfulEvent(b)&&(e._touchRecordEvent(b),e.__options.interactive&&a.contains(e._$tooltip[0],b.target)||e._close(b))}),e.__options.triggerClose.tap&&h.hasTouchCapability&&c.on("touchstart."+e.__namespace+"-triggerClose",function(a){e._touchRecordEvent(a)})}},0),e._trigger("ready"),e.__options.functionReady&&e.__options.functionReady.call(e,e,{origin:e._$origin[0],tooltip:e._$tooltip[0]})}if(e.__options.timer>0){var m=setTimeout(function(){e._close()},e.__options.timer+g);e.__timeouts.close.push(m)}}}return e},_openShortly:function(a){var b=this,c=!0;if("stable"!=b.__state&&"appearing"!=b.__state&&!b.__timeouts.open&&(b._trigger({type:"start",event:a,stop:function(){c=!1}}),c)){var d=0==a.type.indexOf("touch")?b.__options.delayTouch:b.__options.delay;d[0]?b.__timeouts.open=setTimeout(function(){b.__timeouts.open=null,b.__pointerIsOverOrigin&&b._touchIsMeaningfulEvent(a)?(b._trigger("startend"),b._open(a)):b._trigger("startcancel")},d[0]):(b._trigger("startend"),b._open(a))}return b},_optionsExtract:function(b,c){var d=this,e=a.extend(!0,{},c),f=d.__options[b];return f||(f={},a.each(c,function(a,b){var c=d.__options[a];void 0!==c&&(f[a]=c)})),a.each(e,function(b,c){void 0!==f[b]&&("object"!=typeof c||c instanceof Array||null==c||"object"!=typeof f[b]||f[b]instanceof Array||null==f[b]?e[b]=f[b]:a.extend(e[b],f[b]))}),e},_plug:function(b){var c=a.tooltipster._plugin(b);if(!c)throw new Error('The "'+b+'" plugin is not defined');return c.instance&&a.tooltipster.__bridge(c.instance,this,c.name),this},_touchIsEmulatedEvent:function(a){for(var b=!1,c=(new Date).getTime(),d=this.__touchEvents.length-1;d>=0;d--){var e=this.__touchEvents[d];if(!(c-e.time<500))break;e.target===a.target&&(b=!0)}return b},_touchIsMeaningfulEvent:function(a){return this._touchIsTouchEvent(a)&&!this._touchSwiped(a.target)||!this._touchIsTouchEvent(a)&&!this._touchIsEmulatedEvent(a)},_touchIsTouchEvent:function(a){return 0==a.type.indexOf("touch")},_touchRecordEvent:function(a){return this._touchIsTouchEvent(a)&&(a.time=(new Date).getTime(),this.__touchEvents.push(a)),this},_touchSwiped:function(a){for(var b=!1,c=this.__touchEvents.length-1;c>=0;c--){var d=this.__touchEvents[c];if("touchmove"==d.type){b=!0;break}if("touchstart"==d.type&&a===d.target)break}return b},_trigger:function(){var b=Array.prototype.slice.apply(arguments);return"string"==typeof b[0]&&(b[0]={type:b[0]}),b[0].instance=this,b[0].origin=this._$origin?this._$origin[0]:null,b[0].tooltip=this._$tooltip?this._$tooltip[0]:null,this.__$emitterPrivate.trigger.apply(this.__$emitterPrivate,b),a.tooltipster._trigger.apply(a.tooltipster,b),this.__$emitterPublic.trigger.apply(this.__$emitterPublic,b),this},_unplug:function(b){var c=this;if(c[b]){var d=a.tooltipster._plugin(b);d.instance&&a.each(d.instance,function(a,d){c[a]&&c[a].bridged===c[b]&&delete c[a]}),c[b].__destroy&&c[b].__destroy(),delete c[b]}return c},close:function(a){return this.__destroyed?this.__destroyError():this._close(null,a),this},content:function(a){var b=this;if(void 0===a)return b.__Content;if(b.__destroyed)b.__destroyError();else if(b.__contentSet(a),null!==b.__Content){if("closed"!==b.__state&&(b.__contentInsert(),b.reposition(),b.__options.updateAnimation))if(h.hasTransitions){var c=b.__options.updateAnimation;b._$tooltip.addClass("tooltipster-update-"+c),setTimeout(function(){"closed"!=b.__state&&b._$tooltip.removeClass("tooltipster-update-"+c)},1e3)}else b._$tooltip.fadeTo(200,.5,function(){"closed"!=b.__state&&b._$tooltip.fadeTo(200,1)})}else b._close();return b},destroy:function(){var b=this;if(b.__destroyed)b.__destroyError();else{"closed"!=b.__state?b.option("animationDuration",0)._close(null,null,!0):b.__timeoutsClear(),b._trigger("destroy"),b.__destroyed=!0,b._$origin.removeData(b.__namespace).off("."+b.__namespace+"-triggerOpen"),a(h.window.document.body).off("."+b.__namespace+"-triggerOpen");var c=b._$origin.data("tooltipster-ns");if(c)if(1===c.length){var d=null;"previous"==b.__options.restoration?d=b._$origin.data("tooltipster-initialTitle"):"current"==b.__options.restoration&&(d="string"==typeof b.__Content?b.__Content:a("<div></div>").append(b.__Content).html()),d&&b._$origin.attr("title",d),b._$origin.removeClass("tooltipstered"),b._$origin.removeData("tooltipster-ns").removeData("tooltipster-initialTitle")}else c=a.grep(c,function(a,c){return a!==b.__namespace}),b._$origin.data("tooltipster-ns",c);b._trigger("destroyed"),b._off(),b.off(),b.__Content=null,b.__$emitterPrivate=null,b.__$emitterPublic=null,b.__options.parent=null,b._$origin=null,b._$tooltip=null,a.tooltipster.__instancesLatestArr=a.grep(a.tooltipster.__instancesLatestArr,function(a,c){return b!==a}),clearInterval(b.__garbageCollector)}return b},disable:function(){return this.__destroyed?(this.__destroyError(),this):(this._close(),this.__enabled=!1,this)},elementOrigin:function(){return this.__destroyed?void this.__destroyError():this._$origin[0]},elementTooltip:function(){return this._$tooltip?this._$tooltip[0]:null},enable:function(){return this.__enabled=!0,this},hide:function(a){return this.close(a)},instance:function(){return this},off:function(){return this.__destroyed||this.__$emitterPublic.off.apply(this.__$emitterPublic,Array.prototype.slice.apply(arguments)),this},on:function(){return this.__destroyed?this.__destroyError():this.__$emitterPublic.on.apply(this.__$emitterPublic,Array.prototype.slice.apply(arguments)),this},one:function(){return this.__destroyed?this.__destroyError():this.__$emitterPublic.one.apply(this.__$emitterPublic,Array.prototype.slice.apply(arguments)),this},open:function(a){return this.__destroyed?this.__destroyError():this._open(null,a),this},option:function(b,c){return void 0===c?this.__options[b]:(this.__destroyed?this.__destroyError():(this.__options[b]=c,this.__optionsFormat(),a.inArray(b,["trigger","triggerClose","triggerOpen"])>=0&&this.__prepareOrigin(),"selfDestruction"===b&&this.__prepareGC()),this)},reposition:function(a,b){var c=this;return c.__destroyed?c.__destroyError():"closed"!=c.__state&&d(c._$origin)&&(b||d(c._$tooltip))&&(b||c._$tooltip.detach(),c.__Geometry=c.__geometry(),c._trigger({type:"reposition",event:a,helper:{geo:c.__Geometry}})),c},show:function(a){return this.open(a)},status:function(){return{destroyed:this.__destroyed,enabled:this.__enabled,open:"closed"!==this.__state,state:this.__state}},triggerHandler:function(){return this.__destroyed?this.__destroyError():this.__$emitterPublic.triggerHandler.apply(this.__$emitterPublic,Array.prototype.slice.apply(arguments)),this}},a.fn.tooltipster=function(){var b=Array.prototype.slice.apply(arguments),c="You are using a single HTML element as content for several tooltips. You probably want to set the contentCloning option to TRUE.";if(0===this.length)return this;if("string"==typeof b[0]){var d="#*$~&";return this.each(function(){var e=a(this).data("tooltipster-ns"),f=e?a(this).data(e[0]):null;if(!f)throw new Error("You called Tooltipster's \""+b[0]+'" method on an uninitialized element');if("function"!=typeof f[b[0]])throw new Error('Unknown method "'+b[0]+'"');this.length>1&&"content"==b[0]&&(b[1]instanceof a||"object"==typeof b[1]&&null!=b[1]&&b[1].tagName)&&!f.__options.contentCloning&&f.__options.debug&&console.log(c);var g=f[b[0]](b[1],b[2]);return g!==f||"instance"===b[0]?(d=g,!1):void 0}),"#*$~&"!==d?d:this}a.tooltipster.__instancesLatestArr=[];var e=b[0]&&void 0!==b[0].multiple,g=e&&b[0].multiple||!e&&f.multiple,h=b[0]&&void 0!==b[0].content,i=h&&b[0].content||!h&&f.content,j=b[0]&&void 0!==b[0].contentCloning,k=j&&b[0].contentCloning||!j&&f.contentCloning,l=b[0]&&void 0!==b[0].debug,m=l&&b[0].debug||!l&&f.debug;return this.length>1&&(i instanceof a||"object"==typeof i&&null!=i&&i.tagName)&&!k&&m&&console.log(c),this.each(function(){var c=!1,d=a(this),e=d.data("tooltipster-ns"),f=null;e?g?c=!0:m&&(console.log("Tooltipster: one or more tooltips are already attached to the element below. Ignoring."),console.log(this)):c=!0,c&&(f=new a.Tooltipster(this,b[0]),e||(e=[]),e.push(f.__namespace),d.data("tooltipster-ns",e),d.data(f.__namespace,f),f.__options.functionInit&&f.__options.functionInit.call(f,f,{origin:this}),f._trigger("init")),a.tooltipster.__instancesLatestArr.push(f)}),this},b.prototype={__init:function(b){this.__$tooltip=b,this.__$tooltip.css({left:0,overflow:"hidden",position:"absolute",top:0}).find(".tooltipster-content").css("overflow","auto"),this.$container=a('<div class="tooltipster-ruler"></div>').append(this.__$tooltip).appendTo(h.window.document.body)},__forceRedraw:function(){var a=this.__$tooltip.parent();this.__$tooltip.detach(),this.__$tooltip.appendTo(a)},constrain:function(a,b){return this.constraints={width:a,height:b},this.__$tooltip.css({display:"block",height:"",overflow:"auto",width:a}),this},destroy:function(){this.__$tooltip.detach().find(".tooltipster-content").css({display:"",overflow:""}),this.$container.remove()},free:function(){return this.constraints=null,this.__$tooltip.css({display:"",height:"",overflow:"visible",width:""}),this},measure:function(){this.__forceRedraw();var a=this.__$tooltip[0].getBoundingClientRect(),b={size:{height:a.height||a.bottom-a.top,width:a.width||a.right-a.left}};if(this.constraints){var c=this.__$tooltip.find(".tooltipster-content"),d=this.__$tooltip.outerHeight(),e=c[0].getBoundingClientRect(),f={height:d<=this.constraints.height,width:a.width<=this.constraints.width&&e.width>=c[0].scrollWidth-1};b.fits=f.height&&f.width}return h.IE&&h.IE<=11&&b.size.width!==h.window.document.documentElement.clientWidth&&(b.size.width=Math.ceil(b.size.width)+1),b}};var j=navigator.userAgent.toLowerCase();-1!=j.indexOf("msie")?h.IE=parseInt(j.split("msie")[1]):-1!==j.toLowerCase().indexOf("trident")&&-1!==j.indexOf(" rv:11")?h.IE=11:-1!=j.toLowerCase().indexOf("edge/")&&(h.IE=parseInt(j.toLowerCase().split("edge/")[1]));var k="tooltipster.sideTip";return a.tooltipster._plugin({name:k,instance:{__defaults:function(){return{arrow:!0,distance:6,functionPosition:null,maxWidth:null,minIntersection:16,minWidth:0,position:null,side:"top",viewportAware:!0}},__init:function(a){var b=this;b.__instance=a,b.__namespace="tooltipster-sideTip-"+Math.round(1e6*Math.random()),b.__previousState="closed",b.__options,b.__optionsFormat(),b.__instance._on("state."+b.__namespace,function(a){"closed"==a.state?b.__close():"appearing"==a.state&&"closed"==b.__previousState&&b.__create(),b.__previousState=a.state}),b.__instance._on("options."+b.__namespace,function(){b.__optionsFormat()}),b.__instance._on("reposition."+b.__namespace,function(a){b.__reposition(a.event,a.helper)})},__close:function(){this.__instance.content()instanceof a&&this.__instance.content().detach(),this.__instance._$tooltip.remove(),this.__instance._$tooltip=null},__create:function(){var b=a('<div class="tooltipster-base tooltipster-sidetip"><div class="tooltipster-box"><div class="tooltipster-content"></div></div><div class="tooltipster-arrow"><div class="tooltipster-arrow-uncropped"><div class="tooltipster-arrow-border"></div><div class="tooltipster-arrow-background"></div></div></div></div>');this.__options.arrow||b.find(".tooltipster-box").css("margin",0).end().find(".tooltipster-arrow").hide(),this.__options.minWidth&&b.css("min-width",this.__options.minWidth+"px"),this.__options.maxWidth&&b.css("max-width",this.__options.maxWidth+"px"),
this.__instance._$tooltip=b,this.__instance._trigger("created")},__destroy:function(){this.__instance._off("."+self.__namespace)},__optionsFormat:function(){var b=this;if(b.__options=b.__instance._optionsExtract(k,b.__defaults()),b.__options.position&&(b.__options.side=b.__options.position),"object"!=typeof b.__options.distance&&(b.__options.distance=[b.__options.distance]),b.__options.distance.length<4&&(void 0===b.__options.distance[1]&&(b.__options.distance[1]=b.__options.distance[0]),void 0===b.__options.distance[2]&&(b.__options.distance[2]=b.__options.distance[0]),void 0===b.__options.distance[3]&&(b.__options.distance[3]=b.__options.distance[1]),b.__options.distance={top:b.__options.distance[0],right:b.__options.distance[1],bottom:b.__options.distance[2],left:b.__options.distance[3]}),"string"==typeof b.__options.side){var c={top:"bottom",right:"left",bottom:"top",left:"right"};b.__options.side=[b.__options.side,c[b.__options.side]],"left"==b.__options.side[0]||"right"==b.__options.side[0]?b.__options.side.push("top","bottom"):b.__options.side.push("right","left")}6===a.tooltipster._env.IE&&b.__options.arrow!==!0&&(b.__options.arrow=!1)},__reposition:function(b,c){var d,e=this,f=e.__targetFind(c),g=[];e.__instance._$tooltip.detach();var h=e.__instance._$tooltip.clone(),i=a.tooltipster._getRuler(h),j=!1,k=e.__instance.option("animation");switch(k&&h.removeClass("tooltipster-"+k),a.each(["window","document"],function(d,k){var l=null;if(e.__instance._trigger({container:k,helper:c,satisfied:j,takeTest:function(a){l=a},results:g,type:"positionTest"}),1==l||0!=l&&0==j&&("window"!=k||e.__options.viewportAware))for(var d=0;d<e.__options.side.length;d++){var m={horizontal:0,vertical:0},n=e.__options.side[d];"top"==n||"bottom"==n?m.vertical=e.__options.distance[n]:m.horizontal=e.__options.distance[n],e.__sideChange(h,n),a.each(["natural","constrained"],function(a,d){if(l=null,e.__instance._trigger({container:k,event:b,helper:c,mode:d,results:g,satisfied:j,side:n,takeTest:function(a){l=a},type:"positionTest"}),1==l||0!=l&&0==j){var h={container:k,distance:m,fits:null,mode:d,outerSize:null,side:n,size:null,target:f[n],whole:null},o="natural"==d?i.free():i.constrain(c.geo.available[k][n].width-m.horizontal,c.geo.available[k][n].height-m.vertical),p=o.measure();if(h.size=p.size,h.outerSize={height:p.size.height+m.vertical,width:p.size.width+m.horizontal},"natural"==d?c.geo.available[k][n].width>=h.outerSize.width&&c.geo.available[k][n].height>=h.outerSize.height?h.fits=!0:h.fits=!1:h.fits=p.fits,"window"==k&&(h.fits?"top"==n||"bottom"==n?h.whole=c.geo.origin.windowOffset.right>=e.__options.minIntersection&&c.geo.window.size.width-c.geo.origin.windowOffset.left>=e.__options.minIntersection:h.whole=c.geo.origin.windowOffset.bottom>=e.__options.minIntersection&&c.geo.window.size.height-c.geo.origin.windowOffset.top>=e.__options.minIntersection:h.whole=!1),g.push(h),h.whole)j=!0;else if("natural"==h.mode&&(h.fits||h.size.width<=c.geo.available[k][n].width))return!1}})}}),e.__instance._trigger({edit:function(a){g=a},event:b,helper:c,results:g,type:"positionTested"}),g.sort(function(a,b){if(a.whole&&!b.whole)return-1;if(!a.whole&&b.whole)return 1;if(a.whole&&b.whole){var c=e.__options.side.indexOf(a.side),d=e.__options.side.indexOf(b.side);return d>c?-1:c>d?1:"natural"==a.mode?-1:1}if(a.fits&&!b.fits)return-1;if(!a.fits&&b.fits)return 1;if(a.fits&&b.fits){var c=e.__options.side.indexOf(a.side),d=e.__options.side.indexOf(b.side);return d>c?-1:c>d?1:"natural"==a.mode?-1:1}return"document"==a.container&&"bottom"==a.side&&"natural"==a.mode?-1:1}),d=g[0],d.coord={},d.side){case"left":case"right":d.coord.top=Math.floor(d.target-d.size.height/2);break;case"bottom":case"top":d.coord.left=Math.floor(d.target-d.size.width/2)}switch(d.side){case"left":d.coord.left=c.geo.origin.windowOffset.left-d.outerSize.width;break;case"right":d.coord.left=c.geo.origin.windowOffset.right+d.distance.horizontal;break;case"top":d.coord.top=c.geo.origin.windowOffset.top-d.outerSize.height;break;case"bottom":d.coord.top=c.geo.origin.windowOffset.bottom+d.distance.vertical}"window"==d.container?"top"==d.side||"bottom"==d.side?d.coord.left<0?c.geo.origin.windowOffset.right-this.__options.minIntersection>=0?d.coord.left=0:d.coord.left=c.geo.origin.windowOffset.right-this.__options.minIntersection-1:d.coord.left>c.geo.window.size.width-d.size.width&&(c.geo.origin.windowOffset.left+this.__options.minIntersection<=c.geo.window.size.width?d.coord.left=c.geo.window.size.width-d.size.width:d.coord.left=c.geo.origin.windowOffset.left+this.__options.minIntersection+1-d.size.width):d.coord.top<0?c.geo.origin.windowOffset.bottom-this.__options.minIntersection>=0?d.coord.top=0:d.coord.top=c.geo.origin.windowOffset.bottom-this.__options.minIntersection-1:d.coord.top>c.geo.window.size.height-d.size.height&&(c.geo.origin.windowOffset.top+this.__options.minIntersection<=c.geo.window.size.height?d.coord.top=c.geo.window.size.height-d.size.height:d.coord.top=c.geo.origin.windowOffset.top+this.__options.minIntersection+1-d.size.height):(d.coord.left>c.geo.window.size.width-d.size.width&&(d.coord.left=c.geo.window.size.width-d.size.width),d.coord.left<0&&(d.coord.left=0)),e.__sideChange(h,d.side),c.tooltipClone=h[0],c.tooltipParent=e.__instance.option("parent").parent[0],c.mode=d.mode,c.whole=d.whole,c.origin=e.__instance._$origin[0],c.tooltip=e.__instance._$tooltip[0],delete d.container,delete d.fits,delete d.mode,delete d.outerSize,delete d.whole,d.distance=d.distance.horizontal||d.distance.vertical;var l=a.extend(!0,{},d);if(e.__instance._trigger({edit:function(a){d=a},event:b,helper:c,position:l,type:"position"}),e.__options.functionPosition){var m=e.__options.functionPosition.call(e,e.__instance,c,l);m&&(d=m)}i.destroy();var n,o;"top"==d.side||"bottom"==d.side?(n={prop:"left",val:d.target-d.coord.left},o=d.size.width-this.__options.minIntersection):(n={prop:"top",val:d.target-d.coord.top},o=d.size.height-this.__options.minIntersection),n.val<this.__options.minIntersection?n.val=this.__options.minIntersection:n.val>o&&(n.val=o);var p;p=c.geo.origin.fixedLineage?c.geo.origin.windowOffset:{left:c.geo.origin.windowOffset.left+c.geo.window.scroll.left,top:c.geo.origin.windowOffset.top+c.geo.window.scroll.top},d.coord={left:p.left+(d.coord.left-c.geo.origin.windowOffset.left),top:p.top+(d.coord.top-c.geo.origin.windowOffset.top)},e.__sideChange(e.__instance._$tooltip,d.side),c.geo.origin.fixedLineage?e.__instance._$tooltip.css("position","fixed"):e.__instance._$tooltip.css("position",""),e.__instance._$tooltip.css({left:d.coord.left,top:d.coord.top,height:d.size.height,width:d.size.width}).find(".tooltipster-arrow").css({left:"",top:""}).css(n.prop,n.val),e.__instance._$tooltip.appendTo(e.__instance.option("parent")),e.__instance._trigger({type:"repositioned",event:b,position:d})},__sideChange:function(a,b){a.removeClass("tooltipster-bottom").removeClass("tooltipster-left").removeClass("tooltipster-right").removeClass("tooltipster-top").addClass("tooltipster-"+b)},__targetFind:function(a){var b={},c=this.__instance._$origin[0].getClientRects();if(c.length>1){var d=this.__instance._$origin.css("opacity");1==d&&(this.__instance._$origin.css("opacity",.99),c=this.__instance._$origin[0].getClientRects(),this.__instance._$origin.css("opacity",1))}if(c.length<2)b.top=Math.floor(a.geo.origin.windowOffset.left+a.geo.origin.size.width/2),b.bottom=b.top,b.left=Math.floor(a.geo.origin.windowOffset.top+a.geo.origin.size.height/2),b.right=b.left;else{var e=c[0];b.top=Math.floor(e.left+(e.right-e.left)/2),e=c.length>2?c[Math.ceil(c.length/2)-1]:c[0],b.right=Math.floor(e.top+(e.bottom-e.top)/2),e=c[c.length-1],b.bottom=Math.floor(e.left+(e.right-e.left)/2),e=c.length>2?c[Math.ceil((c.length+1)/2)-1]:c[c.length-1],b.left=Math.floor(e.top+(e.bottom-e.top)/2)}return b}}}),a});
var cookieWorldState  = getCookie("worldEditState");
var cookieWorldCharacterMenu  = getCookie("cookieWorldCharacterMenu");

function bindselect2( id, message ) {
    $( id ).select2({
        theme: "bootstrap",
        allowClear: true,
        placeholder: message,
        width: "100%"
    });
    $( id ).on("select2:select", function (e) { 
    });
}


function toggleWorldEditLinks() {
    var cookieWorldState  = getCookie("worldEditState");
    if (cookieWorldState ===  "inactive") {
        $('.world-editor-link').hide();
    } else {
        $('.world-editor-link').show();
    }
}

function toggleWorldCharacterMenu() {
    var cookieWorldCharacterMenu  = getCookie("cookieWorldCharacterMenu");
    if (cookieWorldCharacterMenu  ===  "inactive") {
        $('#heroes-menu').hide();
    } else {
        $('#heroes-menu').show();
    }
}


function loadVariables() {
    $('.variable-text').tooltipster({
        theme: 'tooltipster-light',
        animation: 'fade',
        interactive: true,
        delay: [300, 300],
        maxWidth: 650,
        minWidth: 350,
        contentAsHTML: true,
        content: '<div class="p-2 padding-10 text-center">Loading...</div>',
        functionBefore: function(instance, helper) {
            var $origin = $(helper.origin);
            if ($origin.data('loaded') !== true) {
                console.log( $origin );
                $.get( $origin.attr('data-url'), function(data) {
                    instance.content(data);
                    $origin.data('loaded', true);
                });
            }
        }
    });
}



$(document).ready(function() {

    bindTrackable();

    $(function () {
      $('[data-toggle="tooltip"]').tooltip()
    });


    $('.tooltipster').tooltipster({
        theme: 'tooltipster-borderless',
        maxWidth: '300',
        minWidth: '300',
        side: 'top'
    });

    loadVariables();

    $('.article-link').tooltipster({
        theme: 'tooltipster-light',
        animation: 'fade',
        interactive: true,
        delay: [300, 300],
        maxWidth: 650,
        minWidth: 350,
        contentAsHTML: true,
        content: '<div class="p-2 padding-10 text-center">Loading...</div>',
        functionBefore: function(instance, helper) {
            var $origin = $(helper.origin);
            if ($origin.data('loaded') !== true) {
                console.log( $origin );
                $.get( '/article/'+$origin.attr('data-article')+'/tooltip', function(data) {
                    instance.content(data);
                    $origin.data('loaded', true);
                });
            }
        }
    });

    $('.history-link').tooltipster({
        theme: 'tooltipster-light',
        animation: 'fade',
        interactive: true,
        delay: [300, 300],
        maxWidth: 650,
        minWidth: 350,
        contentAsHTML: true,
        content: '<div class="p-2 padding-10 text-center">Loading...</div>',
        functionBefore: function(instance, helper) {
            var $origin = $(helper.origin);
            if ($origin.data('loaded') !== true) {
                console.log( $origin );
                $.get( '/history/'+$origin.attr('data-history')+'/tooltip', function(data) {
                    instance.content(data);
                    $origin.data('loaded', true);
                });
            }
        }
    });

    var clipboard = new Clipboard('.cp');

    clipboard.on('success', function(e) {
        console.info('Action:', e.action);
        console.info('Text:', e.text);
        console.info('Trigger:', e.trigger);
        $.notify("Copied to Clipboard", {
            globalPosition: 'top right',
            autoHide: true,
            autoHideDelay: 3000,
            showDuration: 1500,
            className: 'notify-success',
            showAnimation: 'slideDown'
        });
        e.clearSelection();
    });

    // create a new instance of the DiceRoller
    var diceRoller = new rpgDiceRoller.DiceRoller();
    $(".rolldice").click(function() {
        diceToRoll = $(this).attr('data');
        diceRoller.roll( diceToRoll )
        latestRoll = diceRoller.log.shift().toString();
        $.notify("You rolled: " + latestRoll, {
            globalPosition: 'bottom left',
            autoHide: false,
            className: 'roller-alert',
            showAnimation: 'slideDown'
        });
    });

    document.addEventListener('DOMContentLoaded', function () {
        $('span').on('click', function () {
          $(this)
            .find('[data-fa-i2svg]')
            .toggleClass('fa-plus-square')
            .toggleClass('fa-minus-square');
        });
    });

    // $(document).on('click', '.btn-random-roll', function( event ){
    //     that = $(this);
    //     data = that.siblings('.random-table-data').val()
    //     var dataArray = JSON.parse( data );
    //     var formattedArray = [];
    //     for (var i = 0, len = dataArray.length; i < len; i++) {
    //         console.log( dataArray[i][0] );
    //         if ( isNaN( dataArray[i][0] ) ) {
    //             var range =  dataArray[i][0].split("-");
    //             var rangeStart = Number(range[0]);
    //             var rangeEnd = Number(range[1]);
    //             console.log( range );
    //             console.log( 'start:' + rangeStart );
    //             console.log( 'end:' + rangeEnd );
    //
    //             for ( var j = rangeStart; j <= rangeEnd; j++) {
    //                 console.log( j + ' >> generating: ' + j + '('+ dataArray[i][1] +')' )
    //                 formattedArray[ j ] = dataArray[i][1];
    //             }
    //             console.log( 'pointer:' + j );
    //             j = 0;
    //         } else {
    //             formattedArray[ +dataArray[i][0]++ ] = dataArray[i][1];
    //         }
    //     }
    //     console.log( formattedArray );
    //     for (var firstKey in formattedArray) break;
    //     minimum = Number(firstKey);
    //     maximum = Number(formattedArray.length - 1);
    //     var randomnumber = Math.floor(Math.random()*(maximum-minimum+1))+minimum;
    //     result = 'You Rolled a <strong>' + randomnumber +'</strong>: ' + formattedArray[ randomnumber ] ;
    //     that.siblings('.table-random-results').prepend('<div class="random-table-result">' + result + '</div>' );
    //     event.preventDefault();
    // });


    // Parsing page for instance of world-toc-loader created by the [toc] BBcode
    // If found, loading the ToC for that world
    $('.world-toc-loader').each(function () {
            console.log('found one. Loading url: ' + contentCategories );
            that = $(this);
            $.ajax({
                url: contentCategories,
                type: "GET",
                dataType: "json",
                async: false,
                success: function (data)
                {
                    console.log('loading world Table of Contents');
                    that.html(data.contents);
                }
            });
    });


    // Parsing page for instance of category-toc-loader 
    // If found, loading the ToC for that category
    $('.category-toc-loader').each(function () {
            that = $(this);
            if ( that.attr('data-category-id') ) {
                console.log('summoning category: ' + that.attr('data-url') );
                $.ajax({
                    url: that.attr('data-url'),
                    type: "GET",
                    dataType: "json",
                    async: false,
                    success: function (data)
                    {
                        console.log('loading category' + that.attr('data-category-id') );
                        that.html(data.menu);
                    }
                });
            }
    });
    $(document).on('click', '.world-category-link', function( event ){
        that = $( this );
        event.preventDefault();
        if ( !that.hasClass('opened') ) {
            $.ajax({
                url: $( this ).attr('data-link'),
                type: "GET",
                dataType: "json",
                async: true,
                success: function (data)
                {
                    that.parent().after(data.menu);
                    that.addClass('opened')
                    $('#world-category-content').html( data.contents );
                    toggleWorldEditLinks();
                }
            });
        } else {
            that.removeClass('opened');
            that.parent().next().remove();
            $('#world-category-content').html(' ');
        }
    });

    $(document).on('click', '.world-category-breadcrumb-link', function( event ){
        that = $( this );
        event.preventDefault();
        if ( !that.hasClass('opened') ) {
            $.ajax({
                url: $( this ).attr('data-link'),
                type: "GET",
                dataType: "json",
                async: true,
                success: function (data)
                {
                    // that.parent().after(data.menu);
                    $('.breadcrumb-contents-loader').html( '<div class="breadcrumb-card card mb-3"><div class="card-body"><span class="pull-right float-end"><i class="fa fa-times breadcrumb-card-close"></i></span>'+ data.menu +'</div></div>' );
                    toggleWorldEditLinks();

                }
            });
        } else {
            that.removeClass('opened');
            that.parent().next().remove();
            $('#world-category-content').html(' ');
        }
    });

    $(document).on('click', '.breadcrumb-card-close', function ( event) {
        $('.breadcrumb-card').remove();
    });



    $(document).on('submit', '#memory-form-add', function( event ){
        event.preventDefault();
        that = $(this);
        var data = that.serialize();

        $.ajax({
            url: that.attr('action'),
            data: data,
            type: "POST",
            dataType: "json",
            async: true,
            success: function (data) {
                $('#memory-form-add').trigger("reset");
                location.reload();
            }
        });
    });


    $(document).on('click', '.memory-remove', function( event ){
        event.preventDefault();
        that = $(this);

        $.ajax({
            url: that.attr('href'),
            type: "GET",
            dataType: "json",
            async: true,
            success: function (data) {
                that.closest('.memory').parent().parent().remove();
            }
        });
    });

    if ( cookieWorldState === 'inactive' ) {
        $('.world-edit-toggle').toggleClass('btn-success btn-danger');
        $('.world-editor-link').toggle();
    }

    $(document).on('click', '.world-edit-toggle', function(){
        if (cookieWorldState ===  "inactive") {
            setCookie('worldEditState','active',45);
        } else {
            setCookie('worldEditState','inactive',45);
        }
        $('.world-edit-toggle').toggleClass('btn-success btn-danger');
        $('.world-editor-link').toggle();
    });


    $(document).on('click', '.heroes-menu-toggle', function( event ){
        event.preventDefault();
        $(this).children('i').toggleClass('fa-chevron-square-left fa-chevron-square-right');
        if (cookieWorldCharacterMenu ===  "inactive") {
            console.log(' world char menu is now active');
            setCookie('cookieWorldCharacterMenu','active',45);
        } else {
            console.log(' world char menu is now inactive');
            setCookie('cookieWorldCharacterMenu','inactive',45);
        }
        $('#heroes-menu').toggle(500);
    });


    if ( cookieWorldCharacterMenu === 'inactive' ) {
        $('.heroes-menu-toggle').children('i').toggleClass('fa-chevron-square-left fa-chevron-square-right');
        $('#heroes-menu').hide();
    }




});
$(document).ready(function () {
    $(document).on('click', 'span.user-follow', function( event ){
        event.preventDefault();
        that = $(this);
        $.ajax({
            url: that.attr("data-url"),
            type: "GET",
            dataType: "json",
            async: true,
            success: function (data)
            {
                that.html( data.contents );
            }
        });
    });
});
$(document).ready(function () {
    var articleToC = $('[data-component="article_toc"]');

    //Only begin processing if the required container is present.
    if (articleToC.length > 0) {
        console.log('Component: [ArticleToC] - Loading.');

        //Theme Detector - finds selected Theme Preset (World Config) and marks
        //<body> to allow CSS detection (used for specifying rules based on theme).
        var theme = $('link#world-theme').attr('href');
        if (theme) {
            theme = theme.split('/')[2];

            $('body').attr('data-css-theme', theme); //Set as data attribute to prevent class/id conflicts
        }

        //List of element selectors to ignore headings within.
        var excludedParents = [
            '.orgchart-wrapper',              // Static OrgCharts
            '.character-relationship-panel',  // Character Relation Panels
            '.rhea-family-tree',              // Rhea Family Trees
            '.rhea-org-chart',                // Rhea OrgChart / Content Trees
            '.rhea-bloodline',                // Rhea Bloodlines
            '.world-toc-loader',              // Global ToC
            '.article-panel',                 // ArticleBlocks
            '.article-subheading',            // Article Sub Header
            '.carousel',                      // Carousel
            '.spoiler-content',
        ];

        //Find all headings that are present in the main body of the article
        var headings = $('.article-content-left, .article-content-full-footer').find('h2, h3, h4, h5, h6');

        for (var i = 0; i < headings.length; i++) {
            var header = $(headings[i]);
            var skip = false; //Flag - if true the header will be ignored.

            //Set skip flag if heading has a parent in the exclusion list.
            for (var j = 0; j < excludedParents.length; j++) {
                if (header.parents(excludedParents[j]).length > 0) {
                    skip = true;
                }
            }

            //Since headings are based on tagname, get the type of heading and convert
            // to a number to calculate indention.
            var indent = Number(header.prop('nodeName').substr(1));

            //Generate a pseudo-unique id for both the ToC links and their associated
            //heading element.
            var id = Math.random().toString(36).slice(2);

            //Verify that the indent is numeric and the heading is not to be skipped.
            if (!isNaN(indent) && !skip) {
                //Assign the pseudo-unique id to header.
                $(header).attr('data-article_toc-id', id);

                //Simple entry object to use for quick assignment.
                var entry = {
                    indent: indent - 2,
                    title: header.text(),
                    id: id
                };

                //Create and customize the corresponding header link
                var link = document.createElement('div');
                $(link).attr('data-article_toc-target-id', entry.id);
                $(link).addClass(`article-toc-link article-toc-indent-${entry.indent}`);
                $(link).text(entry.title);

                //Create the click event handler for navigation. Uses simple native JS
                // scrollIntoView() behavior.
                $(link).on('click', function (ev) {
                    var clickedEntry = $(ev.currentTarget);
                    var targetHeading = $(`[data-article_toc-id="${clickedEntry.attr('data-article_toc-target-id')}`);

                    targetHeading[0].scrollIntoView({ behavior: 'smooth' });
                })

                //Append the link to the ToC container
                $(articleToC).append(link);
            }
        }

        //That's all, folks!
        console.log('Component [ArticleToC] - Loaded.')
    }
})
$(document).ready(function() {

	var Dictionary = {
		load() {
			if ( $('.dictionary-results').length ) {

				console.log('initiating dictionary');
			    $.ajax({
			        url: $('.dictionary-results').attr('data-url'),
			        type: "GET",
			        dataType: "json",
			        async: true,
			        success: function (data)
			        {
			        	console.log('success: ' + data.count );
			        	$('.dictionary-results').html( data.html );
						$('.dictionary-words-count').html( data.count );
			        }
			    });
			}
		}
	}

	Dictionary.load();


	if ( $('.dictionary-import').length ) {
		$(document).on('click', '.dictionary-import', function( event ){
			event.preventDefault();
			that = $(this);
			that.hide();
			that.parent().append('<div class="please-wait text-center p-5"><strong>Importing, please wait!</strong></div>');
		    $.ajax({
		        url: that.attr('href'),
		        type: "POST",
		        data: { csv: $('.dictionary-csv').val() },
		        dataType: "json",
		        async: true,
		        success: function (data)
		        {
		        	toastr.success('All words added!' ); 
		        	Dictionary.load();
		        	that.show();
		        	$('.dictionary-csv').val('');
		        	$('.please-wait').remove();
		        }
		    });
		});
	}

	if ( $('.dictionary-add-word').length ) {
		$(document).on('click', '.dictionary-add-word', function( event ){
			event.preventDefault();
			that = $(this);
		    $.ajax({
		        url: that.attr('href'),
		        type: "POST",
		        data: { 
		        	spelling: $('.word-spelling').val(),
		        	pronunciation: $('.word-pronunciation').val(),
		        	partofspeech: $('.word-partofspeech').val(),
		        	translation: $('.word-translation').val(),
		        	root: $('.word-root').val(),
		        	etymology: $('.word-etymology').val(),
		        	example: $('.word-example').val() 
		        },
		        dataType: "json",
		        async: true,
		        success: function (data)
		        {
		        	toastr.success('New word added!' ); 
		        	Dictionary.load();
					$('.word-spelling').val('');
					$('.word-pronunciation').val('');
					$('.word-partofspeech').val('');
					$('.word-translation').val('');
					$('.word-root').val('');
					$('.word-etymology').val('');
					$('.word-example').val('');
				}
		    });
		});
	}

	$(document).on('click', '.dictionary-edit-word', function( event ){
		event.preventDefault();
		that = $(this);
	    $.ajax({
	        url: that.attr('href'),
	        type: "POST",
	        data: { 
	        	spelling: that.siblings('.word-edit-spelling').val(),
	        	pronunciation: that.siblings('.word-edit-pronunciation').val(),
	        	partofspeech: that.siblings('.word-edit-partofspeech').val(),
	        	translation: that.siblings('.word-edit-translation').val(),
	        	root: that.siblings('.word-edit-root').val(),
	        	etymology: that.siblings('.word-edit-etymology').val(),
	        	example: that.siblings('.word-edit-example').val() 
	        },
	        dataType: "json",
	        async: true,
	        success: function (data)
	        {
	        	toastr.success('Saved!' ); 
	        	Dictionary.load();
				$( '.word-' + that.attr('data-word-id') ).toggleClass('d-none hidden');
	        }
	    });
	});

	$(document).on('click', '.dictionary-delete-word', function( event ){
		event.preventDefault();
		that = $(this);
	    $.ajax({
	        url: that.attr('href'),
	        type: "POST",
	        dataType: "json",
	        async: true,
	        success: function (data)
	        {
	        	toastr.success('Word Deleted!' ); 
	        	that.parent().remove();
	        	Dictionary.load();
	        }
	    });
	});

	$(document).on('click', '.dictionary-purge', function( event ){
		event.preventDefault();
		that = $(this);
	    $.ajax({
	        url: that.attr('href'),
	        dataType: "json",
	        async: true,
	        success: function (data)
	        {
	        	toastr.success('Dictionary Purged!' ); 
	        	Dictionary.load();
	        }
	    });
	});

	$(document).on('keyup', '.dictionary-search', function( event ){
		event.preventDefault();
		that = $(this);
        setTimeout(function () {
			console.log('Loading Search');
			if ( $('.dictionary-search').val().length > 2 ) {
			    $.ajax({
			        url: $('.dictionary-search').attr('data-url') + '?term=' + $('.dictionary-search').val() ,
			        type: "GET",
			        dataType: "json",
			        async: true,
			        success: function (data)
			        {
			        	console.log('success');
			        	console.log( data );
			        	$('.dictionary-search-results').html( data.html );
			        }
	    });			
			}
        }, 750);
	});

	$(document).on('click', '.dictionary-edit-word-button', function( event ){
		console.log('edit word clicked');
		event.preventDefault();
		that = $(this);
		$( '.word-' + that.attr('data-word-id') ).toggleClass('d-none hidden');
	});

});
/*!
 * clipboard.js v2.0.4
 * https://zenorocha.github.io/clipboard.js
 * 
 * Licensed MIT © Zeno Rocha
 */
!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.ClipboardJS=e():t.ClipboardJS=e()}(this,function(){return function(n){var o={};function r(t){if(o[t])return o[t].exports;var e=o[t]={i:t,l:!1,exports:{}};return n[t].call(e.exports,e,e.exports,r),e.l=!0,e.exports}return r.m=n,r.c=o,r.d=function(t,e,n){r.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:n})},r.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},r.t=function(e,t){if(1&t&&(e=r(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)r.d(n,o,function(t){return e[t]}.bind(null,o));return n},r.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return r.d(e,"a",e),e},r.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},r.p="",r(r.s=0)}([function(t,e,n){"use strict";var r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=function(){function o(t,e){for(var n=0;n<e.length;n++){var o=e[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(t,o.key,o)}}return function(t,e,n){return e&&o(t.prototype,e),n&&o(t,n),t}}(),a=o(n(1)),c=o(n(3)),u=o(n(4));function o(t){return t&&t.__esModule?t:{default:t}}var l=function(t){function o(t,e){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,o);var n=function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(o.__proto__||Object.getPrototypeOf(o)).call(this));return n.resolveOptions(e),n.listenClick(t),n}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(o,c.default),i(o,[{key:"resolveOptions",value:function(){var t=0<arguments.length&&void 0!==arguments[0]?arguments[0]:{};this.action="function"==typeof t.action?t.action:this.defaultAction,this.target="function"==typeof t.target?t.target:this.defaultTarget,this.text="function"==typeof t.text?t.text:this.defaultText,this.container="object"===r(t.container)?t.container:document.body}},{key:"listenClick",value:function(t){var e=this;this.listener=(0,u.default)(t,"click",function(t){return e.onClick(t)})}},{key:"onClick",value:function(t){var e=t.delegateTarget||t.currentTarget;this.clipboardAction&&(this.clipboardAction=null),this.clipboardAction=new a.default({action:this.action(e),target:this.target(e),text:this.text(e),container:this.container,trigger:e,emitter:this})}},{key:"defaultAction",value:function(t){return s("action",t)}},{key:"defaultTarget",value:function(t){var e=s("target",t);if(e)return document.querySelector(e)}},{key:"defaultText",value:function(t){return s("text",t)}},{key:"destroy",value:function(){this.listener.destroy(),this.clipboardAction&&(this.clipboardAction.destroy(),this.clipboardAction=null)}}],[{key:"isSupported",value:function(){var t=0<arguments.length&&void 0!==arguments[0]?arguments[0]:["copy","cut"],e="string"==typeof t?[t]:t,n=!!document.queryCommandSupported;return e.forEach(function(t){n=n&&!!document.queryCommandSupported(t)}),n}}]),o}();function s(t,e){var n="data-clipboard-"+t;if(e.hasAttribute(n))return e.getAttribute(n)}t.exports=l},function(t,e,n){"use strict";var o,r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=function(){function o(t,e){for(var n=0;n<e.length;n++){var o=e[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(t,o.key,o)}}return function(t,e,n){return e&&o(t.prototype,e),n&&o(t,n),t}}(),a=n(2),c=(o=a)&&o.__esModule?o:{default:o};var u=function(){function e(t){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),this.resolveOptions(t),this.initSelection()}return i(e,[{key:"resolveOptions",value:function(){var t=0<arguments.length&&void 0!==arguments[0]?arguments[0]:{};this.action=t.action,this.container=t.container,this.emitter=t.emitter,this.target=t.target,this.text=t.text,this.trigger=t.trigger,this.selectedText=""}},{key:"initSelection",value:function(){this.text?this.selectFake():this.target&&this.selectTarget()}},{key:"selectFake",value:function(){var t=this,e="rtl"==document.documentElement.getAttribute("dir");this.removeFake(),this.fakeHandlerCallback=function(){return t.removeFake()},this.fakeHandler=this.container.addEventListener("click",this.fakeHandlerCallback)||!0,this.fakeElem=document.createElement("textarea"),this.fakeElem.style.fontSize="12pt",this.fakeElem.style.border="0",this.fakeElem.style.padding="0",this.fakeElem.style.margin="0",this.fakeElem.style.position="absolute",this.fakeElem.style[e?"right":"left"]="-9999px";var n=window.pageYOffset||document.documentElement.scrollTop;this.fakeElem.style.top=n+"px",this.fakeElem.setAttribute("readonly",""),this.fakeElem.value=this.text,this.container.appendChild(this.fakeElem),this.selectedText=(0,c.default)(this.fakeElem),this.copyText()}},{key:"removeFake",value:function(){this.fakeHandler&&(this.container.removeEventListener("click",this.fakeHandlerCallback),this.fakeHandler=null,this.fakeHandlerCallback=null),this.fakeElem&&(this.container.removeChild(this.fakeElem),this.fakeElem=null)}},{key:"selectTarget",value:function(){this.selectedText=(0,c.default)(this.target),this.copyText()}},{key:"copyText",value:function(){var e=void 0;try{e=document.execCommand(this.action)}catch(t){e=!1}this.handleResult(e)}},{key:"handleResult",value:function(t){this.emitter.emit(t?"success":"error",{action:this.action,text:this.selectedText,trigger:this.trigger,clearSelection:this.clearSelection.bind(this)})}},{key:"clearSelection",value:function(){this.trigger&&this.trigger.focus(),window.getSelection().removeAllRanges()}},{key:"destroy",value:function(){this.removeFake()}},{key:"action",set:function(){var t=0<arguments.length&&void 0!==arguments[0]?arguments[0]:"copy";if(this._action=t,"copy"!==this._action&&"cut"!==this._action)throw new Error('Invalid "action" value, use either "copy" or "cut"')},get:function(){return this._action}},{key:"target",set:function(t){if(void 0!==t){if(!t||"object"!==(void 0===t?"undefined":r(t))||1!==t.nodeType)throw new Error('Invalid "target" value, use a valid Element');if("copy"===this.action&&t.hasAttribute("disabled"))throw new Error('Invalid "target" attribute. Please use "readonly" instead of "disabled" attribute');if("cut"===this.action&&(t.hasAttribute("readonly")||t.hasAttribute("disabled")))throw new Error('Invalid "target" attribute. You can\'t cut text from elements with "readonly" or "disabled" attributes');this._target=t}},get:function(){return this._target}}]),e}();t.exports=u},function(t,e){t.exports=function(t){var e;if("SELECT"===t.nodeName)t.focus(),e=t.value;else if("INPUT"===t.nodeName||"TEXTAREA"===t.nodeName){var n=t.hasAttribute("readonly");n||t.setAttribute("readonly",""),t.select(),t.setSelectionRange(0,t.value.length),n||t.removeAttribute("readonly"),e=t.value}else{t.hasAttribute("contenteditable")&&t.focus();var o=window.getSelection(),r=document.createRange();r.selectNodeContents(t),o.removeAllRanges(),o.addRange(r),e=o.toString()}return e}},function(t,e){function n(){}n.prototype={on:function(t,e,n){var o=this.e||(this.e={});return(o[t]||(o[t]=[])).push({fn:e,ctx:n}),this},once:function(t,e,n){var o=this;function r(){o.off(t,r),e.apply(n,arguments)}return r._=e,this.on(t,r,n)},emit:function(t){for(var e=[].slice.call(arguments,1),n=((this.e||(this.e={}))[t]||[]).slice(),o=0,r=n.length;o<r;o++)n[o].fn.apply(n[o].ctx,e);return this},off:function(t,e){var n=this.e||(this.e={}),o=n[t],r=[];if(o&&e)for(var i=0,a=o.length;i<a;i++)o[i].fn!==e&&o[i].fn._!==e&&r.push(o[i]);return r.length?n[t]=r:delete n[t],this}},t.exports=n},function(t,e,n){var d=n(5),h=n(6);t.exports=function(t,e,n){if(!t&&!e&&!n)throw new Error("Missing required arguments");if(!d.string(e))throw new TypeError("Second argument must be a String");if(!d.fn(n))throw new TypeError("Third argument must be a Function");if(d.node(t))return s=e,f=n,(l=t).addEventListener(s,f),{destroy:function(){l.removeEventListener(s,f)}};if(d.nodeList(t))return a=t,c=e,u=n,Array.prototype.forEach.call(a,function(t){t.addEventListener(c,u)}),{destroy:function(){Array.prototype.forEach.call(a,function(t){t.removeEventListener(c,u)})}};if(d.string(t))return o=t,r=e,i=n,h(document.body,o,r,i);throw new TypeError("First argument must be a String, HTMLElement, HTMLCollection, or NodeList");var o,r,i,a,c,u,l,s,f}},function(t,n){n.node=function(t){return void 0!==t&&t instanceof HTMLElement&&1===t.nodeType},n.nodeList=function(t){var e=Object.prototype.toString.call(t);return void 0!==t&&("[object NodeList]"===e||"[object HTMLCollection]"===e)&&"length"in t&&(0===t.length||n.node(t[0]))},n.string=function(t){return"string"==typeof t||t instanceof String},n.fn=function(t){return"[object Function]"===Object.prototype.toString.call(t)}},function(t,e,n){var a=n(7);function i(t,e,n,o,r){var i=function(e,n,t,o){return function(t){t.delegateTarget=a(t.target,n),t.delegateTarget&&o.call(e,t)}}.apply(this,arguments);return t.addEventListener(n,i,r),{destroy:function(){t.removeEventListener(n,i,r)}}}t.exports=function(t,e,n,o,r){return"function"==typeof t.addEventListener?i.apply(null,arguments):"function"==typeof n?i.bind(null,document).apply(null,arguments):("string"==typeof t&&(t=document.querySelectorAll(t)),Array.prototype.map.call(t,function(t){return i(t,e,n,o,r)}))}},function(t,e){if("undefined"!=typeof Element&&!Element.prototype.matches){var n=Element.prototype;n.matches=n.matchesSelector||n.mozMatchesSelector||n.msMatchesSelector||n.oMatchesSelector||n.webkitMatchesSelector}t.exports=function(t,e){for(;t&&9!==t.nodeType;){if("function"==typeof t.matches&&t.matches(e))return t;t=t.parentNode}}}])});
!function(e){e(["jquery"],function(e){return function(){function t(e,t,n){return g({type:O.error,iconClass:m().iconClasses.error,message:e,optionsOverride:n,title:t})}function n(t,n){return t||(t=m()),v=e("#"+t.containerId),v.length?v:(n&&(v=d(t)),v)}function o(e,t,n){return g({type:O.info,iconClass:m().iconClasses.info,message:e,optionsOverride:n,title:t})}function s(e){C=e}function i(e,t,n){return g({type:O.success,iconClass:m().iconClasses.success,message:e,optionsOverride:n,title:t})}function a(e,t,n){return g({type:O.warning,iconClass:m().iconClasses.warning,message:e,optionsOverride:n,title:t})}function r(e,t){var o=m();v||n(o),u(e,o,t)||l(o)}function c(t){var o=m();return v||n(o),t&&0===e(":focus",t).length?void h(t):void(v.children().length&&v.remove())}function l(t){for(var n=v.children(),o=n.length-1;o>=0;o--)u(e(n[o]),t)}function u(t,n,o){var s=!(!o||!o.force)&&o.force;return!(!t||!s&&0!==e(":focus",t).length)&&(t[n.hideMethod]({duration:n.hideDuration,easing:n.hideEasing,complete:function(){h(t)}}),!0)}function d(t){return v=e("<div/>").attr("id",t.containerId).addClass(t.positionClass),v.appendTo(e(t.target)),v}function p(){return{tapToDismiss:!0,toastClass:"toast",containerId:"toast-container",debug:!1,showMethod:"fadeIn",showDuration:300,showEasing:"swing",onShown:void 0,hideMethod:"fadeOut",hideDuration:1e3,hideEasing:"swing",onHidden:void 0,closeMethod:!1,closeDuration:!1,closeEasing:!1,closeOnHover:!0,extendedTimeOut:1e3,iconClasses:{error:"toast-error",info:"toast-info",success:"toast-success",warning:"toast-warning"},iconClass:"toast-info",positionClass:"toast-top-right",timeOut:5e3,titleClass:"toast-title",messageClass:"toast-message",escapeHtml:!1,target:"body",closeHtml:'<button type="button">&times;</button>',closeClass:"toast-close-button",newestOnTop:!0,preventDuplicates:!1,progressBar:!1,progressClass:"toast-progress",rtl:!1}}function f(e){C&&C(e)}function g(t){function o(e){return null==e&&(e=""),e.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function s(){c(),u(),d(),p(),g(),C(),l(),i()}function i(){var e="";switch(t.iconClass){case"toast-success":case"toast-info":e="polite";break;default:e="assertive"}I.attr("aria-live",e)}function a(){E.closeOnHover&&I.hover(H,D),!E.onclick&&E.tapToDismiss&&I.click(b),E.closeButton&&j&&j.click(function(e){e.stopPropagation?e.stopPropagation():void 0!==e.cancelBubble&&e.cancelBubble!==!0&&(e.cancelBubble=!0),E.onCloseClick&&E.onCloseClick(e),b(!0)}),E.onclick&&I.click(function(e){E.onclick(e),b()})}function r(){I.hide(),I[E.showMethod]({duration:E.showDuration,easing:E.showEasing,complete:E.onShown}),E.timeOut>0&&(k=setTimeout(b,E.timeOut),F.maxHideTime=parseFloat(E.timeOut),F.hideEta=(new Date).getTime()+F.maxHideTime,E.progressBar&&(F.intervalId=setInterval(x,10)))}function c(){t.iconClass&&I.addClass(E.toastClass).addClass(y)}function l(){E.newestOnTop?v.prepend(I):v.append(I)}function u(){if(t.title){var e=t.title;E.escapeHtml&&(e=o(t.title)),M.append(e).addClass(E.titleClass),I.append(M)}}function d(){if(t.message){var e=t.message;E.escapeHtml&&(e=o(t.message)),B.append(e).addClass(E.messageClass),I.append(B)}}function p(){E.closeButton&&(j.addClass(E.closeClass).attr("role","button"),I.prepend(j))}function g(){E.progressBar&&(q.addClass(E.progressClass),I.prepend(q))}function C(){E.rtl&&I.addClass("rtl")}function O(e,t){if(e.preventDuplicates){if(t.message===w)return!0;w=t.message}return!1}function b(t){var n=t&&E.closeMethod!==!1?E.closeMethod:E.hideMethod,o=t&&E.closeDuration!==!1?E.closeDuration:E.hideDuration,s=t&&E.closeEasing!==!1?E.closeEasing:E.hideEasing;if(!e(":focus",I).length||t)return clearTimeout(F.intervalId),I[n]({duration:o,easing:s,complete:function(){h(I),clearTimeout(k),E.onHidden&&"hidden"!==P.state&&E.onHidden(),P.state="hidden",P.endTime=new Date,f(P)}})}function D(){(E.timeOut>0||E.extendedTimeOut>0)&&(k=setTimeout(b,E.extendedTimeOut),F.maxHideTime=parseFloat(E.extendedTimeOut),F.hideEta=(new Date).getTime()+F.maxHideTime)}function H(){clearTimeout(k),F.hideEta=0,I.stop(!0,!0)[E.showMethod]({duration:E.showDuration,easing:E.showEasing})}function x(){var e=(F.hideEta-(new Date).getTime())/F.maxHideTime*100;q.width(e+"%")}var E=m(),y=t.iconClass||E.iconClass;if("undefined"!=typeof t.optionsOverride&&(E=e.extend(E,t.optionsOverride),y=t.optionsOverride.iconClass||y),!O(E,t)){T++,v=n(E,!0);var k=null,I=e("<div/>"),M=e("<div/>"),B=e("<div/>"),q=e("<div/>"),j=e(E.closeHtml),F={intervalId:null,hideEta:null,maxHideTime:null},P={toastId:T,state:"visible",startTime:new Date,options:E,map:t};return s(),r(),a(),f(P),E.debug&&console&&console.log(P),I}}function m(){return e.extend({},p(),b.options)}function h(e){v||(v=n()),e.is(":visible")||(e.remove(),e=null,0===v.children().length&&(v.remove(),w=void 0))}var v,C,w,T=0,O={error:"error",info:"info",success:"success",warning:"warning"},b={clear:r,remove:c,error:t,getContainer:n,info:o,options:{},subscribe:s,success:i,version:"2.1.4",warning:a};return b}()})}("function"==typeof define&&define.amd?define:function(e,t){"undefined"!=typeof module&&module.exports?module.exports=t(require("jquery")):window.toastr=t(window.jQuery)});
//# sourceMappingURL=toastr.js.map



String.prototype.trimToLength = function(m) {
  return (this.length > m) 
    ? jQuery.trim(this).substring(0, m) + " ..."
    : this;
};

function refreshHandouts( inputData ) {
    console.log("refreshing Handouts screen");
    $.ajax({
        type:"get",
        url: live_urls.handoutsRefresh,
        datatype:"json",
        success:function(data)
        {
            $('#handouts-wrapper').html( data );
        }
    });
}

function refreshMessagesCounter() {
    if ( $('.hermes-update-count').length ) {
    }
}

// jQuery plugin to prevent double submission of forms
jQuery.fn.preventDoubleSubmission = function() {
    $(this).on('submit',function(e){
        saveEditors();
        console.log('checking form');
        var $form = $(this);
        console.log('form submission triggered');
        if ($form.data('submitted') === true) {
            // Previously submitted - don't submit again
            console.log('submission prevented');
            e.preventDefault();
        } else {
            // Mark it so that the next submit can be ignored
            console.log('submission accepted');
            $form.data('submitted', true);

        }
    });

    // Keep chainability
    return this;
};



$(window).on('load', function(){ 
    $('.navbar-default').css("left","0");
});


// Save the current state of the navbar  
$(document).on('click', 'a.navbar-minimalize', function( event ){
    event.preventDefault();
    that = $(this);
    var miniNavbar = 'mini-navbar';

    if ( $('body').hasClass('mini-navbar') ) {
        miniNavbar = 'mini-navbar';
    } else {
        miniNavbar = '';
    }

    $.ajax({
        url: that.attr("href"),
        data: { miniNavbar: miniNavbar },
        type: "GET",
        dataType: "json",
        async: true,
    });
    return false;
});

$(document).on('click', 'a.follow-character', function( event ){
    event.preventDefault();
    that = $(this);
    $.ajax({
        url: that.attr("href"),
        type: "GET",
        dataType: "json",
        async: true,
        success: function (data)
        {
          if ( data == 'followed') {
            that.html('<i class="far fa-check"></i> Followed')
          } 
          else if ( data == 'unfollowed') {
            that.html('<i class="far fa-user-friends"></i> Follow')
          }
          else {
          }
        }
    });
    return false;
});


function bindtooltipster() {
    $('.tooltipster').tooltipster({
        theme: 'tooltipster-borderless',
        side: 'top',
        maxWidth: 350,
        interactive: true,
    });

    $('.article-link').tooltipster({
        theme: 'tooltipster-light',
        animation: 'fade',
        interactive: true,
        delay: [300, 300],
        maxWidth: 650,
        minWidth: 300,
        contentAsHTML: true,
        content: '<div class="p-2 text-center">Loading...</div>',
        // 'instance' is basically the tooltip. More details in the "Object-oriented Tooltipster" section.
        functionBefore: function(instance, helper) {
            
            var $origin = $(helper.origin);
            
            // we set a variable so the data is only loaded once via Ajax, not every time the tooltip opens
            if ($origin.data('loaded') !== true) {
                console.log( $origin );
                $.get( '/article/'+$origin.attr('data-article')+'/tooltip', function(data) {

                    // call the 'content' method to update the content of our tooltip with the returned data.
                    // note: this content update will trigger an update animation (see the updateAnimation option)
                    instance.content(data);

                    // to remember that the data has been loaded
                    $origin.data('loaded', true);
                });
            }
        }
    });

}

function bindselect2( id, message ) {
    $( id ).select2({
        theme: "bootstrap",
        allowClear: true,
        placeholder: message,
        width: "100%"
    });
    $( id ).on("select2:select", function (e) { 
    });
}




// Konami Code
var kkeys = [], konami = "38,38,40,40,37,39,37,39,66,65";
$(document).keydown(function(e) {
  kkeys.push( e.keyCode );
  if ( kkeys.toString().indexOf( konami ) >= 0 ) {
    $(document).unbind('keydown',arguments.callee);
    // do something awesome
    alert('boom big bada boom - Leeloo'); 
  }
});


// Timestamp to Date Converter
function convertTimestamp(timestamp) {
  var d = new Date(timestamp * 1000), // Convert the passed timestamp to milliseconds
    yyyy = d.getFullYear(),
    mm = ('0' + (d.getMonth() + 1)).slice(-2),  // Months are zero based. Add leading 0.
    dd = ('0' + d.getDate()).slice(-2),     // Add leading 0.
    hh = d.getHours(),
    h = hh,
    min = ('0' + d.getMinutes()).slice(-2),   // Add leading 0.
    ampm = 'AM',
    time;
  if (hh > 12) {
    h = hh - 12;
    ampm = 'PM';
  } else if (hh === 12) {
    h = 12;
    ampm = 'PM';
  } else if (hh == 0) {
    h = 12;
  }
    
  time = dd + '/' + mm + ' ' + h + ':' + min + ' ' + ampm;

  return time;
}


// Random Roll Tables code
$(document).on('click', '.btn-random-roll', function( event ){
    that = $(this);
    data = that.siblings('.random-table-data').val()
    var dataArray = JSON.parse( data );
    var formattedArray = [];
    for (var i = 0, len = dataArray.length; i < len; i++) {
        console.log( dataArray[i][0] );
        if ( isNaN( dataArray[i][0] ) ) {
            var range =  dataArray[i][0].split("-");
            var rangeStart = Number(range[0]);
            var rangeEnd = Number(range[1]);
            console.log( range );
            console.log( 'start:' + rangeStart );
            console.log( 'end:' + rangeEnd ); 

            for ( var j = rangeStart; j <= rangeEnd; j++) {
                console.log( j + ' >> generating: ' + j + '('+ dataArray[i][1] +')' )
                formattedArray[ j ] = dataArray[i][1];
            }
            console.log( 'pointer:' + j );  
            j = 0;
        } else {
            formattedArray[ +dataArray[i][0]++ ] = dataArray[i][1];
        }
    }
    console.log( formattedArray );
    for (var firstKey in formattedArray) break;
    minimum = Number(firstKey);
    maximum = Number(formattedArray.length - 1);
    var randomnumber = Math.floor(Math.random()*(maximum-minimum+1))+minimum;
    result = 'You Rolled a <strong>' + randomnumber +'</strong>: ' + formattedArray[ randomnumber ] ;
    that.siblings('.table-random-results').prepend('<div class="random-table-result">' + result + '</div>' );
    event.preventDefault();
});






$(document).ready(function () {
     // Confirmation 
    // 
    var elems = document.getElementsByClassName('confirmation');
    var confirmIt = function (e) {
        if (!confirm('Are you sure you want to do this? This is a non-reversible action.')) e.preventDefault();
    };
    for (var i = 0, l = elems.length; i < l; i++) {
        elems[i].addEventListener('click', confirmIt, false);
    }

    // Refresh Handouts every 90 seconds
	setInterval(function() { 
	    if ( $('#handouts-wrapper').length ) {
	        refreshHandouts();
	    }
	}, 90000);

    // Clipboard initilization

    var clipboard = new ClipboardJS('.cp');

    clipboard.on('success', function(e) {
        toastr.success('Right click > Paste or ctrl+V to paste anywhere you want.','Copied to clipboard' );
        e.clearSelection();
    });


    // Reloading Messages every 90 seconds
    setInterval(function() { 
        refreshMessagesCounter();
    }, 90000);//time in milliseconds 

    $('form').preventDoubleSubmission();


    // Select2 Init
    $('.select2').select2({
        theme: "bootstrap",
        allowClear: true,
        width: "100%",
        placeholder: "Make your choice"
    });

    // Tooltipster Init
    bindtooltipster();

    // Lightbok Init
    var lightbox = $('.gallery a').simpleLightbox({
      captionsData: 'title'
    });

    // Toastr Init
    toastr.options = {
      "closeButton": true,
      "debug": false,
      "newestOnTop": true,
      "progressBar": true,
      "positionClass": "toast-top-right",
      "preventDuplicates": false,
      "onclick": null,
      "showDuration": "300",
      "hideDuration": "1000",
      "timeOut": "5000",
      "extendedTimeOut": "1000",
      "showEasing": "swing",
      "hideEasing": "linear",
      "showMethod": "fadeIn",
      "hideMethod": "fadeOut"
    }

    // Datatables Initilization 
    $('#articles-list, #categories-list, #maps-list, .datatable-enabled, .table-data').DataTable({
        "lengthChange": false,
        "pageLength": 500,
        "autowidth": true
    });

    bindTrackable();
    console.log('finished loading Javascript.');
    
    if ( $('.world-search').length ) { 
        console.log('world-search detected.');
        $.typeahead({
            input: '.world-search',
            dynamic: true,
            maxItem: 15,
            delay: 300,
            limit: 25,
            minLength: 3,
            emptyTemplate: "I have found nothing matching that. Womp womp! :(",
            backdrop: {
                "background-color": "#fff"
            },
            template: function (query, item) {
         
                var color = "#777";
                if (item.status === "owner") {
                    color = "#ff1493";

                }
         
                return '{{title}} <small>({{type}})</small>'
            },
            highlighter: function(data, rawdata) {
                html = '<div class="info">' + rawdata.name + ' <span class="text-muted">('+ rawdata.type+')</span></div>';
                return html;
            },
            updater: function(item) {
                this.$element[0].value = item;
                string = JSON.stringify(item);
                $('#objectData').val( string );
                this.$element[0].form.submit();
                return item;
            },
            source: {
                "Articles": {
                    display: "title",
                    ajax: function (query) {
                        return {
                            type: "GET",
                            url: urls.search_article,
                            path: "data",
                            data: {
                                q: "{{query}}"
                            },
                        }
                    }
                },
            },
            callback: {
                onClick: function (node, a, item, event) {
                    window.location.href = item.url;
                }
            },
            debug: true
        });
    }




});


