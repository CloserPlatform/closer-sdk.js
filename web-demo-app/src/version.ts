export const displayVersion = (): void => {

    $.ajax({
        contentType: 'text/plain',
        url: 'version.txt',
        success(version): void {
            $('#nav').append(`<div class="text-muted text-center"><small>Version: ${version}</small></div>`);
        }
    });
};
