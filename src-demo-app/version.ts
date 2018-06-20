export const displayVersion = (): void => {

    $.ajax({
        contentType: 'text/plain',
        url: 'version.txt',
        success(version): void {
            $('.navbar').append(`<div class="text-center"><span>Commit: ${version}</span></div>`);
        }
    });
};
