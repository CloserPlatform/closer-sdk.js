function displayVersion() {
    $.ajax( {
        url: "../.git/ORIG_HEAD",
        success: function( data ) {
            $('.navbar').append('<div class="text-center"><span>Commit: '+data+'</span></div>')
        }
    })

}