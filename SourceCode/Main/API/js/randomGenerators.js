

function loadRandomGenerators() {
    $(document).on('click', '.template_render', function( event ){
        event.preventDefault(); // avoid to execute the actual submit of the form.
        that = $( this );

        $.ajax({
            type: "GET",
            url: that.attr('href'),
            success: function (data) {
                $('.template_render_container').html( data.contents );
            }
        });
    });
}

loadRandomGenerators();