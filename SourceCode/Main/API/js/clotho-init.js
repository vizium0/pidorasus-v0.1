var ClothoData = {};
$(document).ready(function () {

  $('[data-component="clotho"]').each(function (i, element) {
    // console.log(element)
    var config = {
      rootElement: element,
      displayType: $(element).attr('data-clotho-type'),
      initialID: $(element).attr('data-clotho-id'),
      worldID: $(element).attr('data-world-id'),
      mode: $(element).attr('data-clotho-mode') === 'tag' ? 'tag' : 'default',
      breakpoint: 7,
      breakpointSpace: 30,
      breakpointZoom: .06,
      serverURL: $(element).attr('data-server-url') || undefined,
      zoom: {
        initial: 120,
        max: 150,
        min: 20,
        step: 20,
        invertControls: false,
        showControls: true
      }
    }

    var clotho = new Clotho(config);
  })
})