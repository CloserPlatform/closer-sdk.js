function displayVersion() {

    $.ajax( {
        contentType: 'text/plain',
        url: "version.txt",
        success: function( version ) {
            $('.navbar').append('<div class="text-center"><span>Commit: '+version+'</span></div>');
        }
    })
}






