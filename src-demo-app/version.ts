export function displayVersion(): void {

    $.ajax( {
        contentType: "text/plain",
        url: "version.txt",
        success( version ) {
            $(".navbar").append("<div class=\"text-center\"><span>Commit: " + version + "</span></div>");
        }
    });
}
