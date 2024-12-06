function loadThales() {
  $('[data-component="thales"').each(function (i, elem) {
    var loaded = $(elem).attr('data-component-loaded') === "true";

    if (!loaded) {
      var options = {
        tableID: $(elem).attr('data-thales-table'),
        worldID: $(elem).attr('data-world-id'),
        serverURL: $(elem).attr('data-server-url'),
        rootNode: elem,
        mode: $(elem).hasClass('thales-edit') ? 'editor' : 'viewer',
        env: (typeof ENV !== "undefined" ? ENV : 'prod')
      };

      new Thales(options);
    }

  });
}

$(document).ready(function () {
  var ThalesTables = {};
  loadThales();
})